# Inspector UX — task-first composition

Use Odin to reduce authoring mistakes and navigation cost, not to decorate every field. This guide owns **which
layout and interaction to choose**. Attribute syntax stays in [`ODIN_ATTRIBUTES.md`](ODIN_ATTRIBUTES.md); editor
windows and actions stay in [`EDITOR_TOOLING.md`](EDITOR_TOOLING.md).

The Odin presence gate still applies. Target-specific runtime-field constraints belong to the installed build rule.

## 1. Start from the author's task

Arrange information in the order a user needs it:

1. identity and required wiring,
2. primary configuration,
3. optional capabilities,
4. diagnostics and destructive actions.

Do not mirror source regions mechanically. A code section is not automatically an Inspector section.

## 2. Choose the smallest layout

| Authoring shape | Use | Do not use when |
| --- | --- | --- |
| Short, linear flow | `[Title]` at real section changes | only two related fields need no heading |
| Related fields need a visible boundary | `[TitleGroup]` or `[BoxGroup]` | the box would wrap one ordinary field |
| Detail is occasionally relevant | `[FoldoutGroup]` | hiding it would conceal an invalid state |
| One boolean owns a whole capability | `[ToggleGroup]` | the boolean does not actually gate every child |
| Stable sibling work domains | `[TabGroup]` | fields are normally edited together or the labels are vague |
| Naturally paired compact values | `[HorizontalGroup]` | labels/controls clip at narrow Inspector width |
| Same-schema rows compared by columns | `[TableList]` / `[TableMatrix]` | order or heterogeneous item detail matters more than comparison |
| Multi-page workflow or asset browser | menu-tree window | a single Inspector remains scannable |

Tabs are not triggered by a field count. Use them when domains are stable, independently understood, and users
normally work in one domain at a time.

## 3. Tab rules

- Name tabs after responsibilities: `Input`, `Movement`, `Rotation`; avoid `General`, `Misc`, `Other`.
- Keep labels short and order stable. Put the most frequently authored domain first.
- Keep a text label even when using `SdfIconType`; color is not a substitute for meaning.
- Use icons only when the enum member is compile-proven and the symbol is conventional.
- Put a feature gate first in its tab. Disable meaningful dependents instead of making configured values vanish.
- Keep shared identity/status above the tab set only when it is needed while viewing every tab.
- Avoid nested tabs. If tab labels or nested groups stop fitting, consolidate domains or use a menu-tree window.
- Test normal and narrow Inspector widths; never assume the author's dock width.

Choose tab domains from the component's authoring tasks; keep the tab set shallow and sibling-oriented.
## 4. Hide, disable, read-only, or validate

| State | Presentation | Reason |
| --- | --- | --- |
| Field has no meaning in the current mode | `[ShowIf]` / `[HideIf]` | removes irrelevant choices |
| Value remains informative but is inactive | `[EnableIf]` / `[DisableIf]` | preserves authored intent and discoverability |
| Value reports runtime or derived truth | `[ShowInInspector, ReadOnly]` / `[DisplayAsString]` | prevents editing the wrong source of truth |
| Authored value is invalid | `[ValidateInput]` plus a specific message | keeps the field editable and shows remediation |
| Dependency or state needs explanation | conditional `[InfoBox]` | explains cause and next action near the source |

Do not hide an error. Do not use read-only presentation for configuration that actually needs an editable source.
Keep predicates cheap and side-effect free; Odin may evaluate them repeatedly during repaint.

## 5. Present each value for its job

- **Required references:** `[Required]`; add `[AssetsOnly]` / `[SceneObjectsOnly]` when location is part of the contract.
- **Bounded identifiers:** `[ValueDropdown]` only when the set comes from data; follow
  `skill://aku-code-conventions/BOUNDED_DOMAIN_FIELDS.md`.
- **Referenced assets:** `[InlineEditor]` only when in-place editing reduces context switching without expanding a
  large nested object graph.
- **Numbers:** show units with labels/suffixes; use ranges only for real bounds, not preferred defaults.
- **Collections:** keep a list for ordered or heterogeneous data; use a table when row comparison is the task.
- **Status:** make it read-only and visually secondary; use a progress bar only for a meaningful bounded measure.
- **Actions:** group repeated safe actions; keep destructive or infrequent actions labeled and separated.

Tooltips explain ownership, units, side effects, or non-obvious consequences. They do not repeat the label.

## 6. Keep the Inspector responsive

Never perform reflection scans, `AssetDatabase` searches, list allocation, or texture creation from a displayed
getter, condition, dropdown provider, or repaint callback. Cache immutable choices and invalidate them explicitly.
Keep members named by attributes compiled in every applicable build; see `ODIN_ATTRIBUTES.md` §6.

Prefer vertical flow. A dense `HorizontalGroup` or nested layout copied from a wide custom window can become
unusable in a docked Inspector.

## 7. Escalate deliberately

1. Express the workflow with attributes on the object.
2. Use `OdinEditorWindow` when the workflow needs its own window.
3. Use `OdinMenuEditorWindow` when it needs persistent multi-page navigation.
4. Reach for selectors, property trees, drawers, processors, or custom validators only when the prior surface cannot
   express the interaction. See [`ADVANCED_EDITOR_TOOLING.md`](ADVANCED_EDITOR_TOOLING.md).

## Review checklist

- Domains follow user tasks, not source-file regions.
- Short inspectors stay linear; tabs have stable sibling responsibilities.
- Optional values are hidden or disabled for an explicit semantic reason.
- Invalid data remains editable and explains remediation.
- Labels, units, and tooltips make ownership clear.
- Lists/tables and references match the actual authoring task.
- Narrow width remains usable; displayed members do no repaint-heavy work.
