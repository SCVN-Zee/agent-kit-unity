# Decision Tree — Prefab-Asset Op → Capability → Invariant

> The load-bearing artifact of `skill://aku-prefab`. Entry assumption: **the target is a named prefab asset** (`@Assets/.../X.prefab`) — so there is no scene-instance detection step. If that assumption is false, **hand back to `skill://aku-scene`** (see below). Bind each capability below to the Unity MCP tools already surfaced in your in-context tool list — match the capability, not a hardcoded name; if none matches, do it in the Editor or via a committed-state `git` op.

## The spine: confirm-asset → consider-variants → pick-op → act

```
1. CONFIRM  — target is a named .prefab asset? If it's a scene object of unknown
              prefab status → STOP, hand to skill://aku-scene (it detects + classifies).
2. CONSIDER — creating prefab(s)? Before creating, run the variant-opportunity check
              (VARIANT_STRATEGY.md): base+variants vs flat; ask when ambiguous. Skip
              for a clearly unique one-off.
3. PICK     — read the user's words → which asset op (table below).
4. ACT      — run the capability sequence / recipe.
```

## Routing rows

| Intent | Capability sequence | Notes |
| --- | --- | --- |
| **Edit the asset's contents** ("change `X.prefab` itself", set a field on the asset) | open the prefab in an isolated stage → apply the targeted patch (GameObject / component / object) → save the prefab → close the stage | No separate load-contents call needed. Changes **all** instances. |
| Inspect the asset | read the asset data (payload), or open the prefab stage + find the GameObject (structural) → close the stage if opened | Slice reads to save tokens. |
| Instantiate into a scene | instantiate the prefab → save the scene | Pass prefab asset path; optional parent / transform. |
| **Before creating prefab(s)** (esp. plural / related) | **run the variant-opportunity check** (`VARIANT_STRATEGY.md`) → then create as base + variants or flat | Base+variants vs flat. Skip only for a clearly unique one-off. |
| Create a prefab from a scene GO | create a prefab from the scene GameObject | Pass the scene GO + save path. |
| Unpack (break the link) | call a method by reflection on `UnityEditor.PrefabUtility.UnpackPrefabInstance` (no dedicated capability); confirm the overload with a reflection find first | An editor-side C# snippet is fine for a one-off. |
| Create a **variant** | open the base in a stage → save-as a new path, OR run an editor-side C# snippet using `PrefabUtility.SaveAsPrefabAsset` / `SaveAsPrefabAssetAndConnect` | No single-call variant capability ships. See `examples/variant-create.md`. |

Route `.prefab` mutations through the connected Unity MCP (or the Editor / a committed-state `git` op) rather than a direct file edit.

## Hand-back to `skill://aku-scene` (when this is NOT the right skill)

Stop and route to `skill://aku-scene` when **any** holds:

- The target is a scene object whose prefab status is **unknown** — `skill://aku-scene` runs the detect → classify first.
- The user changed a prefab **instance** in a scene and needs the **scene-override vs apply-to-source vs nested-child** decision — that's the apply-override tiers + coarse-apply audit, owned by `skill://aku-scene`.
- "Make this one different in this scene only" → `skill://aku-scene` Tier-1 override (an *instance* override, not an asset write).

## Fallback when the editor-side C# snippet capability is unavailable

If Roslyn execution is disabled (restricted permission mode), do **not** silent-fail and do **not** hard-block: emit precise manual Editor steps (double-click the prefab to open **Prefab Mode** → edit → save), or — if a scene instance is acceptable — instantiate the prefab, edit the instance, and apply via `skill://aku-scene` Tier 2. Full fallback in `examples/asset-mode-edit.md`.

## Cross-references

- `MCP_USAGE.md` — the capability sequences per operation.
- `skill://aku-scene/DECISION_TREE.md` — the instance apply-tier decision this skill defers to.
