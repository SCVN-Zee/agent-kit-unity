---
name: aku-code-conventions
description: "Use when looking up Unity C# policy or generating, editing, or refactoring MonoBehaviours, ScriptableObjects, or classes. Owns lifecycle, reference wiring, bounded domains, and Animator driving; asset naming uses skill://aku-asset-conventions and Inspector UX uses skill://aku-odin. Do not activate for report-only review; use skill://aku-code-review."
---

# aku-code-conventions — Unity C# Conventions

Sub-files:

| File | Purpose |
| --- | --- |
| [`NAMING.md`](NAMING.md) | PascalCase/camelCase/UPPER_SNAKE_CASE rules for namespaces, types, interfaces, members, properties, functions, and enums. |
| [`STRUCTURE.md`](STRUCTURE.md) | Required class sections, lifecycle pairing, and composition instead of partial classes. |
| [`REFERENCE_WIRING.md`](REFERENCE_WIRING.md) | Inspector-first references, runtime lookup bans, editor-only `Setup Refs`, and interface-reference patterns. |
| [`REQUIRED_FIELDS.md`](REQUIRED_FIELDS.md) | Required serialized-reference policy, type matrix, explicit optional refs, prefab-instance tier, and no-Odin assertions. |
| [`BOUNDED_DOMAIN_FIELDS.md`](BOUNDED_DOMAIN_FIELDS.md) | Enum, picker, mask, and ScriptableObject choices for finite value sets. |
| [`ANIMATOR_DRIVING.md`](ANIMATOR_DRIVING.md) | Parameter-driven runtime Animator code, cached hashes, trigger discipline, and layer weights. |
| [`examples/`](examples/) | Canonical MonoBehaviour, ScriptableObject, setup-reference, lifecycle, bounded-domain, and identifier-picker recipes. |
This skill is the authoritative source for Unity C# policy. Before acting, MUST read the subfiles relevant to the work. Inspector decoration, validation, picker mechanisms, and editor tooling also require reading and applying `skill://aku-odin` when Odin is installed.

Asset filenames, folders, importer intent, config-asset naming, and hierarchy names belong to `skill://aku-asset-conventions`.

## When to load

- Generating or editing any MonoBehaviour, ScriptableObject, or plain Unity C# class.
- Declaring a field whose legal values form a finite named set.
- Wiring scene, prefab, component, config, or asset references from C#.
- Driving an Animator from runtime code.
- Refactoring Unity C# for convention compliance. Report-only file, diff, commit, or PR review enters through skill://aku-code-review, which loads this policy as its convention lens.

## Critical rules (cheat sheet)

1. **Access modifiers always required.** No bare `void Awake()` or bare serialized field.
2. **Braces always required** for `if`, `else`, `for`, `foreach`, and `while`, including one-line bodies.
3. **No `var`.** Use explicit types.
4. **ScriptableObject data uses serialized properties:** `[field: SerializeField] public T Prop { get; private set; }`. No public member variables.
5. **Section dividers required** in MonoBehaviours: Serialized Fields → Private Fields → Properties → Lifecycle → Logic. Events follows Properties when present; editor-only wiring is last.
6. **Lifecycle pairing:** `Awake`↔`OnDestroy`, `Init`↔`Release`.
7. **Comments explain why, not what.**
8. **Inspector-wire scene-time references.** No runtime `GetComponent` or `Find*`, including `Awake`/`Start`; only post-`Instantiate()` lookup is allowed. Editor-only setup may use lookup and must dirty the asset or scene.
9. **Inspector decoration and picker mechanisms belong to `skill://aku-odin`.** Odin installed means Odin decoration attributes; no Odin means built-ins. Which fields need a picker is decided by rule 11.
10. **Drive normal gameplay Animators with parameters and configured transitions**, not `Animator.Play`/`CrossFade`. Keep direct-state calls narrow and justified. Graph authoring belongs to `skill://aku-animator`.
11. **Finite value sets are never bare `string` or `int`.** A new member requiring a code path uses an enum; data-defined members use an authority-backed picker or ScriptableObject reference.
12. **Every serialized reference is required unless explicitly optional.** With Odin, place `[Required]` in its own bracket; document optional null behavior with `[PropertyTooltip]`. Never apply `[Required]` to value types or collections. Without Odin, assert in `Init()` and name the field.

## Workflow position

```text
rule://aku-code-convention-rules (automatic activation bridge)
  → skill://aku-code-conventions (authoritative code policy + subfile routing)
  → skill://aku-odin (Odin mechanisms, when installed)
  → skill://aku-animator (Animator graph authoring)
  → matching focused Unity skill or connected MCP capability
```

## Cross-references

- `skill://aku-asset-conventions` — content folders, asset filenames, importer intent, and hierarchy naming
- `rule://aku-code-convention-rules` — automatic C# activation bridge
- `skill://aku-odin` — inspector decoration, validation attributes, and picker mechanisms
- `skill://aku-animator` — AnimatorController and clip authoring
