# Example — safe editor-only reference setup

Illustrative Odin-enabled component; verify compilation, Undo, prefab overrides and save/reopen in the consumer.
Without Odin, replace Required with initialization assertions and the button with a ContextMenu trigger.

```csharp
using Sirenix.OdinInspector;
using UnityEngine;

namespace GameName.Gameplay
{
    [DisallowMultipleComponent]
    public class Turret : MonoBehaviour
    {
        //----------------------------------------------------------------------
        // Serialized Fields
        //----------------------------------------------------------------------
        [Required]
        [SerializeField] private Animator _animator;
        [Required]
        [SerializeField] private Transform _muzzle;

        //----------------------------------------------------------------------
        // Private Fields
        //----------------------------------------------------------------------
        private static readonly int FIRE_HASH = Animator.StringToHash("Fire");

        //----------------------------------------------------------------------
        // Logic
        //----------------------------------------------------------------------
        public void Fire()
        {
            // Inspector validation does not protect against runtime destruction.
            if (_animator == null || _muzzle == null)
            {
                return;
            }
            _animator.SetTrigger(FIRE_HASH);
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
            UnityEditor.SerializedObject serialized = new UnityEditor.SerializedObject(this);
            try
            {
                serialized.Update();
                UnityEditor.SerializedProperty animator = serialized.FindProperty("_animator");
                UnityEditor.SerializedProperty muzzle = serialized.FindProperty("_muzzle");
                if (animator.objectReferenceValue == null)
                {
                    Animator[] candidates = GetComponentsInChildren<Animator>(true);
                    if (candidates.Length == 1)
                    {
                        animator.objectReferenceValue = candidates[0];
                    }
                    else
                    {
                        Debug.LogWarning("Setup Refs: assign Animator manually; expected one candidate.", this);
                    }
                }
                if (muzzle.objectReferenceValue == null)
                {
                    // Exact authoring path; an absent child remains visibly unwired.
                    muzzle.objectReferenceValue = transform.Find("Muzzle");
                }
                serialized.ApplyModifiedProperties();
            }
            finally
            {
                serialized.Dispose();
            }
        }
#endif
    }
}
```

## Why this shape

- Existing assignments survive setup; ambiguous child matches are reported rather than silently accepted.
- `SerializedObject` applies field changes with Undo, dirty state and prefab-override integration; no automatic save.
- Source-prefab internal wiring and scene-instance references remain separate ownership decisions.
- The runtime uses serialized references and validates both dependencies it needs.
- `Reset()` is a convenience, not a substitute for rerunning setup after authoring children.

For direct object writes rather than serialized-property edits, follow
[`REFERENCE_WIRING.md`](../REFERENCE_WIRING.md) §3. Test nested prefabs/variants and Undo/redo on the actual target.
