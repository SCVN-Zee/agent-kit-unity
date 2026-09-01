---
description: "Use when reading or mutating Unity Editor state, serialized assets, scenes, prefabs, Animator assets, or materials. Route per the channel ladder — Unity CLI (Pipeline) where proven, else the connected Unity MCP, never raw file edits; covers binding, discovery, and reflection/script fallback."
globs: ["**/*.prefab", "**/*.unity", "**/*.controller", "**/*.anim", "**/*.mat"]
---

# Unity Editor Channel Policy

In a Unity project, route by file pattern / intent → the **designated channel** for that operation — the Unity CLI (Pipeline) when the detection ladder passes and the classification table marks it, else **your connected Unity MCP** — instead of plain `read`/`edit`/`write`, which on Unity asset files breaks GUIDs, scene serialization, prefab apply chains. Bind each capability to the surface **already available in your session**: CLI commands via `unity list`, MCP tools via your in-context tool list. The kit names capabilities, never a specific server.

**Any Unity MCP works.** Install whichever Unity MCP you prefer for this project — most expose the same core capabilities — and bind to whatever tools your session surfaces. The kit neither registers nor assumes a particular server, and never names one to install.

## Setup (official Unity CLI + Pipeline)

The kit couples to the **official** `unity` CLI for Editor automation (an MCP remains the generic fallback):

- **Binary:** install the Unity CLI, then check `unity --version`.
- **Pipeline package:** run `unity pipeline install --project-path <path>` — it adds `com.unity.pipeline` to `Packages/manifest.json` for you (`unity pipeline list-versions` enumerates versions).
- **Activation:** a running Editor does **not** hot-resolve the install — restart the Editor once. Then `unity status --format json` lists the instance and `unity command` enumerates the registered commands; `unity list` stays the runtime authority (server version and per-command availability vary by Pipeline release).

## Channel ladder

Check in order; a missing rung falls through to the next channel — never guess.

1. **`unity` binary present** — `unity --version` succeeds.
2. **Live connected Editor** — `unity status --format json` lists a non-empty `editors` array (`--format` is a global CLI flag; fall back to the plain verb if a newer CLI drops it).
3. **Pipeline package + Editor 6.0+** — `com.unity.pipeline` in the project's `Packages/manifest.json`, and `ProjectSettings/ProjectVersion.txt` shows an Editor 6 or newer. **Version mapping (stated once here): Unity 6 = the `6000.x` series, so "6.0+" means ≥`6000.0`; element-level capture additionally requires ≥`6000.7`.**
4. **Capability registered** — `unity list` shows the command. `unity list` is the **binding authority for the CLI channel**; for the MCP channel the in-context tool list is the authority (see Discovery).

Fallback chain: **CLI-live → MCP → Editor or committed-state `git` op → pause.**

## Classification table (per op family)
Verdicts come from runtime probes of the installed stack (latest capture **2026-08-30, live probe**: Editor 6000.3.15f1 + Pipeline 0.5.0-exp.1, 142 commands registered; catalog + exercise evidence in the kit plan reports). Rows carry their evidence class. This prose is non-normative — `unity list` is the runtime authority for the CLI channel.

| Capability surface | Primary channel | Fallback / status |
|---|---|---|
| Live-Editor authoring & observability per family — scenes; hierarchy/components; prefab lifecycle + 3 apply tiers; animator batch; materials; baking; selection; build settings; recompile; tests inventory (`list_tests`); console read; Roslyn eval; play/stop/pause | **CLI** — `unity command <name>` (reads proven-run 2026-08-30; write roundtrips verify-at-use; catalog in kit reports) | MCP capability of the same class (`tests-run`, `scene-open`, …) |
| Live captures (game/scene view) | **CLI** — `capture_game_view` / `capture_scene_view` (proven-run 2026-08-30; `save_path` resolves under the authoring root) | MCP capture capability; manual screenshot |
| Element captures | **CLI**, Editor ≥6000.7 only | pre-6000.7 → MCP capture or manual |
| In-Editor input simulation | **MCP** (or manual) | no CLI route at capture: 0 of 142 registered commands are RuntimeOnly, none simulate input |
| RuntimeOnly commands in a dev Player (`simulate_*`, `set_timescale`, `set_target_framerate`, `quit`, `runtime_status`, `log`, `hotreload_*`) | CLI against a standalone Development build (`enableInBuilds=true` + Input System) | informational route — not a kit routing target |
| Headless one-shot (`unity build` / `unity test` / `unity run [--command]`) | **MCP / `eval`** for in-Editor runs while an interactive session holds the project | headless CLI (`unity build` / `unity test` / `unity run`) — gated: only with the project closed in the interactive Editor; flag surface help-verified, `list_tests` proven-run 2026-08-30; execution verify-at-use |

### Headless one-shot

Inside a live interactive session, run tests in-Editor via MCP (`tests-run`) and builds via editor-side scripts. The headless CLI variant is the gated fallback: `unity build`, `unity test`, and `unity run` spawn a **separate batch-mode Editor** — use them only while the target project is **closed in the interactive Editor** — behavior under a live interactive session is unproven; do not assume single-instance lock semantics. `unity run --command` additionally requires the command to be Pipeline-registered (ladder rung 3) and parses args after `--` against the command's schema. Flag digests: `unity test --mode EditMode --filter <pattern> --output <path> --report-format nunit` (plus `--retries`, `--rerun-failed`, `--coverage`); `unity build --target <platform> [--profile <name>] [-o <path>] [-l <log>]`.

## Binding to the connected Unity MCP

- **No server-name binding.** Discover the connected server from the in-context tool list at runtime; do not hard-code a server name or auto-register one.
- **Reference form in kit content:** **bare kebab tool id in backticks** — `scene-open`, not a prefixed form. These are illustrative capability labels, not one server's tool names; map them to whatever your connected server calls the same capability.
- **Client prefix:** a Unity MCP exposes its tools under an MCP-client prefix. Never reproduce a prefix as a binding — cite the bare kebab id and let your client resolve it against whatever server is connected.

## Two invocation surfaces (use either)

Many Unity MCPs expose every tool **twice**:

1. **MCP tool** — invoked through the MCP tool client.
2. **Generated per-tool skill** — auto-generated under the agent's skills dir. Invoked as the bare `<kebab>` via the Skill tool.

Both back the same handler in the Unity editor. Kit content cites bare kebab ids; downstream resolution picks whichever surface your connected server registered.

## File types that corrupt on hand-edit

Prefer a routed channel (the classification table, or the Editor) for these — a plain `read`/`edit`/`write` breaks them:

- **Corrupt on direct edit:** `.prefab .unity .controller .anim .mat .playable .signal` — FileID webs, prefab apply chains, shader coupling. Route every mutation through its designated channel per the classification table; if no channel matches, use the Editor or a committed-state `git` op.
- **Usually safe, routed channels still preferred:** `.asset .preset .spriteatlas[v2] .terrainlayer .giparams .lighting .physicMaterial .physicsMaterial2D .cubemap` — flat key/value YAML; a direct edit rarely corrupts, but a routed channel keeps GUID/serialization handling correct.

## Focused domain routing

- Scene, hierarchy, GameObject, component, transform, prefab-instance, camera, or Cinemachine work → `skill://aku-scene`.
- Prefab-asset creation, isolated-stage editing, instantiation, unpacking, or variants → `skill://aku-prefab`.
- AnimatorController or AnimationClip authoring and wiring → `skill://aku-animator`.
- Other Editor domains → bind the intent directly to a matching capability in the live session surface (MCP tool list, or a registered CLI command); use the fallback below only when no domain capability exists.

## Reflection-first fallback (when no domain tool exists)

When your connected server exposes no domain tool for the task (dropped between versions, extension uninstalled), reach for a generic reflection/scripting capability. Example capability shapes:

- `reflection-method-find` → `reflection-method-call` for one-off invocations.
- `type-get-json-schema` to discover the shape of an `Object` type before modifying it.
- `script-execute` (Roslyn) for one-off editor-side C# snippets.
- `script-update-or-create` to land a permanent helper in `Assets/Editor/`.

## Discovery (per channel)

- **MCP channel:** before assuming a capability exists, inspect the in-context tool list your session already surfaces — that list is the binding authority; do not call a tool-introspection command to "discover" tools.
- **CLI channel:** `unity list` is the binding authority — enumerate registered commands before invoking one.
- For reachability, a cheap health probe (`ping`) or any no-op read is enough; surface-level lookups (`assets-find`, `gameobject-find`, `gameobject-component-list-all`) confirm what the world contains.

## Capability coverage varies

Servers differ in optional editing sets (animation curves, particle systems); treat a missing capability family as absent rather than probing for a product name.

**Cinemachine:** load `skill://aku-scene/CINEMACHINE.md`; it uses core GameObject/component/reflection capabilities and distinguishes CM2 from CM3.

Domains without a matching capability (Timeline, Terrain, Tilemap, Splines, Navigation, ProBuilder, InputSystem, …) → reflection/script fallback.

## Fallback when no channel is available

Work down the ladder: CLI-live when all four rungs pass and the table marks the family CLI; else the connected Unity MCP. If **no channel** is available — no Unity MCP in your in-context tool list (or a health probe fails) **and** the CLI ladder fails — fall back to plain `read`/`edit` for scripts (`.cs` only) and pause for prefab/scene/material work until a channel is connected.

## See also

- `rule://aku-mcp-guard` — the TTSR that intercepts a raw `edit`/`write` on a corruptible asset and points you back here.
