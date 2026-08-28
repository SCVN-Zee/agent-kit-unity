# Example — Apply an override to a specific nested child prefab (Tier 3, gated)

The one case the typed capabilities can't cover. The **apply-overrides** capability applies to the **nearest** prefab root and pushes **all** overrides — so when the user means "apply only to the inner prefab, not the parent", you drop to a **gated editor-side C# snippet** using `PrefabUtility.ApplyObjectOverride`.

> Use this **only** for "apply to the nested child, not the parent". If the user means the whole instance / outermost prefab, that's **Tier 2** (the **apply-overrides** capability) — don't reach for C#. Bind capabilities to the Unity MCP tools in your in-context tool list.

## Scenario

`Tank` (instance of `Tank.prefab`) contains `Turret` (instance of `Turret.prefab`), which contains `Barrel`. The user edited something on `Barrel` and wants it on **`Turret.prefab`**, not `Tank.prefab`.

## Step 1 — Probe (READ ONLY): enumerate the apply targets

Establish the nesting chain and the candidate inner assets before touching anything.

```csharp
// editor-side C# snippet — READ ONLY: list candidate prefab assets for a nested instance
var go = GameObject.Find("Tank/Turret/Barrel");
var nearest   = PrefabUtility.GetNearestPrefabInstanceRoot(go);
var outermost = PrefabUtility.GetOutermostPrefabInstanceRoot(go);
var nearestAsset = AssetDatabase.GetAssetPath(PrefabUtility.GetCorrespondingObjectFromSource(nearest));
var outerAsset   = AssetDatabase.GetAssetPath(PrefabUtility.GetCorrespondingObjectFromSource(outermost));
return $"nearest={nearest?.name} ({nearestAsset}) | outermost={outermost?.name} ({outerAsset})";
```

If `nearestAsset` and `outerAsset` differ, there are 2+ candidates → **ASK** which prefab the user means (list both), unless they already named it.

## Step 2 — Gate: show → confirm → run

Show the apply code to the user and get confirmation **before** running it (it writes a prefab asset). Parameterized on **object path** + **nested asset path**:

```csharp
// editor-side C# snippet — apply ONE object's overrides to a SPECIFIC nested prefab asset
var go = GameObject.Find("Tank/Turret/Barrel");
string nestedAsset = "Assets/Prefabs/Turret.prefab";   // the inner prefab, NOT the Tank
PrefabUtility.ApplyObjectOverride(go, nestedAsset, InteractionMode.UserAction);
AssetDatabase.SaveAssets();
return $"Applied {go.name} overrides to {nestedAsset}";
```

## Step 3 — Verify

**Read the instance data** for `Tank/Turret/Barrel` — `overrideCount` should have dropped.

Confirm the targeted overrides are gone from the instance (they now live in `Turret.prefab`). If `overrideCount` is unchanged, the apply didn't take — re-check `nestedAsset` (must be an asset the object actually descends from).

## Fallback — when editor-side C# is unavailable

If C# execution is disabled (restricted permission mode), **never silent-fail and never hand-off blindly**. Degrade to detect + classify, then hand the user precise manual Editor steps:

1. Select `Tank/Turret/Barrel` in the Hierarchy.
2. In the Inspector, click the override indicator on the changed property (or the **Overrides** dropdown at the top of the prefab instance).
3. Choose **Apply to Prefab 'Turret'** (the *nested* entry — Unity lists each prefab in the chain; pick the inner one, not 'Tank').
4. Save.

State explicitly that you're handing off because C# is unavailable, and which prefab to pick.

## Roadmap (do NOT implement)

Per-property apply — `PrefabUtility.ApplyPropertyOverride(serializedProperty, assetPath, mode)` — is the future surgical path (apply one field, not the whole object). Not shipped yet; document it as the next step, don't use it.

## When NOT to use this recipe

- "Apply to the prefab" / "all tanks" with no nested distinction → **Tier 2** apply-overrides.
- A plain (non-prefab) object → **Tier 1**, just **save the scene**.
- Reparenting or transform edits → the typed **reparent / set-transform** GameObject capabilities.
- You'd rather change the inner prefab **asset** directly (for *all* its instances) → that's **`skill://aku-prefab`** asset-mode editing — often simpler than this nested-apply when you don't need to keep other instances unchanged.
