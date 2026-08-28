# Project Layout — Supercent Unity Playable Ads

This is the **Supercent playable-ad reference layout**. The asset-type folder split + prefix scheme (see `ASSET_PREFIXES.md`) generalize to any Unity project; the variant-folder structure (`Assets/Supercent/<GameName>/<PlayableXXX>/`) is Supercent-specific. Adapt §6 for non-playable Unity projects.

## 1. Unity Project Root

```
<ProjectName>/
├── .gitignore
├── .mcp.json                          # MCP server config
├── luna.json                          # Luna playable build config (if Luna)
├── Assets/                            # All Unity assets
├── Packages/                          # UPM packages (manifest.json)
├── ProjectSettings/                   # Unity project settings
├── docs/                              # Project documentation
└── plans/                             # Implementation plans + reports
```

## 2. Assets layout

Top-level `Assets/` mixes vendor packages with Supercent code. Vendor folders (e.g. `Casual Game Sounds U6/`, `Joystick Pack/`, `Lana Studio/`, `Soap/`, `TextMesh Pro/`, `vFolders/`, `Voxel Labs/`) live alongside `Assets/Supercent/`:

```
Assets/
├── Plugins/
├── Resources/
├── Supercent/                         # Supercent project + shared code
│   ├── Luna/                          # Shared Luna base (Base, UI, Util)
│   └── <GameName>/                    # Game family root
│       ├── Playable.../               # Earlier playable variant(s)
│       └── <PlayableXXX>/             # Active playable variant
├── SupercentVN_Toolkit/
└── <Other Packages...>
```

## 3. Playable variant layout

Each playable variant (e.g. `Assets/Supercent/ArrowFlow/Playable010/`):

```
<PlayableXXX>/
├── Animation/
│   ├── AnimationClips/                # A_*.anim
│   └── AnimatorControllers/           # C_*.controller
├── Audio/
│   ├── SFX/                           # SFX_*.wav
│   └── BGM/                           # BGM_*.wav
├── Configs/                           # ScriptableObject configs — LVL_Stage1, WPN_Sword, Tune_Combat (prefix = what's configured; see ASSET_PREFIXES.md §6)
├── FBX/                               # 3D models
├── Fonts/
├── Materials/                         # M_*.mat
├── Prefabs/                           # Gameplay prefabs at root
│   └── UI/                            # GamePlayUI, WinUI, ...
├── Scenes/                            # SC_*.unity (e.g. SC_Playable010.unity)
├── Scripts/                           # C# logic (see §4)
├── Shaders/                           # S_*.shader
├── Sprites/                           # 2D sprite art (Texture Type = Sprite 2D/UI)
│   ├── Ingame/                        # SP_*, SS_* gameplay sprites
│   └── UI/                            # SP_* UI sprites (popups, buttons)
└── Textures/                          # T_*_BC, T_*_N, T_*_ORM; optional _Atlas layout descriptor (Texture Type = Default)
```

**Note**: spec previously listed both `Art/` and `Sprites/` covering overlapping content. The kit drops `Art/` and uses `Sprites/Ingame|UI/` to mirror `Textures/` and the `SP_` / `T_` prefix split.

## 4. Scripts organization

Scripts inside a variant are kept **flat** with two reserved subfolders. Don't introduce domain folders unless flat layout becomes unmanageable.

```
Scripts/
├── <GameplayClass>.cs                 # Block, GameManager, LevelGrid, LevelManager, ...
├── Editor/                            # Editor-only utilities (e.g. LunaTempCleaner)
└── UI/                                # UI controllers + UI helpers
    ├── GamePlayUI.cs
    ├── LoseUI.cs
    ├── SettingUI.cs
    ├── SfxPalette.cs
    ├── StreakFeedback.cs
    ├── UIManager.cs
    ├── UIName.cs
    └── WinUI.cs
```

Guidelines:

- Gameplay scripts (`Block`, `LevelSession`, `CameraFit`, `LevelSO`, ...) live at the `Scripts/` root — no per-feature subfolders.
- UI-facing MonoBehaviours and the audio entry point belong under `Scripts/UI/`.
- Editor-only code belongs under `Scripts/Editor/` and must be wrapped in an editor asmdef OR `#if UNITY_EDITOR` guard.

## 5. Shared Supercent code

`Assets/Supercent/Luna/` and similar shared roots host code consumed by every variant in a game family. Treat as read-only from a variant's perspective; changes there are cross-cutting.

## 6. When to deviate

- **3D-heavy projects** (not playable ads): `Sprites/` may be empty or omitted; `FBX/` + `Materials/` + `Textures/` carry the load.
- **Multi-scene games** (not Luna playables): `Scenes/` may have several scenes; still prefer `SC_<Name>.unity` naming.
- **Shared base / framework code**: place outside the variant folder (e.g. `Assets/Supercent/<GameName>/Shared/`) and make the dependency explicit via assembly definitions.

## Cross-references

- [`ASSET_PREFIXES.md`](ASSET_PREFIXES.md) — full asset prefix + texture suffix table
- `skill://aku-code-conventions/NAMING.md` — C# naming (different from asset naming)
- `skill://aku-scene` — scene/prefab/component MCP ops
