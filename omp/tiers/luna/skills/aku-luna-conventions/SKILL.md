---
name: aku-luna-conventions
description: "Use when authoring C#, Animator controllers, prefab variants, or Odin-decorated Inspector fields for a Luna (Playwork) playable. Owns Luna editor-strip, transpile-safe authoring, and export-sensitive conventions; report-only compatibility findings use skill://aku-luna-code-review."
---

# aku-luna-conventions — Luna authoring rules

This skill is loaded by `rule://aku-luna-rules` for Luna playable authoring. It owns only constraints that exist because the Luna/Playwork export target differs from the Unity player.

## Read these references

| Reference | Use |
| --- | --- |
| [`references/authoring-guards.md`](references/authoring-guards.md) | Odin guards, serialized fields, provider methods, and identifier pickers. |
| [`references/animator-prefab.md`](references/animator-prefab.md) | WriteDefaults and prefab-variant export constraints. |
| [`examples/tabbed-component.md`](examples/tabbed-component.md) | Complete guarded Odin Inspector example. |

## Workflow

1. Apply the common Unity skill for the operation: `skill://aku-code-conventions`, `skill://aku-animator`, `skill://aku-prefab`, or `skill://aku-odin`.
2. Apply `references/authoring-guards.md` to every Odin `using` and attribute in runtime-transpiled source.
3. Apply `references/animator-prefab.md` to Animator and prefab changes.
4. Keep `[SerializeField]` and `[SerializeReference]` outside conditional compilation; Odin decorates, Unity serializes.
5. Send export compatibility findings to `skill://aku-luna-code-review`; this skill does not perform report-only review.

## Boundary

This skill applies only when the target is a Luna playable. It does not replace generic Odin presence detection, common Unity serialization rules, or the Luna build-settings validator.
