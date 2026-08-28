---
description: "Use when reading or mutating Unity Editor state, serialized assets, scenes, prefabs, Animator assets, or materials. Route mutations through the connected Unity MCP, never raw file edits; covers server-agnostic capability binding, discovery, and reflection/script fallback."
globs: ["**/*.prefab", "**/*.unity", "**/*.controller", "**/*.anim", "**/*.mat"]
---

# Unity MCP Tool Policy

In a Unity project, route by file pattern / intent → a capability of **your connected Unity MCP** (its tools, or the generated skills of the same name) instead of plain `read`/`edit`/`write`, which on Unity asset files breaks GUIDs, scene serialization, prefab apply chains. Bind each capability to the tools **already in your in-context tool list** — the kit names capabilities, never a specific server.

**Reference server.** The kit's capability catalog is documented against one concrete Unity MCP: the IvanMurzak Unity-MCP, used purely as an example of what a Unity MCP exposes. Nothing here binds to it: any Unity MCP with equivalent capabilities works, and the kit neither registers nor assumes a particular server.

## Binding to the connected Unity MCP

- **No server-name binding.** Discover the connected server from the in-context tool list at runtime; do not hard-code a server name or auto-register one.
- **Reference form in kit content:** **bare kebab tool id in backticks** — `scene-open`, not a prefixed form. These are the *reference server's* names, shown so a capability has a concrete illustration; map them to whatever your connected server calls the same capability.
- **Client prefix:** a Unity MCP exposes its tools under an MCP-client prefix. Never reproduce a prefix as a binding — cite the bare kebab id and let your client resolve it against whatever server is connected.

## Two invocation surfaces (use either)

Many Unity MCPs — the reference server included — expose every tool **twice**:

1. **MCP tool** — invoked through the MCP tool client.
2. **Generated per-tool skill** — auto-generated under the agent's skills dir (the reference plugin does this in its `unity-skill-generate` step). Invoked as the bare `<kebab>` via the Skill tool.

Both back the same handler in the Unity editor. Kit content cites bare kebab ids; downstream resolution picks whichever surface your connected server registered.

## File types that corrupt on hand-edit

Prefer the connected Unity MCP (or the Editor) for these — a plain `read`/`edit`/`write` breaks them:

- **Corrupt on direct edit:** `.prefab .unity .controller .anim .mat .playable .signal` — FileID webs, prefab apply chains, shader coupling. Route every mutation through the connected Unity MCP; if no tool matches, use the Editor or a committed-state `git` op.
- **Usually safe, MCP still preferred:** `.asset .preset .spriteatlas[v2] .terrainlayer .giparams .lighting .physicMaterial .physicsMaterial2D .cubemap` — flat key/value YAML; a direct edit rarely corrupts, but the MCP keeps GUID/serialization handling correct.

## Focused domain routing

- Scene, hierarchy, GameObject, component, transform, prefab-instance, camera, or Cinemachine work → `skill://aku-scene`.
- Prefab-asset creation, isolated-stage editing, instantiation, unpacking, or variants → `skill://aku-prefab`.
- AnimatorController or AnimationClip authoring and wiring → `skill://aku-animator`.
- Other Editor domains → bind the intent directly to a matching capability in the live Unity MCP tool list; use the fallback below only when no domain capability exists.

## Reflection-first fallback (when no domain tool exists)

When your connected server exposes no domain tool for the task (dropped between versions, extension uninstalled), reach for a generic reflection/scripting capability. Reference-server example tools:

- `reflection-method-find` → `reflection-method-call` for one-off invocations.
- `type-get-json-schema` to discover the shape of an `Object` type before modifying it.
- `script-execute` (Roslyn) for one-off editor-side C# snippets.
- `script-update-or-create` to land a permanent helper in `Assets/Editor/`.

## Discovery

Before assuming a capability exists, list what your connected server actually exposes. Reference-server example tools:

- `unity-tool-list` — live registry of the tools the server currently exposes.
- `assets-find`, `gameobject-find`, `gameobject-component-list-all` — surface-level lookups.
- `ping` — health probe; call first if uncertain whether the server is reachable.

## Extensions (reference server)

The reference server's capability catalog assumes two extensions installed:

- **AI Animation** (`unity-ai-animation`) — `animation-*`, `animator-*` tools.
- **AI ParticleSystem** (`unity-ai-particlesystem`) — `particle-system-get/modify`.

**Cinemachine:** load `skill://aku-scene/CINEMACHINE.md`; it uses core GameObject/component/reflection capabilities and distinguishes CM2 from CM3.

Remaining extensions (Timeline, Terrain, Tilemap, Splines, Navigation, ProBuilder, InputSystem) are install-pointer + reflection fallback.

## Fallback when no Unity MCP is connected

If no Unity MCP appears in your in-context tool list (or a health probe fails), fall back to plain `read`/`edit` for scripts (`.cs` only) and pause for prefab/scene/material work until a Unity MCP is connected.

## See also

- `rule://aku-mcp-guard` — the TTSR that intercepts a raw `edit`/`write` on a corruptible asset and points you back here.
