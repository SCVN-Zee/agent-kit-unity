# Patterns — the 8 ways an Animator Controller silently fails

Each entry is **symptom → cause → fix**. Symptoms come first because that is how they arrive: "the animation doesn't play", not "my transition lacks a condition".

> **Bind each capability below to the Unity MCP tools already in your in-context tool list** — match the capability (batch animator edits, read the graph, patch a component, run an editor-side C# snippet), not a hardcoded name. If none matches, do it in the Editor rather than editing the `.controller` / `.anim` file directly.

## 1. Nothing plays but the default state

**Symptom.** States exist in the controller. Only the default one ever runs. Code "fixes" it with `animator.Play("Attack")`.

**Cause.** Creating a controller produces an **empty** one and `AddState` adds a node, not an edge. A state with no incoming transition is unreachable — the graph has no path to it.

**Fix.** Add the transition. Follow the build order in `DECISION_TREE.md`. Verify assertion 1 (reachability).

`Play()` is not a workaround for this — it desyncs the state machine from its parameters, so the *next* parameter-driven transition fires from a state the graph didn't expect.

## 2. The transition fires, but late

**Symptom.** Setting the parameter works, but the animation changes up to a full clip later. Feels laggy or "stuck". Often "fixed" with a hard cut.

**Cause.** Unity defaults `hasExitTime` to **ON** (~0.75 normalized). The transition config applies `hasExitTime` **only when supplied** — omit it and the default survives. The transition waits for the source clip to reach its exit time *before* evaluating your condition.

**Fix.** `hasExitTime: false` on every condition-driven transition. Pass it explicitly even when you think the default is fine — the default is not neutral.

## 3. A one-shot loops, or a sustained state flickers

**Symptom.** Attack repeats forever. Or Run stutters in and out of Idle every few frames.

**Cause.** Parameter type mismatched to intent. A `Bool` set true for an attack is never cleared, so the transition re-fires. A `Trigger` used for sustained movement is consumed on the first transition, so the state immediately falls back.

**Fix.** Trigger = one-shot (auto-consumed). Bool = sustained (persists until cleared). Float = blend axis. Table in `DECISION_TREE.md`. Runtime discipline in `skill://aku-code-conventions/ANIMATOR_DRIVING.md`.

## 4. A batch "succeeded" but the graph is half-wired

**Symptom.** The batched animator edit returned success. Some states have transitions, others don't. No error was raised.

**Cause.** **Per-modification errors are accumulated in the response's `errors[]` array instead of aborting the batch.** Batching guarantees *ordering*, not *atomicity*. The most common trigger: a condition naming a parameter that doesn't exist yet, because `AddTransition` was ordered before `AddParameter`.

**Fix.** Order the array `AddParameter` → `AddState` → `SetDefaultState` → `AddTransition` (parameters before transitions). Read `errors[]` and read the graph back to see what landed.

## 5. An Any-State transition restarts its own state every frame

**Symptom.** Attack plays for one frame, forever. The clip never advances.

**Cause.** `AddAnyStateTransition` includes the destination state itself in "any state", and `canTransitionToSelf` defaults to **true**. While the trigger is set, Attack transitions to Attack, restarting the clip each evaluation.

**Fix.** Set `canTransitionToSelf = false` — **not settable via the batched edit**, use the recipe in [`FALLBACK_RECIPES.md`](FALLBACK_RECIPES.md). Or prefer an explicit state-to-state transition when the source is known.

## 6. A new layer plays nothing

**Symptom.** Layer added, states added to it, clips assigned. Silence. No error anywhere.

**Cause.** `AddLayer` accepts **only** `layerName` — the entire implementation is `controller.AddLayer(mod.layerName)`. The resulting layer has `defaultWeight = 0`, no `avatarMask`, `blendingMode = Override`, an empty state machine, and no default state. Weight 0 contributes nothing to the final pose.

**Fix.** Add states and a default state through the batched edit, then set weight + mask + blending via [`FALLBACK_RECIPES.md`](FALLBACK_RECIPES.md). Verify assertion 4. Prefer a single layer unless two regions must animate simultaneously.

**Related:** `"Base Layer"` is layer 0's existing name. `AddLayer("Base Layer")` creates a **second** layer with that name — it does not target the existing one.

## 7. The controller asset exists but nothing animates in play mode

**Symptom.** The `.controller` looks correct when you read the graph. The object doesn't move.

**Cause.** Creating the asset does not attach it. `Animator.runtimeAnimatorController` is still null (or points at an older controller).

**Fix.** Patch the Animator component → `runtimeAnimatorController`. On a prefab do it inside the prefab stage (`skill://aku-prefab`); on a scene object follow with a scene save (`skill://aku-scene`).

## 8. Transitions skip, or blend from a stale pose

**Symptom.** A transition is ignored under load, or a state starts from the previous state's pose on unrelated properties.

**Cause.** `writeDefaultValues` (WriteDefaults) is inconsistent across states. Mixed WD in one controller is the classic source of skipped transitions and pose bleed.

**Fix.** Make WD uniform — `false` across the controller is the common recommendation, and is **required** on Luna playable targets (`skill://aku-code-review-luna`). **Not settable via the batched edit** — recipe in [`FALLBACK_RECIPES.md`](FALLBACK_RECIPES.md).

## Capability gaps

The batched animator edit covers 12 ops. These are outside it:

| Gap | Readable when you read the graph? | Reachable? |
| --- | --- | --- |
| Layer `defaultWeight`, `avatarMask`, `blendingMode`, `syncedLayerIndex`, `iKPass` | yes (except mask) | [`FALLBACK_RECIPES.md`](FALLBACK_RECIPES.md) |
| `canTransitionToSelf` | yes | [`FALLBACK_RECIPES.md`](FALLBACK_RECIPES.md) |
| `writeDefaultValues` | yes | [`FALLBACK_RECIPES.md`](FALLBACK_RECIPES.md) |
| `interruptionSource` / `orderedInterruption` | no | [`FALLBACK_RECIPES.md`](FALLBACK_RECIPES.md) |
| Editing an existing transition in place | — | no — `RemoveTransition` → `AddTransition` |
| **BlendTree** (1D/2D) | motion name only | **no recipe** — an editor-side C# snippet against `UnityEditor.Animations.BlendTree` is possible but unsupported here; ask the user |
| **Sub-state machines** | names only | **no recipe** — same |
| Entry / Exit node transitions | no | **no recipe** — same |
| `StateMachineBehaviour` | no | **no recipe** — same |

The last four are deliberately out of scope: they need a design conversation, not a snippet. Surface the gap and ask rather than improvising.

## Anti-patterns

- ❌ Reaching for `Animator.Play` / `CrossFade` when a transition is missing — fix the graph.
- ❌ Treating a batched-edit success as proof the graph is complete; read `errors[]` and the graph back.
- ❌ Omitting `hasExitTime` and assuming the default is off.
- ❌ Adding a layer without setting its weight.
- ❌ `AddAnyStateTransition` on a Trigger without clearing `canTransitionToSelf`.
- ❌ Mixed `writeDefaultValues` across one controller.
