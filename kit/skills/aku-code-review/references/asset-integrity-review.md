# Surface — asset reference integrity (read-only)

Compilation cannot establish scene/prefab wiring. Inspect the data used by the changed code without editing,
saving, importing or opening a different scene/prefab stage in the user's workspace.

## Capabilities and boundaries

Use available scene/component/asset read capabilities; bind by actual surfaced capability, not server name.
Read the currently loaded scene or asset representation without changing selection/stage when possible.
A tool named “execute” is not automatically safe or unsafe: inspect its effects. Arbitrary editor code can run
callbacks or mutate state, so do not invoke it as a report-only fallback unless its read-only behavior is established.
If inspection would require loading/importing assets with unknown callbacks, report that coverage as blocked.

Dependency enumeration is not a complete missing-reference scan. `CollectDependencies` does not prove that every
serialized reference resolves; text matching `m_Script: {fileID: 0}` misses broken nonzero GUIDs and other references.
Do not label such a partial scan complete.

## When to inspect

- A serialized field, component requirement or prefab-instantiating path changes.
- A scene/prefab/ScriptableObject is part of the reviewed change.
- A runtime path depends on a specific authored assignment that cannot be proven from C#.

## Protocol

1. Locate the changed asset and owning object by stable asset/object path or ID. Bound traversal to affected consumers.
2. Read the serialized slots and distinguish intentional nulls, unresolved references and valid assignments. Verify
   missing script components separately from ordinary unassigned object fields.
3. Check GUID/fileID resolution when available, including nonzero references to deleted scripts/assets. Respect prefab
   inheritance/overrides; an unset override is not automatically an unset source field.
4. Report the asset path, object path, field and observed failure. If evidence is incomplete, label the candidate
   unverified rather than asserting it is broken.

## Suppression and handoff

An optional field needs documented null behavior and a compatible runtime path. A guard alone does not prove that an
otherwise required reference is intentionally optional. Do not report unrelated unused assets as blocking issues.

Report-only review never repairs wiring. A separate authorized implementation chooses source versus instance,
performs mutations and verifies Undo, override persistence and save/reopen.

No live Editor or suitable read surface: report `asset-integrity: not run` with the reason. Static serialized-text
inspection may supplement evidence, but is not a complete Unity reference resolver and never authorizes file edits.
