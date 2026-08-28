---
description: "Always applies in an installed Unity project. Enforces core MonoBehaviour lifecycle, mobile performance and GC, URP defaults, connected-Unity-MCP preference for Editor state, and serialized Editor mutations on every prompt."
alwaysApply: true
---

# Unity Rules (sticky)

This is a Unity project. These invariants hold for the whole session.

1. **MonoBehaviour-first.** Honor the Unity lifecycle. No constructor-side effects on MonoBehaviours.
2. **Mobile-perf is correctness.** Per-frame allocations are bugs. Cache components, pool objects, no LINQ in frame loops.
3. **URP default.** Do not suggest Built-in RP unless the project already uses it.
4. **Prefer the connected Unity MCP over `read`/`edit`/`write` for Editor state** (scene, prefab, asset DB, animator, materials). Hand-editing a serialized asset breaks GUIDs / prefab-apply chains. Bind each capability to a Unity MCP tool already in your in-context tool list — match the capability, never a hardcoded server name. If no tool matches, use the Editor or a committed-state `git` op. Full policy: `rule://aku-mcp-policy`.
5. **Serialize Unity Editor mutations.** Unity's Editor is single-threaded and the MCP serializes anyway — never dispatch Unity MCP write ops in parallel. Parallelize only read-only investigation. Detail: `rule://aku-parallel-rules`.
6. **Conventions apply.** C#: `rule://aku-code-convention-rules`. Assets: `rule://aku-asset-convention-rules`. Full C# detail: `skill://aku-code-conventions`. Full asset/layout detail: `skill://aku-asset-conventions`.
7. **Use focused Unity skills directly.** Scenes, components, prefab instances, cameras, and Cinemachine → `skill://aku-scene`; prefab assets → `skill://aku-prefab`; Animator assets → `skill://aku-animator`; Unity review → `skill://aku-code-review`.
