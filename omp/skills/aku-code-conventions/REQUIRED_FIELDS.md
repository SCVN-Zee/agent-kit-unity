# Required Fields — `[Required]` on every serialized reference

**Every serialized field holding a reference carries `[Required]` by default. Opting out is explicit, never silent.**

Subfile of [`skill://aku-code-conventions`](SKILL.md). The attribute tier is Odin-gated (`skill://aku-odin/ODIN_ATTRIBUTES.md`
§1); the assert tier in §7 is plain C# and applies everywhere. Composes with
[`REFERENCE_WIRING.md`](REFERENCE_WIRING.md) — that file governs *how* a ref is acquired, this one governs whether an
empty slot is allowed to stay quiet.

## 1. Why it is a mandate

An unwired slot is a null-deref waiting for the first Play. `REFERENCE_WIRING.md` §7 already argues that a serialized
slot is *visible* before Play — but visible is not flagged. `[Required]` turns a slot you have to notice into an error
box you cannot miss.

## 2. The shape

```csharp
[Required]
[SerializeField] private Animator _animator;
```

`[Required]` takes its **own bracket on its own line**, directly above `[SerializeField]`. Keep the validation attribute independent from the serialized field.

Other Odin attrs keep their combined form (`[SerializeField, LabelText("Interval (s)")]`). Only `[Required]` earns the
dedicated line.

## 3. What qualifies

| Serialized type | Verdict |
| --- | --- |
| `UnityEngine.Object` ref — `Animator`, `Transform`, prefab, ScriptableObject, `AudioClip`, `Material` | **`[Required]`** |
| Object ref that is legitimately optional | no `[Required]`; **`[PropertyTooltip]` stating the null behavior is mandatory** (§4) |
| Object ref on a **prefab asset**, wired only once instanced | `[RequiredIn(PrefabKind.InstanceInScene)]` (§5) |
| `string` — free-form required text (id, display name, URL) | `[Required]` — checks null **or empty** |
| `string` — finite named set | **not** `[Required]` → cheat-sheet rule 11 ([`BOUNDED_DOMAIN_FIELDS.md`](BOUNDED_DOMAIN_FIELDS.md)) |
| array / `List<T>` | **no-op — cannot fire.** ADVISORY (§6) |
| `float` / `int` / `bool` / `Vector3` / enum / struct | never — a value type cannot be null |
| Odin absent | no attribute (compile error) → the assert tier (§7) |

## 4. Opting out

An optional ref announces itself, so a reader — and the `skill://aku-code-review` serialization lens — can tell deliberate
from forgotten:

```csharp
[Required]
[SerializeField] private Animator _animator;

[SerializeField, PropertyTooltip("Optional — no SFX when empty.")]
private AudioClip _hitSfx;
```

The tooltip opt-out stays in the combined bracket. Only `[Required]` takes its own line.

Absence of both marks is the defect the review lens flags — silence cannot distinguish "optional by design" from
"forgot the attribute."

## 5. Prefab assets — `[RequiredIn]`

A prefab **asset** legitimately has empty scene refs until something instances it; plain `[Required]` shows red on
every such prefab and trains people to ignore the box.

```csharp
[RequiredIn(PrefabKind.InstanceInScene)]
[SerializeField] private Camera _mainCamera;
```
Source alone rarely reveals that a ref is scene-instance-wired. Expected path: write `[Required]` first, downgrade to
`[RequiredIn]` when the red box appears on the prefab asset. That is the workflow, not a failure.

Other `PrefabKind` members exist (`Regular`, `Variant`, `PrefabAsset`, `NonPrefabInstance`, …); `InstanceInScene` is
the case that actually recurs.

## 6. Collections — `[Required]` cannot fire (ADVISORY)

Unity deserializes an unassigned array or `List<T>` as **empty, never null**. A null-check attribute therefore never
fires on a collection — `[Required]` there is silent decoration, not validation. Use a predicate instead:

```csharp
[ValidateInput(nameof(HasEntries), "Assign at least one waypoint.")]
[SerializeField] private Transform[] _waypoints;
```

`[ValidateInput]` names a member, so `skill://aku-odin/ODIN_ATTRIBUTES.md` **§6 applies**: keep `HasEntries`
compiled in every build and guard only its body.

Advisory rather than mandatory — the predicate route costs real complexity for a case that is rarer than a plain ref.
What is *not* optional is never writing `[Required]` on a collection and believing it does something.

## 7. No Odin — the degraded tier

A Sirenix attribute on a project without Odin is a compile error (`skill://aku-odin/ODIN_ATTRIBUTES.md` §1). The *intent* still needs
somewhere to live, so it degrades to a runtime assert naming the field:

```csharp
public void Init()
{
    Debug.Assert(_animator != null, $"{name}: _animator not wired", this);
}
```

Same shape as the no-Odin degradation in [`BOUNDED_DOMAIN_FIELDS.md`](BOUNDED_DOMAIN_FIELDS.md) §5 — weaker than the
attribute (fires at runtime, not edit-time), and the sanctioned fallback rather than silence.

## 8. Scope of enforcement

The Inspector error box ships with **Odin Inspector**. Scanning a whole project for `[Required]` violations needs
**Odin Validator** — a separate product, not assumed present. Never write guidance that depends on it.

## Cross-references

- `skill://aku-odin/ODIN_ATTRIBUTES.md` — the Odin presence gate (§1), the attr mapping tables, and §6's
  always-compiled-member rule that §6 above depends on
- [`REFERENCE_WIRING.md`](REFERENCE_WIRING.md) — how scene refs are acquired; §7 there is the argument this file extends
- [`BOUNDED_DOMAIN_FIELDS.md`](BOUNDED_DOMAIN_FIELDS.md) — owns the `string`-with-a-finite-value-set row above
- Target-specific editor-only attribute guards belong to the target's own build rule.
- `rule://aku-code-convention-rules` — automatic bridge into this authoritative skill
