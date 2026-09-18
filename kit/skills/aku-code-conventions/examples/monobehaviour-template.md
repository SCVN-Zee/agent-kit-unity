# Example — canonical MonoBehaviour

Illustrative one-lifetime health component, not a pooling/reset recipe. Keep dividers only for nonempty sections.
Odin is assumed installed; without it use built-in decoration and initialization assertions.
Verify the Animator's Die trigger and transitions in the consumer.

```csharp
using Sirenix.OdinInspector;
using UnityEngine;

namespace GameName.Gameplay
{
    [DisallowMultipleComponent]
    public class PlayerHealth : MonoBehaviour
    {
        //----------------------------------------------------------------------
        // Serialized Fields
        //----------------------------------------------------------------------
        [Title("Stats")]
        [SerializeField, MinValue(1f), LabelText("Max HP")] private float _maxHP = 100f;
        [Title("References")]
        [Required]
        [SerializeField] private Animator _animator;

        //----------------------------------------------------------------------
        // Private Fields
        //----------------------------------------------------------------------
        private static readonly int DIE_HASH = Animator.StringToHash("Die");
        private float _hp;

        //----------------------------------------------------------------------
        // Properties
        //----------------------------------------------------------------------
        public float HP => _hp;
        public float MaxHP => _maxHP;
        public bool IsAlive => _hp > 0f;

        //----------------------------------------------------------------------
        // Events
        //----------------------------------------------------------------------
        public event System.Action<float> OnDamaged;
        public event System.Action OnDied;

        //----------------------------------------------------------------------
        // Lifecycle
        //----------------------------------------------------------------------
        private void Awake()
        {
            _hp = _maxHP;
            Debug.Assert(_animator != null, $"{name}: _animator not wired", this);
        }

        private void OnDestroy()
        {
            // This publisher will not emit again. Subscribers still own external unsubscription.
            OnDamaged = null;
            OnDied = null;
        }

        //----------------------------------------------------------------------
        // Logic
        //----------------------------------------------------------------------
        public void TakeDamage(float amount)
        {
            if (!IsAlive || amount <= 0f || float.IsNaN(amount) || float.IsInfinity(amount))
            {
                return;
            }
            float applied = Mathf.Min(_hp, amount);
            _hp -= applied;
            OnDamaged?.Invoke(applied);
            if (_hp <= 0f)
            {
                Die();
            }
        }

        private void Die()
        {
            if (_animator != null)
            {
                _animator.SetTrigger(DIE_HASH);
            }
            enabled = false;
            OnDied?.Invoke();
        }

#if UNITY_EDITOR
        //----------------------------------------------------------------------
        // Editor
        //----------------------------------------------------------------------
        private void Reset()
        {
            SetupRefs();
        }

        [Button(SdfIconType.Link45deg, "Setup Refs")]
        private void SetupRefs()
        {
            if (_animator != null)
            {
                return;
            }
            UnityEditor.Undo.RecordObject(this, "Setup Refs");
            _animator = GetComponent<Animator>();
            if (UnityEditor.PrefabUtility.IsPartOfPrefabInstance(this))
            {
                UnityEditor.PrefabUtility.RecordPrefabInstancePropertyModifications(this);
            }
        }
#endif
    }
}
```

## Contracts

- Runtime reads serialized dependencies; no scene-time component searches.
- Setup preserves authored references and records prefab overrides; it does not automatically save.
- Damage reports the applied amount and rejects invalid numeric input; callbacks are project-owned integration points.
- `OnDestroy` is not pool return. For reuse, add an owner-driven Init/Release/reset contract before calling this pooled.
- Inspector attributes do not establish runtime dependency validity or guarantee animation graph correctness.

See [`STRUCTURE.md`](../STRUCTURE.md), [`REFERENCE_WIRING.md`](../REFERENCE_WIRING.md),
[`setup-refs-pattern.md`](setup-refs-pattern.md), and `skill://aku-odin/INSPECTOR_UX.md`.
