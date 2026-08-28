---
description: "Use when—and only when—a request asks for Unity asset or hierarchy naming, importing, folder organization, importer intent, config asset names, or texture suffixes. Do not load for scene, prefab, Animator, material, or other serialized mutation unless naming or organization is requested; use focused skills or the connected Unity MCP."
globs: ["**/Assets/**", "**/*.prefab", "**/*.unity", "**/*.asset", "**/*.mat"]
---

# Unity Asset Convention Rules

Asset folder layout + file-name prefixes for Unity. Layered on the sticky `rule://aku-engine-rules` (engine baseline). Full detail in the **`skill://aku-asset-conventions`** skill (`PROJECT_LAYOUT.md`, `ASSET_PREFIXES.md`).

## Folder layout

1. Split by asset type — `Sprites/`, `Textures/`, `Materials/`, `Shaders/`, `Audio/SFX|BGM/`, `Animation/AnimationClips|AnimatorControllers/`, `Prefabs/`, `Scenes/`, `Scripts/`, `Configs/`. Avoid mixed-content `Art/` umbrellas — separation enables atlasing and importer correctness.

## Asset prefixes (Epic-aligned, industry-standard)

1. **Prefixes** by asset type: `SC_` scene · `M_` material · `S_` shader · `A_` animation clip · `C_` animator controller · `SFX_` / `BGM_` audio · `T_` texture map · `SP_` sprite · `SS_` sprite sheet (multi-sprite Texture2D).
2. **Texture map suffixes** (for `T_*` files): `_BC` base color · `_N` normal · `_M` mask · `_R` roughness · `_MT` metallic · `_AO` ambient occlusion · `_E` emissive · `_ORM` packed occlusion/roughness/metallic · `_H` height · `_OP` opacity. Append `_Atlas` after the map suffix for texture-atlas layouts (for example, `T_Environment_BC_Atlas`).
3. **Importer alignment**: `T_*` → Texture Type = Default, including `T_*_<Map>_Atlas` material atlases. `SP_*` / `SS_*` → Texture Type = Sprite (2D/UI). A Unity `.spriteatlas` asset is distinct from a texture atlas. Prefix mismatch → wrong importer setting → bug. Full table in `skill://aku-asset-conventions/ASSET_PREFIXES.md`.
4. **ScriptableObject configs**: place in `Configs/`. Class name uses `Config` suffix (`LevelConfig`, `WeaponConfig`). Asset file prefix describes *what is configured* — do NOT repeat "Config" (the folder already says it): `LVL_Stage1.asset`, `WPN_Sword.asset`, `Tune_Combat.asset`. Pick stable prefixes per config family.

## Hierarchy / GameObject name prefixes (scenes + prefabs)

1. UI/VFX **GameObjects** take a type prefix on their *object name* (PascalCase after the `_`): `Canvas_` Canvas · `IMG_` image (Image/RawImage) · `TXT_` text (Text/TextMeshProUGUI) · `BTN_` button · `VFX_` VFX/particle object. Examples: `Canvas_HUD`, `IMG_Background`, `TXT_Score`, `BTN_Play`, `VFX_Confetti`.
2. Applies inside **scene AND prefab** hierarchies (incl. nested children) — a prefab is just a saved hierarchy. Prefixes the GameObject name, **not** the containing asset file (prefab file unprefixed; scene file keeps its own `SC_` prefix) and not the sprite/material asset (still `SP_`/`M_`). Full table in `skill://aku-asset-conventions/HIERARCHY_NAMING.md`.

## Cross-references

- `skill://aku-asset-conventions/PROJECT_LAYOUT.md` — sample project tree (Supercent playable-ad reference)
- `skill://aku-asset-conventions/ASSET_PREFIXES.md` — full prefix + texture suffix table
- `skill://aku-asset-conventions/HIERARCHY_NAMING.md` — UI/VFX hierarchy GameObject name prefixes (scenes + prefabs)
- `skill://aku-code-conventions` — authoritative Unity C# coding conventions
- `rule://aku-sc-rules` — Supercent playable-ad layout (Supercent projects only)
