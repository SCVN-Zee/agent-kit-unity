---
name: aku-scene
description: "Use when working with Unity scenes, hierarchy objects, GameObjects, components, transforms, cameras, Cinemachine 2/3, scene open/save, or prefab instances and overrides. Detect prefab context before mutation. For a named prefab asset, prefab stage, creation, or variant, use skill://aku-prefab; never hand-edit serialized scene/prefab data."
---

# aku-scene — Scenes, Hierarchy & Prefab Instances

Scene / hierarchy / component / prefab-**instance** work via the connected Unity MCP. The intelligence is in **detecting prefab context before a mutation** and **choosing where the change lands** (scene-override vs apply-to-source vs nested-child) — not in any single tool call. Editing a prefab **asset** itself → `skill://aku-prefab`.

> **Binding instruction.** Bind each capability below to the Unity MCP tools already surfaced in your in-context tool list — match the capability, not a hardcoded name. If none matches, do it in the Editor or via a committed-state `git` op.

**Channel.** Capabilities below are transport-neutral. Resolve the transport per `rule://aku-mcp-policy`'s ladder + table: the Unity CLI (Pipeline) where the table marks the family CLI and detection passes; else the connected Unity MCP; else the Editor or a committed-state `git` op; if no channel is available, pause.

**CLI recipes (Pipeline; `unity command` + args `--param value` using schema names).** Reads (proven-run 2026-08-30): `get_scene_hierarchy` (active-scene tree, per-node `instanceId`/`hierarchyPath`), `list_open_scenes`, `find_assets --type <Type> --name <substr>` (returns `assetPath`/`guid`/`globalId`), `find_gameobjects`, `get_component_properties`, `console --tail <n>`. Writes (surface-verified; verify via `unity command` listing at use): `open_scene` / `save_scene` / `save_all` / `set_active_scene` / `create_scene`; `create_gameobject` / `delete_gameobject` (Undo-reversible) / `rename_gameobject`; `add_component` / `set_component_properties` / `remove_component`; `set_selection` / `get_selection`; C# escape hatch `eval` (Roslyn, editor-side).

Sub-files:

| File | Purpose |
| --- | --- |
| [`DECISION_TREE.md`](DECISION_TREE.md) | **Load-bearing.** detect → classify → map-intent → act; the 3 propagation tiers + ASK conditions + the coarse-apply audit. |
| [`MCP_USAGE.md`](MCP_USAGE.md) | The ordered capability sequences per operation + a one-line "when". |
| [`PATTERNS.md`](PATTERNS.md) | Scene mgmt, hierarchy ops (the reparent capability), detect-before-edit, the coarse-apply trap, nested-prefab gotchas, the reflection / editor-snippet scalpel policy. |
| [`CINEMACHINE.md`](CINEMACHINE.md) | Cinemachine 2/3 vocabulary and core-capability recipes, including CM2 hidden pipeline components and CM3 sibling components. |
| [`examples/scene-override-vs-apply.md`](examples/scene-override-vs-apply.md) | One prefab instance, branched across all 3 tiers + the ASK case. |
| [`examples/nested-prefab-apply.md`](examples/nested-prefab-apply.md) | The gated reflection recipe for applying to a specific nested child prefab. |

## When to load

- Adding / deleting / renaming / duplicating / **reparenting** GameObjects.
- Editing a component or transform on an object that may be a prefab instance.
- Applying or reverting prefab overrides — *especially* when "the prefab" vs "just this one" is unstated.
- Reading scene hierarchy before a mutation.
- Creating or configuring cameras, Cinemachine brains, virtual cameras, targets, lenses, blends, Body/Aim/Noise stages, or extensions.

## Critical rules (cheat sheet)

1. **Classify the target.** A pre-existing GameObject may be a prefab instance; read its component data (prefab-instance slice) for a prefab connection (or call `PrefabUtility.GetPrefabInstanceStatus` by reflection) to pick a propagation tier. Objects you created earlier *this* session are plain scene objects.
2. **Route `.unity` / `.prefab` mutations through the connected Unity MCP's** scene/prefab capabilities rather than plain `Edit`/`Write`.
3. **Map intent to a tier** (full table in `DECISION_TREE.md`):
   - *scene override* ("here", "just this one") → modify the instance's GameObject/component, **no apply**, save the scene.
   - *apply to source* ("the prefab", "all of them") → mutate → coarse-apply audit → open the prefab in an isolated stage and replay the change on the source (or apply via a `PrefabUtility.ApplyPrefabInstance` reflection call).
   - *nested child prefab* ("only the Turret, not the Tank") → gated reflection call on `PrefabUtility.ApplyObjectOverride` with the inner prefab's path.
   - *ambiguous* → `AskUserQuestion` (scene-only / this prefab / nested).
4. **`PrefabUtility.ApplyPrefabInstance` is coarse** — it pushes **all** overrides on the **nearest** prefab root, not the one field you touched. Audit the override list first (read `PrefabUtility.GetObjectOverrides` by reflection); warn + offer apply-all / revert-others-first / cancel.

## Cross-references

- `rule://aku-mcp-policy` — serialized-asset safety, direct domain routing, and non-domain fallbacks.
- `skill://aku-prefab` — prefab-**asset** lifecycle (create / instantiate / variant) + prefab-stage editing. This skill keeps the prefab-**instance** apply-tier decision.
- `skill://aku-asset-conventions` — asset paths + naming (`SC_` scenes; prefabs unprefixed; layout per `PROJECT_LAYOUT.md`).
