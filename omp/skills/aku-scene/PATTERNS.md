# Scene & Prefab Patterns

Domain gotchas behind the `DECISION_TREE.md` routing.

> **Binding instruction.** Bind each capability below to the Unity MCP tools already surfaced in your in-context tool list — match the capability, not a hardcoded name. If none matches, do it in the Editor or via a committed-state `git` op.

## Scene management

A project usually has a **boot/main** scene with persistent managers and **gameplay** scenes loaded additively or by replacement. For Editor-time setup the agent uses the connected Unity MCP; the runtime `SceneManager` API belongs in game code, not in agent calls.

```
open the scene            (Assets/Scenes/SC_Main.unity, Single load mode)
read scene data           (slice with paths, e.g. ["root"]) — confirm starting state
# … mutate …
save the scene            (omit the scene ref = active scene)
```

Multi-scene editing: open a second scene additively to layer it, set the active scene to choose where new objects land, unload it when done. Listing the open scenes enumerates the current set + dirty flags.

## Hierarchy ops

| Op | Capability | Note |
| --- | --- | --- |
| Add child | create a GameObject (`name="Goblin"`, parent `"Pool/Enemies"`) | request a `primitive` for built-in shapes (`Cube`…). |
| **Reparent** | reparent the GameObject (`target=<Goblin>`, `newParent=<Player>`, `siblingIndex=0`) | Typed capability. **Not** reflection, **not** an inline script. |
| Set transform | modify the GameObject (`diff={transform.position: [1,0,0]}`) | Local TRS via diff / pathPatches / jsonPatch. |
| Find | find a GameObject (`tag="Enemy"`) | Criteria search (query/tag/component/layer/path). |
| Dump tree | read scene data (`paths: ["root"]`, `viewQuery: …`) | Before any mutation; slice with `paths` for tokens. |

## Prefabs — instance propagation

> Asset-lifecycle (instantiate / create / unpack), variants, and direct asset editing → `skill://aku-prefab`. This section keeps **instance** detection + the apply tiers.

### Detect before editing (the whole point)

Any pre-existing object may be a prefab instance. Read its prefab-instance slice to classify it:

```
read component data on <Pool/Enemies/Goblin>, sliced to:
  ["PrefabInstance.m_SourcePrefab", "PrefabInstance.m_Modifications"]
# sourcePrefab? m_Modifications[]? overrideCount = m_Modifications.Length
```

This classifies the target and feeds the audit. Skip it only for objects you created earlier this session.

### The Tier-2 source-replay trap (narrative)

There is no single "apply all overrides to source" capability. Tier 2 is **open the source prefab and replay your edit there**: open the source in an isolated stage → replay the GameObject/component/object modification → save → close the stage. The change then propagates to every instance.

Before opening the source, run the **audit**: read `m_Modifications[]` on the live instance; if unrelated overrides are pending, warn and offer replay-only / replay-all / cancel. To wipe a single override without replaying, make a reflection call on `PrefabUtility.RevertObjectOverride`. See `examples/scene-override-vs-apply.md`.

### Remove a component (typed)

```
destroy the component on <Pool/Enemies/Goblin>  (component=<Rigidbody ref>)
```

If you only have a type name, read component data by type name (`"Rigidbody"`) first to resolve the component ref, then destroy it.

### Nested prefabs (Tier 3)

A prefab can contain another prefab as a child. Editing the child instance creates a **local override**; replaying it on the outermost source pushes it to the wrong asset. To land the change on the specific inner asset, make a reflection call on `PrefabUtility.ApplyObjectOverride(Object instance, string assetPath, InteractionMode)` — or run an editor-side C# snippet — per `examples/nested-prefab-apply.md`.

## Reflection / editor-snippet policy (scalpel only)

Reach for the reflection / editor-snippet chain **only** when no typed capability covers the op (revert-single-override, nested-child apply, obscure Editor calls). Rules:

1. Prefer the typed capability whenever one exists — reflection skips Undo + dirty-flag wrappers.
2. Editor-side C# snippets must end with `return <expr>;`. Standard Unity / Editor namespaces are pre-injected.
3. **Gate destructive scripts** (anything that writes a prefab asset): show the plan → confirm → run → verify by reading the asset data (or re-open the source prefab stage to inspect).

## Save

```
save the scene
```

Save the scene to persist a scene mutation; a closed Editor session discards unsaved changes. Prefab stage changes persist when the prefab stage is saved, but the host scene still needs a scene save if it changed.

## Common mistake

Reading the `.unity` / `.prefab` YAML in plain text and editing it. It breaks the moment instance IDs renumber. If you're tempted, you missed a capability — re-check `DECISION_TREE.md`.
