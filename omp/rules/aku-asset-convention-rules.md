---
description: "Use when looking up Unity asset or hierarchy naming, folder organization, importer intent, config asset names, or texture suffixes. Loads skill://aku-asset-conventions only for convention work; actual serialized mutation stays with focused Unity skills or the connected Unity MCP."
globs: ["**/Assets/**", "**/*.prefab", "**/*.unity", "**/*.asset", "**/*.mat"]
---

# Unity Asset Convention Rules

Before looking up or applying asset or hierarchy naming, folder organization, importer-intent, config-asset, or texture-suffix policy, MUST read and apply `skill://aku-asset-conventions`.

Actual scene, prefab, Animator, material, or other serialized mutation without convention work MUST use the focused Unity skill or connected Unity MCP; do not load the asset-conventions skill.

Engine-wide invariants remain in `rule://aku-core-rules`; Unity C# policy belongs to `skill://aku-code-conventions`.
