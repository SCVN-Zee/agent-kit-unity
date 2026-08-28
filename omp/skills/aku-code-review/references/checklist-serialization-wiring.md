# Lens 3 — Serialization & Wiring

How fields reach the Inspector, how references get wired, and the string-coupling that breaks silently at runtime. Convention overlaps cite `skill://aku-code-conventions` rather than restate.

## Field exposure

- `public` member variable used as serialized data — banned (cross-ref `skill://aku-code-conventions` cheat-sheet rule 4 — ScriptableObject / no public member vars). Use `[SerializeField] private T _x;`.
- Field meant to be Inspector-assigned but missing `[SerializeField]` → silently null at runtime.
- `[SerializeField]` on a non-serializable type (interface, raw `object`, plain class without `[Serializable]`) → not persisted / lost on reload. <!-- mcp-lint-ignore -->
- ScriptableObject exposing mutable state as `public` field instead of `[field: SerializeField] public T Prop { get; private set; }` (Inspector-editable, runtime read-only).

## Reference wiring

- Acquiring scene refs via `GetComponent`/`Find*` at runtime instead of Inspector-wiring (cross-ref `skill://aku-code-conventions/REFERENCE_WIRING.md`; perf angle in Lens 1). Only post-`Instantiate()` lookups are allowed.
- Several refs resolved via `GetComponent`/`Find` in `Awake`/`Start` that should be `[SerializeField]` slots populated by an editor-only `Setup Refs` method (`[Button]`/`Reset`; `[ContextMenu]` without Odin) — the sanctioned edit-time auto-wire (cross-ref `skill://aku-code-conventions/REFERENCE_WIRING.md` §4).
- A serialized reference the code dereferences without a null check, where the slot can be left empty in the Inspector. Route by Odin presence: **Odin installed** → `[Required]` (edit-time error box, the mandated answer); **Odin absent** → `Debug.Assert` in `Init` naming the field, the sanctioned degraded tier. A runtime guard on an Odin project is treating the symptom.
- **Serialized Object ref carrying neither `[Required]` nor an optionality `[PropertyTooltip]`** (cross-ref `skill://aku-code-conventions/REQUIRED_FIELDS.md`). Silence cannot distinguish "optional by design" from "forgot the attribute", so the mandate makes both states explicit.
  - **DEFECT** when the field is inside the reviewed diff / PR / commit — the author can mark it now.
  - **ADVISORY** in a whole-codebase scan — legacy code predates the mandate and carries no optionality tooltips anywhere; flagging every ref as a defect buries the report and gets the lens ignored.
  - Fix: `[Required]` in its own bracket above `[SerializeField]`, or a `[PropertyTooltip]` stating what happens when it is null. Prefab asset whose ref is only wired once instanced → `[RequiredIn(PrefabKind.InstanceInScene)]`.
- `[RequireComponent(typeof(T))]` missing for a `GetComponent<T>()` the script assumes exists on the same object.

## Serialization-safe types

- `Dictionary<,>` field expecting to persist — Unity doesn't serialize it; use a serializable list + rebuild, or a known serializable-dictionary type.
- Polymorphic field needing `[SerializeReference]` (interface/abstract list) — without it, only the base/`UnityEngine.Object` slot serializes.
- Nullable / auto-property without backing serialization; `readonly` serialized field (won't serialize).

## Magic strings (break on rename, no compile error)

- Hardcoded animator parameter names per call → cache `Animator.StringToHash("Speed")` once.
- Hardcoded tag/layer/scene/shader-property strings → constants, `LayerMask.NameToLayer` cached, `Shader.PropertyToID`.
- `SendMessage`/`Invoke("MethodName")` string method names — fragile; prefer direct calls/events.

## Bounded-domain fields (cross-ref `skill://aku-code-conventions/BOUNDED_DOMAIN_FIELDS.md`)

- **DEFECT — volatile value set typed as an `enum`.** A set whose members arrive as *content* (GAS tags, item ids, ability keys — no new code path per member) declared as an `enum`. Unity serializes an enum as its underlying int, so inserting or removing a member silently repoints every already-serialized asset. Fix: picker or `ScriptableObject` ref per the decision table.
  - *Canned failure narrative — reproduced here deliberately, since a finding must carry a concrete scenario:* `enum EDebuff { Stun, Slow }` with 50 assets authoring `Slow` (= 1); a later `enum EDebuff { Stun, Frozen, Slow }` makes all 50 read `Frozen` — no compile error, no warning, no diff in the `.asset`. Canonical statement of the mechanism stays in `skill://aku-code-conventions/BOUNDED_DOMAIN_FIELDS.md` §2.
- **DEFECT — `[Flags]` on a volatile set.** Strictly worse than the row above: removing a bit forces renumbering, which corrupts every stored *combination* rather than one field, and the 32-member ceiling guarantees the set outgrows it. A volatile multi-select set is a checkbox list (`IsUniqueList`), never a flags enum.
- **DEFECT — unconstrained Unity-owned identifier.** In an Odin project, a serialized GameObject/sorting layer or Animator parameter/layer/state field has no dropdown sourced from project settings or the assigned controller. Single → authority-backed `[ValueDropdown]`; multiple → `LayerMask` or `IsUniqueList = true`. Internal names used once to cache hashes/indices are allowed; free-text Inspector authoring is not.
- **ADVISORY — other bounded primitive with no picker.** A tag, scene name, or project-specific volatile identity left unconstrained where Odin is installed. Typo risk only, no corruption — advisory, not a defect. Fix: `[ValueDropdown]` with an always-compiled provider.

## Scene reference validity

- Reference to an object in another (additively-loaded) scene that may be unloaded → becomes invalid; re-resolve or guard.
- `FindObjectOfType` returning a different instance than intended after a scene reload.

## Suppress

- Serialized public auto-properties via `[field: SerializeField]` (the sanctioned SO pattern).
- One-off `GetComponent` immediately after `Instantiate` (allowed exception).
- A bounded primitive fed from a `static class` of `const`s on a project **without** Odin — the sanctioned degraded tier (`skill://aku-code-conventions/BOUNDED_DOMAIN_FIELDS.md` §5), not a finding.
- A controller/project-discovered name used only during initialization to cache `StringToHash`, `GetLayerIndex`, `NameToLayer`, or a sorting-layer ID — the serialized authoring field is the picker surface.
- A stable set as an `enum` with no picker attribute — that is the correct representation, not a missing dropdown.
- **`[Required]` absent from a value-type field** (`float`, `int`, `bool`, `Vector3`, enum, struct) — a value type cannot be null; the attribute would be meaningless there.
- **`[Required]` absent from a serialized array / `List<T>`** — Unity deserializes an unassigned collection as *empty, never null*, so the attribute could not fire. Its absence is correct. (A `[Required]` *present* on a collection is the finding — silent no-op; route to `[ValidateInput]`.)
- **`[Required]` absent on a project without Odin** — a Sirenix attr there is a compile error. Look for the `Debug.Assert` tier instead.
- **An Object ref carrying `[PropertyTooltip]` describing its null behavior** — that is the sanctioned opt-out, not a missing `[Required]`.
