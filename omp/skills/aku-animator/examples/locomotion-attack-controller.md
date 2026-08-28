# Example — Locomotion + Attack controller, end to end

Idle ↔ Run driven by a `Speed` float; Attack fired by a trigger from any state and returning on its own. Build order and transition-kind rules from [`../DECISION_TREE.md`](../DECISION_TREE.md).

**Task:** *"Make the player idle, run when moving, and play an attack on click."*

> **Bind each capability below to the Unity MCP tools already in your in-context tool list** — match the capability (create a controller, batch animator edits, read the graph, patch a component, save the scene), not a hardcoded name — rather than editing the `.controller` file directly.

## Step 1 — create the (empty) controller

```
create the empty controller
  sourcePaths: ["Assets/Game/Animation/AnimatorControllers/C_Player.controller"]
```

Nothing is wired yet. This asset has no states, no parameters, and no default state.

## Step 2 — one batched animator edit

Array order is the build order: parameters, states, default, then edges — **parameters before transitions**. Ordering here is what lets step 2d's conditions reference step 2a's parameters in the same call.

```
batch the animator edits
  animatorRef: "Assets/Game/Animation/AnimatorControllers/C_Player.controller"
  modifications: [
    { "type": "AddParameter", "parameterName": "Speed",  "parameterType": "Float", "defaultFloat": 0 },
    { "type": "AddParameter", "parameterName": "Attack", "parameterType": "Trigger" },

    { "type": "AddState", "layerName": "Base Layer", "stateName": "Idle",
      "motionAssetPath": "Assets/Game/Animation/AnimationClips/A_PlayerIdle.anim" },
    { "type": "AddState", "layerName": "Base Layer", "stateName": "Run",
      "motionAssetPath": "Assets/Game/Animation/AnimationClips/A_PlayerRun.anim" },
    { "type": "AddState", "layerName": "Base Layer", "stateName": "Attack",
      "motionAssetPath": "Assets/Game/Animation/AnimationClips/A_PlayerAttack.anim" },

    { "type": "SetDefaultState", "layerName": "Base Layer", "stateName": "Idle" },

    { "type": "AddTransition", "layerName": "Base Layer",
      "sourceStateName": "Idle", "destinationStateName": "Run",
      "hasExitTime": false, "duration": 0.1, "hasFixedDuration": true,
      "conditions": [ { "parameter": "Speed", "mode": "Greater", "threshold": 0.1 } ] },

    { "type": "AddTransition", "layerName": "Base Layer",
      "sourceStateName": "Run", "destinationStateName": "Idle",
      "hasExitTime": false, "duration": 0.1, "hasFixedDuration": true,
      "conditions": [ { "parameter": "Speed", "mode": "Less", "threshold": 0.1 } ] },

    { "type": "AddAnyStateTransition", "layerName": "Base Layer",
      "destinationStateName": "Attack",
      "hasExitTime": false, "duration": 0.05, "hasFixedDuration": true,
      "conditions": [ { "parameter": "Attack", "mode": "If", "threshold": 0 } ] },

    { "type": "AddTransition", "layerName": "Base Layer",
      "sourceStateName": "Attack", "destinationStateName": "Idle",
      "hasExitTime": true, "exitTime": 0.9, "duration": 0.1, "hasFixedDuration": true }
  ]
```

Four decisions worth naming:

- **Idle↔Run are two transitions, not one.** A sustained state needs an exit edge or you enter Run and never leave. Inverse condition on the way back.
- **`hasExitTime: false` on all three condition-driven edges.** Omit it and Unity's ON default makes them fire up to a full clip late.
- **Attack→Idle is the opposite:** `hasExitTime: true`, `exitTime: 0.9`, **no conditions**. That is what "play to completion, then return" means.
- **Attack comes from Any State** so it interrupts both Idle and Run without two separate edges.

## Step 3 — read `errors[]`

```
response.errors  →  []
```

Per-modification failures accumulate here and the call reports success regardless. A non-empty array means the graph is partly wired — fix and re-apply the failed entries before continuing.

## Step 4 — clear the self-retrigger on the Any-State edge

`canTransitionToSelf` defaults to true, so while `Attack` is set, Attack→Attack restarts the clip every evaluation. Not settable via the batched edit — see [`../FALLBACK_RECIPES.md`](../FALLBACK_RECIPES.md) recipe 2.

## Step 5 — wire the component

The asset exists but is attached to nothing.

```
read the component data      → confirm the Animator exists on Player
patch the component          → runtimeAnimatorController =
                               "Assets/Game/Animation/AnimatorControllers/C_Player.controller"
save the scene               (or save the prefab inside its isolated stage)
```

A wired scene or prefab still needs its own save.

## Step 6 — verify

```
read the animator graph back
  animatorRef: "Assets/Game/Animation/AnimatorControllers/C_Player.controller"
```

**Passing read-back:**

```
✓ reachability   Idle=default · Run ← Idle · Attack ← AnyState — no orphans
✓ edge validity  4 transitions: 3 conditioned (hasExitTime=false), 1 exit-timed (no conditions)
✓ condition type Speed(Float)→Greater/Less ✓ · Attack(Trigger)→If ✓
✓ layer          Base Layer defaultWeight=1 · defaultStateName="Idle"
```

**What a failing read-back looks like** — the same controller built without `hasExitTime` and with `AddTransition` ordered before `AddParameter`:

```
✗ state 'Attack' unreachable — no incoming transition
    → the AnyState edge landed in errors[]: parameter 'Attack' not found at the time
      the condition was evaluated (AddTransition ran before AddParameter)
✗ transition Idle→Run: hasExitTime=true (Unity default, not supplied)
    → condition satisfied at t=0 but the transition waits until 75% of A_PlayerIdle
✗ condition 'Speed' mode=If — Float parameters take Greater/Less
```

Each of those returns a success status from the batched edit. The read-back is what makes them visible.

## Runtime side

Drive it with parameters, never `Play`:

```csharp
private static readonly int SPEED_HASH  = Animator.StringToHash("Speed");
private static readonly int ATTACK_HASH = Animator.StringToHash("Attack");

_animator.SetFloat(SPEED_HASH, _velocity.magnitude);
_animator.SetTrigger(ATTACK_HASH);          // NOT _animator.Play("Attack")
```

Full rules: `skill://aku-code-conventions/ANIMATOR_DRIVING.md`.
