# Pickers and validation — constrain choices without hiding bad data

Code conventions own enum versus data-defined identity selection:
`skill://aku-code-conventions/BOUNDED_DOMAIN_FIELDS.md`. This guide owns Odin mechanisms.

## Select the mechanism

| Need | Mechanism | Boundary |
| --- | --- | --- |
| Stable code-defined state | enum; EnumToggleButtons/EnumPaging when useful | Do not recreate a type-safe enum with strings. |
| Data-defined primitive ID | ValueDropdown + authority provider | Display label and stored identity can differ. |
| Hierarchical ID | ValueDropdownList with slash-separated labels | Store stable values; renaming a label must not change identity. |
| Asset reference | Object field or AssetSelector | Scope paths/type/labels to the actual project. |
| Scene/child reference | SceneObjectsOnly / ChildGameObjectsOnly where supported | Filtering is not proof of lifetime or ownership. |
| Managed polymorphic implementation | TypeFilter / PolymorphicDrawerSettings | Requires valid managed storage, not a Unity-object implementation. |
| Reusable rich selection | OdinSelector / GenericSelector | Commit on confirmation; cancel preserves prior data. |

For `[SerializeReference]`, only eligible serializable managed classes are values; MonoBehaviour/ScriptableObject
implementations need Unity object slots and separate interface validation. Do not switch runtime serializers to get a picker.

## Dropdown UX

Use friendly labels with stable IDs, a meaningful title and search for large sets (verify the installed version's
search options). `IsUniqueList` controls unique multi-selection; `ExcludeExistingValuesInList` hides chosen options;
`DrawDropdownForListElements` changes per-element presentation. Pick deliberately rather than combining all flags.

Keep the current value visible if its authority entry is missing. Show “Controller missing” or “Selected ID no longer
exists” with remediation; an empty dropdown without explanation looks broken. A picker constrains new input but does
not migrate old values or validate assignments made by code.

## Cached providers: ownership and invalidation

Do bounded discovery outside frequently evaluated getters. Cache by authority identity and its relevant revision.
Invalidate when the authority assignment changes, on applicable project/controller changes, after Undo/redo and on
explicit refresh. Pair event subscriptions with disposal; do not use a static cache keyed only by display name.

The editor-only fragment below caches tags; embed it in an owned editor model. It is not a runtime component and
requires the owner to call Dispose on window/model teardown. The producer may allocate on invalidation, not each read.

```csharp
private sealed class TagChoices : System.IDisposable
{
    private string[] _values;

    public TagChoices()
    {
        UnityEditor.EditorApplication.projectChanged += Invalidate;
        UnityEditor.Undo.undoRedoPerformed += Invalidate;
    }

    public System.Collections.Generic.IEnumerable<string> GetValues()
    {
        if (_values == null)
        {
            _values = UnityEditorInternal.InternalEditorUtility.tags;
        }
        return _values;
    }

    public void Invalidate()
    {
        _values = null;
    }

    public void Dispose()
    {
        UnityEditor.EditorApplication.projectChanged -= Invalidate;
        UnityEditor.Undo.undoRedoPerformed -= Invalidate;
        _values = null;
    }
}
```

Expose an explicit refresh because project-change notifications need not cover every unsaved settings edit. A custom
inspector/controller model needs its own relevant invalidation signals; do not present this tag cache as a universal
Animator cache. Short-lived selection popups can snapshot their options once at opening.

For attributes on runtime fields, preserve named provider/predicate declarations for `nameof` binding; guard only
editor-dependent bodies, or guard the attribute together with its provider when required by a target rule. Never guard
away the serialized field itself. See [`ODIN_ATTRIBUTES.md`](ODIN_ATTRIBUTES.md) §6.

## Validation layers

| Invariant | Mechanism |
| --- | --- |
| Object/string presence | Required; optional tooltip describes null behavior. |
| Context-specific prefab presence | RequiredIn with the intended PrefabKind; test non-prefab cases too. |
| Minimum/exact collection count | RequiredListLength when installed, otherwise a collection predicate. |
| Null elements or duplicate identity | Explicit collection validation; count alone is insufficient. |
| Cross-field bounds or membership | Pure ValidateInput predicate against the same authority. |
| Explanation/status | InfoBox or DetailedInfoBox; message states cause and next action. |

Attribute propagation to list elements is attribute/version-specific. Test empty, null-element, duplicate and stale
values instead of inferring behavior from the attribute name. Full policy: `skill://aku-code-conventions/REQUIRED_FIELDS.md`.

Validators report; they should not silently repair authored data during repaint/discovery. A deterministic fix is a
separate action with known targets, Undo and persistence handling. Inspector errors do not automatically block Play,
saving or builds. Project-wide gates require a configured validation workflow; optional Odin Validator is not assumed.

OnValueChanged/OnCollectionChanged can invalidate caches for Inspector edits. They are not callbacks for every
programmatic/runtime change. Runtime invariants must be enforced independently.

Sources: [ValueDropdown](https://odininspector.com/attributes/value-dropdown-attribute),
[AssetSelector](https://odininspector.com/attributes/asset-selector-attribute),
[TypeFilter](https://odininspector.com/attributes/type-filter-attribute),
[RequiredListLength](https://odininspector.com/attributes/required-list-length-attribute),
[ValidateInput](https://odininspector.com/attributes/validate-input-attribute).
