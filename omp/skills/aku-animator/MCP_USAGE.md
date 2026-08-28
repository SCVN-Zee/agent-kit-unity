# Capability Usage — Animator & Animation

The animator/animation capabilities and their data model. Field names and op types below are the portable Unity animator schema (`UnityEditor.Animations.AnimatorController` / `AnimationUtility`), not one server's tool names.

> **Bind each capability here to the Unity MCP tools already in your in-context tool list** — match the capability, not a hardcoded name; do not call a tool-introspection command to "discover" them, the client already surfaces them. If a needed capability has no matching tool (the AI Animation editing set is an *extension*, not core — it may be absent), fall back to **find a method by reflection → call it by reflection** on `UnityEditor.Animations.AnimatorController` / `AnimationUtility`, or **run an editor-side C# snippet**, rather than editing the `.controller` / `.anim` file directly.

## Animator controller

| Capability | Params | When |
| --- | --- | --- |
| create a controller | `sourcePaths: string[]` — each starts `Assets/`, ends `.controller` | Create **empty** controllers. Folders are created recursively. Nothing is wired — pair with the batched edit. |
| read animator data | `animatorRef` — asset ref (`Assets/…​.controller`) | Read the whole graph — layers, states, parameters, transitions, conditions. Also the read-back after a batched edit shows what actually landed. |
| batch animator edits | `animatorRef`, `modifications: AnimatorModification[]` | Apply an ordered batch. See the op table below. |

### The batched edit — all 12 ops

Field names below are the `AnimatorModification` schema. Params not listed for an op are ignored by it.

| `type` | Required | Optional |
| --- | --- | --- |
| `AddParameter` | `parameterName`, `parameterType` (`Float`\|`Int`\|`Bool`\|`Trigger`) | `defaultFloat`, `defaultInt`, `defaultBool` |
| `RemoveParameter` | `parameterName` | — |
| `AddLayer` | `layerName` | — (weight / mask / blending **not settable** — see `PATTERNS.md`) |
| `RemoveLayer` | `layerName` | — |
| `AddState` | `layerName`, `stateName` | `motionAssetPath` (assigns the clip inline) |
| `RemoveState` | `layerName`, `stateName` | — |
| `SetDefaultState` | `layerName`, `stateName` | — |
| `AddTransition` | `layerName`, `sourceStateName`, `destinationStateName` | `conditions[]`, `hasExitTime`, `exitTime`, `duration`, `hasFixedDuration` |
| `RemoveTransition` | `layerName`, `sourceStateName`, `destinationStateName` | — |
| `AddAnyStateTransition` | `layerName`, `destinationStateName` | `conditions[]`, `hasExitTime`, `exitTime`, `duration`, `hasFixedDuration` |
| `SetStateMotion` | `layerName`, `stateName`, `motionAssetPath` | — |
| `SetStateSpeed` | `layerName`, `stateName`, `speed` | — |

`conditions[]` entries: `{ parameter, mode, threshold }`.

**Condition modes** — `If`, `IfNot`, `Greater`, `Less`, `Equals`, `NotEqual`. An unrecognized mode throws. Type pairing: Trigger/Bool → `If`/`IfNot`; Float → `Greater`/`Less`; Int → `Equals`/`NotEqual`/`Greater`/`Less`.

**Transition defaults matter.** `hasExitTime`, `exitTime`, `duration`, `hasFixedDuration` are applied **only when supplied** — omit one and Unity's own default survives. Unity defaults `hasExitTime` to ON, so a condition-driven transition you don't configure fires up to a full clip late. Always pass it.

### Batch semantics — read this before trusting a result

- The modifications are applied **in array order**, so parameters can be added and referenced by conditions in the same call (parameters before transitions).
- **Per-modification errors are accumulated in the response's `errors[]` array instead of aborting the batch.** The call reports success with a half-applied graph; the `errors[]` array and the graph read-back are what show what landed.
- `RemoveTransition` matches on destination-state name — with two transitions to the same destination it removes the first match. Reading animator data first disambiguates.
- There is no edit-in-place for a transition: `RemoveTransition` → `AddTransition`.

### The animator-data read-back payload

```
name
parameters[]        { name, type, defaultFloat, defaultInt, defaultBool }
layers[]            { name, defaultWeight, blendingMode, syncedLayerIndex, iKPass,
                      defaultStateName, subStateMachines[], 
                      states[]              { name, tag, speed, motionName, writeDefaultValues,
                                              speedParameter*, cycleOffset*, mirror*,
                                              transitions[] { destinationStateName, hasExitTime,
                                                              exitTime, hasFixedDuration, duration,
                                                              offset, canTransitionToSelf,
                                                              conditions[] { parameter, mode, threshold } } },
                      anyStateTransitions[] { …same transition shape… } }
```

Everything the graph checks need is in this one payload — reachability from `transitions[]` + `anyStateTransitions[]`, edge validity from `conditions[]` + `hasExitTime`, typing from `parameters[]`, layer viability from `defaultWeight` + `defaultStateName`. Component wiring is separate and reads the target GameObject's Animator component data.

Note `canTransitionToSelf` and `writeDefaultValues` are **readable here but not settable** via the batched edit — see `FALLBACK_RECIPES.md`.

## Animation clips

| Capability | Params | When |
| --- | --- | --- |
| create a clip | `sourcePaths: string[]` — each starts `Assets/`, ends `.anim` | Create empty clips. |
| read clip data | `animRef` | Inspect curves, events, frame rate, wrap mode. |
| modify a clip | `animRef`, `modifications: AnimationModification[]` | Batch clip edits. |

Clip modification op types: `SetCurve`, `RemoveCurve`, `ClearCurves`, `SetFrameRate`, `SetWrapMode`, `SetLegacy`, `AddEvent`, `ClearEvents`.

## Wiring the component

Creating the controller asset does **not** attach it to anything.

| Capability | Params | When |
| --- | --- | --- |
| read component data | GO ref, component ref | Confirm an Animator exists and read `runtimeAnimatorController`. |
| add a component | GO ref, component type | Add the Animator if missing. |
| patch the component | GO ref, component ref, `diff` / `pathPatches` / `jsonPatch` | Set `runtimeAnimatorController` to the `.controller` asset. |

On a prefab, do this inside the prefab stage (`skill://aku-prefab`); on a scene object, follow with a scene save (`skill://aku-scene`).

## Saving

The batched animator edit marks the controller dirty, saves it, and forces a synchronous refresh **itself** — no separate save call for the controller asset. A scene or prefab whose component you wired still needs its own save.

## Editor-side C# snippet return rule (Roslyn)

Used by `FALLBACK_RECIPES.md` for what the batched edit cannot reach. The snippet body must compile and **end with `return <expr>;`** — a body of only `Debug.Log(...)` fails to compile. Unity / UnityEditor / System namespaces are already in scope; don't re-add those `using` directives.

## Anti-patterns

- ❌ Omitting `hasExitTime` on a condition-driven transition.
- ❌ `AddTransition` before the parameters its conditions name exist.
- ❌ `AddLayer` and assuming it plays — weight 0.
- ❌ `AddLayer("Base Layer")` — duplicates layer 0 rather than targeting it.
