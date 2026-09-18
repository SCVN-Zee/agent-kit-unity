# Reference Wiring — Inspector-first

Acquire references known at scene-authoring time through serialized slots, not runtime searches. This is house policy:
visible dependencies are easier to validate than hidden lookups. It is not a claim that every one-time lookup is slow.
[`STRUCTURE.md`](STRUCTURE.md) owns initialization order; this file owns acquisition and editor wiring.

## 1. Scene-time policy

Use `[SerializeField]` for same-object, child and other scene-component references. Do not call `GetComponent*`,
`FindObjectOfType*`, `FindObjectsByType`, `GameObject.Find` or `transform.Find` at runtime to discover these dependencies,
even in `Awake`/`Start`. Editor setup can use bounded, unambiguous lookup.

```csharp
[Required]
[SerializeField] private Rigidbody _rigidbody;
[Required]
[SerializeField] private Animator _animator;
[SerializeField, PropertyTooltip("Optional: no muzzle effect when empty.")]
private Transform _muzzleEffect;
```

Odin attributes require Odin. Without it use a built-in tooltip and assert required references on the initialization
path that actually runs. See [`REQUIRED_FIELDS.md`](REQUIRED_FIELDS.md). Authoring validation does not replace runtime
handling when dependencies can be destroyed, injected late or invalidated by scene unload.

## 2. Editor-time setup

`Setup Refs` populates serialized slots at edit time. Use an Odin icon button when installed; otherwise use
`[ContextMenu("Setup Refs")]`. `Reset()` can invoke it when the component is added or reset. Keep the region under
`#if UNITY_EDITOR`; do not auto-wire in `OnValidate`, which can run during loading and outside safe editor UI callbacks.

```csharp
#if UNITY_EDITOR
private void Reset()
{
    SetupRefs();
}

[Button(SdfIconType.Link45deg, "Setup Refs")]
private void SetupRefs()
{
    UnityEditor.Undo.RecordObject(this, "Setup Refs");
    // Preserve deliberate assignments. Resolve ambiguity instead of picking an arbitrary child.
    if (_rigidbody == null)
    {
        _rigidbody = GetComponent<Rigidbody>();
    }
    if (UnityEditor.PrefabUtility.IsPartOfPrefabInstance(this))
    {
        UnityEditor.PrefabUtility.RecordPrefabInstancePropertyModifications(this);
    }
}
#endif
```

This excerpt changes a component, not a ScriptableObject asset. Undo records the component/scene change; it does not
save it to disk. For multiple fields, prefer `SerializedObject`/`SerializedProperty` and `ApplyModifiedProperties`,
which integrate Undo, dirty state and prefab overrides. See the complete [`setup-refs-pattern.md`](examples/setup-refs-pattern.md).

## 3. Persistence and ownership

| Target / operation | Contract |
| --- | --- |
| Serialized-property editing | Update the serialized view, edit properties, apply modifications; use its Undo/override integration. |
| Direct component/scene mutation | `Undo.RecordObject` before assignment. Record prefab-instance property modifications afterward if applicable. |
| Direct ScriptableObject asset mutation | Record Undo first and mark the asset dirty after mutation. |
| Add/remove/reparent objects | Use the appropriate Undo structural APIs; `RecordObject` alone does not cover these operations. |
| Save | Save only the authorized scene/asset when requested by the workflow. Dirty marking is not saving. Never save during a report-only review. |

Choose prefab source versus instance deliberately. Shared internal wiring belongs on the source; scene-specific wiring
belongs on the scene instance and cannot be put on the prefab asset. Do not apply unrelated instance overrides to the
source. Prefab Stage, nested prefabs and variants require verifying the intended owner and resulting override.

Setup must preserve existing assignments unless replacement is explicitly requested. Include inactive children when
appropriate, reject ambiguous matches, and report unresolved slots rather than silently choosing the first match.
Never save all assets/scenes merely to persist a local setup operation.

## 4. Runtime-created objects

Scene-time slots cannot point at objects that do not yet exist. Prefer typed prefab references:

```csharp
[Required]
[SerializeField] private EnemyController _enemyPrefab;

private EnemyController Spawn(Transform target)
{
    EnemyController enemy = Instantiate(_enemyPrefab, transform);
    enemy.Init(target);
    return enemy;
}
```

If an existing prefab API returns `GameObject`, `GetComponent<T>()` on that freshly instantiated object is allowed.
Keep child references on its root component and expose typed accessors. Runtime `Find*` remains outside this exception.
Injected/borrowed references need explicit lifetime handling; Inspector wiring does not make another object immortal.

## 5. Interface references: two distinct storage models

- **Scene components/assets:** serialize a concrete component/base type (or `MonoBehaviour` when needed), then validate
  that it implements the interface. An `as IPlayerInput` cast can return null; it is not compile-time implementation
  validation. Cache the validated interface in `Init()` and fail clearly if the contract is not met.
- **Managed polymorphic data:** `[SerializeReference]` supports interface/abstract fields whose instances are eligible
  `[Serializable]` managed classes. Values must not derive from `UnityEngine.Object`; this cannot store a MonoBehaviour,
  Transform or ScriptableObject implementation. Use this for strategies/data, not Inspector scene-component slots.

Do not use `GetComponent<IPlayerInput>()` to bypass the scene-time policy. A concrete serialized base implementing the
interface is preferable to a broadly typed slot where the architecture permits it.

## 6. Initialization and verification

Read self-owned serialized values in `Awake`; coordinate cross-component state through the owner's explicit `Init()`.
Pair `Init` with `Release`, and distinguish releasing owned resources from invalidating borrowed references.

For new wiring, verify assigned values, Undo/redo, prefab overrides, save/reopen, and player compilation in the actual
project. No live Editor means these checks are unverified, not passing.

Sources: [Unity SerializeReference](https://docs.unity3d.com/ScriptReference/SerializeReference.html),
[SetDirty](https://docs.unity3d.com/ScriptReference/EditorUtility.SetDirty.html),
[prefab modifications](https://docs.unity3d.com/ScriptReference/PrefabUtility.RecordPrefabInstancePropertyModifications.html).
