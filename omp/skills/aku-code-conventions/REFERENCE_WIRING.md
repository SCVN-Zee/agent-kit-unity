# Reference Wiring — Inspector-first

Scene-time references — components on the same GameObject, on children, on other scene objects — MUST be acquired via `[SerializeField]` + Inspector drag. No runtime lookups, even in `Awake`/`Start`.

Subfile of [`skill://aku-code-conventions`](SKILL.md). Composes with [`STRUCTURE.md`](STRUCTURE.md) §4 (defer cross-component wiring out of Awake) — §4 governs *when*, this file governs *how*.

## 1. Banned API at scene-time

- `GetComponent<T>()` / `GetComponentInChildren<T>()` / `GetComponentInParent<T>()` — even on `this` GameObject. Same outcome as `[SerializeField]` at non-zero runtime cost, no edit-time visibility.
- `FindObjectOfType<T>()` / `FindObjectsOfType<T>()` — O(scene) traversal, scene-order dependent, silent on missing.
- `GameObject.Find()` / `transform.Find()` — string-keyed, breaks on rename, no compile-time check.

## 2. Canonical pattern

```csharp
public class Player : MonoBehaviour
{
    //----------------------------------------------------------------------
    // Serialized Fields
    //----------------------------------------------------------------------
    [Required]
    [SerializeField] private Rigidbody _rigidbody;

    [Required]
    [SerializeField] private Animator _animator;

    [Required]
    [SerializeField] private Transform _firePoint;

    [Required]
    [SerializeField] private PlayerInput _input;
}
```

Drag each ref in Inspector — or auto-populate the slots with an editor-only `Setup Refs` method (§4). Missing ref → empty Inspector slot → caught before Play.

`[Required]` is mandatory on every one of these, in its own bracket, and an optional ref must say so with a `[PropertyTooltip]`: [`REQUIRED_FIELDS.md`](REQUIRED_FIELDS.md). Without Odin, drop the attribute and assert in `Init()` instead.

## 3. Anti-pattern

```csharp
// Bad — runtime lookups of refs known at edit-time
private void Awake()
{
    _rigidbody = GetComponent<Rigidbody>();                         // banned — even same-GameObject
    _animator  = transform.Find("Visual").GetComponent<Animator>(); // banned — Find + GetComponent
    _input     = FindObjectOfType<PlayerInput>();                   // banned — scene traversal
}
```

## 4. Editor-time auto-wiring (`Setup Refs`)

Manual Inspector dragging is tedious and error-prone for many refs. The sanctioned alternative: an **editor-only** method that populates the serialized slots at edit-time. Runtime still reads only the serialized values — the §1 ban is unchanged; `GetComponent`/`Find` are allowed *here* because this runs in the Editor, never in a build.

```csharp
[SerializeField] private Rigidbody _rigidbody;
[SerializeField] private Animator  _animator;
[SerializeField] private Transform _firePoint;

#if UNITY_EDITOR
    //----------------------------------------------------------------------
    // Editor — reference auto-wiring (stripped from player builds)
    //----------------------------------------------------------------------
    private void Reset()              // runs on Add Component / "Reset"; editor-only
    {
        SetupRefs();
    }

    [Button(SdfIconType.Link45deg, "Setup Refs")]   // visible button; Odin installed
    private void SetupRefs()
    {
        UnityEditor.Undo.RecordObject(this, "Setup Refs");
        _rigidbody = GetComponent<Rigidbody>();
        _animator  = GetComponentInChildren<Animator>();
        _firePoint = transform.Find("FirePoint");
        UnityEditor.EditorUtility.SetDirty(this);
    }
#endif
```

**Rules:**
- Wrap the whole region in `#if UNITY_EDITOR`. What breaks a player build is the **body's `UnityEditor.*` calls** (`Undo`, `EditorUtility`) — those types don't exist in builds. `Reset()` and the trigger attribute are harmless on their own, but wrapping the whole region is the clean way to strip the editor-only logic.
- **Trigger is `[Button]`** when Odin is installed — it renders an actual button in the Inspector, where a `[ContextMenu]` gear entry is discoverable only by people who already know it exists. **Without Odin, use `[ContextMenu("Setup Refs")]`.** Icon guidance: `skill://aku-odin/EDITOR_TOOLING.md` §3.
- Because the region is already `#if UNITY_EDITOR`, `[Button]` here costs **nothing extra on a Luna playable target** — the whole block is stripped before transpile either way.
- `EditorUtility.SetDirty(this)` is **required** so the assignment persists into the scene/prefab; `Undo.RecordObject` makes it undoable.
- Use fully-qualified `UnityEditor.*` (no top-level `using UnityEditor;` to guard).
- `Reset()` wires what exists when the component is added; re-run **Setup Refs** from the Inspector after building children.
- Do **not** auto-wire in `OnValidate` (runs on every inspector change/recompile, API-restricted).

**Limits ("if possible"):** covers same-GameObject, children, and named scene objects. Cannot wire runtime-`Instantiate`d objects (§5 exception applies) or cross-scene refs. For a **prefab instance**, run Setup Refs on the prefab asset (see `skill://aku-prefab`) so values live on the source, not as instance overrides.

## 5. Only allowed exception — runtime-instantiated objects

`[SerializeField]` cannot reference objects that don't exist until Play. For these, `GetComponent` on the newly returned instance is allowed:

```csharp
GameObject enemy = Instantiate(_enemyPrefab, transform);
EnemyController controller = enemy.GetComponent<EnemyController>();
controller.Init(_target);
```

Prefer designing the prefab so its root script holds `[SerializeField]` refs to its own children, then expose typed accessors (`controller.Weapon`, `controller.Animator`) — callers never need `GetComponentInChildren<T>()` on the spawn.

Exception scoped narrowly: `GetComponent` on the freshly returned `Instantiate()` reference. `Find*` family stays banned in all contexts.

## 6. Interface references

`[SerializeField]` cannot bind a bare interface field. Workarounds, in order of preference:

1. **`[SerializeReference]`** (Unity 2019.3+) — supports interface fields and polymorphic instances. Tooling rougher than plain `[SerializeField]`.
2. **Serialize a concrete base type** — e.g., `[SerializeField] private MonoBehaviour _inputBehaviour;` plus `private IPlayerInput _input;` cached as `_inputBehaviour as IPlayerInput` in `Init()`. Compile-checked.
3. **Skip the interface for scene refs** — accept the concrete class where Inspector wiring matters; reserve interfaces for pure-code seams.

Never: `_input = GetComponent<IPlayerInput>()`.

## 7. Why

- **Edit-time validation** — empty Inspector slot is visible before Play. `GetComponent` returning null surfaces only at runtime, often as a downstream NRE far from the missing wire. *Visible is not flagged*, though: a blank slot still relies on someone noticing it. `[Required]` ([`REQUIRED_FIELDS.md`](REQUIRED_FIELDS.md)) turns it into an error box that cannot be scrolled past — which is why the attribute is mandatory rather than encouraged.
- **Refactor safety** — renaming a GameObject breaks `Find()`. Moving a component to another object breaks `GetComponent`. Serialized refs track by Unity's internal GUID/instanceID and survive both.
- **Explicit dependency graph** — Inspector reveals what depends on what. `GetComponent` calls hide the graph until you grep code.
- **Zero runtime cost** — even cached, `GetComponent<T>()` is non-zero. `Find*` is O(scene). SerializeField resolves at deserialization, never at runtime.
- **Unity tooling** — "Find references in scene", asset-dependency tracking, prefab override system all work on serialized fields. Code-resolved refs are invisible to these tools.

## 8. Composition with [`STRUCTURE.md`](STRUCTURE.md) §4

§4 governs *when* cross-component wiring happens (defer to `Init()` from Awake). This file governs *how* (Inspector-wired, not code-resolved). They compose: serialize the ref → in `Init()` read its state and set up dependents.

```csharp
[SerializeField] private Rigidbody _rigidbody;   // this file — Inspector-wired

public void Init()                                // §4 — cross-component reads happen here, not Awake
{
    _initialSpeed = _rigidbody.linearVelocity.magnitude;
}
```

## Cross-references

- [`REQUIRED_FIELDS.md`](REQUIRED_FIELDS.md) — `[Required]` on every serialized ref: shape, type matrix, opt-out marker, no-Odin assert tier
- [`STRUCTURE.md`](STRUCTURE.md) — class structure, lifecycle pairing, MonoBehaviour discipline
- [`NAMING.md`](NAMING.md) — `_` prefix on private/serialized fields
- `rule://aku-code-convention-rules` — automatic bridge into this authoritative skill
