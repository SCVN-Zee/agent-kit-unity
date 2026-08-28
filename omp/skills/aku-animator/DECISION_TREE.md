# Decision Tree — Animator Controllers

Build order → transition kind → layer decision → verify. Modification-op detail in [`MCP_USAGE.md`](MCP_USAGE.md).

> **Bind each capability below to the Unity MCP tools already in your in-context tool list** — match the capability (create a controller, batch animator edits, read the graph, patch a component), not a hardcoded name; don't call a tool-introspection command to discover them. If no tool matches, do it in the Editor or via a committed-state `git` op rather than editing the `.controller` / `.anim` file directly.

## Canonical build order

Creating a controller makes an **empty** one — no states, no parameters, no default state. Everything below is what turns it into a working graph.

```
1. create the empty controller   at Assets/.../Animation/AnimatorControllers/C_Player.controller

2. batch the animator edits       ONE call, this exact order — parameters before transitions:
     a. add parameters   × N    parameters must exist before any condition names them
     b. add states       × N    the clip is assigned inline (motionAssetPath) per state
     c. set default state        the idle / entry state
     d. add transitions          + conditions, + explicit hasExitTime
        add any-state transitions for interrupts reachable from anywhere

3. read the batch result's errors[]   per-modification failures land here; the batch still
                                       reports success

4. patch the component            runtimeAnimatorController → the .controller asset
   read the component back        confirm the assignment

5. read the animator graph back   graph assertions — reachability, edges, condition typing, layers

6. runtime C#                     controller-backed parameter → cache StringToHash once → integer setter
```

**Why one batched call:** the modifications are applied in array order, so 2a–2d in a single call guarantees parameters exist before conditions reference them. It is also far cheaper than four round-trips.

**The `errors[]` array:** batching gives ordering, not atomicity. A failed modification is appended to `errors[]` and the call still succeeds; reading the graph back is what shows what actually landed.

## Intent → op

| Intent | Op(s) |
| --- | --- |
| New controller from scratch | full build order above |
| Add a state to an existing controller | read the graph (discover layer + state names) → `AddState` → entry and required exit `AddTransition` ops |
| Assign or swap a clip on a state | `SetStateMotion` (`motionAssetPath`) |
| "Play X when Y happens" | `AddParameter` (if new) → `AddTransition` with a condition on it |
| "X should interrupt whatever is playing" | `AddAnyStateTransition` + condition; then `canTransitionToSelf = false` (see `PATTERNS.md`) |
| "X should return to idle when it finishes" | `AddTransition` X→Idle, `hasExitTime: true`, **no conditions** |
| Speed up / slow down a state | `SetStateSpeed` |
| Rename / remove a state or transition | `RemoveState` / `RemoveTransition` (then re-add — there is no edit-in-place) |
| Change an existing transition's conditions | `RemoveTransition` → `AddTransition` with the new conditions |
| Edit clip curves / events / frame rate | modify the clip (see `MCP_USAGE.md`) |
| Inspect the current graph | read the graph (discover layer / state / parameter names) |

## Transition kind — pick one deliberately

The single most common defect is a condition-driven transition left on Unity's default `hasExitTime`, which makes it fire up to a full clip late. **Always set `hasExitTime` explicitly.**

| Intent | `hasExitTime` | `exitTime` | conditions | Op |
| --- | --- | --- | --- | --- |
| Condition-driven — Idle→Run when `Speed > 0.1` | **false** | — | yes | `AddTransition` |
| Auto-return at clip end — Attack→Idle | **true** | ~0.9 | **none** | `AddTransition` |
| Interrupt from anywhere — →Hit, →Death | **false** | — | yes | `AddAnyStateTransition` |
| Return from a sustained state — Run→Idle | **false** | — | inverse (`Less` / `IfNot`) | `AddTransition` |

Notes:
- **A transition with no conditions and `hasExitTime: false` fires immediately and unconditionally** — the state is a pass-through. The read-back's edge-validity check surfaces this.
- Sustained states need transitions **both ways**. `Speed > 0.1` in, `Speed < 0.1` out. One direction only = a state you can enter and never leave.
- `duration` is the blend length. `hasFixedDuration: true` reads it as seconds, `false` as a fraction of the source clip. Default to seconds for predictability.
- Prefer a state-to-state transition over an Any-State one when the source is known. Any-State applies from *every* state including the destination itself — see the self-retrigger trap in `PATTERNS.md`.

## Parameter type → intent

| Type | Use for | Lifecycle |
| --- | --- | --- |
| `Trigger` | one-shot actions — attack, jump, hit, die | auto-consumed when a transition uses it; `ResetTrigger` to cancel a queued one |
| `Bool` | sustained states — isRunning, isGrounded, isAiming | persists until explicitly set false |
| `Float` | blend axes and thresholds — Speed, Health | compared with `Greater` / `Less` |
| `Int` | discrete enum-like selection — WeaponIndex | compared with `Equals` / `NotEqual` / `Greater` / `Less` |

Condition modes are typed. Trigger and Bool accept only `If` / `IfNot`; using `Greater` on a Trigger is a defect assertion 3 catches.

## Layers — one until a mask forces a second

**Default to a single layer.** Add one only when two animations must play on *different body regions simultaneously* (upper-body aim over lower-body run) or when an additive pass is genuinely needed.

A layer added through the batched animator edit arrives **unusable**: `AddLayer` accepts only `layerName`, so the new layer has `defaultWeight = 0`, no `avatarMask`, `blendingMode = Override`, an empty state machine, and no default state. It plays nothing and reports no error.

```
AddLayer (batched edit)  →  weight 0, no mask, empty FSM
                         →  AddState / SetDefaultState / AddTransition into that layer (batched edit)
                         →  weight + mask + blendingMode via an editor-side C# snippet  ← FALLBACK_RECIPES.md
                         →  read the graph back: assert defaultWeight > 0 and defaultStateName != null
```

`"Base Layer"` is layer 0's existing name — `AddLayer("Base Layer")` creates a **duplicate**, it does not target the existing one.

## Asset conventions

| Asset | Path | Prefix |
| --- | --- | --- |
| AnimatorController | `Assets/.../Animation/AnimatorControllers/` | `C_` |
| AnimationClip | `Assets/.../Animation/AnimationClips/` | `A_` |
| AvatarMask | alongside the controller | (no kit prefix) |

Full layout in `skill://aku-asset-conventions/PROJECT_LAYOUT.md`; prefix table in `skill://aku-asset-conventions/ASSET_PREFIXES.md`.

## Saving

The batched animator edit self-saves the controller — `SetDirty` + `SaveAssets` + a synchronous `Refresh` — so there is no separate save step for the controller. A scene or prefab you wired the component on still needs its own save.
