# agentkit-unity

> Standalone, MCP-agnostic Unity kit for AI coding agents: it teaches Unity conventions and routes Editor operations to whatever Unity MCP is connected, bound at runtime from the in-context tool list—no server name hard-coded and none auto-registered. It ships as an Oh My Pi (OMP) project-scoped kit, so it activates only inside the Unity repo that contains it.

**Status: v1.x-rc.** Validation gate before `1.0.0` final: the agent reaches for the **connected Unity MCP's** tool **unprompted** on a Unity-coded prompt in a real Unity project (whichever server is registered).

> **Migration note.** The globally-installed Claude Code / Codex builds (SessionStart/UserPromptSubmit hooks, `~/.claude`, `~/.codex`) are **retired**. There is one build now: the project-scoped OMP kit under `omp/`, installed with `ship-omp`.

## Why

When an agent works in a Unity project, it reaches for plain `Read`/`Edit` instead of the server's specialized tools (`script-read`, `gameobject-create`, `scene-open`, …). That breaks Unity's asset guarantees — prefab applies, scene serialization, asset-DB refresh — and produces broken commits.

The kit answers that by **teaching the agent, not policing it** — it trusts a capable model to route correctly once it knows the conventions. Because it is project-scoped, its rules and skills are discovered natively from the repo's `.omp/` and apply only inside that repo:

1. **`AGENTS.md`** carries project background + tier-detection instructions.
2. **`rules/aku-engine-rules.md`** carries the sticky always-apply hard invariants (engine + MCP + serialize).
3. **The other `rules/`** carry on-demand rulebook/guard rules (focused domain routing, conventions, asset guard).
4. **`skills/`** encode focused scene, prefab, Animator, review, convention, and Odin workflows.

Scope is Unity Editor/asset handling. C# script authoring stays with the host agent runtime while this kit supplies the conventions. Luna playable-ad *builds* are run by the Luna pipeline. Luna *source/asset compatibility review* is in scope, via `/skill:aku-code-review-luna`.

---

## What the kit does

### Skills — 9

Six are user-invocable as `/skill:aku-<name>`; `aku-code-conventions`, `aku-asset-conventions`, and `aku-odin` are reference skills the others load.

| Skill | What it owns |
|---|---|
| `aku-scene` | Scenes, hierarchy, components, prefab-**instance** work, cameras, and Cinemachine 2/3. Detects prefab context before mutation, owns propagation tiers, and carries focused core-capability camera recipes. |
| `aku-prefab` | Prefab-**asset** lifecycle: the stage workflow (`assets-prefab-open` → mutate → `assets-prefab-save` → `assets-prefab-close`), create, instantiate, unpack, variant. |
| `aku-animator` | AnimatorController + AnimationClip wiring — parameter-driven transitions rather than force-played states. Owns the build order, the transition-kind decision, and a read-back gate that catches unreachable states, conditionless transitions and weight-0 layers. |
| `aku-code-conventions` | Unity C# conventions: naming, class structure, lifecycle pairing, inspector-first reference wiring, `[Required]`, bounded-domain fields, and parameter-driven runtime Animator code. *(Reference skill — loaded by the others.)* |
| `aku-asset-conventions` | Unity content conventions: project layout, asset prefixes, texture-map suffixes and importer intent, config asset naming, and scene/prefab hierarchy name prefixes. *(Reference skill — loaded by the others.)* |
| `aku-odin` | Odin Inspector house style when Sirenix is installed: task-based Inspector UX, state semantics, groups and tabs, validation and collections, plus the escalation path from attributes through `OdinEditorWindow`, menu trees, selectors, property trees, and custom drawers. Absence of Odin is the only off-ramp. *(Reference skill — loaded by `aku-code-conventions` for inspector work; the `**/*.cs` rule activates that code-policy entrypoint.)* |
| `aku-code-review` | Unity-flavored review: GC in hot paths, MonoBehaviour lifecycle and leaks, serialization/wiring defects, ungated editor/debug code, convention violations. Report-only; verifies via read-only tools. |
| `aku-code-review-luna` | Luna playable compatibility lens. Flags Bridge.NET forbidden-API hazards (async/await, reflection, struct-keyed dictionaries, `ScreenToWorldPoint`, …) and Luna asset risks that compile clean in the Editor but strip or no-op in the Luna build. Report-only. |
| `aku-luna-build-check` | Luna export build-settings probe against `luna.json` — 6 auto-fixable gates, 4 report-only advisories. |

**Domains without a focused skill** — bind directly to a matching capability from the connected Unity MCP; if none exists, use `reflection-method-call` or `script-execute`: physics · ui · render · test · build · first-class surgical per-property prefab apply. *(Luna builds → Luna pipeline.)*

### Agents — none

The kit ships **no specialist agents**. Unity work runs directly in the main session (the conventions and routing rules are in context), and code review runs **inline** via the `aku-code-review` / `aku-code-review-luna` skills.

### Rules — 5 base + 3 tier overlays

Base rules ship into every Unity repo's `.omp/`; tier overlays are copied in only for matching repos (see Install). Each rule is bucketed by how OMP loads it — **sticky always-apply** (full body every prompt), **rulebook** (name+desc listed; body pulled via `rule://` on demand), or **TTSR** (fires once on a matching edit/command).

| Rule | Bucket | Loaded when |
|---|---|---|
| `aku-engine-rules.md` | Sticky always-apply | Always — hard engine + MCP + serialize invariants |
| `aku-code-convention-rules.md` | Rulebook | On-demand when editing `**/*.cs` |
| `aku-asset-convention-rules.md` | Rulebook | On-demand for asset work |
| `aku-mcp-policy.md` | Rulebook | Serialized-asset safety, focused domain dispatch, and live-capability/reflection fallback |
| `aku-mcp-guard.md` | TTSR | On `edit`/`write` of a corruptible Unity asset — aborts, redirects to MCP |
| `aku-sc-rules.md` *(Supercent tier)* | Always-apply | Supercent repos — `[Dev]` commit prefix + playable-ad layout |
| `aku-luna-rules.md` *(Luna tier)* | Rulebook | Luna playable targets — the Odin editor-strip guard |
| `aku-session-commit-rules.md` *(concurrent tier)* | TTSR | Concurrent-session repos — aborts blanket `git add -A` |

### File types that corrupt on hand-edit

The routing rules flag the file types where a plain `Edit`/`Write` breaks Unity's on-disk integrity, so the agent reaches for the connected MCP's tool instead:

- **Corrupt-on-edit** (7): `.prefab` `.unity` `.controller` `.anim` `.mat` `.playable` `.signal` — FileID webs, prefab apply chains, shader coupling. Route through the Editor/MCP, never a text edit.
- **Usually-safe YAML**: `.asset` `.preset` `.spriteatlas` `.terrainlayer` `.giparams` `.lighting` `.physicMaterial` `.physicsMaterial2D` `.cubemap` — flat key/value; a direct edit is usually harmless but still better routed when a tool exists.

`aku-mcp-guard` (TTSR) aborts the first raw edit of a corrupt-on-edit type and redirects to the MCP. `git checkout` / `git restore` / `git reset` remain the recovery path if an asset is ever corrupted.

### The MCP surface

The kit binds to **whatever Unity MCP you have connected**, matching each capability it needs against the tools already surfaced in the session's in-context tool list — it hard-codes no server name and auto-registers nothing. The reference server documented in [`docs/MCP_CATALOG.md`](./docs/MCP_CATALOG.md) — IvanMurzak Unity-MCP — exposes **82 tools** (74 core + 6 AI Animation + 2 AI ParticleSystem) and **46 prompts**, and is one concrete example of the surface the kit expects, not a requirement.

Such servers commonly ship each tool **twice** — an MCP tool (`mcp__<server>__<id>`) and a generated per-tool skill invoked as the bare `<id>` — both backing the same handler in the Unity editor. **Kit content cites bare kebab capability ids in backticks** — `scene-open`, `assets-prefab-instantiate`, `gameobject-modify` — as illustrative labels; downstream resolution binds them to whichever surface the connected server registers.

**Extensions treated as first-class**: AI Animation (`animator-*`, `animation-*`), AI ParticleSystem (`particle-system-*`). **Cinemachine uses core tools** (see `skills/aku-scene/CINEMACHINE.md`). Remaining extensions are install-pointer plus reflection fallback: `reflection-method-find` → `reflection-method-call`.

---

## Install

### 1. A Unity MCP server (bring your own)

The kit binds to **whatever Unity MCP you connect** — it registers none and hard-codes no server name. Any server exposing Unity Editor capabilities (scene, prefab, asset-DB, animator, material tools) works. The examples in `docs/MCP_CATALOG.md` use IvanMurzak Unity-MCP as one concrete choice. Once a server is connected, its tools (or generated per-tool skills) surface in-context and the kit binds each capability to them.

### 2. The kit — into a Unity repo's `.omp/`

```sh
npm i -g agentkit-unity
aku-ship-omp /path/to/unity-repo              # install base + auto-detected tiers, write the lock
aku-ship-omp /path/to/unity-repo --check      # verify in sync (exit 2 on drift/available update)
aku-ship-omp /path/to/unity-repo --update     # apply upstream changes; keep user edits unless --force
aku-ship-omp /path/to/unity-repo --uninstall  # remove hash-matching trusted paths; orphan-marked bytes need --force
aku-ship-omp /path/to/unity-repo --dry-run    # print the plan, write nothing
```

Iterating on the kit itself? Run `node scripts/ship-omp.cjs <repo>` from this checkout — same command, same result (the packaged `omp/` resolves from the module root either way).

The installer writes `.omp/{AGENTS.md,rules/*,skills/**}` and **auto-detects** tier overlays from the target, recording the chosen set plus a raw-byte SHA-256 per file in `.omp/aku-lock.json`:

- **Supercent** — `Assets/Supercent/` present → `aku-sc-rules.md`.
- **Luna playable** — a Luna/Playworks package is present AND the target is playable (`.omp/aku-project.json {"lunaPlayable":true}` wins; else the branch name contains `playable`) → `aku-luna-rules.md`.
- **Concurrent sessions** — `.omp/aku-project.json {"concurrentSessions":true}` → `aku-session-commit-rules.md`.

Override auto-detection with `--tier a,b` / `--no-tier a,b`. Drift is decided by **content hash**, never by version string; a committed `.omp/aku-lock.json` never churns, and a re-run on unchanged source+target is a byte-identical no-op. User-edited managed files are kept as conflicts (never silently clobbered) unless `--force`; departed files are pruned only when their on-disk hash still matches the lock.

### Prereqs

- **An OMP-capable agent host** that discovers a repo's `.omp/` rules and skills.
- **A Unity MCP server** connected, so each capability binds to a surfaced tool.
- **Node 18+** for the installer (stdlib only — no runtime deps).

### Smoke test

Open the Unity repo and run a small Unity prompt:

> add a Debug.Log to PlayerController.Update

Expect the agent to reach for `script-read` (or `script-update-or-create`) **without** being told, then await the compile via `console-get-logs(severity="Error")` before any follow-up scene mutation. If it pivots to plain `Read`/`Edit`, file an issue with the session transcript.

---

## Configure

### Project marker

`.omp/aku-project.json` — optional committed file the kit reads by name for project facts (the installer never writes it):

| Key | Effect |
|---|---|
| `lunaPlayable` (`true`/`false`) | Authoritative override for "is this an active Luna playable target". Beats the branch-name heuristic. Gates `aku-luna-rules.md`. |
| `concurrentSessions` (`true`) | Declares that multiple sessions share this working directory. Gates `aku-session-commit-rules.md`. |
| `odin` (`true`/`false`) | Overrides Odin Inspector auto-detection. Beats every auto signal. |

---

## Develop the kit

### Repo map

| Path | Contents |
|---|---|
| `omp/` | The shipped kit: `AGENTS.md`, `rules/` (incl. the always-apply `aku-engine-rules.md`), `skills/`, and `tiers/<tier>/rules/` overlays |
| `scripts/` | `ship-omp.cjs` + its `lib/` (lock, payload, reconcile, tier-detect, apply), the MCP catalog generator, and the lint gates |
| `scripts/tests/`, `test/` | Unit + integration suites |
| `snapshots/` | Generated MCP inventories — the lint authority for tool/prompt refs |
| `references/` | Vendored Unity-MCP plugin + extension repos (gitignored from CI) |
| `plans/`, `docs/` | Plans and long-form documentation (untracked, local-only) |

### Make targets

```
make help       List available targets
make update     Install/refresh the OMP kit into TARGET_DIR/.omp and write the lock
make dry-run    Preview the install for TARGET_DIR, writing nothing
make uninstall  Remove hash-matching trusted paths; keep drifted/orphan-marked bytes
make omp-check  Verify TARGET_DIR/.omp is in sync (exit 2 on drift)
make test       Run the full test suite (scripts/ + test/)
make lint       Run all lint gates
make check      Full verification gate — lint + test (run before an update)
```

```bash
make update TARGET_DIR=/path/to/unity-repo
```

`TARGET_DIR` is a make **variable**, not a flag (default `.`).

### Lint gates

| Gate | Enforces |
|---|---|
| `lint:loc` | No kit code/skill file over 200 LOC — **including `scripts/tests/`** |
| `lint:catalog` | `docs/MCP_CATALOG.md` + snapshots are byte-identical to a fresh regeneration of the reference-server catalog |
| `lint:frontmatter` | `name` + `description` frontmatter present and well-formed on every `omp/skills/*/SKILL.md` |
| `lint:docs-counts` | Counts stated in docs match source (mirror completeness enforced only where a `docs/components/<category>/` dir exists) |

`make check` (`npm run lint` + `npm test`) is the local verification gate — run it before every install. It must exit 0.

### Contributing rules that bite

- **Single namespace.** Every shipped file under `omp/{skills,rules}` is `aku-*` (Supercent tier `aku-sc-*`). Enforced by `scripts/tests/shipped-namespace.test.cjs`.
- **Never blanket-rename `unity-`.** `unity-ai-animation`, `unity-tool-list`, `unity-skill-generate`, `Unity-MCP`, `agentkit-unity` and the user-file example `unity-house-style.md` all legitimately keep it.
- **The lock is untrusted destructive input.** `ship-omp` deletes a path only when its on-disk hash still equals the recorded hash; it refuses a symlinked `.omp/` root and never rmdirs the root.
- **Version source is `package.json`.** The installer stamps `kitVersion` into the lock for provenance only; drift is decided by content hash, never a version compare.
- **No new runtime deps.** Node stdlib only; every file ≤200 LOC (`lint:loc`).

Full detail in [`AGENTS.md`](./AGENTS.md).

---

## Troubleshooting

- **Rules/skills not discovered** — confirm the repo has a populated `.omp/` (`aku-ship-omp <repo>`), and that the nearest non-empty `.omp/` walking cwd→repo root is this one.
- **`ship-omp --check` exits 2** — a managed file drifted from the lock, or an upstream update is available. Run `--update` (add `--force` to overwrite your own edits).
- **`ship-omp` refuses** — it declines when `.omp/` is a symlink (it may redirect writes) or when the lock is corrupt/forward-version; `--force` rebuilds a corrupt lock.
- **Agent ignores the rules** — confirm `.omp/rules/aku-mcp-policy.md` exists, then restart the session.
- **Unity MCP tools unresolved** — confirm a Unity MCP server is connected and its tools (or generated per-tool skills) appear in the in-context tool list. The kit binds to whatever is surfaced under any server name.

---

## License

MIT — see [LICENSE](LICENSE).
