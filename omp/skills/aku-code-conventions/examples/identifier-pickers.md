# Example — Unity identifier pickers
Unity-owned identifiers change in project settings or controller assets, not in C# source. When Odin is installed,
every serialized single selection uses a dropdown sourced from that authority; multiple selections use checkboxes.
The stored primitive is an API boundary, never a free-text authoring surface.

Provider methods stay compiled for `nameof(...)`; only their `UnityEditor` bodies are stripped.

```csharp
using System.Collections;
using System.Collections.Generic;
using Sirenix.OdinInspector;
using UnityEngine;
```

## GameObject layers

Store a single layer as its integer index. `LayerMask` is Unity's native multiple-selection checkbox field.

```csharp
[ValueDropdown(nameof(GetGameObjectLayers))]
[SerializeField] private int _gameObjectLayer;
[SerializeField] private LayerMask _collisionLayers;
private static IEnumerable GetGameObjectLayers()
{
#if UNITY_EDITOR
    ValueDropdownList<int> layers = new ValueDropdownList<int>();
    foreach (string layerName in UnityEditorInternal.InternalEditorUtility.layers)
    {
        int layerIndex = LayerMask.NameToLayer(layerName);
        if (layerIndex >= 0)
        {
            layers.Add(layerName, layerIndex);
        }
    }
    return layers;
#else
    return new int[0];
#endif
}
```

## Sorting layers

`SortingLayer.layers` is the authority. Store `SortingLayer.id`, not the mutable display name. Use a checkbox list
only when the field genuinely accepts several sorting layers.

```csharp
[ValueDropdown(nameof(GetSortingLayers))]
[SerializeField] private int _sortingLayerId;
[ValueDropdown(nameof(GetSortingLayers), IsUniqueList = true)]
[SerializeField] private List<int> _visibleSortingLayerIds = new List<int>();
private static IEnumerable GetSortingLayers()
{
#if UNITY_EDITOR
    ValueDropdownList<int> layers = new ValueDropdownList<int>();
    foreach (SortingLayer layer in SortingLayer.layers)
    {
        layers.Add(layer.name, layer.id);
    }
    return layers;
#else
    return new int[0];
#endif
}
```

## Animator parameter, Animator layer, and exceptional Animator state

Normal gameplay serializes parameters, not states. An Animator state field exists only for a justified direct-state
exception such as preview/scrubbing or deliberate same-state restart, and stores the full `Layer.State` path.

```csharp
[Required]
[SerializeField] private Animator _animator;
[ValueDropdown(nameof(GetTriggerParameters))]
[SerializeField] private string _attackParameter = "Attack";
[ValueDropdown(nameof(GetTriggerParameters), IsUniqueList = true)]
[SerializeField] private List<string> _cancelledTriggers = new List<string>();
[ValueDropdown(nameof(GetAnimatorLayers))]
[SerializeField] private string _previewLayer = "Base Layer";
[ValueDropdown(nameof(GetAnimatorLayers), IsUniqueList = true)]
[SerializeField] private List<string> _blendedLayers = new List<string>();
[ValueDropdown(nameof(GetAnimatorStatePaths))]
[ValidateInput(nameof(IsPreviewStateInLayer), "State must belong to the selected Animator layer.")]
[SerializeField] private string _previewStatePath = "Base Layer.Attack";
private int _attackParameterHash;
private int _previewLayerIndex;
private int _previewStateHash;
private void Init()
{
    _attackParameterHash = Animator.StringToHash(_attackParameter);
    _previewLayerIndex = _animator.GetLayerIndex(_previewLayer);
    _previewStateHash = Animator.StringToHash(_previewStatePath);
}
private bool IsPreviewStateInLayer(string statePath)
{
    return !string.IsNullOrEmpty(statePath) && statePath.StartsWith(_previewLayer + ".");
}
```

`Animator.GetLayerIndex` and `Animator.StringToHash` run once during initialization. Runtime setters receive cached
integers. Resolve each selected layer once. An exceptional state keeps its full-path hash paired with its layer index;
routine gameplay uses parameter transitions instead. Tooling-only multi-state fields use the state provider with
`IsUniqueList = true`.

All Animator providers read the same controller authority, unwrapping `AnimatorOverrideController` first:

```csharp
#if UNITY_EDITOR
private UnityEditor.Animations.AnimatorController GetAnimatorController()
{
    RuntimeAnimatorController runtime = _animator == null ? null : _animator.runtimeAnimatorController;
    AnimatorOverrideController overrideController = runtime as AnimatorOverrideController;
    RuntimeAnimatorController controller =
        overrideController == null ? runtime : overrideController.runtimeAnimatorController;
    return controller as UnityEditor.Animations.AnimatorController;
}
#endif
private IEnumerable GetTriggerParameters()
{
#if UNITY_EDITOR
    UnityEditor.Animations.AnimatorController controller = GetAnimatorController();
    List<string> names = new List<string>();
    if (controller != null)
    {
        foreach (AnimatorControllerParameter parameter in controller.parameters)
        {
            if (parameter.type == AnimatorControllerParameterType.Trigger)
            {
                names.Add(parameter.name);
            }
        }
    }
    return names;
#else
    return new string[0];
#endif
}
private IEnumerable GetAnimatorLayers()
{
#if UNITY_EDITOR
    UnityEditor.Animations.AnimatorController controller = GetAnimatorController();
    List<string> names = new List<string>();
    if (controller != null)
    {
        foreach (UnityEditor.Animations.AnimatorControllerLayer layer in controller.layers)
        {
            names.Add(layer.name);
        }
    }
    return names;
#else
    return new string[0];
#endif
}
private IEnumerable GetAnimatorStatePaths()
{
#if UNITY_EDITOR
    UnityEditor.Animations.AnimatorController controller = GetAnimatorController();
    List<string> paths = new List<string>();
    if (controller != null)
    {
        foreach (UnityEditor.Animations.AnimatorControllerLayer layer in controller.layers)
        {
            if (layer.name != _previewLayer)
            {
                continue;
            }
            foreach (UnityEditor.Animations.ChildAnimatorState child in layer.stateMachine.states)
            {
                paths.Add(layer.name + "." + child.state.name);
            }
        }
    }
    return paths;
#else
    return new string[0];
#endif
}
```

The state provider matches `skill://aku-animator`'s supported top-level state graph. A project using sub-state machines must
recurse through child state machines rather than flatten duplicate names.

## Validation, Luna, and no-Odin fallback

A dropdown constrains new input but does not migrate renamed values. Add `[ValidateInput]` against the same authority
when stale data must block authoring. Keep its predicate compiled in every build and guard only its editor body.

On Luna, guard the Sirenix `using` and each Odin attribute with `#if UNITY_EDITOR && ODIN_INSPECTOR`; never guard the
serialized field. The provider methods above remain compiled, while their UnityEditor bodies are already conditional.

Without Odin, preserve the sanctioned degraded fallback: primitive fields plus a `static class` of `const` names.
There is no custom drawer or generated identifier layer in this kit.

See [`bounded-domain-fields.md`](bounded-domain-fields.md) recipe 7 for the exact Luna guard shape and no-Odin tier,
[`ANIMATOR_DRIVING.md`](../ANIMATOR_DRIVING.md) for runtime transitions, and
`skill://aku-odin/ODIN_ATTRIBUTES.md` for member-referencing attribute build rules.
