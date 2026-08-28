# Example — ScriptableObject with `[field: SerializeField]` auto-property

Honors Sec 5.2 (no public member variables) while staying Inspector-editable.

## Anti-pattern (BEFORE — violates Sec 5.2)

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
    [CreateAssetMenu(menuName = "Game/Enemy Config", fileName = "EnemyConfig")]
    public class EnemyConfig : ScriptableObject
    {
        //----------------------------------------------------------------------
        // Serialized Fields (Inspector-editable, read-only at runtime)
        //----------------------------------------------------------------------
        [field: Title("Stats")]
        [field: SerializeField, MinValue(1f)] public float MaxHp { get; private set; } = 100f;
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

> **Unverified — check in your project before relying on it.** `[field:]` targets the compiler-generated *backing
> field*, while Odin draws the *property*. `[field: Title(...)]` is shown here because it is consistent with the
> `[field: SerializeField]` forwarding around it, but Odin may only honor the decoration when applied to the
> property directly (`[Title("Stats")]`, no `field:` prefix). Try the `[field:]` form first; if the section header
> does not render in the Inspector, drop the prefix on the *display* attrs and keep it on `[field: SerializeField]`,
> which Unity's serializer genuinely requires there.

## How it works

`[field: <Attr>]` forwards the attribute to the **compiler-generated backing field** of the auto-property. Unity's serializer sees a private field (so it serializes), the Inspector sees the decorations (`[Title]`/`[PropertyRange]`/`[MinValue]`, or `[Header]`/`[Range]`/`[Min]` without Odin), runtime sees a read-only property.

## Consumption

```csharp
public class Enemy : MonoBehaviour
{
    //----------------------------------------------------------------------
    // Serialized Fields
    //----------------------------------------------------------------------
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
        _hp = _config.MaxHp;
    }
}
```

## Why ScriptableObject (not static class)

- Designers tweak in Inspector without recompile.
- Multiple variants (Goblin, Orc, Boss) share the same code path.
- No global singleton; testable.

## Runtime caveat

ScriptableObjects mutated at runtime in the Editor **persist to disk**. In a build, mutations are lost on app quit (asset is read-only). The `private set;` here prevents accidental mutation entirely — a good guard either way.

For per-instance state (current HP, etc.), copy fields into the consuming MonoBehaviour at `Awake`.

## Conventions encoded

- ✅ Namespace placeholder `<GameName>.<Variant>`
- ✅ Section dividers
- ✅ Zero public member variables (Sec 5.2)
- ✅ `[field: SerializeField]` for Inspector + read-only runtime
- ✅ `[field: Title]`, `[field: PropertyRange]`, `[field: MinValue]` attribute forwarding (Odin; `[Header]`/`[Range]`/`[Min]` without it)
- ✅ Properties named PascalCase (`MaxHp` not `maxHp`)
- ✅ Consumer reads via `.MaxHp` property, not legacy `.maxHp` field

## Cross-references

- [`STRUCTURE.md`](../STRUCTURE.md) — class structure
- C# authoring → the installed C#-authoring skill (per `rule://aku-capability-routing`); this file is the canonical SO convention template
