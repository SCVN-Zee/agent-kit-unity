# Prefab-Asset Patterns

Domain gotchas behind `DECISION_TREE.md`. Speaks capabilities, not tool names.

> Bind each capability to the Unity MCP tools already surfaced in your in-context tool list — match the capability, not a hardcoded name. If none matches, do it in the Editor or via a committed-state `git` op.

## Asset-mode editing (the whole point)

Editing the prefab **asset** directly changes the **source**, so **every** instance inherits — no override/apply dance. Typically **no typed capability** covers this; use a *run-an-editor-side-C#-snippet* capability with `PrefabUtility.LoadPrefabContents`.

```csharp
// editor-side C# snippet — asset-mode edit (writes the asset)
string path = "Assets/Prefabs/Player.prefab";
var root = PrefabUtility.LoadPrefabContents(path);   // isolated copy, NOT in any scene
// mutate the isolated copy, e.g.:
// root.GetComponent<Player>().moveSpeed = 5f;
// root.transform.Find("Body").gameObject.SetActive(false);
PrefabUtility.SaveAsPrefabAsset(root, path);          // write back to the asset
PrefabUtility.UnloadPrefabContents(root);             // MANDATORY — frees the temp scene
return $"asset-mode edit saved to {path}";
```

Gotchas:

- The loaded `root` is an **isolated copy** in a hidden preview scene — it **cannot** reference scene objects, and scene objects can't reference it.
- `UnloadPrefabContents(root)` is **mandatory**; skipping it leaks the temporary edit scene.
- Game-assembly types (your own `MonoBehaviour`s) are **not** auto-imported — the wrapper injects only `UnityEngine` / `UnityEditor` / `System` / `Collections.Generic` / `Linq`. Fully-qualify a namespaced component (`MyGame.Player`) or the script won't compile.
- This is the right path when the user clearly means "change the prefab **asset**". If they mean "just this one in the scene", that's a `skill://aku-scene` Tier-1 override instead.

## Variants (no typed capability → C#)

A variant is a prefab whose source is another prefab. Typically there is **no** dedicated *create-variant* capability — saving a *connected* instance of a base prefab as a new asset produces a variant. Full walkthrough: `examples/variant-create.md`. Use variants for reskins + minor stat tweaks; a fresh prefab (the **create-prefab-from-a-scene-GameObject** capability) for fundamentally different behavior.

## Instantiate / create / unpack (typed capabilities)

| Op | Capability | Note |
| --- | --- | --- |
| Drop asset into scene | **instantiate a prefab** into a parent (`Pool/Enemies`) | Then **save the scene** if it changed. Subsequent edits on the instance → `skill://aku-scene`. |
| Scene GO → new asset | **create a prefab** from a scene GameObject at a save path | Creates the asset + leaves a connected instance. |
| Break the link | **unpack the prefab instance** (`OutermostRoot`) | `Completely` flattens nested prefabs too. Only when you intend to sever the connection. |

## Editor-side-C# policy (scalpel only)

Reach for the **run-an-editor-side-C#-snippet** capability **only** when no typed capability covers the op (asset-mode edit, variant). Rules:

1. **No `using` directives** — the handler injects `UnityEngine` + `UnityEditor` + `System` + `Collections.Generic` + `Linq`.
2. **End with `return <expr>;`** — the wrapper is `object Execute()`; a return-less body fails to compile. Return a status string.
3. Prefer the typed capability whenever one exists — the raw C# snippet skips the plugin's safety wrappers.

## Hand back to `skill://aku-scene` when…

- The target turns out to be a scene **instance**, not a named asset.
- The user wants the change in one scene only (Tier-1 override) or to "apply to the prefab" from an instance edit (Tier-2 + coarse-apply audit) or to a **nested child** (Tier-3).

## Common mistake

Reaching here to "apply overrides". Apply/revert start from a scene instance and live in `skill://aku-scene`. This skill edits the **asset**; it does not reconcile instance overrides.
