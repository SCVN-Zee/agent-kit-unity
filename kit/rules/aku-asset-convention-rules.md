---
description: "Use when looking up Unity asset or hierarchy naming, folder organization, importer intent, config asset names, or texture suffixes. Loads skill://aku-asset-conventions only for convention work, not serialized mutation alone."
globs: ["**/Assets/**", "**/*.prefab", "**/*.unity", "**/*.asset", "**/*.mat"]
---

# Unity Asset Convention Rules

Before looking up or applying asset or hierarchy naming, folder organization, importer-intent, config-asset, or texture-suffix policy, MUST read and apply `skill://aku-asset-conventions`.

Do not load the asset-conventions skill for scene, prefab, Animator, material, or other serialized mutation unless naming or organization is requested.

Engine-wide invariants remain in `rule://aku-core-rules`; Unity C# policy belongs to `skill://aku-code-conventions`.
