# Example — `Setup Refs` editor-only auto-wiring

Populate `[SerializeField]` slots at **edit-time** instead of dragging each ref by hand — without ever doing a runtime `GetComponent`/`Find`. The auto-wire region is `#if UNITY_EDITOR` so it is stripped from player builds. See [`REFERENCE_WIRING.md`](../REFERENCE_WIRING.md) §4.

```csharp
using Sirenix.OdinInspector;
using UnityEngine;

namespace <GameName>.<Variant>
{
    /// <summary>Turret that fires from a muzzle; refs auto-wired in the Editor.</summary>
    [DisallowMultipleComponent]
    public class Turret : MonoBehaviour
    {
        //----------------------------------------------------------------------
        // Serialized Fields
        //----------------------------------------------------------------------
        [SerializeField] private Rigidbody _rigidbody;       // same GameObject
        [SerializeField] private Animator _animator;         // child
        [SerializeField] private Transform _muzzle;          // named child
        [SerializeField] private Collider _detectionVolume;  // child trigger

        //----------------------------------------------------------------------
        // Private Fields
        //----------------------------------------------------------------------
        private static readonly int FIRE_HASH = Animator.StringToHash("Fire");
        private bool _isReady;

        //----------------------------------------------------------------------
        // Lifecycle
        //----------------------------------------------------------------------
        private void Awake()
        {
            // Reads serialized refs only — never GetComponent/Find at runtime.
            _isReady = _rigidbody != null && _muzzle != null;
        }

        //----------------------------------------------------------------------
        // Logic
        //----------------------------------------------------------------------
        public void Fire()
        {
            if (!_isReady)
            {
                return;
            }

            _animator.SetTrigger(FIRE_HASH);
        }

#if UNITY_EDITOR
        //----------------------------------------------------------------------
        // Editor — reference auto-wiring (stripped from player builds)
        //----------------------------------------------------------------------
        private void Reset()                 // runs on Add Component / "Reset"
        {
            SetupRefs();
        }

        [Button(SdfIconType.Link45deg, "Setup Refs")]   // Inspector button (Odin)
        private void SetupRefs()
        {
            UnityEditor.Undo.RecordObject(this, "Setup Refs");
            _rigidbody = GetComponent<Rigidbody>();
            _animator = GetComponentInChildren<Animator>();
            _muzzle = transform.Find("Muzzle");
            _detectionVolume = GetComponentInChildren<Collider>();
            UnityEditor.EditorUtility.SetDirty(this);   // persist into scene/prefab
        }
#endif
    }
}
```

## Conventions encoded

- ✅ `[SerializeField] private` slots; runtime (`Awake`/`Fire`) reads them only — zero runtime `GetComponent`/`Find`
- ✅ Auto-wire region fully under `#if UNITY_EDITOR` — no `UnityEditor.*` in the build
- ✅ `EditorUtility.SetDirty(this)` persists; `Undo.RecordObject` makes it undoable
- ✅ Both triggers: `[Button(SdfIconType.Link45deg, "Setup Refs")]` (manual; `[ContextMenu]` without Odin) + `Reset()` (on add) — both editor-only
- ✅ Fully-qualified `UnityEditor.*` — no top-level `using UnityEditor;` needing a guard
- ✅ Section dividers, access modifiers, braces, no `var`
- ✅ Animator parameter hashed once; runtime uses the integer setter overload

## Caveats

- `Reset()` wires what exists when the component is added; re-run **Setup Refs** after building children.
- Does NOT cover runtime-`Instantiate`d objects (`REFERENCE_WIRING.md` §5 exception) or cross-scene refs.
- For a prefab **instance**, run Setup Refs on the prefab asset (see `skill://aku-prefab`) so values live on the source.
- Never auto-wire in `OnValidate` (runs constantly, API-restricted).
- Child lookup by name (`transform.Find("Muzzle")`) is edit-time only — a rename surfaces as an empty slot before Play; prefer typed `GetComponentInChildren<T>()` where unambiguous.

## Cross-references

- [`REFERENCE_WIRING.md`](../REFERENCE_WIRING.md) — §4 editor-time auto-wiring, §1 runtime ban
- [`monobehaviour-template.md`](monobehaviour-template.md) — canonical class structure
