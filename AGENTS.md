# AGENTS.md — agentkit-unity

This file provides guidance to coding agents working with this repository.

## Role

This repo is a **standalone, MCP-agnostic, convention-only Unity kit**, shipped as an **Oh My Pi (OMP) project-scoped kit**. It teaches the agent **Unity conventions** (naming, structure, asset layout) and how to route Editor operations to **whatever Unity MCP is connected** — binding each capability to the tools already in the session's in-context tool list, hard-coding no server name and auto-registering nothing. It ships Unity domain skills and rules; it ships **no specialist agents** — a capable model, given the conventions and routing rules, decides for itself when to route an asset op through the connected MCP. Because it installs into a repo's `.omp/`, it activates only in that repo and stays silent everywhere else — no detection hooks needed.

> The globally-installed Claude Code / Codex builds (hooks, `~/.claude`, `~/.codex`) are **retired**. There is one build: the project-scoped OMP kit under `omp/`, installed with `ship-omp`.

## Dual invocation surface

A Unity MCP server commonly ships each tool **twice**:

1. **MCP tool** — invoked as `mcp__<server>__<kebab>` through the MCP tool client.
2. **Auto-generated per-tool skill** — invoked as the bare `<kebab>` via the Skill tool.

Kit content cites **bare kebab capability ids in backticks** (`scene-open`, `script-update-or-create`) as illustrative labels; the agent binds each to whichever surface the connected server registers. The kit hard-codes no server name — it never emits a prefixed `mcp__<server>__` form.

## Coexistence

- The kit is **standalone**: it ships Unity handling only and routes non-Unity capabilities (cross-language scaffolding, planning, debugging, **C# script authoring**) at runtime via `aku-capability-routing.md`. When a sibling engineer/skill kit is installed it wins that routing; when absent, native fallbacks carry the work.
- It supplies Unity-only knowledge via `aku-*` namespaced files across skills and rules.
- `scripts/ship-omp.cjs` copies the packaged `omp/` into a target repo's `.omp/`, records a checksum lock, and reconciles updates against user edits — it never touches paths the lock does not record.

## Layout

```
omp/                       # The shipped kit (copied into a repo's .omp/)
  AGENTS.md                # project background + tier-detection instructions
  rules/                   # aku-engine-rules.md (sticky always-apply engine+MCP+serialize) + on-demand rulebook + TTSR guard
  skills/aku-*/            # focused Unity skills (SKILL.md + subfiles)
  tiers/<tier>/rules/      # tier overlays copied in for matching repos (supercent, luna, concurrent)
scripts/
  ship-omp.cjs             # install / --check / --update / --uninstall / --dry-run into <repo>/.omp
  sync-mcp-catalog.cjs     # regen docs/MCP_CATALOG.md (reference-server catalog) + snapshots
  lib/
    omp-install-lock.js      # .omp/aku-lock.json read/write (atomic, corrupt/version-gated, per-entry hashes)
    omp-install-payload.js   # byte-oriented enumerator: base + tiers → per-file raw SHA-256
    omp-install-reconcile.js # pure three-way (source/lock/installed) planner + destructive-integrity gate
    omp-tier-detect.js       # pick tier overlays from target markers/branch/package
    omp-install-apply.js     # fs-touching half: guarded writes/deletes, symlink refusal, integrity delete
    global-install-fs.js     # writeAtomic + copy/remove/tmp-sweep, symlink-safe
    path-safety.js           # assertSafePath / isWithin / assertRootNotSymlink containment guards
    docs-facts.js            # derive component inventory + counts from source (docs-counts authority)
  tests/                   # node --test suite for scripts
test/                      # Luna build-settings validator suite
snapshots/
  mcp-tools.json             # flat tool list + per-tool source/category
  mcp-tools-by-category.json # grouped tool list (lint:catalog authority)
  mcp-prompts.json           # 46 [AiPrompt] entries with Enabled flag
references/                # vendored Unity-MCP plugin + extension repos (gitignored from CI)
Makefile                   # OMP install/update/verify (make help | update | dry-run | uninstall | omp-check | check; TARGET_DIR=.)
```

## Critical rules for contributors

- **Single namespace**: every shipped file under `omp/{skills,rules}` is named `aku-*`; the Supercent tier spells it `aku-sc-*`. `unity-*` is retired precisely because it collides with plausible user file names — the kit must never own a prefix a user would pick. Enforced by `scripts/tests/shipped-namespace.test.cjs`.
- **Never blanket-rename `unity-`.** `unity-ai-animation` / `unity-ai-particlesystem` (MCP extensions), `unity-tool-list` / `unity-skill-generate` (server-side names), `Unity-MCP` (the vendored plugin), `agentkit-unity`, and the user-file example `unity-house-style.md` all legitimately keep `unity` — a namespace sweep that touches them corrupts foreign or user files.
- **The lock is untrusted destructive input.** `ship-omp` deletes a path only when its on-disk raw-byte hash still equals the hash the lock recorded (the destructive-integrity gate) — a user-edited or foreign file is kept as a conflict, never clobbered, unless `--force`. It refuses a symlinked `.omp/` root (writes could redirect outside the repo) and never `rmdir`s the root itself: `path.relative(root, root)` is `''`, so a `.` entry must never resolve to the root.
- **Drift is content, not version.** The lock stamps `kitVersion` from `package.json` for provenance only; `--check`/`--update` decide staleness by comparing raw-byte hashes, so a committed `.omp/aku-lock.json` never churns and a re-run on unchanged source+target is a byte-identical no-op. `installedAt` is preserved; `updatedAt` bumps only on an actual change.
- **Byte-oriented payload.** `omp-install-payload.js` hashes **raw file bytes** — it must not route non-`.md` skill subfiles through the markdown walker (which decodes UTF-8 and would miss binary/exact-byte content). README/tier metadata are excluded from the payload.
- **Version source is `package.json`.** Nothing reads or writes a `metadata.json`; that file and its stamp step are gone.
- **File size**: each `.md` skill subfile and `.js`/`.cjs` source ≤200 LOC — **including `scripts/tests/`**, which `lint-loc` does not ignore. Split helpers into `scripts/lib/` as needed (`docs/MCP_CATALOG.md` may exceed; carve-out documented in `lint-loc.cjs`).
- **Capability refs**: reference Unity capabilities by **bare kebab ids in backticks** as illustrative labels — the agent binds them to the connected server's tools at runtime. The kit hard-codes no server name and emits no `mcp__<server>__` prefix. `docs/MCP_CATALOG.md` stays byte-identical to a fresh regeneration, enforced by `lint:catalog`.
- **No new runtime deps**: Node stdlib only for scripts. Dev deps (semantic-release plugins) are fine.

## OMP kit conventions

- **Rule buckets.** `rules/aku-engine-rules.md` is sticky always-apply (full body every prompt, via `alwaysApply: true`) — it cannot self-gate, which is why the kit is project-scoped rather than user-global. The other `rules/*` are rulebook (name+desc indexed, body pulled via `rule://` on demand) except `aku-mcp-guard.md`, which is TTSR (fires once on a matching corrupt-on-edit `edit`/`write`). Supercent's `aku-sc-rules.md` is always-apply; the concurrent tier's `aku-session-commit-rules.md` is TTSR.
- **Discovery.** OMP finds `.omp/` rules and skills at priority 100; skills live one level under `.omp/skills/` as `<name>/SKILL.md`, addressable as `skill://aku-<name>` and `/skill:aku-<name>`.
- **Lock inertness.** `.omp/aku-lock.json` matches no rule/skill/config discovery path — the only `.omp/*.json` the kit reads by name is `aku-project.json`. The lock is therefore inert (no dot-prefix needed).

## Validation gate

Whole-plan smoke (held at `-rc` until a Unity project is available): an agent in a real Unity project reaches for the **connected Unity MCP's** tool (either surface) **unprompted** on a Unity-coded prompt. Machine gates ship first: `lint:catalog`, `lint:loc`, `lint:frontmatter`, `lint:docs-counts`, and the full `scripts/tests/` + `test/` suites — all exit 0 (aggregated as `make check`).

## Workflow

When implementing changes inside this repo:
- Read the active plan under `plans/` (the latest `<timestamp>-*/plan.md`) and the relevant `phase-XX-*.md` for context.
- Update CHANGELOG.md via semantic-release commits (`feat:`, `fix:`, etc.). `package.json` is the version source of truth.
- After any installer/rule/skill change, run `make check` (lint + test), then `make update TARGET_DIR=<unity-repo>` (or `node scripts/ship-omp.cjs <repo>`) to refresh a real install and confirm every path the lock names resolves.
- **`TARGET_DIR` is a make VARIABLE, not a flag** (default `.`).

## Updating the MCP Catalog

When the Unity-MCP plugin or an extension ships a new version:

1. Pull the new plugin source into `references/Unity-MCP/Unity-MCP-Plugin/` (and the extension repo into `references/Unity-AI-<Name>/`).
2. Regenerate from C# sources (multi-source — first is core, rest are extensions):
   ```bash
   node scripts/sync-mcp-catalog.cjs \
     --plugin-source references/Unity-MCP/Unity-MCP-Plugin/Packages/com.ivanmurzak.unity.mcp/Editor/Scripts/API \
     --plugin-source references/Unity-AI-Animation \
     --plugin-source references/Unity-AI-ParticleSystem \
     --write
   ```
   Refreshes `snapshots/mcp-tools.json`, `snapshots/mcp-tools-by-category.json`, `snapshots/mcp-prompts.json`, and `docs/MCP_CATALOG.md`.
3. (Optional) Update curated descriptions / footnotes / `assumedExtensions` in `scripts/data/mcp-catalog-overrides.json` (kebab keys only — snake keys are dropped to stderr).
4. Verify the gate locally: `npm run lint:catalog` (must exit 0).
5. Commit everything in one PR.

The generator is deterministic (sorted output, mtime-based `refreshedAt`) — reruns produce byte-identical files. Missing extension source dirs degrade gracefully (warn + core-only output, exit 0).
