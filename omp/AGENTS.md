# agent-kit-unity (OMP)

Unity conventions + Editor-operation routing for this project. Teaches Unity naming/structure/asset layout and how to route Editor operations to **whatever Unity MCP is connected** — binding each capability to the tools already in your in-context tool list, hard-coding no server name.

The hard, always-on invariants live in the sticky, always-apply `rule://aku-core-rules` (in the same `.omp/rules/` directory). Situational conventions and policies are on-demand rules — read them via `rule://<name>` when the work calls for them. Unity domain workflows are skills — invoke `/skill:aku-<name>` or read `skill://aku-<name>`.

## Detect tier before applying tier-specific guidance

OMP rules cannot run detection code, so confirm the project's tier by reading these markers when a task makes them relevant:

- **Unity version + render pipeline** — read `ProjectSettings/ProjectVersion.txt` for the major version; check `Packages/manifest.json` for `com.unity.render-pipelines.universal` (URP) vs Built-in. State the detected pipeline before suggesting render-specific code.
- **Odin Inspector** — present when `Assets/Plugins/Sirenix/` exists or `Packages/manifest.json` / an asmdef references Sirenix. Odin absent → use built-in `[Header]`/`[Tooltip]`; emitting a Sirenix attribute is a compile error. Override with `.omp/aku-project.json {"odin": true|false}` (wins over auto-detection).
- **Supercent project** — `Assets/Supercent/` present → the `[Dev]` commit-prefix and playable-ad layout rules apply (`rule://aku-sc-rules`, installed in Supercent repos).
- **Project-specific overlays** — when a target's markers match an installed tier, apply that tier's rules and skills; otherwise use only the common payload.
- **Concurrent sessions** — no installed rule: detect a shared working directory at runtime and stage only the current session's paths before committing.

## Server-agnostic MCP binding

**Setup:** install any Unity MCP for this project — most expose the same core capabilities (scene, prefab, asset DB, animator, material, reflection/script execution); the kit hard-codes none and binds to whatever your session surfaces.

A Unity MCP commonly ships each tool twice — as an `mcp__<server>__<kebab>` tool and as an auto-generated bare-`<kebab>` skill. Kit content cites **bare kebab capability ids in backticks** (`scene-open`, `script-update-or-create`) as illustrative labels; bind each to whichever surface your connected server registers. Never reproduce a server prefix as a binding. Full detail: `rule://aku-mcp-policy`.
