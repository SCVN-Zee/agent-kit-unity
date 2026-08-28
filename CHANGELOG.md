# Changelog

All notable changes to this project are documented in this file. Generated automatically by semantic-release on the main branch after 1.0.

## [Unreleased]

### BREAKING
- **Convention skill URI split.** `skill://aku-conventions` is replaced by `skill://aku-code-conventions` and `skill://aku-asset-conventions` with no compatibility alias. Code naming, structure, fields, wiring, bounded domains, and runtime Animator policy route to the code skill; content layout, asset filenames/importer intent, config assets, and hierarchy naming route to the asset skill.
- **Generic Unity router removed.** `aku-unity` no longer ships and has no compatibility alias. Prompts now activate the focused scene, prefab, Animator, review, convention, Odin, or Luna skill directly; unmatched Unity domains bind straight to connected MCP capabilities with reflection or script execution as fallback. Cinemachine 2/3 guidance now belongs to `aku-scene`, while catalog-maintainer overrides are build data under `scripts/data/`. Existing installs prune the retired skill when unchanged and preserve user-edited departed files as conflicts.
- **Asset-edit guard retired — the kit is now convention-only.** The PreToolUse asset guard, its cross-agent ship machinery (`ship-guard`, `build-guard-bundle`, the whole **Cursor** target), the portable Unity invariants, the editor-state HARD-GATEs, the Cinemachine "never install" landmine, and the Luna Odin editor-strip guard are all removed. The kit ships conventions + MCP file→tool routing knowledge only. `AKU_ASSET_GUARD`/`CKU_ASSET_GUARD` are inert. **Codex and Cursor users must run `node scripts/ship-guard.cjs --uninstall --target codex|cursor` before upgrading** (not self-healing); Claude Code self-heals on `make update`. See `MIGRATION.md` § "Guard retired".

### Added
- `aku-odin` skill — owns the Odin-instead-of-built-ins mandate (`[Header]`→`[Title]`, icon-first `[Button(SdfIconType.…)]`) and editor-tooling house style. `aku-code-conventions` keeps `[Required]` and bounded-domain policy and imperatively routes inspector work to the Odin skill.
- `aku-odin` Inspector UX and advanced editor-tool guides, including the canonical 21-field/seven-tab locomotion example and a cached `OdinMenuEditorWindow` example.
- `claude/rules/unity-supercent-rules.md` — new `## Commit prefix` section carrying the Supercent commit-message convention (`[Dev] <type>: <subject>`). Folded in from former `sc-git-rules.md`.

### Changed
- **OMP discovery metadata is now trigger-first and enforced.** All 9 skills, 7 base rules, and 3 tier rules state concrete activation intents, owned artifacts, exclusions, and sibling-surface boundaries in their indexed `description`. `lint:frontmatter` now validates the complete inventory, one-line scalar shape, 360-character ceiling, per-surface routing contracts, skill names, and always/glob/TTSR trigger semantics, with falsification tests for every invariant. Report-only Unity file, diff, commit, PR, or completed-feature review enters through `skill://aku-code-review`; it loads `skill://aku-code-conventions` as its convention lens, while direct convention discovery is reserved for policy lookup and author/edit/refactor work.
- **Code convention rulebook is now an activation bridge.** The `**/*.cs` rule imperatively loads `skill://aku-code-conventions` instead of duplicating its policy. The code skill is the single authority, loads task-relevant subfiles, and routes inspector/Odin work to `skill://aku-odin`.
- **Installer conflict baseline integrity.** Normal updates now preserve the prior trusted lock hash for user-edited managed files instead of promoting user bytes into the lock. Repeated updates continue reporting both still-packaged and departed edits as conflicts; only `--force` may overwrite or prune them. Hand-copied conflicts without a trusted baseline remain outside lock management, and legacy v1 entries already marked `orphaned: true` remain protected even when their recorded hash equals the installed user bytes. Uninstall also keeps marker-bearing bytes unless `--force` explicitly accepts that untrusted baseline.
- Texture naming now uses `_BC` for Base Color and appends `_Atlas` after the physical map suffix for material texture atlases (for example, `T_Environment_BC_Atlas`), distinct from Unity `.spriteatlas` assets.
- `claude/hooks/unity-context-inject.cjs` — single Supercent rule load (`unity-supercent-rules.md`) now covers both kit substitutions and commit-prefix.
- `claude/rules/unity-rules.md` — Supercent pointer line collapsed to a single rule file.
- **`omp/RULES.md` relocated to `omp/rules/aku-engine-rules.md`** — the sticky always-apply engine + MCP + serialize invariants now ship as an `alwaysApply: true` rule inside `rules/` instead of a top-level `RULES.md` bucket (behavior preserved; renamed off the ambiguous `RULES` stem to the `aku-<domain>-rules` pattern). Existing installs migrate automatically on `ship-omp --update`: the old top-level `RULES.md` is pruned when unmodified (kept as a conflict if user-edited) and the relocated rule is installed. Installer payload (`omp-install-payload.js`), lock round-trip, `ship-omp`/safety tests, `lint:docs-counts` (now 7 base rules), and all docs/cross-refs (`README.md`, `omp/README.md`, `omp/AGENTS.md`, `AGENTS.md`, `Makefile`, `aku-conventions`) updated accordingly.

### Removed
- `claude/rules/sc-git-rules.md` — content merged into `unity-supercent-rules.md`; path added to `metadata.json.deletions[]` so installers clean up stale copies.
- `claude/rules/unity-supercent-rules.md` — `## Kit substitutions` section dropped (`Supercent.Util.CoroutineUtil`, `Supercent.UIv2`, `BehaviourBase` substitutions no longer prescribed by the kit).
- `claude/skills/cku-conventions/STRUCTURE.md` — stripped Supercent-kit annotations from the MonoBehaviour-discipline rules; removed the `BehaviourBase` bullet. Generic Unity rules retained.

## [1.1.0-rc.1] — 2026-05-06

Adopt Supercent C# coding + asset-naming + project-layout standards as a Supercent-only auto-detected layer. Generic Unity projects unaffected.

### Added
- `claude/lib/supercent-detect.js` — detects `Assets/Supercent/` presence; gates Supercent rule injection.
- `claude/rules/unity-supercent-rules.md` — compact auto-injected overlay (access modifiers, braces, no `var`, naming prefixes, `[field: SerializeField]` SO pattern, lifecycle pairing, comments-for-why, asset folder/prefix guidance).
- `claude/skills/cku-conventions/` — full convention detail in 8 files: `SKILL.md`, `NAMING.md`, `STRUCTURE.md`, `PROJECT_LAYOUT.md`, `ASSET_PREFIXES.md`, plus 3 canonical examples (MonoBehaviour template with section dividers, ScriptableObject `[field: SerializeField]` pattern, Init/Release lifecycle pattern).
- Asset prefix table: `SP_` (sprite), `SS_` (sprite sheet); texture map suffix table (`_D _N _M _R _MT _AO _E _ORM _H _OP`).
- Folder layout: `Sprites/Ingame|UI/` mirroring `Textures/` (replaces `Art/`).

### Changed
- `claude/hooks/unity-context-inject.cjs` — load `unity-supercent-rules.md` conditionally on Supercent projects; hint string now includes "Supercent layout".
- `claude/agents/unity-scripter.md` — Conventions section expanded (access modifiers, braces, no `var`, section dividers, SO pattern); anti-patterns extended; references `cku:conventions`.
- `claude/agents/unity-engineer.md` — Core principles include Supercent layer; references `cku:conventions`.
- `claude/rules/unity-rules.md` — one-line pointer to the Supercent rules + `cku:conventions`.
- 14 existing example files brought into compliance with the new standards (`private` modifiers, full braces, no `var`, comments-for-why, namespace placeholder `<GameName>.<Variant>`).

### Notes
- Kit is purely additive on the Supercent layer; non-Supercent Unity projects see no behavioral change.
- Source standards file `temp/code-standards.md` (provided as one-off input) deleted; standards live in the kit.

## [1.0.0-rc.1] — 2026-04-30

Initial release candidate covering all five phases of the [claudekit-unity supportive-kit plan](../unitykit/plans/260430-1717-claudekit-unity-supportive-kit/plan.md).

### Phase 1 — Skeleton + critical path
- Repo skeleton mirroring claudekit-engineer / claudekit-marketing layout
- `claude/hooks/unity-context-inject.cjs` — SessionStart hook; auto-detects Unity projects + injects rules
- `claude/lib/unity-version-detect.js` — Unity version + render pipeline + Luna detection
- `claude/rules/unity-rules.md` + `claude/rules/unity-mcp-policy.md` — load-bearing MCP-routing table
- `claude/skills/cku-unity/` — entry skill (SKILL.md, MCP_CATALOG.md, DECISION_TREE.md, 3 examples)
- `claude/agents/unity-engineer.md` — generalist Unity agent with embedded decision tree
- `scripts/dev-link.cjs` — symlink kit into a target Unity project; idempotent settings patch; --resync-settings; --uninstall

### Phase 2 — Domain skills + asset guard
- Skills: `cku:script`, `cku:scene`, `cku:test`, `cku:build` (each with SKILL/PATTERNS/MCP_USAGE/examples)
- Agents: `unity-scripter`, `unity-tester` (lightweight routing wrappers)
- `claude/hooks/unity-asset-edit-guard.cjs` — PreToolUse blocker for `.prefab`/`.unity`/`.asset`/etc., with `CKU_DISABLE_ASSET_GUARD=1` escape hatch + rolling 100-line log
- `claude/workflows/unity-feature-development.md`

### Phase 3 — Specialist skills + perf
- Skills: `cku:anim`, `cku:physics`, `cku:ui`, `cku:render` (each with U6/2022 sections)
- Agent: `unity-perf-profiler` (capture → analyze → suggest)
- `claude/hooks/unity-mcp-reminder.cjs` — debounced once-per-session UserPromptSubmit nudge; `CKU_DISABLE_MCP_REMINDER=1` escape hatch
- `claude/workflows/unity-perf-optimization.md`
- `unity-version-detect.js` extended with `getRenderPipelineVersion()`

### Phase 4 — Luna playable-ads pipeline
- `cku:luna` skill (CONSTRAINTS, PATTERNS, MCP_USAGE, 2 examples). SDK pin currently `TBD` pending open question #2.
- `claude/rules/unity-luna-rules.md` — auto-injected on Luna projects
- `claude/workflows/unity-playable-ad-build.md`
- P1 catalogs (`DECISION_TREE.md`, agent prompts, `cku:build/SKILL.md`) cross-link Luna

### Phase 5 — Distribution + CI
- `scripts/merge-settings.cjs` — install-time deep-merger; `.bak.<ts>` snapshot (24h cooldown); idempotent
- `scripts/lint-mcp-refs.cjs` — validates every `mcp__unity__*` ref in markdown against `snapshots/mcp-tools.json`; supports `--snapshot` and `--refresh-snapshot --tools-list <file>`; `<!-- mcp-lint-ignore -->` per-line override for intentional family patterns
- `scripts/lint-loc.cjs` — 200-LOC budget enforcer with carve-out for `MCP_CATALOG.md` reference data
- `scripts/lint-frontmatter.cjs` — verifies all `claude/skills/*/SKILL.md` have valid frontmatter (name/description/when_to_use, `cku:*` naming)
- `scripts/lib/{json-deep-merge,symlink-helpers,walk-md}.js` — shared helpers
- `snapshots/mcp-tools.json` — bootstrap snapshot (refresh against live MCP server before 1.0)
- `.github/workflows/quality-gates.yml` — PR gate (3 lints + dev-link + merge-settings + asset-guard smoke tests)
- `.github/workflows/release.yml` — semantic-release on main push
- `.github/workflows/branch-protection.yml` — declarative; required check `Quality Gates / Lint`
- `package.json` — `bin` exposes `cku-merge-settings` + `cku-dev-link`; `lint:mcp`, `lint:loc`, `lint:frontmatter` scripts

### Open questions (carried from plan)
1. claudekit-cli `--kit unity` upstream PR vs direct-install path — README documents both for now.
2. Luna SDK version baseline — `cku:luna/SKILL.md` frontmatter `luna-sdk: TBD`. Lock before Luna build is run for real.
3. Unity 6 vs 2022 gating granularity — currently in `cku:render`, `cku:anim`, `cku:ui` only.
4. Telemetry for "≥90% MCP usage" success metric — deferred (no logging hook shipped this release).
5. `merge-settings.cjs` deep-merge edge cases — covered by hash-based hook dedup; further synthetic tests pending.
6. Windows symlink fallback — `dev-link.cjs` uses `'junction'` for dirs; copy+watch fallback not shipped.
7. Marketing-kit Luna integration — decoupled per plan; revisit in a follow-up.

### Known limitations
- `snapshots/mcp-tools.json` is a bootstrap inventory — refresh against a live Unity MCP server before shipping 1.0 final.
- DinoUniverse end-to-end smoke test (validation gate S5) tracked as a follow-up; Phase 1 hook + skill content verified against synthetic projects in this commit.
- `unity-asset-edit-guard.cjs` does not currently block direct `.meta` file edits. Direct GUID edits also break asset DB; revisit if reported.

### Code-review follow-ups (rc.1 → 1.0)
- **Fixed in rc.1:** asset guard switched from exit-2-with-stdout-JSON (legacy contract that suppressed the redirect message) to exit-0-with-block-decision JSON (modern contract); `isWithin` replaces unsafe `path.startsWith` in `symlink-helpers.js`; uninstall scans timestamped `.bak.<iso>` as fallback to plain `.bak`; dev-link no longer overwrites a pre-existing backup chain; workflow files renamed `unity-*` so the `OWNED_FILE_PATTERNS` filter picks them up (otherwise dev-link skipped them silently).
- **Deferred:** synthetic test for concurrent UserPromptSubmit hook fires (low-likelihood; atomic-rename means no partial JSON); concurrent asset-guard log writers across sessions sharing a cwd; reduce reliance on `process.cwd()` in hook log paths (use `CLAUDE_PROJECT_DIR` env when available).
