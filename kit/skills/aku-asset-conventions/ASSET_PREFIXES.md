# Asset Prefixes & Texture Map Suffixes

Asset files use **prefixes** to group by type. Texture maps additionally use **suffixes** to denote which physical map they carry. Apply PascalCase after the prefix underscore (e.g. `M_RainbowTrail`, `T_Block_BC`).

## 1. Asset prefix table

| Asset Type | Prefix | Example | Notes |
| --- | --- | --- | --- |
| Scene | `SC_` | `SC_Playable010.unity` | |
| Material | `M_` | `M_RainbowTrail.mat` | |
| Shader | `S_` | `S_Outline.shader` | Supercent-internal; differs from UE (UE uses `S_` for Sound). No collision since SFX uses `SFX_`. |
| AnimationClip | `A_` | `A_BlockIdle.anim` | |
| AnimatorController | `C_` | `C_Block.controller` | |
| SFX | `SFX_` | `SFX_BlockPop.wav` | One-shot sound effects. |
| BGM | `BGM_` | `BGM_1.wav` | Background music. |
| Texture (map) | `T_` + suffix | `T_BrickWall_BC.png`, `T_BrickWall_ORM.png` | Importer follows the consuming shader: Default for ordinary maps, Normal map for normals. See §2. |
| Sprite | `SP_` | `SP_PlayButton.png`, `SP_Coin.png` | `Texture Type = Sprite (2D and UI)`. House prefix for sprites. |
| Sprite Sheet | `SS_` | `SS_HeroWalkCycle.png` | Multi-sprite Texture2D (`Sprite Mode = Multiple`). Distinct from `SP_` because slicing required at import. |
| Sprite Atlas | (none) | `Coins.spriteatlas` | `.spriteatlas` extension already disambiguates. |
| ScriptableObject config | *(project-defined; see §6)* | `LVL_Stage1.asset`, `WPN_Sword.asset`, `Tune_Combat.asset` | Lives in `Configs/`. Class name uses `Config` suffix (`LevelConfig`, `WeaponConfig`). Prefix describes *what is configured* — do **not** repeat "Config" (folder already implies it). |

Prefixes apply to **asset files** under `Materials/`, `Shaders/`, `Animation/...`, `Audio/...`, `Sprites/...`, `Textures/`, `Configs/`. They do **not** apply to C# scripts.

## 2. Texture map suffix table

For `T_*` files only. Suffix denotes which physical map the texture carries.

| Suffix | Map | Channel layout |
| --- | --- | --- |
| `_BC` | Base Color / Albedo | RGB (A optional opacity) |
| `_N` | Normal | RGB (XYZ) |
| `_M` | Mask | RGBA (shader-defined) |
| `_R` | Roughness | grayscale |
| `_MT` | Metallic | grayscale |
| `_AO` | Ambient Occlusion | grayscale |
| `_E` | Emissive | RGB |
| `_ORM` | Packed | R=Occlusion, G=Roughness, B=Metallic |
| `_H` | Height / Displacement | grayscale |
| `_OP` | Opacity (when not in `_BC` alpha) | grayscale |

Channel-packing example — a brick surface with 3 maps in 1 file via `_ORM`:

```
T_BrickWall_BC.png      (Base Color, RGB)
T_BrickWall_N.png       (Normal, RGB)
T_BrickWall_ORM.png     (R=AO, G=Roughness, B=Metallic)
```

Packing can reduce samples and storage, but memory savings depend on resolution, mipmaps and platform compression. Measure imported sizes; three single-channel textures are not necessarily three times the size of one RGB texture.

Match the shader's channel contract. `_ORM` is R=AO/G=roughness/B=metallic, not a universal Unity format. URP Lit commonly reads metallic from R, occlusion from G and smoothness from A; roughness needs conversion. Use Normal map import for `_N`; scalar/packed data usually needs sRGB disabled. Color-map color space follows shader intent.

### Texture atlas descriptor

An atlas is a spatial layout, not a physical map type. Append `_Atlas` **after** the map suffix:

```
T_Environment_BC_Atlas.png
T_Environment_N_Atlas.png
T_Environment_ORM_Atlas.png
```

These remain material textures; their importer still follows map intent (including Normal map for `_N`). Do not confuse them with Unity Sprite Atlas assets such as `Environment.spriteatlas`, whose extension already identifies the asset type.

## 3. Folder ↔ prefix mapping

| Folder | Expected prefixes |
| --- | --- |
| `Sprites/Ingame/` | `SP_`, `SS_` |
| `Sprites/UI/` | `SP_`, `SS_` |
| `Textures/` | `T_*_BC`, `T_*_N`, `T_*_M`, `T_*_R`, `T_*_MT`, `T_*_AO`, `T_*_E`, `T_*_ORM`, `T_*_H`, `T_*_OP`; append `_Atlas` for atlas layouts |
| `Materials/` | `M_` |
| `Shaders/` | `S_` |
| `Animation/AnimationClips/` | `A_` |
| `Animation/AnimatorControllers/` | `C_` |
| `Audio/SFX/` | `SFX_` |
| `Audio/BGM/` | `BGM_` |
| `Scenes/` | `SC_` |
| `Configs/` | project-defined per family (`LVL_`, `WPN_`, `Tune_`, …) — see §6 |

Apply this mapping to new project-owned content. For existing assets, establish ownership and migration scope before renaming or moving; vendor, package and generated paths are not automatically house-style defects.

## 4. Why these prefixes?

- **House consistency**: these are this kit's naming conventions, not a universal Unity or cross-engine standard.
- **Importer intent**: `SP_*` indicates Sprite (2D and UI); `T_*` indicates material use, with map-specific import settings. Check the actual consumer before changing import settings.
- **Atlasing**: tools that auto-pack sprites into atlases use prefix filters (`SP_*` → atlas A, `SS_*` → atlas B).
- **Channel packing**: `_ORM` states channel intent; the consuming shader must explicitly support that layout.

## 5. Edge cases

- **Imported-as-Sprite Texture2D used by a material**: choose semantic intent. If the asset participates in PBR lighting → `T_*` with the shader-appropriate importer; check other consumers before reimporting. If it ships into UI/SpriteRenderer → `SP_*`.
- **Procedural textures (Render Textures)**: `RT_<Name>.renderTexture`. Not typical for most projects; documented for completeness.
- **Lightmaps / GI-baked**: auto-generated by Unity; live in `Assets/<scene>/Lightmap-*.exr`. Don't rename — Unity manages them.
- **Editor icons / gizmo textures**: prefix `T_` is fine; place under `Editor/` to scope.

## 6. ScriptableObject configs

Custom ScriptableObjects used as config data (level layouts, weapon stats, tuning tables, …) follow a 3-part convention: **folder + class suffix + file prefix**.

| Layer | Convention | Example |
| --- | --- | --- |
| Folder | `Configs/` (always) | `Assets/.../Configs/` |
| Class name | `<Noun>Config` (PascalCase, `Config` suffix) | `public class LevelConfig : ScriptableObject` |
| Asset file prefix | `<TYPE>_<Name>.asset` — describes *what is configured*, **NOT** the word "Config" (folder already says it) | `LVL_Stage1.asset`, `WPN_Sword.asset`, `Tune_Combat.asset` |

### Suggested prefixes per family

These are project-defined; pick stable per-family prefixes and document them. Examples:

| Prefix | Family | Class |
| --- | --- | --- |
| `LVL_` | Level layouts | `LevelConfig` |
| `WPN_` | Weapon stats | `WeaponConfig` |
| `ENM_` | Enemy stats | `EnemyConfig` |
| `Tune_` | Tuning / balancing tables | `TuningConfig` |
| `Eco_` | Economy / pricing | `EconomyConfig` |

### Why not `Data`?

The folder is `Configs/` (plural). `Data` has no clean English plural — `Datas` is wrong; `Data` itself is technically already plural. `Config`/`Configs` pluralizes cleanly and is unambiguous.

### Why not `LC_` / `WC_` (Config-as-suffix)?

The `Configs/` folder already establishes that everything inside is a config. Repeating "Config" in the file prefix (`LC_` = LevelConfig) wastes characters and is redundant. The prefix should describe the *thing* being configured, not the file's role.

```
Configs/
├── LVL_Stage1.asset          ← LevelConfig for Stage1
├── LVL_Stage2.asset
├── WPN_Sword.asset           ← WeaponConfig for Sword
├── ENM_Goblin.asset
└── Tune_Combat.asset         ← TuningConfig for combat balancing
```

## Cross-references

- [`PROJECT_LAYOUT.md`](PROJECT_LAYOUT.md) — folder tree
- `skill://aku-code-conventions/NAMING.md` — C# naming (separate from asset naming)
