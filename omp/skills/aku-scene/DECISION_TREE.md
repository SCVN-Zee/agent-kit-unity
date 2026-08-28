# Decision Tree — Scene / Prefab / Component Intent → Capability

> The load-bearing artifact of `skill://aku-scene`. Before any scene-touching mutation, walk **detect → classify → map-intent → act**. Each routing row: intent → capability → mandatory follow-up + invariant.

> **Binding instruction.** Bind each capability below to the Unity MCP tools already surfaced in your in-context tool list — match the capability, not a hardcoded name. If none matches, do it in the Editor or via a committed-state `git` op.

## The spine: detect → classify → map-intent → act

```
1. DETECT   — target is a pre-existing object? → read its component data,
              sliced to the prefab-instance connection
              (objects you created this session are plain scene objects)
2. CLASSIFY — no prefab-instance modification → plain scene object (Tier 1, no prefab fuss)
              instance present → read sourcePrefab + modifications, go to 3
3. MAP      — read the user's words for propagation intent (tier table below)
4. ACT      — run the tier's capability sequence; save the scene; verify
```

Read the underlying prefab-instance object data (or open the *source* asset in an isolated stage) to discover `sourcePrefab` + `m_Modifications[]`. That payload drives both classification and the coarse-apply audit.

## Propagation tiers (the core decision)

| Tier | Trigger intent | Capability | Apply? |
| --- | --- | --- | --- |
| **1 — scene override** | "here", "this scene", "just this one", one-off encounter | modify the instance's GameObject/component in place | **No.** Save the scene only. |
| **2 — apply to source** | "the prefab", "all/every X", "update the X prefab" | open the source prefab in an isolated stage → replay the same GameObject/component/object modifications there → save + close the stage. Audit the live instance first. | Yes — the canonical apply path. |
| **3 — nested child prefab** | "only the nested/child X, not the parent" | gated reflection call on `PrefabUtility.ApplyObjectOverride(obj, nestedAssetPath, UserAction)` (or an editor-side C# snippet). See `examples/nested-prefab-apply.md`. | Yes, one object → one specific inner asset. |
| **ASK** | instance + propagation unclear, OR nested + which-prefab unclear | `AskUserQuestion` | — |

**Why tiers, not one apply:** there is no single coarse "apply all overrides to source" capability. Tier 2 is "open the source prefab and replay the change there" — that's the supported flow. Per-instance overrides stay where they are (Tier 1) unless you choose to replay them on the source. Tier 3 (reflection) is the only single-call path that pushes a *specific* nested asset.

## ASK conditions (when to stop and ask)

Use `AskUserQuestion` when **any** holds:

- Target is a prefab instance AND the prompt doesn't say whether the change is scene-only or for the prefab.
- "the nested prefab" but the nesting chain has 2+ candidate inner prefabs (run the read-only probe first, then list them).
- A Tier-2 source edit would conflict with *unrelated* pending overrides on the live instance (see audit) and the user hasn't said how to reconcile.

Option shape: `scene-only (keep override here)` / `this prefab (replay edit on <sourcePrefab>)` / `nested (apply to <inner>)`.

## Coarse-apply audit (mandatory before Tier 2)

Before opening the source prefab to replay the change:

1. Read the live instance's object data → enumerate `m_Modifications[]`.
2. If the only pending overrides are the ones you just made → safe to replay them on the source.
3. If **unrelated** overrides exist → **warn + list them**, then offer:
   - **Replay only the intended edit on the source** (default), or
   - **Replay all** (the user accepts pushing other overrides to the source), or
   - **Cancel** (keep as a scene override instead).

Never replay blindly (you may propagate noise); never silently revert someone else's overrides.

## Routing rows

### Scene

| Intent | Capability | Follow-up + invariant |
| --- | --- | --- |
| Open a scene | open the scene (`Single` load mode) | — |
| Save | save the scene | after a scene mutation |
| Inspect opened set | list open scenes / read scene data | slice reads with `paths` / `viewQuery` |
| Additive load / unload | open additively / unload the scene | set the active scene |

### Hierarchy / GameObject

| Intent | Capability | Follow-up |
| --- | --- | --- |
| Add | create a GameObject | optionally modify it / add a component |
| Delete | destroy the GameObject | — |
| Rename | modify the GameObject (set `name`) | diff / pathPatches / jsonPatch surfaces |
| Duplicate | duplicate the GameObject | — |
| **Reparent** | reparent the GameObject (typed capability) | set `newParent` + `siblingIndex` |
| Find | find a GameObject | by name / path / component type / tag / layer |

### Component / transform

| Intent | Capability | Notes |
| --- | --- | --- |
| **Detect prefab context** | read component data (prefab-instance slice) or read object data | reveals the prefab connection → picks the tier |
| Add component | add a component | type name as string, e.g. `"Rigidbody"` (FQ name when ambiguous) |
| Read components | read component data / list a GameObject's components | slice with `paths` / `viewQuery` |
| Set serialized property | apply a targeted patch to the component | honors `[SerializeField]`; then choose a tier |
| Set transform | modify the GameObject | position / rotation / scale via diff / pathPatches / jsonPatch |
| **Remove component** | destroy the component (typed capability) | no reflection needed |

### Prefab

| Intent | Capability | Follow-up |
| --- | --- | --- |
| Detect | read component/object data (prefab-instance slice) | — (drives classify + audit) |
| Replay on source (Tier 2) | open the prefab in an isolated stage → mutate → save → close | **audit first**; closes the stage cleanly |
| Revert an override | reflection call on `PrefabUtility.RevertObjectOverride` (or an editor-side C# snippet) | no dedicated revert capability ships |
| Apply to **nested child** (Tier 3) | reflection call on `PrefabUtility.ApplyObjectOverride` | gated recipe → `examples/nested-prefab-apply.md` |

Prefab-**asset** ops — create / instantiate / unpack / variant / **direct asset editing** — are **`skill://aku-prefab`**, not here. This table keeps the prefab-**instance** apply-tier decision.

## Tier-3 fallback when the reflection / script surface is unavailable

If the reflection surface is disabled (restricted permission mode), do **not** silent-fail and do **not** hard-block: degrade to **detect + classify + ask**, then emit precise manual Editor steps (select object → Inspector override dropdown → **Apply to Prefab '<NestedPrefab>'**). Full fallback in `examples/nested-prefab-apply.md`.

## Cross-references

- `MCP_USAGE.md` — the ordered capability sequence per operation.
- `skill://aku-prefab` — prefab-**asset** lifecycle (create / instantiate / unpack / variant) + direct asset editing; this skill defers those there and keeps the instance apply-tier decision.
- `rule://aku-mcp-policy` — serialized-asset safety, direct domain routing, and fallbacks when no focused capability exists.
