# Agent Kit Unity

> Standalone, MCP-agnostic Unity kit for AI coding agents: it teaches Unity conventions and routes Editor operations to whatever Unity MCP is connected — no server name hard-coded, none auto-registered. Ships as an Oh My Pi (OMP) project-scoped kit, so it activates only inside the Unity repo that contains it.

**Release channels:** stable tags (`v0.1.0`) and beta tags (`v0.1.0-beta.7`) — no RC channel. Until the first stable tag exists, install from a pinned beta URL; GitHub's `releases/latest/` only resolves for stable releases.

> **Migrating from the retired global builds?** The Claude Code / Codex global installs (hooks, `~/.claude`, `~/.codex`) are gone. There is one build: the project-scoped OMP kit inside your repo's `.omp/`.

## Install

Requirements: macOS or Linux with POSIX `sh`, `curl`, `tar`, and **Node 18+** (checksum verification + installer; stdlib only).

### 1. Run this from your Unity repo root

```sh
set -o pipefail; curl -fsSL https://github.com/SCVN-Zee/agent-kit-unity/releases/download/v0.1.1-beta.4/install.sh | sh
```

What just happened:

- The bootstrap downloaded the release pinned in the URL, **verified the downloaded archive against the SHA-256 embedded in `install.sh`** before running anything, then installed `.omp/{AGENTS.md,rules/*,skills/**}` plus the notebook `.omp/aku-lock.json` — a raw-byte SHA-256 per installed file. The lock is how later updates and uninstall tell "kit file, untouched" apart from "yours".
- If the target matches a tier — by auto-detection (section 3) or an explicit `--tier <name>` opt-in — the installer copies that tier's rule files **flattened into `rules/`**; there is never a `.omp/tiers/` directory in an install. The active set is recorded in `aku-lock.json` under `tiers`.
- No path argument means **the current directory**. For another target, replace the trailing `| sh` with `| sh -s -- /path/to/unity-repo`.
- `set -o pipefail` — bash, zsh, or dash ≥ 0.5.12 — makes a failed or partial download exit loudly instead of faking success. Drop it and a 404 silently "succeeds". On a strict POSIX `sh`, use the equally fail-closed one-shot instead: `s=$(curl -fsSL <the URL above>) && sh -c "$s"`. Once the first **stable** tag ships, `https://github.com/SCVN-Zee/agent-kit-unity/releases/latest/download/install.sh` follows the latest stable.

### 2. Verify, update, remove

`--check` and `--update` compare your install against the release named in the URL — change the version in the URL to move to a newer release (in a kit checkout, `make bump VERSION=<next>` does the whole bump):

```sh
set -o pipefail; curl -fsSL https://github.com/SCVN-Zee/agent-kit-unity/releases/download/v0.1.1-beta.4/install.sh | sh -s -- --check      # drift report; exit 2 = out of sync
set -o pipefail; curl -fsSL https://github.com/SCVN-Zee/agent-kit-unity/releases/download/v0.1.1-beta.4/install.sh | sh -s -- --update     # apply: add / update / keep / delete
set -o pipefail; curl -fsSL https://github.com/SCVN-Zee/agent-kit-unity/releases/download/v0.1.1-beta.4/install.sh | sh -s -- --dry-run    # preview, writes nothing
set -o pipefail; curl -fsSL https://github.com/SCVN-Zee/agent-kit-unity/releases/download/v0.1.1-beta.4/install.sh | sh -s -- --uninstall  # removes hash-matching kit files only
```

Decisions are made by **content hash, never version strings**: an unchanged re-run is a byte-identical no-op; a file you edited is kept as a conflict (never clobbered) unless `--force`; a departed file is deleted only while its on-disk hash still matches the lock.

### 3. Tier overlays (auto-detected or opt-in)

- **Supercent** — `Assets/Supercent/` present → `aku-sc-rules.md`.
- **Luna playable** — a Luna/Playworks package is present AND the target is playable (`.omp/aku-project.json` `{"lunaPlayable":true}` wins; else the branch name contains `playable`) → `aku-luna-rules.md` plus the three Luna-tier skills (below).

Opt in without markers, or override auto-detection: `| sh -s -- --tier a,b` / `--no-tier a,b` — unknown tier names fail loudly instead of installing nothing. Tier flags are **per-invocation**: a later `--update` without them re-runs auto-detection and prunes forced tier overlays no marker supports — the lock's `tiers` records the last install's set, it is not selection config.

### 4. Bring your own Unity MCP

Install any Unity MCP for your project — the kit registers none and hard-codes no name; it binds each capability it needs to whatever tools the connected server surfaces in context (scene, prefab, asset-DB, animator, material, …). Most Unity MCPs expose the same core capabilities, so the choice of server is yours.

---

## Tutorial: your first kit-routed task

1. Open the Unity project (Editor running, MCP plugin connected) and start your agent session in the repo root.
2. Ask:

   > add a Debug.Log to PlayerController.Update

3. **Expected:** the agent reaches for `script-read` (or `script-update-or-create`) without being told, then awaits the compile via `console-get-logs(severity="Error")` before any follow-up scene mutation.
4. Now ask for asset work:

   > tint the Player material red

   **Expected:** routing through the MCP's material or script tools — never a text edit of `.mat`. Corrupt-on-edit types are guarded: `aku-mcp-guard` aborts the first raw edit and redirects to the policy-designated channel.
5. If the agent pivots to plain `Read`/`Edit` instead, [file an issue](https://github.com/SCVN-Zee/agent-kit-unity/issues) with the session transcript.

---

## What you get

### Skills — 7 base + 3 Luna-tier

Four are user-invocable as `/skill:aku-<name>`; `aku-code-conventions`, `aku-asset-conventions`, and `aku-odin` are reference skills the others load. Three more Luna skills ship only on Luna playable targets (tier overlays — see [Tier overlays](#3-tier-overlays-auto-detected-or-opt-in)):

| Skill | What it owns |
|---|---|
| `aku-scene` | Scenes, hierarchy, components, prefab-**instance** work, cameras, Cinemachine 2/3; detects prefab context before mutation and owns propagation tiers. |
| `aku-prefab` | Prefab-**asset** lifecycle: the stage workflow (`assets-prefab-open` → mutate → `assets-prefab-save` → `assets-prefab-close`), create, instantiate, unpack, variant. |
| `aku-animator` | AnimatorController + AnimationClip wiring — parameter-driven transitions, build order, transition-kind decision, and a read-back gate for unreachable states, conditionless transitions, weight-0 layers. |
| `aku-code-conventions` | Unity C# conventions: naming, lifecycle pairing, inspector-first `[Required]` wiring, bounded-domain fields, parameter-driven Animator code. *(Reference skill.)* |
| `aku-asset-conventions` | Unity content conventions: project layout, asset prefixes, texture-map suffixes, config naming, hierarchy name prefixes. *(Reference skill.)* |
| `aku-odin` | Odin Inspector house style: task-based Inspector UX, groups/tabs, validation, escalation to `OdinEditorWindow`, menus, selectors, property trees, custom drawers. Absence of Odin is the only off-ramp. *(Reference skill.)* |
| `aku-code-review` | Unity-flavored review: GC in hot paths, MonoBehaviour lifecycle/leaks, serialization defects, ungated editor code. Report-only. |

| Skill | What it owns |
|---|---|
| `aku-luna-code-review` | Luna playable compatibility: Bridge.NET forbidden-API hazards and asset risks that compile in Editor but strip or no-op in Luna builds. Report-only. |
| `aku-luna-build-check` | Luna export build-settings probe against `luna.json` — 6 auto-fixable gates, 4 report-only advisories. |
| `aku-luna-conventions` | Luna playable authoring constraints: editor-strip guards, transpile-safe providers, and export-sensitive Animator/prefab guidance. |

**No focused skill for a domain?** Bind directly to a matching capability from the connected MCP; if none exists, `reflection-method-call` / `script-execute`. Covers physics · ui · render · test · build · surgical per-property prefab apply. (Luna *builds* → the Luna pipeline; Luna *source/asset review* → `/skill:aku-luna-code-review`.)

**No specialist agents ship** — Unity work runs in the main session; review runs inline via the review skills.

### Rules — 5 base + 2 tier overlays

| Rule | Bucket | Loaded when |
|---|---|---|
| `aku-core-rules.md` | Sticky always-apply | Always — hard engine + MCP + serialize invariants |
| `aku-code-convention-rules.md` | Rulebook | On-demand when editing `**/*.cs` |
| `aku-asset-convention-rules.md` | Rulebook | On-demand for asset work |
| `aku-mcp-policy.md` | Rulebook | Serialized-asset safety, domain dispatch, reflection fallback |
| `aku-mcp-guard.md` | TTSR | On `edit`/`write` of a corruptible Unity asset — aborts, redirects per the channel policy |
| `aku-sc-rules.md` *(Supercent tier)* | Always-apply | `[Dev]` commit prefix + playable-ad layout |
| `aku-luna-rules.md` *(Luna tier)* | Rulebook | Luna playable targets — the Odin editor-strip guard |

**Corrupt-on-edit types (7):** `.prefab` `.unity` `.controller` `.anim` `.mat` `.playable` `.signal` — FileID webs, prefab apply chains, shader coupling; route through the Editor/MCP, never a text edit. Usually-safe YAML (`.asset`, `.preset`, `.spriteatlas`, …): a direct edit is usually harmless, but a routed tool is still better. Recovery path if an asset is ever corrupted: `git checkout` / `git restore`.

---

## Configure

`.omp/aku-project.json` — optional committed file the kit reads by name (the installer never writes it):

| Key | Effect |
|---|---|
| `lunaPlayable` (`true`/`false`) | Authoritative override for "active Luna playable target"; beats the branch-name heuristic. Gates `aku-luna-rules.md`. |
| `odin` (`true`/`false`) | Overrides Odin Inspector auto-detection; beats every auto signal. |

---

## Troubleshooting

- **Rules/skills not discovered** — confirm the repo has a populated `.omp/`, then rerun the same pinned-URL bootstrap used to install it.
- **`--check` exits 2** — a managed file drifted from the lock, or an upstream update is available. Run `--update` (add `--force` to overwrite your own edits).
- **Installer refuses** — it declines when `.omp/` is a symlink (writes could escape) or the lock is corrupt/forward-version; `--force` rebuilds a corrupt lock.
- **Agent ignores the rules** — confirm `.omp/rules/aku-mcp-policy.md` exists, then restart the session.
- **MCP tools unresolved** — confirm a Unity MCP server is connected and its tools (or generated per-tool skills) appear in the in-context tool list; the kit binds to whatever is surfaced under any server name.

---

## Develop the kit

| Path | Contents |
|---|---|
| `omp/` | The shipped kit: `AGENTS.md`, `rules/`, `skills/`, `tiers/<tier>/rules/` overlays |
| `scripts/` | `ship-omp.cjs` + `lib/` (lock, payload, reconcile, tier-detect, apply), lint gates |
| `scripts/tests/`, `test/` | Unit + integration suites |
| `references/` | Vendored Unity-MCP plugin + extension repos (gitignored from CI) |
| `plans/`, `docs/` | Plans and long-form documentation (untracked, local-only) |

```bash
make help       # all targets
make update TARGET_DIR=/path/to/unity-repo   # install/refresh + write the lock (TARGET_DIR is a variable, default `.`)
make check      # full gate: lint (loc / frontmatter / docs-counts) + tests — must exit 0
make bump VERSION=x.y.z   # release prep: version bump + README install URL, make check, release commit + annotated tag
```

Contributor rules that bite — single `aku-*` namespace, never blanket-rename `unity-`, the lock is untrusted destructive input, no runtime deps — plus the release runbook and lint-gate details: see [`AGENTS.md`](./AGENTS.md).

---

## License

MIT — see [LICENSE](LICENSE).
