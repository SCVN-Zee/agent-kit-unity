# Example — Scene override vs. apply-to-prefab (the 3-way decision)

One scenario, branched across all three propagation tiers + the ASK case. The skill of `skill://aku-scene` is choosing the **right** branch, so each starts with the same **detect** step and diverges on intent.

> Bind each capability below to the Unity MCP tools already in your in-context tool list — match the capability, not a hardcoded name.

## Scenario

`SC_Main.unity` contains a `Door` GameObject that is an **instance** of `Assets/Prefabs/Door.prefab`. The user wants its `openSpeed` (on a `Door` component) changed from `2` to `5`. *Where the change lands depends on what they meant.*

## Step 0 — Detect (always)

**Open the scene** `Assets/Scenes/SC_Main.unity`, then **read the prefab/instance data** for `Door`:

```
# → { isPrefabInstance: true, sourcePrefab: "Assets/Prefabs/Door.prefab",
#     overrideCount: 0, modifications: [] }
```

`isPrefabInstance: true` → this is not a plain object. Read the user's intent and pick a tier.

---

## Branch A — Tier 1: scene override ("just this door")

Intent: "make *this* door faster" / "only in this scene".

**Patch the component** (`Door.openSpeed = 5`), then **save the scene**.

**No apply.** The override lives on the instance in `SC_Main` only; `Door.prefab` and every other door are untouched. Verify: **read the instance data** for `Door` → `overrideCount: 1`.

---

## Branch B — Tier 2: apply to source ("all doors") — with the coarse-apply audit

Intent: "doors should open at 5 everywhere" / "update the Door prefab".

1. Mutate the instance: **patch the component** (`Door.openSpeed = 5`).

2. **Coarse-apply audit** (mandatory): **read the instance data** for `Door` — inspect `modifications[]` + `overrideCount`.

   - If `modifications` == just `[Door.openSpeed]` → safe: **apply the instance's overrides to its source prefab**, then **save the scene**.

   - If `modifications` *also* lists e.g. `Transform.m_LocalPosition` (someone nudged this door) → **warn**: "Applying will also push this door's moved position to Door.prefab — every door inherits it. Options: apply all / revert the position first, then apply openSpeed / keep as a scene override." Do not apply silently.

The **apply-overrides** capability pushes **all** overrides on the nearest root — hence the audit.

---

## Branch C — Tier 3: nested child prefab ("only the handle, not the door")

Intent: "change the `Handle` (itself a `Handle.prefab` nested inside `Door`), and push it to the **handle** prefab, not the door."

The **apply-overrides** capability can't target the inner asset — it applies to the nearest root (`Door`). This needs the gated **editor-side C# snippet** recipe → **see [`nested-prefab-apply.md`](nested-prefab-apply.md)**. (If you instead want `Handle.prefab` itself changed for *every* handle, edit the **asset** directly via `skill://aku-prefab` — simpler than the nested apply.)

---

## Branch ASK — instance + propagation unclear

Intent: bare "make the door open at 5" on a prefab instance, no "this one" / "all" signal.

```
AskUserQuestion(
  question="`Door` is an instance of Door.prefab. Where should openSpeed=5 apply?",
  header="Apply scope",
  options=[
    { label="Just this scene",  description="Override on this Door only; Door.prefab unchanged. (Tier 1)" },
    { label="All doors",        description="Apply to Door.prefab so every instance inherits it. (Tier 2 + audit)" },
    { label="A nested child",   description="Only an inner prefab (e.g. Handle), not the whole door. (Tier 3)" }
  ]
)
```

Then run the chosen branch above.

## Takeaways

- Same edit, three destinations — **intent**, not the tool, picks the tier.
- Always **read the instance data** first; always **save the scene** after a scene mutation.
- Never **apply overrides** without reading `modifications[]`.
