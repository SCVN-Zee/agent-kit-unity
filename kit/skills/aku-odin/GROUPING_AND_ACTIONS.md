# Grouping and actions — compose a task, not an attribute gallery

Read [`INSPECTOR_UX.md`](INSPECTOR_UX.md) first. These are version-checked composition recipes, not a requirement
to use every control. Verify signatures against the installed Odin package before copying code.

## Choose navigation

| User task | Surface | Why |
| --- | --- | --- |
| Fill a short sequence | Title / TitleGroup | Keeps dependent values visible together. |
| Recognize a related cluster | BoxGroup | Adds a boundary without extra clicks. |
| Occasionally inspect details | FoldoutGroup | Reduces scanning; leave invalid-state summary visible. |
| Enable a whole capability | ToggleGroup | The named bool really owns every child. |
| Work in independent sibling domains | TabGroup | Reduces vertical travel without mixing responsibilities. |
| Navigate many assets/pages | OdinMenuEditorWindow | Adds search and persistent selection instead of nested tabs. |

## Group paths and order

Every member belongs to its explicitly declared group; a group attribute does not wrap all subsequent fields.
Use stable paths. Attribute order is not a substitute for group IDs or `PropertyOrder`.

```csharp
[TabGroup("Authoring", "Movement")]
[BoxGroup("Authoring/Movement/Speed")]
[SerializeField, MinValue(0f)] private float _walkSpeed = 3f;

[BoxGroup("Authoring/Movement/Speed")]
[SerializeField, MinValue(0f)] private float _runSpeed = 6f;

[TabGroup("Authoring", "Feedback")]
[SerializeField] private bool _useFeedback;
```

A parent tab declaration establishes the path; children use that same path. Test combined groups on the installed
version and avoid dynamic path strings unless changing the layout is intentional. Use PropertyOrder for presentation
without renaming/reordering serialized fields. Keep shared identity and actionable error summaries outside tabs.

## Responsive tabs and controls

Modern Odin supports `TabLayouting.MultiRow` and `TabLayouting.Shrink`:

```csharp
[TabGroup("Authoring", "Movement", TabLayouting = TabLayouting.MultiRow)]
[SerializeField] private float _turnSpeed;
```

Use MultiRow when it preserves readable labels; shrinking is acceptable only while labels remain recognizable.
`HideTabGroupIfTabGroupOnlyHasOneTab` can remove redundant chrome. These are installed-version capabilities,
not justification to create many tabs. Consolidate or use a menu window when navigation dominates the content.

Prefer vertical fields. Use HorizontalGroup for genuine pairs, with bounded widths and labels that fit. VerticalGroup
can combine related cells in a table. Test long labels, narrow docks, light/dark themes and keyboard traversal.

## Conditional state

- ShowIf/HideIf: no meaning in this mode. Preserve the hidden value unless a separate authorized migration removes it.
- EnableIf/DisableIf: meaningful but currently inactive. Explain the prerequisite near the controls.
- ShowIfGroup/HideIfGroup: one condition owns the entire group; do not duplicate inconsistent predicates per child.
- ToggleGroup: use the bool's member/group path correctly; disabling a feature is not deleting its configuration.
- ReadOnly: diagnostics, not a security or storage boundary. Test mixed values under multi-object selection.

Keep predicates pure and cheap. Do not perform asset scans or author-data mutation to decide visibility.

## Actions near their targets

Use `InlineButton` for a field-local action such as pinging its asset or refreshing a picker. Use a labeled Button
for operations with side effects and a ResponsiveButtonGroup when several safe peer actions need to wrap with width.

```csharp
[ResponsiveButtonGroup("PreviewActions")]
[Button(SdfIconType.PlayFill, "Preview")]
private void Preview() { /* editor-only preview implementation */ }

[ResponsiveButtonGroup("PreviewActions")]
[Button(SdfIconType.StopFill, "Stop Preview")]
private void StopPreview() { /* release owned preview resources */ }
```

These are presentation fragments, not functional preview code. Keep UnityEditor implementations in editor assemblies
or guards, and disable actions when prerequisites are missing. Use DisableInPlayMode/DisableInEditorMode only when the
operation genuinely cannot run safely in that mode; visibility alone does not guard programmatic callers.

Destructive operations keep a label, state target count/scope, confirm before applying, support cancellation and
record Undo where supported. Never execute a mutation merely because a button is drawn. Avoid color-only meaning.

## Consumer checks

Verify narrow/normal width, keyboard use, tab/group paths, mixed multi-selection, visible invalid-state summaries,
mode changes without data loss, and correctly scoped button effects. See [`VERSION_AND_MODULES.md`](VERSION_AND_MODULES.md).

Sources: [TabGroup](https://odininspector.com/attributes/tab-group-attribute),
[ResponsiveButtonGroup](https://odininspector.com/attributes/responsive-button-group-attribute),
[InlineButton](https://odininspector.com/attributes/inline-button-attribute).
