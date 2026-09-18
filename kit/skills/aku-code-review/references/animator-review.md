# Surface — Animator Graph & Driving Code (read-only)

An Animator bug usually splits across two artifacts: C# that forces a state, and a controller graph with no usable edge. Reviewing either alone misses the cause. `Animator.Play("Attack")` may hide the missing transition, but it does not make normal gameplay wiring correct. This surface reads both.

**Read-only.** Report; never mutate. Fixes belong in a separate implementation pass.

## Capabilities (all read-only)

| Capability | Use |
| --- | --- |
| Find assets | Locate `.controller` assets by name/type/folder. |
| Read animator data | The whole graph — parameters, layers, states, transitions, conditions. One read covers every finding below. |
| Read component data | Read `runtimeAnimatorController` on an Animator; confirm it is assigned. |
| Find a GameObject | Locate the animated object referenced by the diff. |
| Read animation-clip data | Clip curves / events / wrap mode, when the diff touches a clip. |

Bind each capability to the Unity MCP tools already surfaced in your in-context tool list — match the capability, not a hardcoded name. If none matches, read via the Editor. Never hand-edit a serialized asset file.

The animator/animation read capabilities ship with an animation MCP extension. If none is surfaced, note `animator-review: skipped (extension not installed)` rather than guessing — do not infer graph shape from C# call sites.

## When to run

When the change:

- calls `Animator.Play`, `CrossFade`, `SetTrigger`, `SetBool`, `SetFloat`, `SetInteger`, `ResetTrigger`, or `SetLayerWeight`
- adds or edits a `.controller` / `.anim` asset
- adds an Animator component or a serialized `Animator` field

## Findings

| # | Finding | Evidence | Severity |
| --- | --- | --- | --- |
| 1 | Unjustified `Play` / `CrossFade` in normal gameplay | call site has no documented exception rationale, and the animator data shows either a conditioned path being bypassed or an unreachable target state | High |
| 2 | `runtimeAnimatorController` unassigned | reading the Animator's component data → null/None | High |
| 3 | Immediate conditionless transition violates intended flow | graph and intended behavior show an unintended skip/loop; an intentional immediate edge is valid | High when demonstrated |
| 4 | Unreachable intended state | inspect default, entry, nested state-machine and Any-State paths; no reachable path or documented direct-state exception | High when demonstrated |
| 5 | Parameter name as a string literal at a call site | grep the diff for `SetTrigger("…")` / `SetBool("…")` / `SetFloat("…")` | Medium |
| 6 | Intended visible layer remains at zero weight | no initialization/runtime blend makes it visible on the relevant path | Medium |
| 7 | Unintended self-restart | self-transition plus trigger behavior reproduces a restart contrary to intent | Medium |
| 8 | Mixed `writeDefaultValues` causes stale/reset properties | identify the affected animation property and transition path, not just differing flags | Medium |

### Finding 1 — the one that needs care

`Play`/`CrossFade` is **not** categorically wrong. Legitimate uses, per `skill://aku-code-conventions/ANIMATOR_DRIVING.md`:

- restarting the **same** state deliberately (re-trigger a hit reaction already playing)
- editor tooling, preview, or cutscene scrubbing
- a state genuinely outside the parameter graph

When a conditioned transition exists, report the direct-state call as a bypass. When no reachable graph path exists and normal gameplay requires one, report finding 4 as the root defect.
Check documented direct-state exceptions before treating absence of a transition as a bug. Recommend adding the correctly typed
parameter plus entry/required-exit edges, then driving its cached hash. Do not describe forced playback as correct normal
gameplay merely because it currently makes the clip visible.

### Finding 5 — scope

Hash caching is already covered by `checklist-serialization-wiring.md` (magic strings → `Animator.StringToHash`). Don't duplicate the row; cite it. Raise it here only when the literal sits in a per-frame path, where it compounds with the perf lens.

## Reporting & handoff

- Standard finding format, plus the controller asset path and layer/state names.
- Tag lens `animator`.
- **Graph and C# fixes** belong in a separate implementation pass. Never fix either here.
- Editor not open (a health probe fails) → report `animator-review: skipped (no live Editor)`; finding 5 remains checkable from the diff alone. Direct-state calls may be noted as unverified until the graph is inspected.

## Suppress

- `Play`/`CrossFade` matching a documented exception above, with a nearby reason normal transitions are unsuitable and controller-backed full-path IDs where serialized — verify the rationale before suppressing.
- `defaultWeight: 0` on a layer the code deliberately blends in at runtime via `SetLayerWeight` (check for the call before suppressing).
- Conditionless `hasExitTime: true` transitions — that is the correct auto-return shape, not a defect.
- Controllers untouched by the change, unless the diff's C# drives them.
