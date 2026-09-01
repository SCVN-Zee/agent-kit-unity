# Project Layout — Unity Projects

This is the common project layout for Unity projects. It defines the project-specific content tree; vendor and game-family roots are project-specific and are not prescribed here.
The Unity project root contains the Unity-managed directories `Assets/`, `Packages/`, and `ProjectSettings/`. The MCP host configuration is separate: `.mcp.json` may be stored outside the Unity project root, so do not assume it is adjacent to `Assets/`; resolve it from the active workspace or host configuration.

## Project layout

Each project-specific folder uses this layout:

```
{Project Name}/
├── Animation/
│   ├── AnimationClips/                # A_*.anim
│   └── AnimatorControllers/           # C_*.controller
├── Audio/
│   ├── SFX/                          # SFX_*.wav
│   └── BGM/                          # BGM_*.wav
├── Configs/                           # ScriptableObject configs — LVL_Stage1, WPN_Sword, Tune_Combat (prefix = what is configured; see ASSET_PREFIXES.md §6)
├── Models/                            # 3D models
├── Fonts/
├── Materials/                         # M_*.mat
├── Prefabs/                           # Gameplay prefabs at root
│   ├── UI/                            # GamePlayUI, WinUI, ...
│   └── VFXs/                          # Visual-effect prefabs
├── Scenes/                            # SC_<Name>.unity
├── Scripts/                           # C# logic
├── Shaders/                           # S_*.shader
├── Sprites/                           # SP_*, SS_* (Texture Type = Sprite 2D/UI)
└── Textures/                          # T_*_BC, T_*_N, T_*_ORM; optional _Atlas layout descriptor (Texture Type = Default)
```

**Note**: spec previously listed both `Art/` and `Sprites/` covering overlapping content. The common layout drops `Art/` and uses `Sprites/` to mirror `Textures/` and the `SP_` / `T_` prefix split.

## Cross-references

- [`ASSET_PREFIXES.md`](ASSET_PREFIXES.md) — full asset prefix + texture suffix table
- `skill://aku-code-conventions/NAMING.md` — C# naming (different from asset naming)
- `skill://aku-scene` — scene/prefab/component MCP ops
