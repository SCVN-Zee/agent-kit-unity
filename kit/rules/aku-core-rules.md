---
description: "Always applies in an installed Unity project. Enforces core MonoBehaviour lifecycle, mobile performance and GC, URP defaults, and serialized Editor mutations on every prompt."
alwaysApply: true
---

# Core Unity Rules (sticky)

This is a Unity project. These invariants hold for the whole session.

1. **MonoBehaviour-first.** Honor the Unity lifecycle. No constructor-side effects on MonoBehaviours.
2. **Respect the performance target.** On mobile, avoid recurring allocations and LINQ in frame loops; Inspector-wire components and pool repeated spawns. Confirm hot-path cost before calling a micro-optimization a correctness defect.
3. **Respect the active pipeline.** Detect Built-in, URP, HDRP or a custom pipeline from Graphics/Quality settings and packages. Preserve an existing pipeline; use URP as the default only for a new project without a pipeline decision.
4. **Serialize Unity Editor mutations.** Unity's Editor is single-threaded — never dispatch Editor write ops in parallel, via CLI or MCP.
5. **Conventions apply.** C#: `rule://aku-code-convention-rules`. Assets: `rule://aku-asset-convention-rules`. Full C# detail: `skill://aku-code-conventions`. Full asset/layout detail: `skill://aku-asset-conventions`.
6. **Unity review** uses `skill://aku-code-review`.
