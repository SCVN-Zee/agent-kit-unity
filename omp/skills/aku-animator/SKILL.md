---
name: aku-animator
description: "Use when creating, editing, debugging, or reviewing Unity AnimatorControllers or AnimationClips: states, parameters, transitions, layers, masks, and playback wiring. Prefer parameter-driven transitions and route all .controller/.anim mutations through the connected Unity MCP, never direct file edits."
---

# aku-animator — Animator Controllers & Animation Clips

Animator Controller / AnimationClip work through the connected Unity MCP's animator capabilities.

> **Bind each capability in this skill to the Unity MCP tools already in your in-context tool list** — match the capability (create a controller, batch animator edits, read the graph, patch a component, run an editor-side C# snippet), not a hardcoded name; do not call a tool-introspection command to "discover" them. If no tool matches, do it in the Editor or via a committed-state `git` op rather than editing the `.controller` / `.anim` file directly.

**Channel.** Capabilities below are transport-neutral. Resolve the transport per `rule://aku-mcp-policy`'s ladder + table: the Unity CLI (Pipeline) where the table marks the family CLI and detection passes; else the connected Unity MCP; else the Editor or a committed-state `git` op; if no channel is available, pause. On a CLI-resolved channel, the Roslyn fallback recipes in `FALLBACK_RECIPES.md` map to the Pipeline `eval` / `eval_file` commands (editor- and runtime-side) — verify spellings via `unity list` at use.

**CLI recipes (Pipeline; `unity command` + args `--param value` using schema names).** Reads (proven-run 2026-08-30: `get_animation_clip --clip <assetPath>` returns bindings + curve metadata; error-path verified: a bad ref fails with a parameter-validation message): `get_animator_controller --controller <assetPath>` (verify-at-use). Writes (surface-verified; verify via `unity command` listing at use): `create_animator_controller`, `create_animation_clip`, `add_animator_layer`, `add_animator_parameter`, `add_animator_state`, `add_animator_transition` — one call per op, same ordering discipline as the batched MCP edit (parameters before states before transitions). Component wiring stays scene-side (`skill://aku-scene` recipes).

**The intelligence here is build order and edge wiring, not any single tool call.** Creating a controller produces an **empty** one. States without transitions are unreachable, so an agent that stops after `AddState` finds nothing plays — and reaches for `animator.Play("Attack")` to force it. That call is the *symptom*; the missing transition is the *defect*. This skill exists to make the graph correct so nothing needs forcing.

Sub-files:

| File | Purpose |
| --- | --- |
| [`DECISION_TREE.md`](DECISION_TREE.md) | **Load-bearing.** The canonical build order, the transition-kind decision, and the one-layer-first rule. |
| [`MCP_USAGE.md`](MCP_USAGE.md) | Capability inventory — all 12 batched-edit ops with required params, condition modes, the animator-data read-back payload shape, clip ops. |
| [`PATTERNS.md`](PATTERNS.md) | The 8 silent-failure modes as symptom → cause → fix, plus the capability-gap table. |
| [`FALLBACK_RECIPES.md`](FALLBACK_RECIPES.md) | Editor-side C# snippet recipes for what the batched edit can't set: layer weight/mask/blending, `canTransitionToSelf`, `writeDefaultValues`, interruption. |
| [`examples/locomotion-attack-controller.md`](examples/locomotion-attack-controller.md) | Idle↔Run↔Attack end to end — one batched payload, component wiring, passing **and** failing read-backs. |
| [`examples/upper-body-layer.md`](examples/upper-body-layer.md) | Masked upper-body layer — why the MCP-only path silently plays nothing, and the fix. |

## When to load

- Creating an AnimatorController, or adding states / parameters / transitions to one.
- "The animation doesn't play", "it plays but at the wrong time", "it plays late", "it restarts every frame".
- Setting up a second layer (upper-body, additive, masked).
- Any C# that calls `Animator.Play` / `CrossFade` — check whether a parameter should drive it instead.
- A blocked `Edit`/`Write` on a `.controller` or `.anim` file redirected you here.

## The read-back

The batched animator edit does not abort on error — per-modification failures are accumulated in the response's `errors[]` array and the batch reports success anyway. Read `response.errors[]`, then read the animator graph back to see what actually landed. The one read-back payload carries everything the graph needs:

1. **Reachability** — every non-default state has ≥1 incoming transition (state-to-state or any-state). No orphans.
2. **Edge validity** — every transition has ≥1 condition **OR** `hasExitTime: true`. Neither → it fires instantly and unconditionally.
3. **Condition typing** — every condition's `parameter` exists in `parameters[]`, with a compatible mode: Trigger/Bool → `If`/`IfNot`; Float → `Greater`/`Less`; Int → `Equals`/`NotEqual`/`Greater`/`Less`.
4. **Layer viability** — every layer has `defaultWeight > 0` and a non-null `defaultStateName`. Weight 0 plays nothing.
5. **Component wiring** — the target Animator's `runtimeAnimatorController` resolves to the controller just authored (read the GameObject's Animator component data).

## Critical rules (cheat sheet)

1. **Parameters before transitions.** A condition referencing a parameter that doesn't exist yet fails, landing in `errors[]`. Order within one batched animator edit: `AddParameter` → `AddState` → `SetDefaultState` → `AddTransition`.
2. **Batch it.** The batched animator edit takes an **array**; one call keeps ordering correct and saves tokens. It does not give atomicity — the `errors[]` array reports per-modification failures.
3. **Set `hasExitTime` explicitly, every time.** Unity's default is ON (~0.75), so a condition-driven transition you don't configure waits most of a clip before firing. Condition-driven → `hasExitTime: false`. Auto-return at clip end (Attack→Idle) → `hasExitTime: true` **and no conditions**.
4. **Match parameter type to intent.** Trigger = one-shot (attack, jump, hit) — auto-consumed. Bool = sustained (isRunning, isGrounded) — persists until cleared. Float = blend axis (Speed). Swapping them loops one-shots or flickers sustained states.
5. **Wire the component.** Creating the `.controller` asset does not attach it. Set `runtimeAnimatorController` on the Animator by patching the component, or nothing runs.
6. **One layer until a mask forces a second.** A layer added via MCP arrives at **weight 0 with no mask and an empty state machine** — it plays nothing. See `PATTERNS.md` before adding one.
7. **A gameplay state needs entry and required exit edges.** Adding the node alone is incomplete. Runtime C# drives the parameter through a cached hash; it does not force the state.

## Anti-Rationalization

| Thought | Reality |
| --- | --- |
| "I'll just `animator.Play("Attack")` — it works" | Your graph has no edge to Attack. `Play` bypasses the authored transition's conditions, timing, and interruption rules, and desyncs the state machine from its parameters. Add the transition. |
| "The transition is there, it's just slow — I'll force it" | `hasExitTime` is ON by default. Set it to `false` on condition-driven transitions. Rule 3. |
| "The batched edit returned success, so the graph is wired" | It accumulates per-modification errors in `errors[]` and reports success regardless. Read the graph back to see what landed. |
| "I added the layer, so the animation will play on it" | New layers arrive at weight 0. Rule 6. |
| "I'll add the transitions first, then the parameters" | Conditions can't reference parameters that don't exist yet. Rule 1. |
| "A Bool works fine for the attack" | A Bool you never clear re-enters Attack forever. Trigger auto-consumes. Rule 4. |

## Cross-references

- `rule://aku-mcp-policy` — serialized-asset safety and direct domain routing; `.controller` / `.anim` mutations use the connected Unity MCP rather than direct edits.
- `skill://aku-asset-conventions` — `C_*.controller` / `A_*.anim` prefixes and `Animation/AnimatorControllers/` layout.
- `skill://aku-scene` — wiring `runtimeAnimatorController` onto a scene object or prefab instance.
