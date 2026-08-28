# Hierarchy / GameObject Name Prefixes

GameObjects in a hierarchy use **prefixes** to flag their primary UI/effect role at a glance. This applies to object (transform) names in **both scenes and prefab contents** — a prefab is just a saved hierarchy, so the same rules hold inside it. Apply PascalCase after the prefix underscore (e.g. `Canvas_HUD`, `BTN_Play`).

The prefix names the **GameObject**, identified by its primary component — not the component itself, and **not** the asset file. Prefab *asset files* stay unprefixed (the `.prefab` extension self-identifies; see [`ASSET_PREFIXES.md`](ASSET_PREFIXES.md) and `skill://aku-prefab`).

## 1. UI / VFX prefix table

| Object (primary component) | Prefix | Example |
| --- | --- | --- |
| Canvas | `Canvas_` | `Canvas_HUD`, `Canvas_Popup` |
| Image / RawImage | `IMG_` | `IMG_Background`, `IMG_CoinIcon` |
| Text (`Text` / `TextMeshProUGUI`) | `TXT_` | `TXT_Score`, `TXT_Title` |
| Button | `BTN_` | `BTN_Play`, `BTN_Close` |
| VFX object (ParticleSystem / VFX Graph / effect root) | `VFX_` | `VFX_Confetti`, `VFX_Explosion` |

Casing is intentional: `Canvas` is written in full (it is rarely abbreviated), while `IMG` / `TXT` / `BTN` / `VFX` use their conventional 3-letter caps form. Keep this exact set — do not invent variants per object.

## 2. Scope

- **Applies to**: GameObject names in scene hierarchies and prefab hierarchies (including nested children inside a prefab).
- **Does not apply to**: the containing **asset filename** — a prefab file stays unprefixed (`.prefab` self-identifies) and a scene file keeps its own `SC_` prefix (`SC_Playable010.unity`); neither takes a hierarchy prefix. Also excludes C# scripts (see `skill://aku-code-conventions/NAMING.md`) and asset files like sprites/materials (see [`ASSET_PREFIXES.md`](ASSET_PREFIXES.md) — a button's sprite is still `SP_PlayButton`, while the button GameObject is `BTN_Play`).

## 3. Why prefix hierarchy objects?

- **Instant type read** in the Hierarchy/Inspector and in serialized references — `BTN_Play` vs a bare `Play` tells you the object type before you click it.
- **Stable, scannable trees**: grouping by prefix keeps large UI hierarchies navigable for designers and reviewers.
- **Safer name-based addressing** at edit time (e.g. editor `Setup Refs` auto-wiring that matches by name) — a typed prefix reduces ambiguous matches.

## 4. Extending

Other UGUI/effect object types may take stable, project-defined prefixes (e.g. `Panel_`, `Scroll_`, `Slider_`, `Toggle_`, `Input_`) — pick them once and document them alongside this table. Do not retrofit prefixes onto objects the team has not agreed on; the five above are the baseline.

## Cross-references

- [`ASSET_PREFIXES.md`](ASSET_PREFIXES.md) — asset **file** prefixes (different rules; e.g. `SP_`, `T_`, `M_`)
- `skill://aku-code-conventions/NAMING.md` — C# code naming (separate from object naming)
- `skill://aku-code-conventions/REFERENCE_WIRING.md` — `[SerializeField]` + editor `Setup Refs` name-matching
- `skill://aku-prefab` — prefab-asset lifecycle (asset file stays unprefixed)
- `skill://aku-scene` — scene / hierarchy / component MCP ops
