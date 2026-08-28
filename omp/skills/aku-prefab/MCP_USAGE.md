# MCP Usage — Prefab Assets

Capability sequences for prefab-asset work through the connected Unity MCP. Bind each capability below to the Unity MCP tools already surfaced in your in-context tool list — match the capability, not a hardcoded name; if none matches, do it in the Editor or via a committed-state `git` op.

## Prefab asset lifecycle

The ordered lifecycle — the loop is **open the isolated stage → mutate → save → close**:

| Capability | When |
| --- | --- |
| Find assets | **Locate the asset.** First call when you have a name or hint, not a path. |
| Read asset data | Inspect the asset's serialized fields. Slice reads to save tokens. |
| Open the prefab in an isolated stage | **The stage entry.** All GameObject / object patches between open and close target the asset, not the scene. |
| Save the prefab | Commit the in-stage mutations to the asset. Triggers re-serialization. |
| Close the stage | Always pair with the open, or the stage leaks. |
| Instantiate a prefab | Drop a prefab asset into the active scene. Follow with a scene save if the scene changed. |
| Create a prefab from a scene GameObject | Save a scene GameObject as a **new** prefab asset. |

**Not here (owned by `skill://aku-scene`):** the prefab-**instance** apply-tier decision (scene-override vs apply-to-source vs nested-child) — those start from a scene instance and live in `skill://aku-scene/DECISION_TREE.md`.

## Editing inside the stage

While a stage is open, mutate via these capabilities:

| Capability | When |
| --- | --- |
| Find a GameObject | Locate child by path/name inside the stage root. |
| Modify a GameObject | Transform / name / hierarchy changes. |
| Add / modify / destroy a component | Component-level changes (serialized fields included). |
| Apply a targeted patch to an object | Any `UnityEngine.Object` field write (e.g. `MonoBehaviour` fields). |

Always close by saving the prefab → closing the stage.

## Variant + unpack (no typed capability)

| Op | Path |
| --- | --- |
| Create a variant | call a method by reflection on `PrefabUtility.CreateVariant`, OR run an editor-side C# snippet invoking `PrefabUtility.CreateVariant` |
| Unpack a prefab instance | call a method by reflection on `PrefabUtility.UnpackPrefabInstance`, OR run an editor-side C# snippet |

When the gap matters (you make more than one reflection call), land a permanent helper by authoring a script in `Assets/Editor/`.

## Refresh

| Capability | When |
| --- | --- |
| Author a script | Lands a permanent helper script under `Assets/Editor/`. |
| Refresh the asset DB | After external file changes (rarely needed — in-Editor changes through the tools don't require it). |

## Editor-side C# snippet return rule (Roslyn)

The editor-side C# snippet capability compiles the `code` string with Unity / UnityEditor / System namespaces in scope and runs it. The body must compile and return a value — return a short status string so the result is observable on the wire.

- **Do not** add `using` directives for what's already in scope.
- **End with `return <expr>;`** — a body of only `Debug.Log(...)` fails to compile.

## Anti-patterns

- ❌ `Edit Assets/Prefabs/Player.prefab` / `Write *.prefab` — route through the connected Unity MCP instead.
- ❌ Asset-mode editing a scene object that's actually an *instance* — if the user means "just this scene", that's `skill://aku-scene` Tier 1, not an asset write.
- ❌ Opening the prefab stage without a matching close — leaks the temp edit stage.
- ❌ Reaching here for prefab-instance override decisions — those are `skill://aku-scene`.
