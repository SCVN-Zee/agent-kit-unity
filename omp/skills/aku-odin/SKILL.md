---
name: aku-odin
description: "Use when Sirenix Odin Inspector is installed and the task involves Odin-decorated C#, Inspector UX, groups/tabs, conditional fields, validation, collections, buttons, OdinEditorWindow, menu trees, selectors, or drawers. Without Odin, use built-in Unity Inspector attributes only; this skill does not activate."
---

# aku-odin — Odin Inspector house style

When Odin Inspector (Sirenix) is present, its attributes are the house style — **not a preference**. Built-in `[Header]` / `[Tooltip]` / `[Space]` / `[Range]` / `[ContextMenu]` are replaced, not merely discouraged.

The `**/*.cs` rule bridge routes C# work through `skill://aku-code-conventions`, which imperatively loads this skill for inspector and Odin work. This skill owns the mandate, mapping tables, presence gate, and icon-first editor tooling.

Sub-files:

| File | Purpose |
| --- | --- |
| [`ODIN_ATTRIBUTES.md`](ODIN_ATTRIBUTES.md) | Attribute mechanisms, built-in keep-list, presence gate, serialization boundary, named-member safety. |
| [`INSPECTOR_UX.md`](INSPECTOR_UX.md) | Task-first layout ladder, tabs, state semantics, collections/references, narrow-width and repaint rules. |
| [`EDITOR_TOOLING.md`](EDITOR_TOOLING.md) | Simple `OdinEditorWindow`, icon-first actions, lifecycle, Undo/dirty boundaries. |
| [`ADVANCED_EDITOR_TOOLING.md`](ADVANCED_EDITOR_TOOLING.md) | Menu trees, selectors/property trees, custom drawers/processors, optional validators. |
| [`examples/`](examples/) | Canonical simple window, seven-domain tabbed component, and menu-tree tool. |

## When to load

- Generating or reviewing inspector-decorated MonoBehaviour / ScriptableObject fields.
- Custom Inspector UX, `[TabGroup]`, `[BoxGroup]`, `[FoldoutGroup]`, conditional fields, validation, lists/tables.
- `[Header]`, `[Tooltip]`, `[Title]`, `[Button]`, `[ShowIf]`, `[PropertyTooltip]`, or "add an inspector button".
- Custom editor windows/tools, `OdinEditorWindow`, `OdinMenuEditorWindow`, `OdinMenuTree`, selectors, drawers.
- Any Odin / Sirenix attribute work. No Odin in the project → do not load; emit built-ins.

## The gate

Odin is a paid third-party DLL. A project without it **cannot compile a single Sirenix attribute**.

| State | What to write |
| --- | --- |
| Odin installed | Odin attrs, mandatory |
| Odin absent | built-in `[Header]` / `[Tooltip]` — emitting a Sirenix attr is a compile error |

Confirm presence per `AGENTS.md`: `Assets/Plugins/Sirenix/` exists, or `Packages/manifest.json` / an asmdef references Sirenix. **Override:** `.omp/aku-project.json {"odin": true|false}` — committed, beats every auto signal.

## Critical rules (cheat sheet)

1. **Odin attrs are MANDATORY when installed.** `[Header]`→`[Title]` (or `[BoxGroup]`/`[FoldoutGroup]` to group), `[Tooltip]`→`[PropertyTooltip]`, `[Space]`→`[PropertySpace]`, `[TextArea]`→`[MultiLineProperty]`, `[Range]`→`[PropertyRange]`, relabel via `[LabelText]`. Behavior: `[ShowIf]`/`[HideIf]`, `[ReadOnly]`, `[InlineEditor]`. Tables: `ODIN_ATTRIBUTES.md` §2–§3.
2. **Keep-list — built-ins with no Odin twin, always keep:** `[SerializeField]`, `[SerializeReference]`, `[RequireComponent]`, `[CreateAssetMenu]`, `[ExecuteAlways]`, `[AddComponentMenu]`, `[HelpURL]`, `[field:]` forwarding. Odin decorates, Unity serializes. `ODIN_ATTRIBUTES.md` §4.
3. **Icon-first editor tooling.** Inspector actions are `[Button(SdfIconType.X, IconAlignment.LeftOfText)]`, not bare text and not `[ContextMenu]`. Custom tools carry icons. `SdfIconType` only — never `EditorGUIUtility.IconContent` strings. `EDITOR_TOOLING.md`.
4. **Not runtime serialization.** `SerializedMonoBehaviour` / `[OdinSerialize]` are out of scope.
5. **Luna playable strip is Luna-tier.** Point at `rule://aku-luna-rules`. Off a playable target, cosmetic attrs need no guard.
6. **`[Required]` is conventions.** Completeness of serialized refs: `skill://aku-code-conventions/REQUIRED_FIELDS.md`. This skill only supplies the presence gate it depends on.
7. **Which fields need a picker is conventions.** `[ValueDropdown]` is the mechanism; the switch test lives in `skill://aku-code-conventions/BOUNDED_DOMAIN_FIELDS.md`. Keep named members compiled (`ODIN_ATTRIBUTES.md` §7).
8. **Compose the Inspector around authoring tasks.** Short flows stay linear; stable sibling domains may use tabs; large multi-page tools use menu navigation. `INSPECTOR_UX.md`.
9. **Escalate editor APIs deliberately.** Attributes → `OdinEditorWindow` → menu tree → selectors/property trees/drawers. Advanced surfaces are not defaults. `ADVANCED_EDITOR_TOOLING.md`.

## Anti-Rationalization

| Thought | Reality |
| --- | --- |
| "I'll just use `[Header]`, it's simpler" | On an Odin project that is a house-style defect. `[Title]` is the 1:1 replacement. |
| "Odin is a preference" | It is mandatory when installed. Absence is the only off-ramp. |
| "Drop `[SerializeField]`, the Odin attr is enough" | Keep-list. Odin draws; Unity serializes. |
| "Text `[Button]` is fine" | Icon-first. `SdfIconType` is compile-checked; `IconContent` strings fail silent. |
| "I'll wrap every Odin attr in `#if` just in case" | Cosmetic attrs are runtime-safe off Luna. The strip token is Luna-tier only. |

## Workflow position

```
rule://aku-code-convention-rules  (automatic bridge for **/*.cs work)
  → skill://aku-code-conventions (code policy + task-specific routing)
  → skill://aku-odin              (this skill, mandate + mapping + tooling)
  → rule://aku-luna-rules         (playable targets only — editor-strip guard)
```

## Cross-references

- `rule://aku-code-convention-rules` — automatic C# activation bridge
- `skill://aku-code-conventions/REQUIRED_FIELDS.md` — `[Required]` on every serialized ref
- `skill://aku-code-conventions/BOUNDED_DOMAIN_FIELDS.md` — enum vs picker vs SO
- `skill://aku-code-conventions/STRUCTURE.md` — section dividers the grouping attrs sit on
- `skill://aku-code-conventions/REFERENCE_WIRING.md` — `Setup Refs` uses `[Button]`
- `rule://aku-luna-rules` — Luna playable editor-strip guard
- `skill://aku-code-review/references/checklist-editor-build-hygiene.md` — review lens for this mandate
