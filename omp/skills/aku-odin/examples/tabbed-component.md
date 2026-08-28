# Example — task-oriented tabbed component

Adapted from Luna Toolkit's `LocomotionMotor`: its 21 serialized fields form seven stable authoring domains —
`Input`, `Movement`, `Rotation`, `Jump`, `Slope`, `Collider`, and `Debug`. This shortened example intentionally shows
representative fields from every domain; it does not claim to reproduce all 21 fields or runtime logic.

The decoration guards shown are the Luna-playable form. Outside Luna, Odin cosmetic attributes do not need guards;
follow [`ODIN_ATTRIBUTES.md`](../ODIN_ATTRIBUTES.md) §6 and `rule://aku-luna-rules`.

```csharp
#if UNITY_EDITOR && ODIN_INSPECTOR
using Sirenix.OdinInspector;
#endif
using UnityEngine;

namespace <GameName>.Locomotion
{
    public sealed class CharacterMotorConfig : MonoBehaviour
    {
        //----------------------------------------------------------------------
        // Serialized Fields
        //----------------------------------------------------------------------
        [SerializeField]
#if UNITY_EDITOR && ODIN_INSPECTOR
        [TabGroup("Motor", "Input")]
        [PropertyTooltip("Optional world-space input source. Leave null for API-driven actors.")]
#endif
        private ScriptableObject _moveWorldChannel;

        [SerializeField]
#if UNITY_EDITOR && ODIN_INSPECTOR
        [TabGroup("Motor", "Movement")]
        [PropertyTooltip("Ground movement speed in metres per second.")]
#endif
        private float _movementSpeed = 7f;

        [SerializeField]
#if UNITY_EDITOR && ODIN_INSPECTOR
        [TabGroup("Motor", "Movement")]
        [MinValue(0f), SuffixLabel("m/s²")]
#endif
        private float _gravity = 30f;

        [SerializeField]
#if UNITY_EDITOR && ODIN_INSPECTOR
        [TabGroup("Motor", "Rotation")]
        [PropertyTooltip("Lets movement own facing. Disable when an aim or cinematic rig owns it.")]
#endif
        private bool _faceMoveDirection = true;

        [SerializeField]
#if UNITY_EDITOR && ODIN_INSPECTOR
        [TabGroup("Motor", "Rotation")]
        [MinValue(0f), SuffixLabel("s")]
#endif
        private float _rotationSmoothTime = 0.1f;

        [SerializeField]
#if UNITY_EDITOR && ODIN_INSPECTOR
        [TabGroup("Motor", "Jump"), LabelText("Enabled")]
#endif
        private bool _jumpEnabled;

        // Visible because the configured value remains useful; disabled because the feature is inactive.
        [SerializeField]
#if UNITY_EDITOR && ODIN_INSPECTOR
        [TabGroup("Motor", "Jump")]
        [EnableIf(nameof(_jumpEnabled)), MinValue(0f), SuffixLabel("m/s")]
#endif
        private float _jumpSpeed = 10f;

        [SerializeField]
#if UNITY_EDITOR && ODIN_INSPECTOR
        [TabGroup("Motor", "Slope"), LabelText("Enabled")]
#endif
        private bool _slopeHandlingEnabled;

        [SerializeField]
#if UNITY_EDITOR && ODIN_INSPECTOR
        [TabGroup("Motor", "Slope")]
        [EnableIf(nameof(_slopeHandlingEnabled)), PropertyRange(0f, 90f), SuffixLabel("°")]
#endif
        private float _slopeLimit = 30f;

        [SerializeField]
#if UNITY_EDITOR && ODIN_INSPECTOR
        [TabGroup("Motor", "Collider")]
        [MinValue(0.01f), SuffixLabel("m")]
#endif
        private float _colliderHeight = 2f;

        [SerializeField]
#if UNITY_EDITOR && ODIN_INSPECTOR
        [TabGroup("Motor", "Collider")]
        [MinValue(0.01f), SuffixLabel("m")]
#endif
        private float _colliderThickness = 1f;

        [SerializeField]
#if UNITY_EDITOR && ODIN_INSPECTOR
        [TabGroup("Motor", "Debug")]
        [PropertyTooltip("Draw the resolved capsule and ground probe in the Scene view.")]
#endif
        private bool _debugDraw;
    }
}
```

## Why tabs fit

- Each tab maps to one runtime responsibility and can be understood independently.
- `Jump` and `Slope` put their gate first, then preserve dependent values while disabled.
- `Debug` is explicit rather than buried in `Misc` or mixed into gameplay configuration.
- Units and bounds are visible where authors enter values.

A short component with only movement speed, gravity, and one reference should remain linear. Do not copy this tab
shape merely because the component is a motor.
