---
description: "Always applies in detected Supercent projects. Requires the [Dev] commit prefix and the Assets/Supercent/ asset layout on every prompt; it does not define general Unity conventions."
alwaysApply: true
---

# Unity Supercent Rules

Supercent commit policy plus the Supercent-specific asset-layout overlay. Applies when `Assets/Supercent/` is present.

## Commit prefix (mandatory)

All commits in this repo MUST start with `[Dev]` followed by a conventional-commit type.

- **Format:** `[Dev] <type>: <subject>`
- **Examples:** `[Dev] feat: add player dash ability` · `[Dev] fix: stabilize attack transitions` · `[Dev] chore: re-organize assets`
- Applies to every commit, no exceptions.

## Asset layout (Supercent playable ads)

Supercent projects place vendor packages beside the game-family root under `Assets/`:

```
Assets/
├── Plugins/
├── Resources/
├── Supercent/                         # Supercent project + shared code
│   ├── {Internal Submodules}/         # Shared code used across projects
│   └── {Game Name}/                   # Game family root
│       └── {Project Name}/            # Project-specific content
└── {Other Packages}
```

Variants live at `Assets/Supercent/<GameName>/<PlayableXXX>/` with `Sprites/Ingame|UI/` (NOT `Art/`), `Audio/SFX|BGM/`, `Animation/AnimationClips|AnimatorControllers/`, `Configs/`, `Prefabs/UI/`, and `Scripts/{root, Editor/, UI/}`.

The project-specific subtree follows the common tree in `skill://aku-asset-conventions/PROJECT_LAYOUT.md`.
