# MCP Usage — Scenes, Hierarchy, Components, Prefabs

The ordered capability sequences for scene / hierarchy / component / prefab-instance work, with param sketches.

> **Binding instruction.** Bind each capability below to the Unity MCP tools already surfaced in your in-context tool list — match the capability, not a hardcoded name. If none matches, do it in the Editor or via a committed-state `git` op.

> Modify capabilities support three surfaces — **`diff`**, **`pathPatches`**, **`jsonPatch`**. Reads accept **`paths`** and **`viewQuery`** to slice the payload and save tokens.

## Scene

| Capability | Params (sketch) | When |
| --- | --- | --- |
| Open a scene | `sceneRef` (`{assetPath}` or `{name}`), `loadSceneMode` (`Single` / `Additive` / `AdditiveWithoutLoading`) | Open a scene before editing it. |
| Save the scene | `sceneRef?` (omit = active), `saveAsPath?` | After a scene mutation. |
| Create a scene | `assetPath` | New empty scene. |
| Read scene data | `sceneRef`, `paths?` / `viewQuery?` | Inspect before mutating; slice for tokens. |
| List open scenes | — | List currently loaded scenes + dirty flags. |
| Set the active scene | `sceneRef` | Choose which loaded scene receives new objects. |
| Unload a scene | `sceneRef` | Unload an additive scene. |

## GameObject / hierarchy

| Capability | Params (sketch) | When |
| --- | --- | --- |
| Create a GameObject | `name`, `parent?` (GO ref), `primitive?` (`Cube` / `Sphere` / `Capsule` / `Cylinder` / `Plane` / `Quad`), `transform?` | Create a GO/primitive. |
| Destroy a GameObject | GO ref | Remove a GO. |
| Duplicate a GameObject | GO ref | Clone. |
| Reparent a GameObject | `target` (GO ref), `newParent` (GO ref or null = scene root), `siblingIndex?` | **Reparent** (typed — no reflection needed). |
| Find a GameObject | `query?`, `tag?`, `component?`, `layer?`, `path?` | Search by criteria. |
| Modify a GameObject | GO ref, `diff` / `pathPatches` / `jsonPatch` | Rename, set transform, toggle active, set tag/layer. |

## Component / transform

| Capability | Params (sketch) | When |
| --- | --- | --- |
| Add a component | GO ref, `componentTypeName` (e.g. `"Rigidbody"`, FQ if ambiguous) | Add a component. |
| List a GameObject's components | GO ref | Enumerate components on a GO. |
| Read component data | GO ref, `componentTypeName?`, `paths?` / `viewQuery?` | Read serialized fields; slice for tokens. |
| Apply a targeted patch to a component | GO ref, component ref, `diff` / `pathPatches` / `jsonPatch` | Set serialized properties (reflection-aware; honors `[SerializeField]`). |
| Destroy a component | GO ref, component ref | Remove a component (typed). |
| Read / patch object data | object ref + paths/diff | Generic `UnityEngine.Object` (ScriptableObjects, settings, sub-assets). |
| Read a type's JSON schema | `typeName` | Discover field shape before constructing a patch. |

## Prefab — instance propagation

Kept here: prefab-**instance** detection + the apply tiers. **Asset-lifecycle** (create / instantiate / unpack via reflection), **variant** creation, and **direct asset editing** → `skill://aku-prefab`.

| Capability | Params (sketch) | When |
| --- | --- | --- |
| Detect: read component/object data (PrefabInstance slice) | GO ref or instance ref, `paths=["PrefabInstance.m_Modifications", "PrefabInstance.m_SourcePrefab"]` | Reveals `sourcePrefab` + `m_Modifications[]`. |
| Tier 2: open the prefab in an isolated stage → mutate → save → close | prefab asset path | **Audit first.** Replay the intended edit on the source via the prefab stage. |
| Revert a single override: reflection call on `PrefabUtility.RevertObjectOverride` (or editor-side C# snippet) | `Object instance, InteractionMode` | No dedicated capability ships. |
| Tier 3: reflection call on `PrefabUtility.ApplyObjectOverride` | `Object instance, string assetPath, InteractionMode` | Push a single override into a nested child prefab. See `examples/nested-prefab-apply.md`. |

## Escape hatch (reflection / script chain)

| Capability | Params (sketch) | When |
| --- | --- | --- |
| Find a method by reflection | type / method filters | Locate an Editor API by name before invoking it. |
| Call a method by reflection | type, method, args | Scalpel for ops with no typed capability. |
| Run an editor-side C# snippet | C# snippet | One-off Roslyn-compiled execution; ends with `return <expr>;`. |
| Author/edit a permanent editor helper | path, contents | Land a helper under `Assets/Editor/`. |
| Invoke a menu command by reflection (`EditorApplication.ExecuteMenuItem`) | menu path | e.g. `"GameObject/Align With View"`. |
| Refresh the asset DB | — | Only after **external** file changes; in-Editor changes via the capabilities above don't need it. |

### Editor-side C# snippet return rule

An editor-side C# snippet is wrapped as a function body — end it with `return <expr>;` so the response carries an inspectable result (status string, JSON, object ref). Standard Unity / Editor namespaces are available.

## Anti-patterns

- `Edit Assets/Scenes/SC_Main.unity` / `Edit *.prefab` — route through the connected Unity MCP's scene/prefab capabilities instead.
- Editing a pre-existing object without detecting prefab-instance state first → silent scene-override risk.
- Replaying a Tier-2 change on the source without auditing the live instance's overrides → propagates unrelated noise.
- Reaching for an editor-side C# snippet to reparent — use the typed reparent capability.
- Inventing tool names to "discover" the surface — bind to the Unity MCP tools already in your in-context tool list; don't call a tool-introspection command.
