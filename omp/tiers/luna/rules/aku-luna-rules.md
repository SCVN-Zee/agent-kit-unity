---
description: "Use when authoring Luna (Playwork) playable Odin-decorated C#, Animator controllers, prefabs, scenes, or materials. Apply the editor-strip guard and load the Luna authoring conventions; Luna compatibility review and luna.json build settings use focused skills."
globs: ["**/*.cs", "**/*.controller", "**/*.anim", "**/*.prefab", "**/*.unity", "**/*.mat"]
---

# Unity Luna Rules

Luna (Playwork) playable-ad build constraints. Applies on a **playable target** carrying the Luna package (`.omp/aku-project.json {"lunaPlayable":true}` wins; else the branch name contains `playable`).

Layered on `skill://aku-odin`, which owns the general Odin mandate. This file owns the Luna editor-strip guard.

For Luna playable authoring, also load `skill://aku-luna-conventions`. That skill owns export-sensitive authoring guidance; `skill://aku-luna-code-review` remains report-only.

## Odin editor-strip guard — `#if UNITY_EDITOR && ODIN_INSPECTOR`

Odin (Sirenix) is a precompiled DLL; Luna's Bridge.NET transpiler cannot transpile it → an unguarded Odin reference **breaks the Luna build**. On a playable target, wrap **every** Odin attribute and its `using` so the transpile never sees Sirenix.

Three make-or-break mechanics:

1. **Odin attrs in their OWN `[...]` bracket**, separate from `[SerializeField]` — a `#if` cannot wrap part of a bracket.
2. **Wrap the `using` too** (or fully-qualify) — a stray `using Sirenix.OdinInspector;` still references the DLL.
3. **NEVER wrap the field / `[SerializeField]`** — the field must still serialize in the Luna build; only the cosmetic attribute is editor-only.

```csharp
#if UNITY_EDITOR && ODIN_INSPECTOR
using Sirenix.OdinInspector;
#endif

public class Player : MonoBehaviour
{
    // Serialized Fields
    //----------------------------------------------------------------------
#if UNITY_EDITOR && ODIN_INSPECTOR
    [Required]                                     // Odin attr — editor-only
#endif
    [SerializeField] private Animator _animator;   // field stays OUTSIDE → serializes in every build

#if UNITY_EDITOR && ODIN_INSPECTOR
    [BoxGroup("Stats"), LabelText("Max Health")]
#endif
    [SerializeField] private float _maxHp = 100f;
}
```

In editor: both symbols defined → Odin draws the rich Inspector. In a player build *and* the Luna transpile: `UNITY_EDITOR` is false → the attrs + `using` vanish, the fields still serialize, no Sirenix reference survives.

`[Required]` leads the example because it is the **most-guarded attr on a playable target** — `skill://aku-code-conventions/REQUIRED_FIELDS.md` mandates it on every serialized reference, so a class with four refs has four guard sites. That is also why it already lives in its own bracket off-Luna: the guard becomes a 2-line insert here instead of surgery on a combined `[SerializeField, Required]`, which mechanic 1 makes impossible to write.

## Scope

- **Covered:** display / cosmetic Odin attrs only — `[Required]`/`[RequiredIn]`, `[Title]`, `[BoxGroup]`, `[FoldoutGroup]`, `[LabelText]`, `[PropertyTooltip]`, `[InfoBox]`, `[ShowInInspector]`, `[Button]`, `[ShowIf]`/`[HideIf]`, etc.
- **Out of scope:** Odin *runtime serialization* — `SerializedMonoBehaviour`, `SerializedScriptableObject`, `[OdinSerialize]`. Those change the base type / serialization path and cannot be `#if`-stripped the same way; flag for the C#-authoring capability, don't auto-guard.

## Cross-references

- `skill://aku-odin` — the general Odin mandate (`[Header]`/`[Tooltip]` → Odin equivalents) + the built-in keep-list.
- `skill://aku-odin/ODIN_ATTRIBUTES.md` — built-in→Odin attribute mapping table.
- `skill://aku-luna-code-review` — Luna transpile review lens (flags unguarded Odin attrs as critical).
- `skill://aku-luna-build-check` — Luna export build-settings probe before a Luna build.
