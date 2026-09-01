# Changelog

All notable changes to this project are documented in this file. Maintainers update it before pushing an exact stable or beta release tag.

## [Unreleased]
### Added
- **Channel-aware Unity CLI routing.** `aku-mcp-policy.md` now owns a detection ladder — `unity` binary → live Editor (`unity status`) → `com.unity.pipeline` + Editor 6.0+ (Unity 6 = `6000.x`; element capture ≥6000.7) → `unity list` capability discovery — plus a per-family classification table: `unity command` (Pipeline) is CLI-live only where a dated runtime probe proved the op family; everything unproven stays MCP/`eval`-first (the conservative variant shipped from the 2026-08-30 probe: no live Editor, no Pipeline package in the resolved project), and the connected Unity MCP remains a first-class fallback (chain: CLI-live → MCP → Editor/committed-state `git` → pause). The headless family is MCP/`eval`-primary to match its `parity-unknown` verdict, with `unity build`/`unity test`/`unity run` as a gated fallback — taught only with the project closed in the interactive Editor; lock behavior is unproven, so no single-instance claims. `aku-core-rules` rules 4–5 go channel-aware and the `aku-mcp-guard` body defers to the policy table (frontmatter byte-identical; its MCP-worded description is lint-pinned and stays). The five mutation/review skills carry thin Channel pointers that defer to the policy table, and luna review's asset tier keys Editor reachability off the detection ladder instead of an MCP health probe. RuntimeOnly commands (`simulate_*`, `set_timescale`, …) are documented only as dev-Player capabilities, never in-Editor CLI routes. New stdlib content gate `scripts/tests/aku-cli-content.test.cjs` locks the doctrine (verdict-aware family completeness enforcing all seven frozen verdicts, RuntimeOnly labeling, guard semantics incl. CLI-before-MCP + terminal pause, beta-local-flag ban, 16-surface inventory split) — falsified-first: every assertion group was observed failing before it was trusted.
### Removed
- **Concurrent tier retired.** `omp/tiers/concurrent/` is gone — the agent detects a shared working directory at runtime, so no installed rule is needed. The next `--update` prunes `rules/aku-session-commit-rules.md` when its bytes still match the lock (a user-edited copy is kept as a conflict unless `--force`), and `.omp/aku-project.json` `concurrentSessions` is no longer read by anything.

### Changed
- **Changelog no longer gates `make bump`.** The release-prep target no longer requires a `## [<version>]` `CHANGELOG.md` section; the `scripts/build-release.cjs` channel-rule gate and the downstream bump → README rewrite → `make check` → release commit/tag flow are unchanged, and an edited changelog still rides in the release commit.
- **Tier opt-in is explicit and validated.** `--tier/--no-tier` (comma-separated; `install.sh` forwards it) is the documented optional-install method for the `luna` and `supercent` overlays, auto-detection for those tiers is unchanged, and unknown tier names now fail loudly instead of silently installing nothing.
- **Sticky rule renamed to `aku-core-rules`.** `omp/rules/aku-engine-rules.md` is now `omp/rules/aku-core-rules.md` (`rule://aku-core-rules`) — same always-apply invariants, a name that says what it is. `ship-omp --update` prunes the retired file when its bytes still match the lock (a user-edited copy is kept as a conflict unless `--force`) and installs the renamed rule.
- **Luna skills are tier overlays, and `aku-code-review-luna` is now `aku-luna-code-review`.** Both Luna skills move to `omp/tiers/luna/skills/` (flattened to `.omp/skills/` on install, lock entries tier-tagged, `luna-build-settings.cjs` still byte-tracked), and the review skill joins `aku-luna-build-check` in the `aku-luna-*` format. Default installs no longer ship them: they require full Luna-tier detection — a Luna/Playworks package AND a playable target (`.omp/aku-project.json` `{"lunaPlayable":true}` wins, else a branch containing `playable`) — or an explicit `--tier luna`. A package-only repo on a non-playable branch loses byte-matching managed Luna skills on `--update` (edited copies stay conflicts); existing Luna-tier destinations are unchanged, so those updates are seamless.
- **Luna authoring boundaries.** Luna-specific compatibility and authoring guidance now lives under `omp/tiers/luna/`, including the new `aku-luna-conventions` skill. The common payload retains tier-neutral Unity guidance, while the Luna rule activates the authoring skill across C#, Animator, prefab, scene, and material work.
- **Common versus Supercent layout ownership.** `PROJECT_LAYOUT.md` now documents the common Unity project tree, while the existing Supercent tier rule retains the `Assets/Supercent/` asset layout and `[Dev]` commit policy.

## [0.1.1-beta.2] — 2026-08-29

### Changed
- **Reference catalog and machinery removed.** `docs/MCP_CATALOG.md`, `snapshots/`, `scripts/sync-mcp-catalog.cjs` with its lib helpers/tests/fixtures, `scripts/data/mcp-catalog-overrides.json`, and the `lint:catalog` gate are gone. Kit capability ids are illustrative labels bound at runtime to whatever the connected Unity MCP surfaces; `lint-docs-counts` now derives component counts only (skills/rules), and `docs-facts` no longer reads snapshots.

## [0.1.0-beta.8] — 2026-08-29

### Changed
- **Kit guidance is "install any Unity MCP."** Shipped rules/skills and user-facing prose carry zero specific-MCP names, zero per-server install guidance, and zero pointers to any one server's catalog: the binding policy is server-agnostic end to end and tells users to install any Unity MCP (most share the same core capabilities). The dev-time illustrative reference catalog (`docs/MCP_CATALOG.md` + `snapshots/` + `lint:catalog`) is unchanged on disk as maintainer research per the decoupling plan — its user-facing pointers are removed; maintainers find it via `AGENTS.md` and the regeneration scripts.
- **Install-first README.** The README now leads with the one-line pinned-URL bootstrap (`set -o pipefail; curl -fsSL …/install.sh | sh`), which installs into the current directory by default and forwards targets and modes via `| sh -s --`, plus a first-run tutorial and a compressed component overview. Contributor, release-runbook, and lint-gate detail is consolidated in `AGENTS.md`. The maintenance wrapper form is retired in favor of the pipefail one-liner (with the `s=$(curl …) && sh -c "$s"` fallback for strict POSIX shells).
- **Single-command bootstrap and `make bump`.** README install and manage commands are now one literal, self-contained line each with the current release baked into the URL (update by changing that version, or by running the new release-prep target). `make bump VERSION=x.y.z[-beta.N]` (leading `v` optional) validates `VERSION` against the exact `build-release.cjs` channel rule, refuses until `CHANGELOG.md` contains the matching `## [<version>]` section, then bumps `package.json`/`package-lock.json`, rewrites the README install URL, reruns `make check`, creates the narrow `chore(release): v<version>` commit (changelog + version files + README) and adds annotated tag `v<version>`.

## [0.1.0-beta.7] — 2026-08-28

### Changed
- **Atomic release asset verification.** Stable and beta publishers now compare the uploaded names, byte sizes, and GitHub SHA-256 digests for all three release assets against the local build before making a draft public.
- **Tag-only release titles.** Stable and beta release names now exactly match their tags, such as `v0.1.0-beta.7`.

## [0.1.0-beta.5] — 2026-08-28

### BREAKING
- **Convention skill URI split.** `skill://aku-conventions` is replaced by `skill://aku-code-conventions` and `skill://aku-asset-conventions` with no compatibility alias. Code naming, structure, fields, wiring, bounded domains, and runtime Animator policy route to the code skill; content layout, asset filenames/importer intent, config assets, and hierarchy naming route to the asset skill.
- **Generic Unity router removed.** `aku-unity` no longer ships and has no compatibility alias. Prompts now activate the focused scene, prefab, Animator, review, convention, Odin, or Luna skill directly; unmatched Unity domains bind straight to connected MCP capabilities with reflection or script execution as fallback. Cinemachine 2/3 guidance now belongs to `aku-scene`, while catalog-maintainer overrides are build data under `scripts/data/`. Existing installs prune the retired skill when unchanged and preserve user-edited departed files as conflicts.
- **Generic routing rulebooks removed.** `aku-capability-routing` and `aku-parallel-rules` no longer ship and have no compatibility aliases. Host-agent capability selection and orchestration remain host concerns; the sticky engine rule still serializes Unity Editor mutations. Existing managed installs prune unchanged copies and preserve user-edited copies as conflicts.
- **Asset-edit guard retired — the kit is now convention-only.** The PreToolUse asset guard, its cross-agent ship machinery (`ship-guard`, `build-guard-bundle`, the whole **Cursor** target), the portable Unity invariants, the editor-state HARD-GATEs, the Cinemachine "never install" landmine, and the Luna Odin editor-strip guard are all removed. The kit ships conventions + MCP file→tool routing knowledge only. `AKU_ASSET_GUARD`/`CKU_ASSET_GUARD` are inert. **Codex and Cursor users must run `node scripts/ship-guard.cjs --uninstall --target codex|cursor` before upgrading** (not self-healing); Claude Code self-heals on `make update`. See `MIGRATION.md` § "Guard retired".

### Added
- **Tag-driven GitHub Releases.** Separate stable (`vX.Y.Z`) and beta (`vX.Y.Z-beta.N`) workflows run the full repository gate, build a draft release, verify its exact asset set, and publish only after all checks pass.
- **Checksum-verified release bootstrap.** `scripts/build-release.cjs` emits exactly `install.sh`, `agent-kit-unity-v<version>.tgz`, and `SHA256SUMS`; the bootstrap verifies the archive before running the packaged OMP installer.
- `aku-odin` skill — owns the Odin-instead-of-built-ins mandate (`[Header]`→`[Title]`, icon-first `[Button(SdfIconType.…)]`) and editor-tooling house style. `aku-code-conventions` keeps `[Required]` and bounded-domain policy and imperatively routes inspector work to the Odin skill.
- `aku-odin` Inspector UX and advanced editor-tool guides, including the canonical 21-field/seven-tab locomotion example and a cached `OdinMenuEditorWindow` example.
- `claude/rules/unity-supercent-rules.md` — new `## Commit prefix` section carrying the Supercent commit-message convention (`[Dev] <type>: <subject>`). Folded in from former `sc-git-rules.md`.

### Changed
- **Independent distribution identity.** Package metadata and public release URLs now use `SCVN-Zee/agent-kit-unity`; the current package version is `0.1.0-beta.5`, and consumer install/update/check/uninstall guidance uses stable-latest or exact-beta GitHub bootstrap URLs instead of a global npm install.
- **Branch-independent tagged releases.** Stable and beta workflows still reject non-canonical repositories and enforce exact tag/package/lock versions, but now publish the exact tagged commit without fetching or requiring ancestry from any branch.
- **Reproducible catalog verification.** Generated MCP catalog snapshots and `docs/MCP_CATALOG.md` are tracked so fresh checkouts run the same catalog gate as contributor worktrees.
- **Reliable draft publication.** Stable and beta publishers tolerate GitHub's short release-list consistency delay before asserting, uploading, and publishing a newly created draft.
- **OMP discovery metadata is now trigger-first and enforced.** All 9 skills, 5 base rules, and 3 tier rules state concrete activation intents, owned artifacts, exclusions, and sibling-surface boundaries in their indexed `description`. `lint:frontmatter` now validates the complete inventory, one-line scalar shape, 360-character ceiling, per-surface routing contracts, skill names, and always/glob/TTSR trigger semantics, with falsification tests for every invariant. Report-only Unity file, diff, commit, PR, or completed-feature review enters through `skill://aku-code-review`; it loads `skill://aku-code-conventions` as its convention lens, while direct convention discovery is reserved for policy lookup and author/edit/refactor work.
- **Code convention rulebook is now an activation bridge.** The `**/*.cs` rule imperatively loads `skill://aku-code-conventions` instead of duplicating its policy. The code skill is the single authority, loads task-relevant subfiles, and routes inspector/Odin work to `skill://aku-odin`.
- **Asset convention rulebook is now an activation bridge.** Asset-path globs retain automatic discovery, while the compact rule loads `skill://aku-asset-conventions` only for naming, organization, importer-intent, config-asset, and texture-suffix policy. Scene, prefab, Animator, material, and other serialized mutation remains with focused Unity skills or the connected Unity MCP.
- **Installer conflict baseline integrity.** Normal updates now preserve the prior trusted lock hash for user-edited managed files instead of promoting user bytes into the lock. Repeated updates continue reporting both still-packaged and departed edits as conflicts; only `--force` may overwrite or prune them. Hand-copied conflicts without a trusted baseline remain outside lock management, and legacy v1 entries already marked `orphaned: true` remain protected even when their recorded hash equals the installed user bytes. Uninstall also keeps marker-bearing bytes unless `--force` explicitly accepts that untrusted baseline.
- Texture naming now uses `_BC` for Base Color and appends `_Atlas` after the physical map suffix for material texture atlases (for example, `T_Environment_BC_Atlas`), distinct from Unity `.spriteatlas` assets.
- `claude/hooks/unity-context-inject.cjs` — single Supercent rule load (`unity-supercent-rules.md`) now covers both kit substitutions and commit-prefix.
- `claude/rules/unity-rules.md` — Supercent pointer line collapsed to a single rule file.
- **`omp/RULES.md` relocated to `omp/rules/aku-engine-rules.md`** — the sticky always-apply engine + MCP + serialize invariants now ship as an `alwaysApply: true` rule inside `rules/` instead of a top-level `RULES.md` bucket (behavior preserved; renamed off the ambiguous `RULES` stem to the `aku-<domain>-rules` pattern). Existing installs migrate automatically on `ship-omp --update`: the old top-level `RULES.md` is pruned when unmodified (kept as a conflict if user-edited) and the relocated rule is installed. Installer payload (`omp-install-payload.js`), lock round-trip, `ship-omp`/safety tests, `lint:docs-counts` (now 7 base rules), and all docs/cross-refs (`README.md`, `omp/README.md`, `omp/AGENTS.md`, `AGENTS.md`, `Makefile`, `aku-conventions`) updated accordingly.

### Removed
- **Competing npm publisher.** Semantic-release configuration, scripts, publish metadata, and dependencies are removed. GitHub tag workflows are the only release publishers; no npm package is published.
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
