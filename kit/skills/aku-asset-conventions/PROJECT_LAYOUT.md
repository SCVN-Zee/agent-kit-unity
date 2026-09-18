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
└── Textures/                          # T_* maps; optional _Atlas; importer follows map/shader intent
```

Use this tree for new project-owned content, not as permission to reorganize vendor or generated assets. Resolve the actual project content root rather than assuming `Assets/Configs`.

For an authorized move/rename, preserve `.meta` GUIDs through Unity asset operations. Check string paths, Resources/Addressables keys, animation bindings and tooling consumers; GUID preservation alone does not protect those. Do not create empty folders solely to reproduce this diagram.

## Cross-references

- [`ASSET_PREFIXES.md`](ASSET_PREFIXES.md) — full asset prefix + texture suffix table
- `skill://aku-code-conventions/NAMING.md` — C# naming (different from asset naming)
