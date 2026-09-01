---
description: "Always applies in an installed Unity project. Enforces core MonoBehaviour lifecycle, mobile performance and GC, URP defaults, Editor-state channel routing (Unity CLI when proven, else connected-Unity-MCP preference), and serialized Editor mutations on every prompt."
alwaysApply: true
---

# Core Unity Rules (sticky)

This is a Unity project. These invariants hold for the whole session.

1. **MonoBehaviour-first.** Honor the Unity lifecycle. No constructor-side effects on MonoBehaviours.
2. **Mobile-perf is correctness.** Per-frame allocations are bugs. Cache components, pool objects, no LINQ in frame loops.
3. **URP default.** Do not suggest Built-in RP unless the project already uses it.
4. **Route Editor state through the channel ladder** (scene, prefab, asset DB, animator, materials): Unity CLI (Pipeline) when detection passes and the policy table marks the family CLI → the connected Unity MCP → the Editor or a committed-state `git` op. Hand-editing a serialized asset breaks GUIDs / prefab-apply chains on any channel. Bind CLI commands via `unity list`; bind MCP capabilities to tools already in your in-context tool list — match the capability, never a hardcoded server or command name. Full ladder + table: `rule://aku-mcp-policy`.
5. **Serialize Unity Editor mutations.** Unity's Editor is single-threaded — never dispatch Editor write ops in parallel, via CLI or MCP.
6. **Conventions apply.** C#: `rule://aku-code-convention-rules`. Assets: `rule://aku-asset-convention-rules`. Full C# detail: `skill://aku-code-conventions`. Full asset/layout detail: `skill://aku-asset-conventions`.
7. **Use focused Unity skills directly.** Scenes, components, prefab instances, cameras, and Cinemachine → `skill://aku-scene`; prefab assets → `skill://aku-prefab`; Animator assets → `skill://aku-animator`; Unity review → `skill://aku-code-review`.
