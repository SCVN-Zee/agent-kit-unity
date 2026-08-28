# Class Structure & Lifecycle

## 1. Recommended class structure (REQUIRED for MonoBehaviours)

Section dividers fence five logical sections in this order. Odin attrs (`[Title]`, `[Required]`) assume Odin is
installed — without it use `[Header]`, and the `[Required]` intent degrades to a `Debug.Assert` in `Init()` rather
than vanishing (`skill://aku-odin/ODIN_ATTRIBUTES.md` §1 for the gate, [`REQUIRED_FIELDS.md`](REQUIRED_FIELDS.md) for the tier):

```csharp
namespace <GameName>.<Variant>
{
    /// <summary>Concise description of the class purpose.</summary>
    public class ClassName : MonoBehaviour
    {
        //----------------------------------------------------------------------
        // Serialized Fields
        //----------------------------------------------------------------------
        [Title("Movement")]
        [SerializeField] private float _moveSpeed = 5f;
        [Required]
        [SerializeField] private Transform _target;

        //----------------------------------------------------------------------
        // Private Fields
        //----------------------------------------------------------------------
        private Rigidbody _rigidbody;
        private bool _isAlive = true;

        //----------------------------------------------------------------------
        // Properties
        //----------------------------------------------------------------------
        public bool IsAlive => _isAlive;

        //----------------------------------------------------------------------
        // Lifecycle
        //----------------------------------------------------------------------
        private void Awake() { }
        private void OnDestroy() { }

        //----------------------------------------------------------------------
        // Logic
        //----------------------------------------------------------------------
        public void TakeDamage(float amount) { }
        private void Die() { }
    }
}
```

Section order is fixed. Skip a section only when empty (don't show an empty section divider). Two optional sections when present, each with its own divider: **Events** (after Properties) and **Editor** (`#if UNITY_EDITOR` auto-wiring, after Logic).

For non-MonoBehaviour classes, the same structure applies; replace **Lifecycle** with **Init/Release**.

## 2. Lifecycle pairing

### 2.1 Awake/Start ↔ OnDestroy

Every resource allocated in `Awake` or `Start` must be freed in `OnDestroy`. Children spawned, lists created, events subscribed — all paired.

```csharp
private List<int> _randomIndices = null;
private GameObject _childObject = null;

private void Awake()
{
    _randomIndices = new List<int>();
    for (int i = 0; i < 10; ++i)
    {
        _randomIndices.Add(UnityEngine.Random.Range(0, 100));
    }
    _childObject = Instantiate(_prefab, transform);
}

private void OnDestroy()
{
    _randomIndices.Clear();
    _randomIndices = null;
    _childObject = null;
}
```

### 2.2 Init ↔ Release

Classes implementing `Init()` must implement `Release()`. Release in reverse order of Init.

```csharp
public void Init()
{
    _fx.Init();
    InitMover();
    InitBiter();
    InitFSM();
    _weapon = new Weapon(_weaponID);
    _weapon.Init();
}

public void Release()
{
    _weapon.Release();
    _weapon = null;
    ReleaseFSM();
    ReleaseBiter();
    ReleaseMover();
    _fx.Release();
}
```

### 2.3 Why pair?

- **Resource leaks** persist across scene loads when objects pool/recycle.
- **Event subscriptions** kept past lifetime fire on dead objects → null-deref.
- **Reverse-order release** mirrors construction; avoids partial-state observer notifications.

## 3. No partial classes

Don't declare `partial class`. If a class needs splitting, decompose by responsibility into separate types and compose:

```csharp
// Bad
public partial class Player { /* movement */ }
public partial class Player { /* combat */ }

// Good
public class PlayerMoveController { }
public class PlayerAttackController { }

public class Player : MonoBehaviour
{
    private PlayerMoveController _moveController;
    private PlayerAttackController _attackController;

    public void Init()
    {
        _moveController = new PlayerMoveController();
        _moveController.Init();
        _attackController = new PlayerAttackController();
        _attackController.Init();
    }

    public void Release()
    {
        _attackController.Release();
        _attackController = null;
        _moveController.Release();
        _moveController = null;
    }
}
```

## 4. Awake/Start — no external instance access

Execution order between MonoBehaviours is **not guaranteed** at scene load. Don't reach into singletons / managers in `Awake` or `Start`. Defer cross-component wiring to `Init()` called explicitly by the owner.

```csharp
// Bad — IngameManager may not exist yet
private void Awake()
{
    _target = IngameManager.GetPlayer();
}

// Good
private void Awake()
{
    _hp = 30f;
    _state = EState.Awake;
}

public void Init()
{
    _target = IngameManager.GetPlayer();
}
```

## 5. MonoBehaviour discipline

- **Inherit only when Unity lifecycle is needed.** For coroutines without lifecycle, use a coroutine runner utility — do NOT inherit MonoBehaviour just for `StartCoroutine`.
- **No constructor side-effects.** Unity may serialize/deserialize on Editor reload.
- **No external object binding** (don't keep a reference to a GameObject you don't own — destruction races break code).
- **Static classes must NOT inherit MonoBehaviour** — no GameObject referent → lifecycle never fires.
- **Static constructors** — no complex logic, no cross-class references (init order undefined).
- **Button events** — register in Inspector, not via `AddListener` in code.

## 6. Reference wiring

Scene-time refs MUST be `[SerializeField]` + Inspector drag — never `GetComponent`/`Find*` at runtime, even in `Awake`/`Start`. Only exception: `GetComponent` on objects spawned via `Instantiate()`. Full rule, examples, exceptions, interface workarounds, and §4 composition: **[`REFERENCE_WIRING.md`](REFERENCE_WIRING.md)**.

## Cross-references

- [`NAMING.md`](NAMING.md) — naming rules
- [`examples/monobehaviour-template.md`](examples/monobehaviour-template.md) — full canonical template
- [`examples/init-release-pattern.md`](examples/init-release-pattern.md) — Init/Release demo
