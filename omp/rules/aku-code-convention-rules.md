---
description: "Use when looking up Unity C# policy or generating, editing, or refactoring C# files. Loads naming, structure, lifecycle, reference, bounded-domain, Animator, and Odin policy. Asset names/layout use skill://aku-asset-conventions. Do not activate for report-only file, diff, commit, or PR review; skill://aku-code-review owns it and loads the convention lens."
globs: ["**/*.cs"]
---

# Unity Code Convention Rules

Before policy lookup, authoring, editing, or refactoring Unity C#, MUST read and apply `skill://aku-code-conventions`. Report-only file, diff, commit, PR, or completed-feature review MUST enter through `skill://aku-code-review`, which loads code conventions as its convention lens.

Engine-wide invariants remain in `rule://aku-core-rules`. Inspector decoration and tooling belong to `skill://aku-odin`; asset naming and organization belong to `skill://aku-asset-conventions`.
