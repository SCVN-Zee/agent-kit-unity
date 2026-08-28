# Bounded-Domain Fields — finite value sets are never bare primitives

A field whose legal values form a finite named set — a tag, an animator parameter, a sorting layer, an
easing type, an ability id — must not be typed as a bare `string` or `int`. Which representation it takes
is decided by **churn**, not by how many members the set has.

Subfile of [`skill://aku-code-conventions`](SKILL.md). Attribute semantics live in
`skill://aku-odin/ODIN_ATTRIBUTES.md`; every provider recipe lives in
[`examples/bounded-domain-fields.md`](examples/bounded-domain-fields.md).

## The switch test

> **Adding a member forces a new code path** (a `switch` arm, a formula, a branch) → **stable** → `enum`.
> **Adding a member forces only new data** → **volatile** → constrained picker. Never an enum.

Ask it about the *next* member, not about the set as it stands. Cardinality is irrelevant: 31 easing types
plus a custom slot is still an `enum`, because each one is a different formula. Three GAS tags is still a
dropdown, because the fourth arrives as a data row.

## 1. Gate scope

The **enum tier applies always** — it is plain C# and needs no third-party package. Only the **picker tier**
needs Odin; without it, volatile identity sets degrade per §5. The ScriptableObject tier needs nothing either.

This is why the rule lives here and not in `skill://aku-odin/ODIN_ATTRIBUTES.md`, whose §1 scopes itself to projects that
have Odin. Presence detection and the `.omp/aku-project.json {"odin"}` override are described there — not
restated here.

## 2. Why this is a defect class, not a style rule

**Unity serializes an enum as its underlying integer.** The member *name* is never written to the asset. So
mutating a volatile enum silently rewrites the meaning of data already on disk:

```text
enum EDebuff { Stun, Slow }            // 50 assets authored Slow → serialized as 1
enum EDebuff { Stun, Frozen, Slow }    // Frozen inserted → now owns 1

→ every asset that said Slow now says Frozen.
  No compile error. No warning. No migration hook. No diff in the .asset file.
```

Explicit numbering (`Stun = 0, Slow = 1`) defends against *insertion* only. Removing a member still orphans
its serialized value, and for a `[Flags]` enum any renumbering corrupts every stored mask. Numbering is a
mitigation, not a licence to use an enum for a volatile set.

The picker tiers have no equivalent failure: a string or an object reference means the same thing after the
set grows.

## 3. Decision table

| Churn | Member shape | Multi | Representation | Odin attr |
| --- | --- | --- | --- | --- |
| stable | identity | single | `enum`, `E` prefix ([`NAMING.md`](NAMING.md) §2.7) | none needed; `[EnumPaging]` cosmetic |
| stable | identity | multi | `[Flags]` enum, ≤32 members | `[EnumToggleButtons]` |
| volatile | identity only | single | primitive + provider method | `[ValueDropdown(nameof(Get…))]` |
| volatile | identity only | multi | `List<T>` + provider method | `[ValueDropdown(…, IsUniqueList = true)]` → checkbox per item |
| volatile | identity, hierarchical | either | `ValueDropdownList<T>`; the `"A/B/C"` display paths make the tree | `ExpandAllMenuItems` pre-expands it |
| volatile | **carries data** | either | **`ScriptableObject` reference** — the primitive disappears | none needed |
| — | Unity already ships a type | — | use it: `LayerMask`, `AnimationClip`, `AssetReference` | none |

Provider shapes for every row: [`examples/bounded-domain-fields.md`](examples/bounded-domain-fields.md).

**Identity vs carries-data** is the volatile split. If the member is only a name the code compares against,
the primitive stays and the picker constrains it. If each member owns fields — an icon, a display string, a
stack rule, a prefab — it is an asset, and the field becomes a typed reference with no string left to typo.

## 4. Worked classifications

| Set | Verdict | Because |
| --- | --- | --- |
| easing type (31 + custom) | `enum` | a new easing needs a new formula → code |
| ad style (`EAdsStyle`) | `enum` | each style drives a different flow → code |
| GAS tag (`State.Debuff.Stun`) | tree dropdown | a new tag needs a data row only; the names are a taxonomy |
| GAS tag carrying icon + stack rule | SO reference | the member owns fields, not just an identity |
| item / upgrade id | SO reference | designer-owned, grows indefinitely, carries data |
| animator parameter | dropdown fed from the controller | the asset owns the set; C# cannot see it |
| Unity tag, sorting layer | dropdown fed from project settings | the project owns the set; C# cannot see it |

### Unity-owned identifier contract

These domains are volatile identities, but their authorities and stored runtime values differ:

| Domain | Single selection | Multiple selection | Runtime handoff |
| --- | --- | --- | --- |
| GameObject layer | project-settings dropdown storing layer index | Unity-native `LayerMask` checkboxes | cached `int` / mask |
| sorting layer | `SortingLayer.layers` dropdown storing stable ID | unique checkbox list only when multi is real | cached ID |
| Animator parameter | type-filtered controller dropdown | `List<string>` + `IsUniqueList = true` | hash once during initialization |
| Animator layer | controller-layer dropdown | `List<string>` + `IsUniqueList = true` | resolve layer index once |
| Animator state | avoid for normal gameplay; exceptional full-path dropdown | tooling-only checkbox list | cache full-path hash + layer index |

Never hand-maintain the option list: project settings or the assigned controller asset is the authority. Unwrap an
`AnimatorOverrideController` before reading parameters, layers, or states. Complete provider and caching recipes live
in [`examples/identifier-pickers.md`](examples/identifier-pickers.md).

## 5. No Odin — the degraded tier

Volatile *identity* sets lose their picker. They fall back to a bare primitive fed from a `static class` of
`const` values:

```csharp
public static class GasTags
{
    public const string STATE_DEBUFF_STUN = "State.Debuff.Stun";
}
```

**This is worse, not equivalent.** The `const` class defends *call sites*; the Inspector field stays free
text, so authoring is unconstrained and a typo is invisible until runtime. Enum and ScriptableObject tiers
are unaffected — prefer moving a volatile set to the SO tier over living with the degraded one, whenever the
members can plausibly carry data.

## 6. Anti-patterns

1. **Volatile set as an enum** — the §2 remap corruption. A review defect, not a style note.
2. **Stable set as a string plus `[ValueDropdown]`** — the type system rebuilt in the Inspector. Compile
   checking traded away for nothing; a `switch` over it can no longer be exhaustive.
3. **`[Flags]` on a volatile set** — 32-member ceiling, and every stored mask corrupts on renumber. A
   volatile multi-select set is a checkbox list (§3 row 4), never a flags enum.
4. **Hierarchical names flattened into an enum** — `AbilityMeleeSword`, `AbilityMeleeAxe` is an open
   taxonomy wearing an enum. Hierarchy in the names *is* the evidence of churn.
5. **Dropdown mistaken for validation** — it constrains **new** input only. Renaming a member leaves every
   already-serialized value stale and silently wrong. Pair `[Required]` / `[ValidateInput]`, or move to the
   SO tier where the reference survives a rename.

## 7. Migrating an existing volatile enum

A data problem, not a code problem — the wrong integers are already on disk, so deleting the enum does not
fix the assets that reference it. Safe order: add the new representation alongside the enum, migrate the
assets while both are readable, then delete the enum. The kit ships no tooling for this; a project-specific
editor script is the normal answer.

## Cross-references

- `skill://aku-odin/ODIN_ATTRIBUTES.md` — attribute semantics, the presence gate, and §7's all-targets
  player-build trap for attributes that name a member (`[ValueDropdown]` is one)
- [`examples/bounded-domain-fields.md`](examples/bounded-domain-fields.md) — every provider recipe
- [`examples/identifier-pickers.md`](examples/identifier-pickers.md) — Unity layer and Animator identifier recipes
- [`NAMING.md`](NAMING.md) — the `E` prefix and enum casing
- [`ANIMATOR_DRIVING.md`](ANIMATOR_DRIVING.md) — parameter-hash caching; this rule constrains where that
  literal comes from, it does not replace the caching
- `skill://aku-code-review/references/checklist-serialization-wiring.md` — the review lens that flags violations
