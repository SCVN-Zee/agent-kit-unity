# Luna authoring guards

Luna/Playwork transpiles runtime C# through Bridge.NET. Odin is an editor dependency, so a runtime-transpiled file must expose no Sirenix `using` or attribute outside the editor-and-Odin guard.

## Guard shape

Use the combined guard exactly:

```csharp
#if UNITY_EDITOR && ODIN_INSPECTOR
using Sirenix.OdinInspector;
#endif
```

Guard each Odin attribute in its own region:

```csharp
#if UNITY_EDITOR && ODIN_INSPECTOR
[Title("Movement")]
#endif
[SerializeField] private float _speed = 5f;
```

Never put `[SerializeField]` or `[SerializeReference]` inside the guard. Odin draws; Unity serializes. A guarded field silently loses its serialized contract in the exported build.

## Required references

Keep `[Required]` on its own line so it can be guarded without changing the serialized field:

```csharp
#if UNITY_EDITOR && ODIN_INSPECTOR
[Required]
#endif
[SerializeField] private Animator _animator;
```

For a prefab asset whose reference is supplied by the scene instance:

```csharp
#if UNITY_EDITOR && ODIN_INSPECTOR
[RequiredIn(PrefabKind.InstanceInScene)]
#endif
[SerializeField] private Camera _mainCamera;
```

## Member-referencing attributes

Keep provider and predicate members compiled in every build. Guard only their editor body; `nameof(GetTags)` must still resolve when the attribute is stripped.

```csharp
private static IEnumerable<string> GetTags()
{
#if UNITY_EDITOR
    return UnityEditorInternal.InternalEditorUtility.tags;
#else
    return new string[0];
#endif
}
```

The same shape applies to `AnimatorController` and `AssetDatabase` providers. The serialized primitive remains outside the guard:

```csharp
#if UNITY_EDITOR && ODIN_INSPECTOR
[ValueDropdown(nameof(GetTags))]
#endif
[SerializeField] private string _targetTag = "Untagged";
```

## Inspector composition

Prefer section-level `[Title]` and `[PropertyTooltip]` over per-field grouping when both express the same structure. Fewer guarded attributes means fewer export hazards. Editor windows and actions already live under `Editor/` or `#if UNITY_EDITOR`; keep their editor-only APIs there.

## Fallback

If Odin is absent, use the common skill's built-in-attribute or runtime-assert fallback. Do not add an unguarded Sirenix reference to make the Inspector prettier.
