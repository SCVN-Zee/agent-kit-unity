# Surface — Asset Reference Integrity (read-only)

A large class of Unity bugs lives in the *data*, not the code: an unassigned `[SerializeField]` slot, a missing component, a broken prefab link, a "Missing (Mono Script)" entry. The C# compiles and looks correct; the scene/prefab is wrong. This protocol catches those — **read-only**, via the live Editor.

## Capabilities (all read-only)

| Capability | Use |
| --- | --- |
| List open scenes / read scene data | Walk the active scene tree. Use `paths` / `viewQuery` to slice. |
| Find a GameObject | Locate a flagged object by name / path / component type. |
| List a GameObject's components | Per-GameObject component list — confirm an expected component exists. |
| Read component data | Serialized field values — detect `None` / null refs on `[SerializeField]` slots. |
| Read asset data | Read the prefab/asset payload directly (slice with `paths`). |
| Read object data | Generic `UnityEngine.Object` read (ScriptableObjects, settings assets). |
| Find assets | Locate prefabs/assets by name/type/folder. |
| Call `UnityEditor.EditorUtility.CollectDependencies` by reflection (or an editor-side C# snippet) | Dependency / unused-asset / missing-script sweeps — no dedicated capability is assumed; fall back to reflection. |

Bind each capability to the Unity MCP tools already surfaced in your in-context tool list — match the capability, not a hardcoded name. If none matches, read via the Editor. Never hand-edit a serialized asset file.

**Never** call a mutating capability — any *create / modify / destroy / save / add / remove / clear / refresh / execute* verb, or a script-write / package / enter-play-state capability. This review only reads.

## When to run

After the static C# pass (Lenses 1–5), when the change:
- adds/edits a `[SerializeField]` field → confirm the slot is actually wired in the prefab/scene that uses it (bridges Lens 3 from "the code looks unwired" to "it IS unwired in the asset").
- adds/removes a component or `[RequireComponent]`.
- touches a prefab-instantiating path or a scene the diff references.

## Protocol

1. Locate the touched scenes/prefabs (find assets by name/type, or paths from the diff).
2. For each new/changed serialized ref in the diff: find the GameObject → read component data on the owning object → verify the slot is assigned, not `None`. For prefab assets, read the asset data (slice with `paths`) — or open the prefab in an isolated stage non-mutatively, reading then closing it.
3. For broader missing-script / orphan sweeps, call `UnityEditor.EditorUtility.CollectDependencies` by reflection (returns `Object[]`) or run a one-off editor-side C# snippet that iterates `AssetDatabase.GetAllAssetPaths()` checking for `m_Script: {fileID: 0}` patterns. Treat any hit on a changed asset as **Critical**.
4. Report findings in the standard format with the asset path + object path. Tag lens `asset`.

## Reporting & handoff

- **Read-only.** Report the broken wiring; do NOT fix it. Editor-state fixes (scene/prefab mutations, the apply-vs-override decision) are applied separately through the connected Unity MCP, not in this read-only pass.
- If the Editor is not open (a health probe fails), skip this surface and note `asset-integrity: skipped (no live Editor)` in the report rather than guessing.

## Suppress

- Unused-asset hits unrelated to the change (informational only, don't block).
- Intentional null slots that the code guards (verify the guard exists before suppressing).
