# Example — ScriptableObject with `[field: SerializeField]` auto-property

Keeps serialized data Inspector-editable without public mutable fields. This is a recipe, not a Unity-verified fixture.

## Anti-pattern (public mutable fields)

```csharp
[CreateAssetMenu(menuName = "Game/Enemy Config", fileName = "EnemyConfig")]
public class EnemyConfig : ScriptableObject
{
    [Title("Stats")]
    [MinValue(1f)] public float maxHp = 100f;         // ❌ public member variable
    [MinValue(0.1f)] public float speed = 5f;         // ❌
    [PropertyRange(0f, 100f)] public float damage = 10f;  // ❌

    [Title("AI")]
    public float aggroRange = 15f;             // ❌
    public float attackRange = 2f;             // ❌
}
```

Why bad: anything mutating `_config.maxHp` at runtime silently corrupts shared state across all consumers (ScriptableObjects are shared by reference). Public fields invite this.

## Pattern (AFTER — `[field: SerializeField]` auto-property)

```csharp
using Sirenix.OdinInspector;
using UnityEngine;

namespace <GameName>.<Variant>
{
    [CreateAssetMenu(menuName = "Game/Enemy Config", fileName = "ENM_Enemy")]
    public class EnemyConfig : ScriptableObject
    {
        //----------------------------------------------------------------------
        // Serialized Fields (Inspector-editable, read-only at runtime)
        //----------------------------------------------------------------------
        [field: Title("Stats")]
        [field: SerializeField, MinValue(1f)] public float MaxHP { get; private set; } = 100f;
        [field: SerializeField, MinValue(0.1f)] public float Speed { get; private set; } = 5f;
        [field: SerializeField, PropertyRange(0f, 100f)] public float Damage { get; private set; } = 10f;

        [field: Title("AI")]
        [field: SerializeField] public float AggroRange { get; private set; } = 15f;
        [field: SerializeField] public float AttackRange { get; private set; } = 2f;

        [field: Title("Loot")]
        // [field:] forwarding repeats per bracket — Required takes its own line like everywhere else.
        [field: Required]
        [field: SerializeField] public LootTable LootTable { get; private set; }
    }
}
```

> **Consumer verification required.** Unity serializes the generated backing field, not the property.
> This recipe targets that field consistently. Verify Odin's resolved property, decoration and persistence
> in the installed version before adopting it; do not decorate both the field and property blindly.

## How it works

`[field: <Attr>]` forwards the attribute to the **compiler-generated backing field** of the auto-property. Unity's serializer sees a private field (so it serializes), the Inspector sees the decorations (`[Title]`/`[PropertyRange]`/`[MinValue]`, or `[Header]`/`[Range]`/`[Min]` without Odin), runtime sees a read-only property.

## Consumption

```csharp
public class Enemy : MonoBehaviour
{
    //----------------------------------------------------------------------
    // Serialized Fields
    //----------------------------------------------------------------------
    [Required]
    [SerializeField] private EnemyConfig _config;

    //----------------------------------------------------------------------
    // Private Fields
    //----------------------------------------------------------------------
    private float _hp;

    //----------------------------------------------------------------------
    // Lifecycle
    //----------------------------------------------------------------------
    private void Awake()
    {
        // PascalCase property reads — not lowercase fields
        _hp = _config.MaxHP;
    }
}
```

## Why ScriptableObject (not static class)

- Designers tweak in Inspector without recompile.
- Multiple variants (Goblin, Orc, Boss) share the same code path.
- No global singleton; testable.

## Runtime caveat

ScriptableObjects are shared objects. In-Editor changes can survive Play Mode in memory and may be saved to disk;
mutation, dirty marking and saving are distinct. Player changes do not write back to the packaged source asset.
A private setter prevents external reassignment, not mutation of referenced objects or collections.

For per-instance state (current HP, etc.), copy values into the consumer. Clone mutable nested state deliberately.
When migrating a serialized field to an auto-property, preserve its old serialized name with a tested
`[field: UnityEngine.Serialization.FormerlySerializedAs("oldName")]` migration where applicable. Save/reopen
representative assets and prefab overrides; a source-only rename is not migration evidence.

## Conventions encoded

- ✅ Namespace placeholder `<GameName>.<Variant>`
- ✅ Section dividers
- ✅ Zero public member variables
- ✅ `[field: SerializeField]` for Inspector + read-only runtime
- ✅ `[field: Title]`, `[field: PropertyRange]`, `[field: MinValue]` attribute forwarding (Odin; `[Header]`/`[Range]`/`[Min]` without it)
- ✅ Properties named PascalCase with house acronym casing (`MaxHP`)
- ✅ Consumer reads via `.MaxHP`; existing serialized names need explicit migration

## Cross-references

- [`STRUCTURE.md`](../STRUCTURE.md) — class structure
- This file is the canonical ScriptableObject convention template
