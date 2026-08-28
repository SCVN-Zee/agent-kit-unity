# agentkit-unity — Oh My Pi (OMP) kit

The OMP-native form of the agentkit-unity Unity conventions + Editor-routing kit. Unlike the Claude Code / Codex builds (installed globally, gated by SessionStart/UserPromptSubmit hooks), this build is **project-scoped**: you drop it into a Unity repo's `.omp/` directory, so it activates only in that repo and stays silent everywhere else — no detection hooks needed.

## Layout

```
omp/
  AGENTS.md                 # project background + tier-detection instructions (all Unity repos)
  rules/                    # base rules (all Unity repos)
    aku-engine-rules.md            # alwaysApply — sticky engine + MCP + serialize invariants
    aku-code-convention-rules.md   # rulebook (globs **/*.cs)
    aku-asset-convention-rules.md  # rulebook (asset globs)
    aku-mcp-policy.md              # rulebook (full MCP routing policy)
    aku-mcp-guard.md              # TTSR — aborts a raw edit/write of a corruptible Unity asset
  skills/aku-*/             # 9 focused Unity skills (SKILL.md + subfiles)
  tiers/                    # opt-in overlays — copy a tier's files in only for matching repos
    supercent/rules/aku-sc-rules.md          # alwaysApply — [Dev] commit prefix + layout
    luna/rules/aku-luna-rules.md             # rulebook — Odin editor-strip guard (globs **/*.cs)
    concurrent/rules/aku-session-commit-rules.md  # TTSR — aborts blanket git staging in bash
```

## Rule bucketing (what lands where and why)

| Rule | OMP bucket | Trigger / cost |
|------|-----------|----------------|
| `aku-engine-rules.md` | **Sticky always-apply** | Full body every prompt; survives long sessions. Hard engine + MCP + serialize invariants only. |
| `aku-code-convention-rules` | **Rulebook** | Name+desc listed; body pulled via `rule://` when editing `**/*.cs`. |
| `aku-asset-convention-rules` | **Rulebook** | On-demand for asset work. |
| `aku-mcp-policy` | **Rulebook** | Full policy, addressable via `rule://aku-mcp-policy`. |
| `aku-mcp-guard` | **TTSR** | Fires on `edit`/`write` of `.prefab/.unity/.controller/.anim/.mat/.playable/.signal`; aborts the corrupting edit, redirects to MCP. |
| `aku-sc-rules` (Supercent) | **Always-apply** | `[Dev]` commit prefix is a hard every-commit requirement. |
| `aku-luna-rules` (Luna) | **Rulebook** | On-demand when editing Odin-decorated C# on a playable target. |
| `aku-session-commit-rules` (concurrent) | **TTSR** | Fires on `git add -A` / `git add .` / `git commit -a` in bash; aborts blanket staging. |

## Install into a Unity repo

Use the installer — it copies the base set plus any auto-detected tier overlays
into the repo's `.omp/` and records a checksum lock (`.omp/aku-lock.json`) so it
can verify, update, and cleanly uninstall later:

```sh
INSTALLER=https://github.com/SCVN-Zee/agent-kit-unity/releases/latest/download/install.sh
run_agent_kit_installer() (
  script=$(mktemp "${TMPDIR:-/tmp}/agent-kit-unity.XXXXXX") || exit
  trap 'rm -f "$script"' 0 HUP INT TERM
  curl -fsSL "$INSTALLER" -o "$script" || exit
  sh "$script" "$@"
)
run_agent_kit_installer /path/to/unity-repo
```

The download-before-execute wrapper propagates curl failures instead of reporting a false success. The stable URL follows latest stable; to stay on beta, set `INSTALLER` to its exact tag URL. The downloaded bootstrap then verifies its archive's embedded SHA-256 before running the packaged installer.

This writes `.omp/{AGENTS.md,rules/*,skills/**}` and, for a matching
repo, the tier rule files below. The installer **auto-detects** tiers from the
target and records the chosen set in the lock:

- **Supercent** — `Assets/Supercent/` present → `aku-sc-rules.md`.
- **Luna playable** — a Luna/Playworks package is present AND the target is
  playable (`.omp/aku-project.json {"lunaPlayable":true}` wins; else the branch
  name contains `playable`) → `aku-luna-rules.md`.
- **Concurrent sessions** — `.omp/aku-project.json {"concurrentSessions":true}`
  → `aku-session-commit-rules.md`.

Override auto-detection with `--tier a,b` / `--no-tier a,b`.

### Manage an installed kit

| Command | Effect |
|---------|--------|
| `run_agent_kit_installer <repo>` | Install / refresh; keeps user-edited files (conflict) unless `--force`; byte-identical no-op when already in sync. |
| `run_agent_kit_installer <repo> --check` | Report drift + available updates. Exit `0` in sync, `2` on drift/update. |
| `run_agent_kit_installer <repo> --update` | Apply upstream changes, recreate deleted managed files, and integrity-gate departed paths. |
| `run_agent_kit_installer <repo> --uninstall` | Remove integrity-gated recorded paths + the lock; preserve user or drifted files unless `--force`. |
| `run_agent_kit_installer <repo> --dry-run` | Print the plan; write nothing. |

The lock stores the kit version (from `package.json`) and a raw-byte SHA-256 per
installed file. Drift is decided by content hash, never by version string. A
committed `.omp/aku-lock.json` never churns: an unchanged re-run rewrites nothing.

Optional per-repo overrides live in `.omp/aku-project.json`, read by `AGENTS.md`
detection: `{"odin": true|false, "lunaPlayable": true, "concurrentSessions": true}`.
The installer never writes `aku-project.json`.

The supported consumer path is the checksum-verified release bootstrap above. It requires a POSIX `sh`, `curl`, `tar`, and Node 18+; source checkout and Make commands are maintainer workflows, not alternate installs.

## Notes

- **Discovery.** Native `.omp/` rules and skills are priority-100 for OMP. Skills are discovered one level under `.omp/skills/` as `<name>/SKILL.md`, addressable via `skill://aku-<name>` and `/skill:aku-<name>`.
- **`aku-engine-rules.md` is always sticky** and cannot self-gate — that is why this kit is project-scoped rather than user-global. Installing it at user scope would fire it on every project, Unity or not.
- **TTSR fires once per session** by default (`repeatMode: once`): the guard warns on the first offending edit/command, then trusts you on a deliberate retry.
- The `docs/MCP_CATALOG.md` referenced by skills is an illustrative reference-server catalog kept in the kit source repo; it is not required at runtime — bind capabilities to your in-context tool list.
