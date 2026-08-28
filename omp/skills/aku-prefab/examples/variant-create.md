# Example — Create a prefab variant (gated)

A **variant** is a prefab whose source is another prefab: it inherits the base and overrides a few things. Reskins + minor stat tweaks should be variants; fundamentally different behavior should be a fresh prefab (the **create-prefab-from-a-scene-GameObject** capability). Typically there is **no** dedicated *create-variant* capability — saving a *connected* instance of the base as a new asset produces a variant.

> Bind each capability to the Unity MCP tools already in your in-context tool list; if none matches, use the manual Editor path.

## Scenario

`Assets/Prefabs/Enemy.prefab` is the base. The user wants `Goblin.prefab` — same rig, different tint + HP — as a **variant** so base changes still propagate.

## Step 1 — Inspect the base

**Read the prefab data** for `Assets/Prefabs/Enemy.prefab` to confirm the base asset.

## Step 2 — Gate: show → confirm → run

Writes a new asset → show the code and confirm first, then **run the editor-side C# snippet**:

```csharp
// editor-side C# snippet — create a variant of an existing prefab
var baseAsset = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/Prefabs/Enemy.prefab");
var temp = (GameObject)PrefabUtility.InstantiatePrefab(baseAsset);   // connected instance
bool ok;
PrefabUtility.SaveAsPrefabAsset(temp, "Assets/Prefabs/Goblin.prefab", out ok);  // → variant
Object.DestroyImmediate(temp);
return ok ? "variant Goblin.prefab created" : "variant save failed";
```

`SaveAsPrefabAsset` of a **connected** instance (from `InstantiatePrefab`) yields a *variant*, not a standalone copy — `Goblin` keeps `Enemy` as its base.

## Step 3 — Verify

**Read the prefab data** for `Assets/Prefabs/Goblin.prefab` to confirm the new variant asset exists.

Then apply the per-variant tweaks (tint, HP) with an **asset-mode edit** on `Goblin.prefab` (see `asset-mode-edit.md`).

## Notes

- Fresh prefab instead of variant → the **create-prefab-from-a-scene-GameObject** capability (no base link).
- Editing the **base** later (`Enemy`) propagates to `Goblin` except where the variant overrides — that inheritance is the reason to choose a variant.
- Naming follows `skill://aku-asset-conventions` — prefabs take no prefix; the `.prefab` extension self-identifies (like Sprite Atlas).
