---
description: "Always applies in detected Supercent projects. Requires the [Dev] commit prefix and the Assets/Supercent playable-variant layout on every prompt; it does not define general Unity conventions."
alwaysApply: true
---

# Unity Supercent Rules

Supercent commit policy plus a playable-ad layout overlay on `skill://aku-asset-conventions`. Applies in this Supercent project (`Assets/Supercent/` present).

## Commit prefix (mandatory)

All commits in this repo MUST start with `[Dev]` followed by a conventional-commit type.

- **Format:** `[Dev] <type>: <subject>`
- **Examples:** `[Dev] feat: add player dash ability` · `[Dev] fix: stabilize attack transitions` · `[Dev] chore: re-organize assets`
- Applies to every commit, no exceptions.

## Project layout (playable-ads)

Variants live at `Assets/Supercent/<GameName>/<PlayableXXX>/` with `Sprites/Ingame|UI/` (NOT `Art/`), `Audio/SFX|BGM/`, `Animation/AnimationClips|AnimatorControllers/`, `Configs/`, `Prefabs/UI/`, `Scripts/{root, Editor/, UI/}`. Full tree: `skill://aku-asset-conventions/PROJECT_LAYOUT.md`.
