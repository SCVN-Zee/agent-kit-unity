# Example — grouped component authoring

Illustrative generic configuration component for an Odin-enabled project, not a gameplay implementation or
consumer-verified fixture. Use tabs only when the real component has enough independent tasks to benefit.
Replace `GameName` with the project's namespace. No optional serializer/module is required.

```csharp
using Sirenix.OdinInspector;
using UnityEngine;

namespace GameName.Gameplay
{
    public sealed class ActorSettings : MonoBehaviour
    {
        //----------------------------------------------------------------------
        // Serialized Fields
        //----------------------------------------------------------------------
        [Title("References")]
        [Required]
        [SerializeField] private Animator _animator;

        [TabGroup("Authoring", "Movement")]
        [SerializeField, MinValue(0f), SuffixLabel("m/s", Overlay = true)]
        private float _walkSpeed = 3f;
        [TabGroup("Authoring", "Movement")]
        [ValidateInput(nameof(IsRunSpeedValid), "Run speed must be at least walk speed.")]
        [SerializeField, MinValue(0f), SuffixLabel("m/s", Overlay = true)]
        private float _runSpeed = 6f;
        [TabGroup("Authoring", "Movement")]
        [SerializeField, MinValue(0f), SuffixLabel("deg/s", Overlay = true)]
        private float _turnSpeed = 180f;

        [TabGroup("Authoring", "Feedback")]
        [SerializeField] private bool _enableFeedback = true;
        [TabGroup("Authoring", "Feedback")]
        [EnableIf(nameof(_enableFeedback))]
        [SerializeField, PropertyTooltip("Optional: no sound when empty.")]
        private AudioClip _hitSound;
        [TabGroup("Authoring", "Feedback")]
        [EnableIf(nameof(_enableFeedback))]
        [SerializeField, PropertyRange(0f, 1f)] private float _volume = 0.8f;

        //----------------------------------------------------------------------
        // Properties
        //----------------------------------------------------------------------
        [FoldoutGroup("Diagnostics")]
        [ShowInInspector, ReadOnly]
        private bool HasAnimator => _animator != null;

        //----------------------------------------------------------------------
        // Logic
        //----------------------------------------------------------------------
        private bool IsRunSpeedValid(float value)
        {
            return value >= _walkSpeed;
        }
    }
}
```

## Decisions demonstrated

- Shared required wiring stays visible outside tabs; movement and feedback are separate authoring tasks.
- Disabling feedback retains authored values and explains the optional reference; it does not clear data.
- Units, bounds and cross-field validation communicate different constraints.
- Diagnostics are derived and unpersisted; named predicates stay compiled for attribute `nameof` binding.
- Additional responsive-tab options are version-gated in [`GROUPING_AND_ACTIONS.md`](../GROUPING_AND_ACTIONS.md).

In a real runtime component, expose only the needed API and enforce gameplay invariants independently. Test
multi-selection, narrow width and save/reopen with the consumer checklist in
[`VERSION_AND_MODULES.md`](../VERSION_AND_MODULES.md).
