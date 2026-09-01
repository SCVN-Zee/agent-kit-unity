---
name: aku-prefab
description: "Use when the target is a named Unity prefab asset: open or edit it in the prefab stage, create or instantiate a prefab, unpack it, or build a variant through the connected Unity MCP. For a scene object or prefab-instance override/apply decision, use skill://aku-scene; never hand-edit .prefab data."
---

# aku-prefab — Prefab as an Asset

Prefab **asset** work through the connected Unity MCP. Bind each capability to the Unity MCP tools already surfaced in your in-context tool list — match the capability, not a hardcoded name; if none matches, do it in the Editor or via a committed-state `git` op. For when you already know the target is a specific `.prefab` **asset** and want to act on the asset itself — *not* when editing a scene object whose prefab status is unknown.

**Channel.** Capabilities below are transport-neutral. Resolve the transport per `rule://aku-mcp-policy`'s ladder + table: the Unity CLI (Pipeline) where the table marks the family CLI and detection passes; else the connected Unity MCP; else the Editor or a committed-state `git` op; if no channel is available, pause.

**CLI recipes (Pipeline; `unity command` + args `--param value` using schema names).** Discovery (proven-run 2026-08-30): `find_assets --type GameObject --name <substr>` locates prefab assets (`assetPath`/`guid`/`globalId`). Lifecycle writes (surface-verified; verify via `unity command` listing at use): `create_prefab`, `instantiate_prefab`, `create_prefab_variant`, `apply_prefab_overrides`, `revert_prefab_overrides`, `save_prefab_contents` (prefab-stage save), `delete_asset --confirm true` (destructive-gated). After any stage edit, verify propagation with `get_scene_hierarchy` (`skill://aku-scene` owns the instance-tier decision).

## Scope gate (read first)

Use `skill://aku-prefab` only when **the target is a named prefab asset** (`@Assets/.../X.prefab`). Then no scene-instance detection is needed — act on the asset directly via the prefab stage.

**Hand to `skill://aku-scene` instead when:**

- Editing a scene object that **might** be a prefab instance (needs detect → classify first).
- You changed a prefab **instance** in a scene and must decide **scene-override vs apply-to-source vs nested-child** — `skill://aku-scene` owns the apply-override tiers + the coarse-apply audit.
- "the prefab" is implied by an *instance* edit, not a named asset.

⚠️ Asset-mode editing (via prefab stage) changes the **source** → **every** instance inherits. If the user wants the change in one scene only, that is a `skill://aku-scene` Tier-1 override, not this skill.

Sub-files:

| File | Purpose |
|---|---|
| [`DECISION_TREE.md`](DECISION_TREE.md) | **Load-bearing.** which asset op → which capability; the hand-back-to-`skill://aku-scene` conditions. |
| [`VARIANT_STRATEGY.md`](VARIANT_STRATEGY.md) | **Load-bearing at creation time.** base-vs-variant-vs-flat decision *before* creating prefab(s): the 3 cases, ask-when-unsure triggers, trade-offs. |
| [`MCP_USAGE.md`](MCP_USAGE.md) | Capability inventory (asset-lifecycle + prefab-stage workflow) as ordered sequences with a one-line "when". |
| [`PATTERNS.md`](PATTERNS.md) | The prefab-stage asset-mode editing recipe, variant creation via reflection, and the editor-side C# snippet scalpel policy. |
| [`examples/asset-mode-edit.md`](examples/asset-mode-edit.md) | Open `Player.prefab` in the stage, edit it, save, close, verify. |
| [`examples/variant-create.md`](examples/variant-create.md) | Create a variant of an existing prefab. |

## When to load

- "Edit `X.prefab`" / "change the prefab asset itself" / `@…/X.prefab`.
- Creating one or more prefabs — decide base+variants vs flat *before* creating (`VARIANT_STRATEGY.md`).
- Create a prefab asset from a scene GameObject.
- Instantiate a prefab into a scene.
- Create a variant (reskin / minor stat tweak of a base prefab).

## Critical rules (cheat sheet)

1. **Target is a named asset → no detect ceremony.** Act on the asset; skip `skill://aku-scene`'s instance detection.
2. **Prefab-stage workflow is the asset-edit path:** open the prefab in an isolated stage → mutate the GameObject / apply targeted patches to its objects → save the prefab → close the stage (close to avoid leaking the temp edit stage).
3. **Prefer typed capabilities** (instantiate a prefab / create a prefab from a scene GameObject); reach for an editor-side C# snippet or a reflection call only when no typed capability covers the op (e.g. variant creation, unpack).
4. **Route `.prefab` mutations through the connected Unity MCP** (or the Editor / a committed-state `git` op) rather than a direct file edit.
5. **Before creating prefab(s), consider variants.** ≥2 related prefabs, or a new one like an existing prefab → run the variant-opportunity check (`VARIANT_STRATEGY.md`) *before* creating the prefab; skip only for a clearly unique one-off.

## Cross-references

- `skill://aku-scene` — scene / hierarchy / component + the prefab-**instance** apply tiers (scene-override / apply-to-source / nested-child) + the coarse-apply audit. The instance→source decision lives there, **not** here.
- `skill://aku-asset-conventions` — asset-naming prefixes + project layout (`PROJECT_LAYOUT.md`); prefabs carry no name prefix (the `.prefab` extension self-identifies).
