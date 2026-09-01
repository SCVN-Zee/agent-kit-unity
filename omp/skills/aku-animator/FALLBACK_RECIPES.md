# Fallback Recipes — what the batched animator edit cannot reach

Four properties that matter for a correct controller are **readable** when you read the graph but **not settable** via the batched animator edit. Each recipe below runs through an **editor-side C# snippet** (Roslyn), with a **call-a-method-by-reflection** alternative.

> **Bind each capability below to the Unity MCP tools already in your in-context tool list** — match the capability (run an editor-side C# snippet, call/find a method by reflection, read the graph, read the console), not a hardcoded name. If none matches, set the property by hand in the Animator window rather than editing the `.controller` file directly.

Gap inventory + the four that have no recipe: [`PATTERNS.md`](PATTERNS.md).

## Shared preamble

Every snippet assumes this shape. An editor-side C# snippet already has Unity / UnityEditor / System in scope — **do not** re-add those `using` directives, and the body **must end with `return <expr>;`** or it fails to compile (`MCP_USAGE.md`).

```csharp
AnimatorController controller = AssetDatabase.LoadAssetAtPath<AnimatorController>(
    "Assets/Game/Animation/AnimatorControllers/C_Player.controller");
if (controller == null) { return "controller not found"; }

// … mutation …

EditorUtility.SetDirty(controller);
AssetDatabase.SaveAssets();
return "ok";
```

`UnityEditor.Animations` may need an explicit `using UnityEditor.Animations;` depending on the host's default namespace set — add it only if the call fails to resolve.

> ⚠️ **`controller.layers` returns a copy of the array, and `AnimatorControllerLayer` is a struct.** Mutating an element in place does nothing. You must reassign the whole array back — `controller.layers = layers;`. This is the same class of silent no-op as the weight-0 trap itself, and the most common way these recipes get written wrong.

## 1. Layer weight, avatar mask, blending mode

Fixes trap 6. Without this a layer added via `AddLayer` has weight 0 and plays nothing.

```csharp
AnimatorControllerLayer[] layers = controller.layers;   // ← copy
for (int i = 0; i < layers.Length; i++)
{
    if (layers[i].name != "UpperBody") { continue; }

    layers[i].defaultWeight = 1f;
    layers[i].blendingMode  = AnimatorLayerBlendingMode.Override;  // or .Additive
    layers[i].avatarMask    = AssetDatabase.LoadAssetAtPath<AvatarMask>(
        "Assets/Game/Animation/UpperBody.mask");
    layers[i].iKPass        = false;
}
controller.layers = layers;                              // ← reassignment REQUIRED
```

- `defaultWeight` is the authored weight. Runtime code can still override it with `Animator.SetLayerWeight`.
- `Override` replaces the base pose for masked bones; `Additive` adds on top of it. Additive layers need clips authored as additive.
- Without an `avatarMask`, an `Override` layer at weight 1 replaces the **whole body**, not a region.

**Reflection alternative:** call a method by reflection on `UnityEditor.Animations.AnimatorController` property `layers` — read, mutate, write back. The struct-copy rule is identical.

## 2. `canTransitionToSelf = false` on Any-State transitions

Fixes trap 5. Required for any Trigger-driven `AddAnyStateTransition`, or the destination state restarts every frame the trigger is set.

```csharp
int fixedCount = 0;
foreach (AnimatorControllerLayer layer in controller.layers)
{
    foreach (AnimatorStateTransition transition in layer.stateMachine.anyStateTransitions)
    {
        transition.canTransitionToSelf = false;
        fixedCount++;
    }
}
```

`anyStateTransitions` returns `AnimatorStateTransition` **objects** (not structs), so in-place mutation works here — no reassignment needed. Return `fixedCount` so the result is observable.

To target one transition, filter on `transition.destinationState.name`.

**Reflection alternative:** call a method by reflection on `AnimatorStateTransition.canTransitionToSelf` for a specific transition instance.

## 3. `writeDefaultValues = false` across every state

Fixes trap 8. Uniform WD prevents skipped transitions and pose bleed.

```csharp
int stateCount = 0;
foreach (AnimatorControllerLayer layer in controller.layers)
{
    foreach (ChildAnimatorState child in layer.stateMachine.states)
    {
        child.state.writeDefaultValues = false;
        stateCount++;
    }
}
```

`ChildAnimatorState` is a struct, but `.state` is a reference to an `AnimatorState` object — mutating through it works without reassigning `states`.

**Sub-state machines are not covered by this loop.** `layer.stateMachine.stateMachines` holds them; recurse if the controller has any (reading the graph reports `subStateMachines[]`).

**Reflection alternative:** call a method by reflection on `AnimatorState.writeDefaultValues` per state.

## 4. Transition interruption

No dedicated capability at all. Controls whether a transition can be interrupted mid-blend and by whom.

```csharp
foreach (AnimatorControllerLayer layer in controller.layers)
{
    foreach (ChildAnimatorState child in layer.stateMachine.states)
    {
        foreach (AnimatorStateTransition transition in child.state.transitions)
        {
            if (transition.destinationState == null) { continue; }
            if (transition.destinationState.name != "Attack") { continue; }

            transition.interruptionSource  = TransitionInterruptionSource.Source;
            transition.orderedInterruption = true;
        }
    }
}
```

`TransitionInterruptionSource`: `None` (default, uninterruptible) · `Source` · `Destination` · `SourceThenDestination` · `DestinationThenSource`. Use `Source` when a higher-priority action must cut in on an in-progress blend.

**Reflection alternative:** call a method by reflection on `AnimatorStateTransition.interruptionSource`.

## After any recipe

These snippets write the asset directly, so read the graph back afterwards — the mutation happened outside the batched animator edit and its `errors[]` reporting.

If you find yourself running the same recipe more than twice, land a permanent editor helper under `Assets/Editor/` instead.

## When the editor-side C# snippet is unavailable

If Roslyn execution is disabled or the call fails, use find-a-method-by-reflection → call-it-by-reflection per the alternatives above. If neither surface works, report the gap and ask the user to set the property in the Animator window — do not fake success or fall back to `Animator.Play` at runtime to paper over an unset property.
