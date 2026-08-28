# Advanced editor tooling — escalate only when needed

Use this file after [`INSPECTOR_UX.md`](INSPECTOR_UX.md) and [`EDITOR_TOOLING.md`](EDITOR_TOOLING.md). It covers
editor-only surfaces for workflows that attributes or one `OdinEditorWindow` cannot express.

All APIs here belong under `Editor/` or `#if UNITY_EDITOR`. Confirm symbols against the installed Odin version;
optional products and modules are not implied by the core Inspector DLLs.

## 1. Escalation ladder

| Surface | Use when | Do not use when |
| --- | --- | --- |
| Attributes on the object | one object owns the workflow | a separate workspace is genuinely needed |
| `OdinEditorWindow` | one tool page needs its own window | navigation is only decorative |
| `OdinMenuEditorWindow` + `OdinMenuTree` | persistent sibling/hierarchical pages share one workspace | one page or one object remains scannable |
| `OdinSelector<T>` | the same searchable selection flow recurs | `[ValueDropdown]` or object field already expresses it |
| Explicit `PropertyTree` | automatic drawing cannot fit a composed editor surface | default Odin drawing preserves the workflow |
| `[CustomValueDrawer]` | one member needs a local presentation exception | behavior is reusable across many members/types |
| Odin drawer / property processor | reusable type/attribute/group behavior is required | an attribute or one-off drawer is sufficient |
| Custom validator/fix | a proven installed validation module must enforce a cross-property/project invariant | `[Required]`, bounds, or `[ValidateInput]` handles it |

Every escalation owns more lifecycle, undo, multi-object, prefab-override, and version-compatibility risk. Stop at the
first level that fully expresses the workflow.

## 2. Menu-tree windows

Use `OdinMenuEditorWindow` for tools with stable pages such as settings, assets, diagnostics, and batch operations.
Override `BuildMenuTree()`, add objects at semantic paths, configure navigation once, then let Odin draw the selected
object.

- Use stable paths (`Configuration/General`, `Diagnostics/Runtime`), not type names or transient IDs.
- Enable search when the tree can grow; enable keyboard navigation unless the tool consumes those keys itself.
- Cache page objects. Rebuilding a tree must not repeat asset scans, network calls, or reflection discovery.
- Rebuild only after explicit invalidation: refresh action, asset change, or domain reload.
- Keep global actions above navigation only when they apply to every selected page.

Canonical template: [`examples/menu-editor-window.md`](examples/menu-editor-window.md).

## 3. Selectors and property trees

Use an `OdinSelector<T>` when selection itself is a reusable workflow: search, hierarchy, multi-select, or a rich
preview. Keep a plain object field or `[ValueDropdown]` for ordinary choices.

Use `PropertyTree` only when embedding Odin-drawn objects into a custom layout. The tree manages Odin properties and
prefab modifications, but the caller still owns creation, drawing cadence, value application, and disposal. Verify
multi-object editing and prefab overrides on the actual target surface before shipping.

Do not create a property tree per repaint. Cache one per stable target set and recreate it when targets change.

## 4. Drawers and processors

Prefer automatic Odin drawers. Custom drawing is justified only when the default cannot communicate the value or
interaction.

- `[CustomValueDrawer]`: one field/property, local exception.
- `OdinValueDrawer<T>`: reusable presentation for a value type.
- `OdinAttributeDrawer<TAttribute, TValue>`: reusable behavior explicitly opted into by an attribute.
- `OdinGroupDrawer<TGroupAttribute>`: custom group layout; highest layout risk.
- `OdinPropertyProcessor<T>`: add/remove attributes or properties systematically; highest discoverability risk.

Before a reusable drawer/processor, prove:

1. attributes cannot express the behavior,
2. default labels, undo, multi-selection, and prefab overrides are preserved,
3. the drawer performs no scans or avoidable allocation in `DrawPropertyLayout`,
4. the type and editor code live in the correct assemblies,
5. a simpler one-off drawer would create harmful duplication.

## 5. Validation

Use core attribute feedback first: `[Required]`, bounds, `[ValidateInput]`, and conditional `[InfoBox]`. Custom
validators and automatic fixes may belong to an optional Odin validation product/module. Confirm its assembly and API
before authoring or citing code.

A fix is appropriate only when deterministic, lossless, and undoable. Otherwise report the error and remediation;
do not mutate author data during repaint or validation discovery.

## 6. Lifecycle, persistence, and performance

- Pair every editor event subscription in enable/disable or initialize/dispose paths.
- `Undo.RecordObject` before asset/scene mutation; mark persistent assets dirty after mutation.
- Use `SerializedObject`/Odin property APIs when multi-object or prefab-override behavior matters.
- Cache `SdfIcons` textures, menu pages, selectors, and property trees at their ownership lifetime.
- Run `AssetDatabase` and reflection discovery on explicit refresh or bounded invalidation, never from getters/drawers.
- Give long operations progress and cancellation; clear progress UI in a `finally` path.
- Keep destructive actions labeled, separated, and confirmation-gated.

## 7. Debug Odin before replacing it

When an attribute appears inert or a drawer order is surprising, use Odin's drawer-chain and property-resolver
diagnostics before writing a replacement drawer. Confirm the property exists, the resolver found the named member,
and the installed version supports the attribute combination.

## Review checklist

- The prior escalation level is demonstrably insufficient.
- Menu paths follow user tasks and pages are cached.
- Selection, multi-edit, prefab overrides, Undo, and persistence are verified where applicable.
- No editor-only symbol reaches runtime assemblies.
- No repaint path allocates icons, scans assets, reflects types, or rebuilds navigation.
- Optional validator APIs are proven from the installed package.
- The actual window receives clicks, keyboard navigation, selection changes, and refresh actions.
