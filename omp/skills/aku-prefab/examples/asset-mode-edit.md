# Example — Edit a prefab asset in isolation (asset-mode, gated)

The case `skill://aku-prefab` exists for: the user names a `.prefab` **asset** and wants the asset itself changed. No scene, no instance, no override/apply dance — edit the source, every instance inherits.

> Use this **only** when the target is a named asset and the user means "change the prefab itself / all of them". If they mean "just this one in the scene", that's a `skill://aku-scene` Tier-1 override — not an asset write. Bind each capability to the Unity MCP tools in your in-context tool list.

## Scenario

`Assets/Prefabs/Player.prefab` has a `Player` component with `moveSpeed = 3`. The user: "set the Player prefab's moveSpeed to 5." They named the asset → asset-mode.

## Step 1 — Inspect

**Read the prefab data** for `Assets/Prefabs/Player.prefab`:

```
# → { name: "Player", assetPath: "Assets/Prefabs/Player.prefab",
#     type: "GameObject", childCount: 3, components: [...] }
```

Confirm it's the asset you think it is (and that `Player` / `moveSpeed` exist).

## Step 2 — Gate: show → confirm → run

The edit **writes the asset**, so show the code and get confirmation **before** running the **editor-side C# snippet**. Parameterized on **asset path** + the **mutation**:

```csharp
// editor-side C# snippet — asset-mode edit Player.prefab
string path = "Assets/Prefabs/Player.prefab";
var root = PrefabUtility.LoadPrefabContents(path);   // isolated copy
root.GetComponent<Player>().moveSpeed = 5f;          // the mutation
PrefabUtility.SaveAsPrefabAsset(root, path);
PrefabUtility.UnloadPrefabContents(root);            // mandatory
return $"moveSpeed=5 saved to {path}";
```

## Step 3 — Verify

**Read the prefab data** for `Assets/Prefabs/Player.prefab` to confirm the asset changed.

Every existing and future instance of `Player` now reads `moveSpeed = 5` (unless an instance has a local override of that field).

## Fallback — when editor-side C# is unavailable

If C# execution is disabled (restricted permission mode), **never silent-fail and never hand-off blindly**. Offer the two manual paths:

1. **Prefab Mode (direct):** in the Project window, double-click `Player.prefab` → it opens in isolation → edit `moveSpeed` on the `Player` component → Ctrl/Cmd-S. This is the exact asset-mode edit, done by hand.
2. **Instance + apply (via `skill://aku-scene`):** **instantiate the prefab** into a scratch scene → edit the instance → `skill://aku-scene` Tier-2 **apply the overrides to the source** to push it to the asset.

State which path you're handing off and why (C# unavailable).

## When NOT to use this recipe

- "Just this door, this scene" → `skill://aku-scene` Tier 1 (instance override).
- "Apply this instance's change to the prefab" → `skill://aku-scene` Tier 2 (+ coarse-apply audit).
- "Only the nested child prefab, not the parent" → `skill://aku-scene` Tier 3.
- A plain scene object of unknown prefab status → `skill://aku-scene` (detect first).
