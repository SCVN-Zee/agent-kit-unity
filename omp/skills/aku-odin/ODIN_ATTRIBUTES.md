# Odin Inspector Attributes — mandatory when installed

When Odin Inspector (Sirenix) is present, its attributes are the house style — **not a preference**. Built-in
`[Header]`/`[Tooltip]`/`[Space]` are replaced, not merely discouraged.

Subfile of [`skill://aku-odin`](SKILL.md). Pairs with [`INSPECTOR_UX.md`](INSPECTOR_UX.md) for layout and interaction decisions, `skill://aku-code-conventions/STRUCTURE.md` for source organization, and [`EDITOR_TOOLING.md`](EDITOR_TOOLING.md) for windows and actions.

## 1. The gate — this applies only where Odin exists

Odin is a paid third-party DLL. A project without it **cannot compile a single Sirenix attribute**, so the
mandate is gated:

| State | What to write |
| --- | --- |
| Odin installed | Odin attrs, mandatory (§2, §3) |
| Odin absent | built-in `[Header]`/`[Tooltip]` — emitting a Sirenix attr is a compile error |

Confirm presence per `AGENTS.md`: `Assets/Plugins/Sirenix/` exists, or `Packages/manifest.json` / an asmdef
references Sirenix.

**Override:** `.omp/aku-project.json {"odin": true|false}` — committed, team-shared, beats every auto signal.
Use `true` when Sirenix lives somewhere detection cannot see it; `false` to opt a project out of the mandate.

## 2. Display attributes (mandatory replacements)

| Built-in | Odin | Notes |
| --- | --- | --- |
| `[Header("Stats")]` | `[Title("Stats")]` | literal 1:1 — label + rule above the field, one attr per section |
| `[Header("Stats")]` | `[BoxGroup("Stats")]` / `[FoldoutGroup("Stats")]` | grouping upgrade — boxes/folds the following fields; **per-field**, so it multiplies attr count |
| `[Tooltip("…")]` | `[PropertyTooltip("…")]` | |
| `[Space]` | `[PropertySpace]` | takes before/after amounts |
| `[TextArea]` / `[Multiline]` | `[MultiLineProperty]` | |
| `[Range(0,1)]` | `[PropertyRange(0,1)]` | Odin's accepts member/expression bounds |
| `[Min(0)]` | `[MinValue(0)]` | `[MaxValue]` for the ceiling |
| renaming a field to fix its label | `[LabelText("Max HP")]` | relabel without touching the field name |

## 3. Behavior attributes (use instead of hand-written editor code)

| Intent | Odin |
| --- | --- |
| Conditional visibility / enablement | `[ShowIf]`, `[HideIf]`, `[EnableIf]`, `[DisableIf]` |
| Validation surfaced in the Inspector | `[Required]` — **mandatory on every serialized reference, see `skill://aku-code-conventions/REQUIRED_FIELDS.md`** · `[ValidateInput]`, `[InfoBox]` |
| Read-only / computed display | `[ReadOnly]`, `[ShowInInspector]`, `[DisplayAsString]` |
| Collection presentation | `[ListDrawerSettings]`, `[TableList]`, `[DictionaryDrawerSettings]` |
| Reference pickers | `[InlineEditor]`, `[AssetsOnly]`, `[SceneObjectsOnly]`, `[AssetSelector]` |
| Bounded-domain value picker | `[ValueDropdown]`; `IsUniqueList` → checkbox list; `ValueDropdownList<T>` with `"A/B/C"` → tree |

A small custom `Editor` class written only to hide a field, add a button, or show a warning is exactly what these
replace. Reach for `OnInspectorGUI` only when no attribute expresses the intent.

**Which fields need a picker** is decided by `skill://aku-code-conventions/BOUNDED_DOMAIN_FIELDS.md`, not here — a
finite value set is an `enum` when the set is closed by code and a picker only when members arrive as data. That
file is not Odin-gated, because its enum tier is plain C#.

Choose these mechanisms only after deciding the authoring state and information hierarchy in `INSPECTOR_UX.md`; an
available attribute is not by itself a reason to add UI.

## 4. Keep-list — built-ins with NO Odin equivalent

These stay built-in. "Use Odin instead of built-ins" governs **decoration**; it does not mean every attribute has
a Sirenix twin:

`[SerializeField]` · `[SerializeReference]` · `[RequireComponent]` · `[CreateAssetMenu]` ·
`[ExecuteAlways]` / `[ExecuteInEditMode]` · `[AddComponentMenu]` · `[HelpURL]` · `[field:]` forwarding

`[SerializeField]` in particular is load-bearing: Odin decorates, Unity serializes. Never drop it because a field
"already has an Odin attribute", and never nest it inside a conditional-compilation guard.

## 5. Scope boundary

This covers **display, behavior, and editor-tooling** attributes.

**Out of scope:** Odin *runtime serialization* — `SerializedMonoBehaviour`, `SerializedScriptableObject`,
`[OdinSerialize]`. Those change the base type and the serialization path, cannot be editor-stripped the same way,
and carry perf and portability consequences the display attrs do not. A separate, harder question — flag for the
engineer kit, don't auto-adopt.

## 6. Attrs that name a member (all targets)

`[ValueDropdown]`, `[ShowIf]`, `[HideIf]`, `[EnableIf]`, `[ValidateInput]` and friends reference another member.
That coupling applies to **every** build:

| Reference form | Member stripped by `#if UNITY_EDITOR` | Consequence |
| --- | --- | --- |
| `nameof(GetTags)` | compile-time reference | **player build breaks** — CS0103, `nameof` cannot resolve it |
| `"GetTags"` (string literal) | not a compile-time reference | compiles; fails as an Odin **editor-time** error instead |

**Rule:** keep the referenced provider or predicate compiled in every build and make only its *body* conditional.
This bites hardest on bounded-domain pickers, whose providers must reach `InternalEditorUtility`,
`AnimatorController`, or `AssetDatabase` — worked BEFORE/AFTER in
`skill://aku-code-conventions/examples/bounded-domain-fields.md` recipe 7.

## 7. `[Required]` — its own subfile

The mandate that every serialized reference carries `[Required]`, its type matrix, the own-bracket shape, the
`[PropertyTooltip]` opt-out, the `[RequiredIn]` prefab tier, the collections no-op, and the no-Odin assert tier live
in **`skill://aku-code-conventions/REQUIRED_FIELDS.md`**. Split out because the assert tier is plain C# and applies with or
without Odin — same reason `skill://aku-code-conventions/BOUNDED_DOMAIN_FIELDS.md` is not folded in here.

Two rules in this file are load-bearing for it: §1 (the presence gate) and §6 (keep a named member compiled in every
build — `[ValidateInput]` in the collections tier depends on it).
