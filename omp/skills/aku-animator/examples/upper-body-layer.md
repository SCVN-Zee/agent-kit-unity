# Example — Upper-body layer (and why the batched-edit-only path silently fails)

Adding a masked layer so the player can aim with the upper body while the legs keep running. This is the case where the batched animator edit alone **cannot** finish the job.

**Task:** *"Let the player aim while running."*

> **Bind each capability below to the Unity MCP tools already in your in-context tool list** — match the capability (batch animator edits, read the graph, run an editor-side C# snippet), not a hardcoded name — rather than editing the `.controller` file directly.

## First: do you actually need a layer?

Default to one layer. A second layer earns its place only when two animations must affect **different body regions at the same time**, or when an additive pass is genuinely required. If Aim fully replaces the pose, it is a state on the base layer, not a layer.

Here the legs must keep running while the arms aim — two regions, simultaneously. A layer is correct.

## Step 1 — add the layer and its states via the batched edit

```
batch the animator edits
  animatorRef: "Assets/Game/Animation/AnimatorControllers/C_Player.controller"
  modifications: [
    { "type": "AddLayer",     "layerName": "UpperBody" },

    { "type": "AddParameter", "parameterName": "IsAiming", "parameterType": "Bool",
      "defaultBool": false },

    { "type": "AddState", "layerName": "UpperBody", "stateName": "Empty" },
    { "type": "AddState", "layerName": "UpperBody", "stateName": "Aim",
      "motionAssetPath": "Assets/Game/Animation/AnimationClips/A_PlayerAim.anim" },

    { "type": "SetDefaultState", "layerName": "UpperBody", "stateName": "Empty" },

    { "type": "AddTransition", "layerName": "UpperBody",
      "sourceStateName": "Empty", "destinationStateName": "Aim",
      "hasExitTime": false, "duration": 0.15, "hasFixedDuration": true,
      "conditions": [ { "parameter": "IsAiming", "mode": "If", "threshold": 0 } ] },

    { "type": "AddTransition", "layerName": "UpperBody",
      "sourceStateName": "Aim", "destinationStateName": "Empty",
      "hasExitTime": false, "duration": 0.15, "hasFixedDuration": true,
      "conditions": [ { "parameter": "IsAiming", "mode": "IfNot", "threshold": 0 } ] }
  ]
```

`IsAiming` is a **Bool**, not a Trigger — aiming is sustained, and a Trigger would be consumed on entry and drop straight back out. The `Empty` state is a deliberate no-clip state: it is what the layer contributes when not aiming.

## Step 2 — read `errors[]`, then look at what you actually got

```
response.errors  →  []
```

Empty. The call succeeded. **The layer still plays nothing.** Read the graph back:

```
read animator data → layers[1]
  name              "UpperBody"
  defaultWeight     0            ← contributes nothing to the final pose
  blendingMode      "Override"
  avatarMask        (none)       ← would replace the WHOLE body, not just arms
  defaultStateName  "Empty"
  states            [ Empty, Aim ]
```

**Cause.** `AddLayer` accepts only `layerName` — the whole implementation is `controller.AddLayer(name)`. Weight defaults to 0, there is no mask, and no batched-edit op can set either. Nothing errored because nothing failed; the capability did exactly what it supports.

This is trap 6 in [`../PATTERNS.md`](../PATTERNS.md), and it is why "the agent set up a layer" and "the layer works" are different claims.

## Step 3 — set weight, mask, and blending via an editor-side C# snippet

Recipe 1 in [`../FALLBACK_RECIPES.md`](../FALLBACK_RECIPES.md). The mask must exist as an asset first — there is **no** typed capability for AvatarMask creation (the asset-creation capabilities cover folders, materials, and prefabs only). Author it in the Editor, or create it in the same snippet body:

```csharp
AvatarMask mask = new AvatarMask();
mask.SetHumanoidBodyPartActive(AvatarMaskBodyPart.LeftArm,  true);
mask.SetHumanoidBodyPartActive(AvatarMaskBodyPart.RightArm, true);
mask.SetHumanoidBodyPartActive(AvatarMaskBodyPart.Head,     true);
mask.SetHumanoidBodyPartActive(AvatarMaskBodyPart.LeftLeg,  false);
mask.SetHumanoidBodyPartActive(AvatarMaskBodyPart.RightLeg, false);
mask.SetHumanoidBodyPartActive(AvatarMaskBodyPart.Root,     false);
AssetDatabase.CreateAsset(mask, "Assets/Game/Animation/UpperBody.mask");
```

```csharp
AnimatorController controller = AssetDatabase.LoadAssetAtPath<AnimatorController>(
    "Assets/Game/Animation/AnimatorControllers/C_Player.controller");
if (controller == null) { return "controller not found"; }

AnimatorControllerLayer[] layers = controller.layers;   // ← copy
for (int i = 0; i < layers.Length; i++)
{
    if (layers[i].name != "UpperBody") { continue; }

    layers[i].defaultWeight = 1f;
    layers[i].blendingMode  = AnimatorLayerBlendingMode.Override;
    layers[i].avatarMask    = AssetDatabase.LoadAssetAtPath<AvatarMask>(
        "Assets/Game/Animation/UpperBody.mask");
}
controller.layers = layers;                              // ← REQUIRED

EditorUtility.SetDirty(controller);
AssetDatabase.SaveAssets();
return "UpperBody weight=1 masked";
```

**The reassignment on the second-to-last line is load-bearing.** `controller.layers` hands back a copy and `AnimatorControllerLayer` is a struct — without `controller.layers = layers;` the loop mutates a throwaway and the asset is unchanged. Same silent-no-op shape as the bug being fixed.

## Step 4 — re-verify

The mutation happened outside the batched animator edit, so nothing reported on it. Read back:

```
✓ layer          UpperBody defaultWeight=1 · defaultStateName="Empty" · mask applied
✓ reachability   Empty=default · Aim ← Empty
✓ edge validity  2 transitions, both conditioned, hasExitTime=false
✓ condition type IsAiming(Bool) → If / IfNot ✓
```

## Override vs Additive

| | Use when | Requires |
| --- | --- | --- |
| `Override` | the layer **replaces** the pose for masked bones — aiming, holding, carrying | an `avatarMask`, or it replaces the whole body |
| `Additive` | the layer **adds** on top — breathing, lean, recoil | clips authored as additive (reference pose configured on import) |

An `Override` layer at weight 1 with **no mask** is the second most common layer defect after weight 0: it silently overrides the legs too, and the run animation disappears.

## Runtime side

```csharp
private static readonly int IS_AIMING_HASH = Animator.StringToHash("IsAiming");

_animator.SetBool(IS_AIMING_HASH, _isAiming);
```

Layer weight can also be blended at runtime with `Animator.SetLayerWeight(1, t)` — `defaultWeight` is the authored starting value, not a lock.
