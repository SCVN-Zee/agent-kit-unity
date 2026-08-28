---
name: aku-asset-conventions
description: "Use when—and only when—a request asks for Unity asset or hierarchy naming, importing, folder layout, importer intent, config names, or texture suffixes. Owns conventions, not mutation: do not load for scene, prefab, Animator, material, or other serialized operations unless naming or organization is requested; use focused skills or the connected Unity MCP."
---

# aku-asset-conventions — Unity Asset Conventions

Sub-files:

| File | Purpose |
| --- | --- |
| [`PROJECT_LAYOUT.md`](PROJECT_LAYOUT.md) | Unity content tree with the Supercent playable-ad reference and adaptation guidance for other projects. |
| [`ASSET_PREFIXES.md`](ASSET_PREFIXES.md) | Asset prefix table, texture map suffixes, importer alignment, config asset naming, rationale, and edge cases. |
| [`HIERARCHY_NAMING.md`](HIERARCHY_NAMING.md) | UI/VFX GameObject prefixes inside scene and prefab hierarchies. |

C# identifiers, class structure, serialized fields, reference wiring, and runtime Animator code belong to `skill://aku-code-conventions`.

## When to load

- Naming a scene, sprite, texture, material, shader, animation, controller, audio clip, or config asset.
- Choosing folders for Unity content or laying out a new playable variant.
- Selecting texture/sprite importer intent from an asset's semantic role.
- Naming UI or VFX GameObjects inside a scene or prefab hierarchy.
- Reviewing Unity content organization or asset-name compliance.

This skill defines policy only. Use `skill://aku-scene` for scene and instance changes, `skill://aku-prefab` for prefab assets, `skill://aku-animator` for controllers and clips, and a matching capability from the connected Unity MCP for other Editor operations.

## Critical rules (cheat sheet)

1. **Split content by asset type.** Use `Sprites/`, `Textures/`, `Materials/`, `Shaders/`, `Audio/SFX|BGM/`, `Animation/AnimationClips|AnimatorControllers/`, `Prefabs/`, `Scenes/`, `Scripts/`, and `Configs/`. Do not use a mixed `Art/` umbrella.
2. **Prefix asset filenames by semantic type.** `SC_` scene, `M_` material, `S_` shader, `A_` animation clip, `C_` controller, `SFX_`/`BGM_` audio, `T_` texture map, `SP_` sprite, `SS_` sprite sheet. Texture maps add the physical-map suffix from `ASSET_PREFIXES.md`; prefixes must agree with importer intent.
3. **Config assets describe what they configure.** Store ScriptableObjects in `Configs/`; class names end in `Config`, while asset prefixes identify the configured domain instead of repeating “Config”.
4. **Prefix UI/VFX hierarchy object names, not their containing asset.** Use `Canvas_`, `IMG_`, `TXT_`, `BTN_`, and `VFX_` in scene and prefab hierarchies. Scene files retain `SC_`; prefab files remain unprefixed.

## Workflow position

```text
rule://aku-asset-convention-rules (compact automatic policy)
  → skill://aku-asset-conventions (full naming and organization rules)
  → matching connected Unity MCP capability (other operations)
  → skill://aku-scene | skill://aku-prefab | skill://aku-animator (asset-specific operations)
```

## Cross-references

- `skill://aku-code-conventions` — Unity C# naming, structure, fields, and reference wiring
- `rule://aku-asset-convention-rules` — compact asset convention rulebook
- `rule://aku-sc-rules` — Supercent-specific playable layout overlay
- `skill://aku-scene` — scene and prefab-instance operations
- `skill://aku-prefab` — prefab-asset operations
- `skill://aku-animator` — AnimatorController and clip operations
