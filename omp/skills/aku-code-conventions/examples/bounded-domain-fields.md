# Example — bounded-domain field recipes

One recipe per row of [`BOUNDED_DOMAIN_FIELDS.md`](../BOUNDED_DOMAIN_FIELDS.md) §3 — that file decides *which*
row a field belongs to, this one is only the mechanics. Snippets show fields and providers, not class
skeletons ([`monobehaviour-template.md`](monobehaviour-template.md)). Odin attrs are unguarded because Odin is installed;
recipe 7 covers player-build provider mechanics.

## 1. Stable set → enum

A new member needs a new formula, so the set is closed by code.

```csharp
public enum EEasing { Linear, InQuad, OutQuad, InOutQuad, InBack, OutBack, /* … */ Custom }

[SerializeField] private EEasing _easing = EEasing.OutQuad;
```

Stable **multi**-select is a `[Flags]` enum with explicit bit values. Hard ceiling of 32 members on `int`, and
renumbering corrupts every stored mask — which is why this tier is stable-only.

```csharp
[System.Flags]   // fully qualified: Unity's default usings don't include System
public enum EHitLayer { None = 0, Enemy = 1 << 0, Wall = 1 << 1, Prop = 1 << 2 }

[EnumToggleButtons]
[SerializeField] private EHitLayer _hits = EHitLayer.Enemy;
```

## 2. Volatile identity, single → dropdown

Unity owns the tag list and C# cannot see it. Unity ships `EditorGUI.TagField` (an editor GUI *call*) but no
tag *attribute*, so without Odin there is no attribute-only path — recipe 8.

```csharp
[ValueDropdown(nameof(GetTags))]
[SerializeField] private string _targetTag = "Untagged";

// Compiled in EVERY build so nameof() above resolves — only the body is conditional. Recipe 7.
private static IEnumerable<string> GetTags()
{
#if UNITY_EDITOR
    return UnityEditorInternal.InternalEditorUtility.tags;
#else
    return new string[0];   // conservative fallback for transpile targets
#endif
}
```

The serialized type stays `string` because `CompareTag(_targetTag)` takes one. The picker constrains
authoring, not storage.

## 3. Volatile identity, multi → checkbox list

`IsUniqueList = true` is what produces the **checkbox-per-item** multi-select and blocks duplicates. Drop it and
each element gets its own dropdown instead — `DrawDropdownForListElements` defaults to true. Adding
`ExcludeExistingValuesInList = true` *hides* taken values rather than check-marking them, usually not what you
want here ([docs](https://odininspector.com/attributes/value-dropdown-attribute)).

```csharp
[ValueDropdown(nameof(GetTags), IsUniqueList = true)]
[SerializeField] private List<string> _ignoredTags = new List<string>();
```

## 4. Volatile identity, hierarchical → tree

A `/` in a `ValueDropdownList<T>` display name becomes a tree level. GAS-shaped tags are the canonical case —
hierarchy in the names is itself the evidence of churn.

```csharp
[ValueDropdown(nameof(GetGasTags), ExpandAllMenuItems = true)]
[SerializeField] private string _appliesTag = "";

// Illustrative source. A registry ScriptableObject or text asset is equally valid — use whatever the
// project already treats as the tag authority.
private static ValueDropdownList<string> GetGasTags()
{
    return new ValueDropdownList<string>
    {
        { "Ability/Melee/Sword", "Ability.Melee.Sword" },
        { "State/Debuff/Stun",   "State.Debuff.Stun"   },
        { "State/Debuff/Frozen", "State.Debuff.Frozen" }
    };
}
```

## 5. Volatile carrying data → ScriptableObject reference

Once a member owns fields it is an asset. The string disappears, the reference survives a rename (GUID), and
no Odin attribute is involved at all.

The tag asset's serialized members — full class shape (dividers, `[CreateAssetMenu]`) in
[`scriptableobject-pattern.md`](scriptableobject-pattern.md):

```csharp
[field: SerializeField] public string DisplayName { get; private set; }
[field: SerializeField] public Sprite Icon { get; private set; }
[field: SerializeField] public GameplayTag Parent { get; private set; }
```

Consumers then hold the type, never a string:

```csharp
[SerializeField] private GameplayTag _appliesTag;
[SerializeField] private List<GameplayTag> _requiredTags = new List<GameplayTag>();
```

## 6. Animator parameter → dropdown fed from the controller asset

Closes the loop with [`ANIMATOR_DRIVING.md`](../ANIMATOR_DRIVING.md): the hash is still cached in `Awake`, the
dropdown only constrains where the literal came from.

Three gotchas, all in the provider. `Animator.parameters` returns **empty in edit mode** on an uninitialized
animator, so the list comes off the controller asset via `UnityEditor.Animations.AnimatorController` —
editor-only, which is what makes recipe 7 load-bearing. And `AnimatorOverrideController` is **not** an
`AnimatorController`: a naive `as` cast returns null, silently emptying the dropdown wherever overrides are used.

```csharp
[SerializeField] private Animator _animator;

[ValueDropdown(nameof(GetTriggerParams))]
[SerializeField] private string _attackParam = "Attack";

private int _attackHash;   // cached in Awake, never re-hashed per call

private IEnumerable<string> GetTriggerParams()
{
#if UNITY_EDITOR
    RuntimeAnimatorController runtime = _animator == null ? null : _animator.runtimeAnimatorController;
    AnimatorOverrideController overrideController = runtime as AnimatorOverrideController;
    if (overrideController != null)
    {
        runtime = overrideController.runtimeAnimatorController;
    }
    UnityEditor.Animations.AnimatorController controller = runtime as UnityEditor.Animations.AnimatorController;
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
    return new string[0];   // conservative fallback for transpile targets
#endif
}
```

## 7. The `nameof` provider trap — player builds

`[ValueDropdown]` names a member. Strip the member and the attribute no longer compiles. Cosmetic attrs
(`[Title]`, `[LabelText]`) have no such coupling — `skill://aku-odin/ODIN_ATTRIBUTES.md` §6 owns this rule, on all targets.

```csharp
// ❌ BEFORE — player build fails: nameof(GetTags) cannot resolve a stripped member
#if UNITY_EDITOR
private static IEnumerable<string> GetTags() => InternalEditorUtility.tags;
#endif

[ValueDropdown(nameof(GetTags))]                 // the attribute survives a normal player build
[SerializeField] private string _targetTag;
```

The fix is recipe 2's shape: method always compiled, only its body conditional. Which build each half of that
shape protects — and why the two halves have different reasons — is `skill://aku-odin/ODIN_ATTRIBUTES.md` §6.

The serialized field remains outside any editor-only region so Unity can load it in every build.

## 8. No Odin → the degraded tier

No picker exists. The field is a bare primitive fed from a `static class` of `const`s — shape in
[`../BOUNDED_DOMAIN_FIELDS.md`](../BOUNDED_DOMAIN_FIELDS.md) §5:

```csharp
[SerializeField] private string _appliesTag = GasTags.STATE_DEBUFF_STUN;
```

The `const` class defends call sites only; authoring stays free text. This is the degraded tier, not a peer of
recipes 2-4 — where members could plausibly carry data, prefer recipe 5: no Odin needed, strictly better.

## Cross-references

- [`../BOUNDED_DOMAIN_FIELDS.md`](../BOUNDED_DOMAIN_FIELDS.md) — the switch test and the decision table
- `skill://aku-odin/ODIN_ATTRIBUTES.md` — attribute semantics; §6 owns the `nameof` trap (all targets)
- [`scriptableobject-pattern.md`](scriptableobject-pattern.md) — the `[field: SerializeField]` SO shape
