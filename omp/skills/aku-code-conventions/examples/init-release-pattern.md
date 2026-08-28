# Example — Init/Release lifecycle pairing

Plain C# class (not MonoBehaviour) demonstrating the Supercent `Init()` / `Release()` pairing. Owner MonoBehaviour drives the lifecycle.

## The pair

```csharp
using System;
using UnityEngine;

namespace <GameName>.<Variant>
{
    /// <summary>Weapon model + behaviour; owned by Player.</summary>
    public class Weapon
    {
        //----------------------------------------------------------------------
        // Private Fields
        //----------------------------------------------------------------------
        private readonly int _weaponId;
        private GameObject _muzzleFx;
        private FireController _fireController;
        private bool _isInitialized;

        //----------------------------------------------------------------------
        // Properties
        //----------------------------------------------------------------------
        public int WeaponId => _weaponId;
        public bool IsReady => _isInitialized && _fireController != null;

        //----------------------------------------------------------------------
        // Events
        //----------------------------------------------------------------------
        public event Action<int> OnFired;

        //----------------------------------------------------------------------
        // Init / Release
        //----------------------------------------------------------------------
        public Weapon(int weaponId)
        {
            _weaponId = weaponId;
        }

        public void Init(Transform parent)
        {
            if (_isInitialized)
            {
                return;
            }

            // Allocate in forward order: deepest dependency first.
            _muzzleFx = WeaponAssets.SpawnMuzzleFx(_weaponId, parent);
            _fireController = new FireController(_muzzleFx);
            _fireController.Init();
            _fireController.OnFire += HandleFire;

            _isInitialized = true;
        }

        public void Release()
        {
            if (!_isInitialized)
            {
                return;
            }

            // Reverse order of Init: handler first, controller next, asset last.
            _fireController.OnFire -= HandleFire;
            _fireController.Release();
            _fireController = null;

            if (_muzzleFx != null)
            {
                UnityEngine.Object.Destroy(_muzzleFx);
                _muzzleFx = null;
            }

            OnFired = null;
            _isInitialized = false;
        }

        //----------------------------------------------------------------------
        // Logic
        //----------------------------------------------------------------------
        public void Fire()
        {
            if (!IsReady)
            {
                return;
            }
            _fireController.Fire();
        }

        private void HandleFire()
        {
            OnFired?.Invoke(_weaponId);
        }
    }
}
```

## Owner MonoBehaviour drives lifecycle

```csharp
public class Player : MonoBehaviour
{
    //----------------------------------------------------------------------
    // Serialized Fields
    //----------------------------------------------------------------------
    [SerializeField] private int _initialWeaponId = 1;
    [SerializeField] private Transform _weaponMount;

    //----------------------------------------------------------------------
    // Private Fields
    //----------------------------------------------------------------------
    private Weapon _weapon;

    //----------------------------------------------------------------------
    // Lifecycle
    //----------------------------------------------------------------------
    private void Awake()
    {
        _weapon = new Weapon(_initialWeaponId);
        // Deferred until Init — see <STRUCTURE.md §4>: no external access in Awake.
    }

    public void Init()
    {
        _weapon.Init(_weaponMount);
    }

    private void OnDestroy()
    {
        // Mirror order: child Release before nulling.
        _weapon?.Release();
        _weapon = null;
    }
}
```

## Why pair?

- **Pool reuse**: when an enemy returns to a pool and is re-Init'd later, dangling event handlers from the previous life would fire on a stale subscriber. `Release` clears them.
- **Reverse-order**: nulling `_fireController` before unsubscribing would NPE the unsubscribe.
- **Idempotency**: both `Init()` and `Release()` early-return on duplicate call. Defensive but cheap.
- **Diagnostics**: `_isInitialized` flag lets external code check readiness without hitting half-built state.

## Conventions encoded

- ✅ Namespace placeholder `<GameName>.<Variant>`
- ✅ Section dividers (Private Fields → Properties → Events → Init/Release → Logic)
- ✅ All access modifiers explicit
- ✅ Full braces, no `var`
- ✅ Init/Release paired; reverse-order release
- ✅ Idempotency guard (`_isInitialized`)
- ✅ Owner (`Player.OnDestroy`) drives child release
- ✅ Comments describe *why* (pool reuse, reverse-order rationale)

## Cross-references

- [`STRUCTURE.md`](../STRUCTURE.md) — lifecycle pairing rules
- [`monobehaviour-template.md`](monobehaviour-template.md) — Awake↔OnDestroy variant
