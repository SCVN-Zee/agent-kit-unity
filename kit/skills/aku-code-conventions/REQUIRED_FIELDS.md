# Required Fields — explicit reference contracts

Every serialized Unity object reference is required unless its null behavior is documented. Odin supplies authoring
feedback; it does not guarantee a reference remains valid at runtime or prevent saving invalid data.
[`REFERENCE_WIRING.md`](REFERENCE_WIRING.md) owns acquisition and persistence.

## 1. Required versus optional

When Odin is installed, put `[Required]` on its own line above the serialized field:

```csharp
[Required]
[SerializeField] private Animator _animator;

[SerializeField, PropertyTooltip("Optional: no hit sound when empty.")]
private AudioClip _hitSound;
```

Only Required uses this dedicated-line house style; other decoration may share a bracket.
For auto-properties, target the serialized backing field explicitly with `[field: Required]` and
`[field: SerializeField]`. Verify the actual Odin property resolver and display in the installed version.

| Value | Contract |
| --- | --- |
| Unity object reference | Required by default; optional tooltip states behavior when empty. |
| Required free-form string | `[Required]` checks missing/empty text; semantic format needs separate validation. |
| Authority-backed identifier | Picker plus membership validation where stale selections matter; Required alone cannot prove membership. |
| Scene reference on a prefab asset | Specify the injection/scene-wiring lifecycle; use context-aware validation rather than unconditional errors. |
| Collection | Validate count, element validity and uniqueness separately (§3). |
| Value type | Use bounds/invariants, not Required to test null. |

## 2. Prefab and runtime context

If a reference is wired on a scene prefab instance, not its source asset, use a deliberate context contract:

```csharp
[RequiredIn(PrefabKind.InstanceInScene)]
[SerializeField] private Camera _mainCamera;
```

Confirm the installed Odin version supports the intended `PrefabKind` and test source/variant/instance contexts.
This attribute does not cover every possible non-prefab object; add the applicable check if that is also a valid owner.
Do not wait for noisy red boxes before deciding ownership. Runtime-injected dependencies should generally be
nonserialized and validated after injection, not treated as missing authoring slots.

Keep runtime guards/assertions where invalid state can still arrive through destruction, unloading, code or external
content. Validation messages explain a repair; they do not substitute for safe runtime behavior.

## 3. Collections: count is not element validity

A non-null list can be empty or contain null entries. Attribute propagation to list elements varies by attribute;
do not assume `[Required]` proves a minimum length or that it can never validate elements.

For count-only constraints, prefer `[RequiredListLength(1, null)]` when supported by the installed package.
For a combined contract, a collection-level `[ValidateInput]` predicate is explicit:

```csharp
[ValidateInput(nameof(HasValidWaypoints), "Assign at least one waypoint and replace empty entries.")]
[SerializeField] private Transform[] _waypoints;

private bool HasValidWaypoints(Transform[] values)
{
    if (values == null || values.Length == 0)
    {
        return false;
    }
    foreach (Transform value in values)
    {
        if (value == null)
        {
            return false;
        }
    }
    return true;
}
```

Specify whether duplicates are meaningful before rejecting them. Test empty, one-null, mixed-validity and valid lists.
Keep named predicates compiled wherever `nameof` is used; guard only editor-dependent bodies when necessary.
See `skill://aku-odin/PICKERS_AND_VALIDATION.md` for authoring mechanisms and version checks.

## 4. Without Odin

Do not emit Sirenix attributes. Keep `[SerializeField]`, document optional behavior with `[Tooltip]`, and assert required
refs on the real initialization path (`Init`, or a self-state lifecycle path if no Init exists):

```csharp
Debug.Assert(_animator != null, $"{name}: _animator not wired", this);
```

Assertions are diagnostics and may be stripped; code that must survive invalid input needs an explicit error/guard path.
Never create an uncalled `Init()` solely to place an assertion there.

## 5. Scope of validation

Inspector feedback is local. Project-wide scans and build/play gates require an explicitly installed and configured
validation workflow, such as optional Odin Validator. Do not assume an error box blocks play or asset saving.

Sources: [Required](https://odininspector.com/attributes/required-attribute),
[RequiredListLength](https://odininspector.com/attributes/required-list-length-attribute),
[ValidateInput](https://odininspector.com/attributes/validate-input-attribute).
