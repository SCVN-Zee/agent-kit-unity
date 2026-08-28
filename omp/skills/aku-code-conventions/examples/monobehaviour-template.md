# Example — Canonical Supercent MonoBehaviour template

Section dividers are REQUIRED. Access modifiers are REQUIRED. Braces are REQUIRED. No `var`. Comments only for *why*.

Odin attrs are shown because Odin is installed here — `[Title]` replaces `[Header]`, `[PropertyTooltip]` replaces
`[Tooltip]` (`skill://aku-odin/ODIN_ATTRIBUTES.md`). **On a project without Odin, use `[Header]`/`[Tooltip]`** — a Sirenix attribute
there is a compile error. `[SerializeField]` is unchanged either way: Odin decorates, Unity serializes.

```csharp
using Sirenix.OdinInspector;
using UnityEngine;

namespace <GameName>.<Variant>
{
    /// <summary>Player health pool with damage events; resets on disable.</summary>
    [DisallowMultipleComponent]
    public class PlayerHealth : MonoBehaviour
    {
        //----------------------------------------------------------------------
        // Serialized Fields
        //----------------------------------------------------------------------
        [Title("Stats")]
        [SerializeField, LabelText("Max HP")] private float _maxHp = 100f;

        [Title("Refs")]
        [Required]
        [SerializeField] private Animator _animator;

        [Required]
        [SerializeField] private AudioSource _audioSource;

        //----------------------------------------------------------------------
        // Private Fields
        //----------------------------------------------------------------------
        private static readonly int DIE_HASH = Animator.StringToHash("Die");
        private float _hp;

        //----------------------------------------------------------------------
        // Properties
        //----------------------------------------------------------------------
        public float Hp => _hp;
        public float MaxHp => _maxHp;
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
            // Reads serialized refs only — never GetComponent/Find at runtime.
            _hp = _maxHp;
        }

        private void OnDestroy()
        {
            // Clearing handlers prevents leaks when this object pools across waves.
            OnDamaged = null;
            OnDied = null;
        }

        //----------------------------------------------------------------------
        // Logic
        //----------------------------------------------------------------------
        public void TakeDamage(float amount)
        {
            if (!IsAlive)
            {
                return;
            }

            _hp = Mathf.Max(0f, _hp - amount);
            OnDamaged?.Invoke(amount);

            if (_hp <= 0f)
            {
                Die();
            }
        }

        private void Die()
        {
            OnDied?.Invoke();

            if (_animator != null)
            {
                _animator.SetTrigger(DIE_HASH);
            }

            // Disable input/collider; let Animator's death-state run before despawn.
            enabled = false;
        }

#if UNITY_EDITOR
        //----------------------------------------------------------------------
        // Editor — reference auto-wiring (stripped from player builds)
        //----------------------------------------------------------------------
        private void Reset()
        {
            SetupRefs();
        }

        [Button(SdfIconType.Link45deg, "Setup Refs")]
        private void SetupRefs()
        {
            UnityEditor.Undo.RecordObject(this, "Setup Refs");
            _animator = GetComponent<Animator>();
            _audioSource = GetComponent<AudioSource>();
            UnityEditor.EditorUtility.SetDirty(this);
        }
#endif
    }
}
```

## Conventions encoded

- ✅ Namespace placeholder `<GameName>.<Variant>` — substitute at generation
- ✅ Section dividers present (Serialized Fields → Private Fields → Properties → Events → Lifecycle → Logic → Editor). Events/Editor get their own divider when present.
- ✅ `[SerializeField] private` on all serialized fields, incl. component refs (`_animator`, `_audioSource`) — Inspector-wired, never `GetComponent` in `Awake`
- ✅ `[Required]` on every Object ref, in its own bracket on its own line (`REQUIRED_FIELDS.md`). `_maxHp` is a `float` — a value type can't be null, so no attribute
- ✅ Editor-only `Setup Refs` (`[Button]` + `Reset`; `[ContextMenu]` without Odin) auto-wires refs at edit-time under `#if UNITY_EDITOR` — see [`setup-refs-pattern.md`](setup-refs-pattern.md)
- ✅ `private` on all lifecycle methods
- ✅ `private` on `Die()`; public-facing API exposed as `TakeDamage()` only
- ✅ No `var` — explicit `float`, `Animator`, `AudioSource`
- ✅ Animator parameter hashed once; runtime uses the integer setter overload
- ✅ Full braces on every `if`
- ✅ `[DisallowMultipleComponent]` to prevent stacking footgun
- ✅ Awake↔OnDestroy paired (handlers cleared in OnDestroy)
- ✅ Comments only describe *why* (pool reuse rationale, animator-state intent)
- ✅ Properties read-only (`public float Hp => _hp;`)

## Cross-references

- [`STRUCTURE.md`](../STRUCTURE.md) — full structure rules
- [`NAMING.md`](../NAMING.md) — naming conventions
- [`setup-refs-pattern.md`](setup-refs-pattern.md) — editor-only `Setup Refs` auto-wiring
- Mobile-performance baseline → the sticky `rule://aku-engine-rules`
