# Odin versions, optional modules and verification

Confirm the installed Unity/Odin versions and available assemblies before using an API. A Sirenix folder or project
marker selects house policy; it does not prove every module, symbol, license or assembly reference exists.
The `.omp/aku-project.json` Odin override cannot make missing DLLs compile.

## Evidence order

1. Inspect project/package version information and the relevant asmdef/plugin import settings.
2. Confirm symbols in installed API/source metadata or a consumer compilation.
3. Use matching official documentation/release notes; current online examples are not minimum-version guarantees.
4. If support is unknown, use the simpler proven surface and report the limitation rather than inventing a define.

Do not add guessed `ODIN_*` compilation symbols. Editor-only assemblies and target-specific guards remain mandatory
where required; runtime serialization stays a separate decision.

## Optional capabilities

| Capability | Documented baseline / use | Adoption boundary |
| --- | --- | --- |
| Unit / smart fields | Introduced in Odin 3.2; stored/displayed units can differ. | Verify range/delayed-field composition; suffix labels are a fallback. |
| UI Toolkit integration | Odin 3.2 added VisualElement embedding and Unity drawer support, requiring supported Unity versions (initially 2020.2+). | Coexistence is not a wholesale conversion of Odin windows to native UI Toolkit. Test lifecycle/fallbacks. |
| Addressables module | Odin 3.2 documents support for Addressables 1.20+. | Confirm both packages/module and current compatibility. Some dependency rules additionally need Validator. |
| Visual Designer / OVDF | Odin 4.0.1 release documents the no-code designer and overview. | Optional layout iteration; do not require Odin 4 for basic Inspector work. |
| Odin Validator | Separate installed product for profiles, project scans and integration hooks. | Inspector attribute feedback remains usable without it; fixes and build/play gates need deliberate setup. |

## Visual Designer ownership

Use the Visual Designer to prototype grouping and presentation without recompilation, or for designer-owned layouts
when the team explicitly adopts it. Default to C# attributes for code-owned constraints. Do not maintain two competing
layout authorities accidentally.

Before committing OVDF layouts, establish:

- which layouts live in C# versus OVDF and how effective overrides are reviewed,
- where files are stored and which configured search roots discover them,
- autosave/manual-save behavior and the scope of a designer session,
- inherited-type and third-party customization ownership,
- how a clean checkout reproduces the same Inspector without local-only settings.

Recent releases changed Visual Designer search-root behavior; never assume Assets is scanned on every version.
Treat OVDF changes as authored configuration, not runtime data migration. Report-only review must not open a designer
workflow that autosaves user changes.

## Documentation drift

As researched in September 2026, the release index listed Odin 4.0.2.4 while some API pages still identified 3.3.1.2.
The Searchable tutorial says direct dictionary search is unsupported, while 3.2 notes announce dictionary/table support.
Resolve such conflicts with the installed version, not whichever page is easiest to copy.

Odin's 4.0.2.3 notes discuss Unity 6000.6+ dictionary serialization under specific circumstances. Do not generalize this
to older Unity or every dictionary shape, and do not change existing serialization ownership without a migration review.
Consult the [live release index](https://odininspector.com/patch-notes) rather than treating this research date as a pin.

## Required consumer evidence

Recipes in this skill are illustrative until verified against the consumer's actual packages. Documentation lint
and successful kit installation do not establish any of the following:

| Area | Verify |
| --- | --- |
| Compilation | Editor and applicable player targets; asmdefs; absent optional modules; supported API signatures. |
| Persistence | Save/reopen, domain reload, backing-field names, managed-reference storage and intended asset ownership. |
| Mutation | Undo/redo; source prefab versus instance/variant; override display; no implicit broad save; cancel preserves data. |
| UX | Narrow/normal width, light/dark theme, keyboard, empty/stale data, mixed multi-selection, clear destructive labels. |
| Lifetime/performance | Reopen/reload, event unsubscription, native resource cleanup, large collections and bounded repaint cost. |

Record passed/failed/not run per area and the exact Unity/Odin versions. If a project path is unavailable, report the
checks as not run; do not present screenshots, documentation or text tests as behavioral proof.

Sources: [3.2 release notes](https://odininspector.com/patch-notes/3-2-1-0),
[4.0.1 release notes](https://odininspector.com/patch-notes/4-0-1-0),
[Visual Designer](https://odininspector.com/tutorials/visual-designer/getting-started-with-the-visual-designer),
[Odin Validator](https://odininspector.com/odin-validator).
