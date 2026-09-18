# Collections and references — choose by authoring task

Rendering is not serialization. Before adding a drawer, establish where its data lives, how changes are applied,
and what survives scene/asset reload. Follow the project's existing serializer; do not adopt Odin runtime serialization
for a visual convenience.

## Collection surfaces

| Task | Surface | Important settings/decisions |
| --- | --- | --- |
| Ordered heterogeneous steps | ListDrawerSettings | Meaningful element labels, index labels when order matters, paging, safe add/remove. |
| Compare same-schema records | TableList | Few useful columns, TableColumnWidth, bounded previews, paging/scroll area. |
| Search a large collection | Searchable | Search depth/member selection and behavior depend on version; test actual data. |
| Spatial 2D editing | TableMatrix | Two-dimensional array presentation, not ordinary record comparison. |
| Key/value lookup | DictionaryDrawerSettings | Clear key/value labels and explicit duplicate-key behavior. |

`ListDrawerSettings(IsReadOnly = true)` constrains collection structure; distinguish that from disabling all element
editing with ReadOnly. CustomAddFunction must create valid defaults without hidden asset writes. Avoid using list
indices as persistent identity if authors can reorder rows.

For tables, collapse infrequent details into a detail view rather than making every column narrow. Use VerticalGroup
for related cells and fixed thumbnail widths only where recognition benefits. Do not assume paging is virtualization;
profile real large collections and avoid expensive per-row getters.

Example: [`examples/collection-config.md`](examples/collection-config.md).

## Storage boundaries

- Unity-serialized arrays/lists of supported serializable row types are the default for persistent authoring data.
- TableMatrix renders 2D arrays; traditional Unity serialization does not persist those directly. Use transient editor
  data or a proven backing representation, such as a flat serialized list with explicit dimensions and apply logic.
- Dictionary support is Unity-version/shape dependent. Older projects need a supported backing representation;
  newer support must be checked against the exact Unity/Odin versions. DictionaryDrawerSettings adds no serializer.
- ShowInInspector exposes a member, not a persistence contract. A getter-created copy may display changes that vanish.
- A flattened grid or adapter needs explicit Undo/apply/save ownership; never claim the visual projection stores data.

## Referenced assets and inline values

`InlineProperty` unfolds a value object into its parent layout. `InlineEditor` draws a referenced Unity object's editor;
changing it changes that shared object, not a private copy of the parent.

Choose InlineEditor mode according to the task: compact/foldout editing for occasional changes, preview-only modes
for visual selection, full editor only when in-place work is genuinely frequent. Preserve the object field and a way
to navigate to the owner when shared-asset identity matters. Hidden reference pickers can make ownership unclear.

Use AssetsOnly/SceneObjectsOnly where location is contractual. AssetSelector's Paths/Filter should reflect the real
content root, not a copied `Assets/Configs` guess. A generic browser may accept a validated root or selected folder.

PreviewField helps recognize sprites/materials/meshes; constrain size and nested depth. Cache owned preview resources
and dispose them; do not destroy a source asset when releasing a preview. Avoid recursively embedding a whole graph.

## Numbers and diagnostics

Use labels or SuffixLabel for units; use Unit only when the installed version supports the intended combination.
Stored and displayed units can differ, so document storage semantics. MinValue/MaxValue/PropertyRange express real
bounds; MinMaxSlider expresses an interval. A range is not a preferred default masquerading as a constraint.

ProgressBar represents a meaningful bounded quantity, not decorative status. ShowInInspector + ReadOnly or
DisplayAsString suits derived diagnostics; keep getters pure and inexpensive. DelayedProperty can reduce intermediate
edits for suitable fields, but test its combination with Unit/range drawers instead of assuming composition.

## Verification

Test empty/large lists, add/remove/reorder, null entries, duplicates, meaningful labels, narrow width, keyboard use,
mixed multi-selection and prefab variants. For persistence, save/reopen and reload assemblies; for edits, Undo/redo.
Shared inline edits must affect the intended asset only. See [`VERSION_AND_MODULES.md`](VERSION_AND_MODULES.md).

Sources: [ListDrawerSettings](https://odininspector.com/attributes/list-drawer-settings-attribute),
[TableList](https://odininspector.com/attributes/table-list-attribute),
[TableMatrix](https://odininspector.com/attributes/table-matrix-attribute),
[DictionaryDrawerSettings](https://odininspector.com/attributes/dictionary-drawer-settings),
[InlineEditor](https://odininspector.com/attributes/inline-editor-attribute).
