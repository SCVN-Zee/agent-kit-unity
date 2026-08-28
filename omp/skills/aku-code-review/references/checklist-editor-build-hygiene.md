# Lens 5 — Editor & Build Hygiene

Editor-only and debug code must NOT ship in player builds. Two failure modes: (a) build breaks because runtime code references `UnityEditor.*`; (b) debug/cheat code silently ships, costing perf or exposing exploits. Flag both.

## Debug logging in shipping code

- `Debug.Log`/`LogWarning`/`LogError` on a runtime hot path or in shipping code without a guard. Options, in order of preference:
  - Wrap call sites in `#if UNITY_EDITOR || DEVELOPMENT_BUILD`.
  - Put the log behind a `[System.Diagnostics.Conditional("UNITY_EDITOR")]` (or `"DEVELOPMENT_BUILD"`) wrapper method — the compiler strips every call site, including argument evaluation.
  - Gate via `Debug.unityLogger.logEnabled = false` in release.
- String interpolation inside a `Debug.Log` that runs in release — the string is built even if logging is off (unless `[Conditional]` strips the call).

## UnityEditor in runtime code (build break)

- `using UnityEditor;` or `UnityEditor.*` API used by a script NOT under an `Editor/` folder or `Editor` asmdef, and NOT inside `#if UNITY_EDITOR` → player build fails to compile.
- `[MenuItem]`, `AssetDatabase`, `EditorGUILayout`, `Selection`, `EditorApplication` referenced from runtime — guard or move to `Editor/`.
- A `#if UNITY_EDITOR` block that leaves a runtime field/method referenced elsewhere undefined in the build (dangling ref). Prefer `[Conditional]` for methods.
- A `Setup Refs` / auto-wire method (populates `[SerializeField]` slots via `GetComponent`/`Find`, or calls `UnityEditor.*`) NOT wrapped in `#if UNITY_EDITOR` → build break / ships edit-time logic. Also flag missing `EditorUtility.SetDirty(this)` (auto-wired values won't persist). Correct trigger: `[Button]`/`Reset` (`[ContextMenu]` without Odin), never `OnValidate` (cross-ref `skill://aku-code-conventions/REFERENCE_WIRING.md` §4).

## Assembly definitions

- Runtime asmdef referencing an Editor asmdef → invalid; Editor → Runtime is the only allowed direction.
- Editor-only test/util asmdef without `"includePlatforms": ["Editor"]`.

## Gizmos & inspectors

- `OnDrawGizmos`/`OnDrawGizmosSelected` doing heavy work — editor-only callback, fine to exist, but flag if it allocates a lot or runs game logic.
- Game logic placed inside `OnValidate` (editor callback) that the runtime depends on.

## Dev cheats / test hooks

- Cheat code (god mode, level skip, infinite currency, free IAP) reachable in a release build — gate behind `DEVELOPMENT_BUILD` or a compiled-out flag.
- Hardcoded test data / mock responses / `#if` test branches that flip behavior in release.

## Inspector attrs & editor tooling (Odin projects)

Applies only where Odin is installed — check `AGENTS.md` (`Assets/Plugins/Sirenix/` or UPM/asmdef Sirenix refs; override `.omp/aku-project.json {"odin": true|false}`). Severity is deliberate: a mandate applied
retroactively to a legacy codebase produces hundreds of findings and trains people to ignore the reviewer.

| Finding | Severity |
| --- | --- |
| `[Header]`/`[Tooltip]`/`[Space]` where an Odin attr belongs | **nit — NEW code only**, never a blanket sweep of existing files |
| Text-only `[Button]` where a conventional glyph exists | **nit** |
| Icon-only button that is destructive, infrequent, or has no tooltip | **finding** — unreadable/dangerous UI (`skill://aku-odin/EDITOR_TOOLING.md` §4) |
| `SdfIconType` member that does not exist | **finding** — compile break |
| `SdfIcons` / `SirenixEditorGUI` outside `Editor/` or `#if UNITY_EDITOR` | **finding** — editor-only assembly in runtime code, player build fails |
| `SdfIcons.CreateTransparentIconTexture` called from `OnGUI`/per-repaint without caching | **finding** — allocates a `Texture2D` every frame (cross-ref Lens 1) |
| `EditorGUIUtility.IconContent("…")` name string in new tooling | **nit** — silent blank icon when wrong; prefer compile-checked `SdfIconType` |
| Odin attr unguarded on a **Luna playable** target | **critical** — see `checklist-luna-compatibility.md` |

`[SerializeField]` is never replaced by an Odin attr and never moves inside a conditional-compilation guard —
Odin decorates, Unity serializes. Same for the rest of the keep-list in `skill://aku-odin/ODIN_ATTRIBUTES.md` §4.

## Asset loading

- `Resources.Load` for content that should be Addressables/asset-referenced — `Resources/` ships everything, bloats build + memory (cross-ref Lens 1). Existing `Resources` usage is not auto-flagged; flag NEW additions for non-trivial assets.

## Suppress

- `Debug.LogError` for genuinely exceptional, rare runtime failures (kept intentionally).
- Editor code correctly under `Editor/` or `#if UNITY_EDITOR`.
- Built-in `[Header]`/`[Tooltip]` in a project **without** Odin — correct there, not a finding.
- Correctly guarded Odin attrs on a Luna playable target.
