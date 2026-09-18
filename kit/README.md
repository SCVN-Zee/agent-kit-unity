# agent-kit-unity — shared Unity kit

The shared source of the agent-kit-unity conventions and reference-feature kit.
`ship-kit.cjs --target omp|pi` installs it into `.omp/` or projects it into `.pi/`.
The source retains OMP rule metadata; the Pi adapter translates activation and links.
The remaining sections describe OMP behavior; see [the root README](../README.md#1-install) for other hosts. Unlike the retired Claude Code / Codex builds (installed globally, gated by SessionStart/UserPromptSubmit hooks), this build is **project-scoped**: you drop it into a Unity repo's `.omp/` directory, so it activates only in that repo and stays silent elsewhere — no detection hooks needed.

## Layout

```
kit/
  AGENTS.md                 # project background + tier-detection instructions (all Unity repos)
  rules/                    # base rules (all Unity repos)
    aku-core-rules.md              # alwaysApply — engine conventions + serialized Editor mutations
    aku-code-convention-rules.md   # rulebook (globs **/*.cs)
    aku-asset-convention-rules.md  # rulebook (asset globs)
  skills/aku-*/             # 6 focused base Unity skills (SKILL.md + subfiles)
  tiers/                    # opt-in overlays — copy a tier's rules + skills in only for matching repos
    supercent/rules/aku-sc-rules.md          # alwaysApply — [Dev] commit prefix + layout
    luna/rules/aku-luna-rules.md             # rulebook — editor-strip + authoring constraints (C#, assets)
    luna/skills/aku-luna-code-review/        # Luna playable compatibility review (report-only)
    luna/skills/aku-luna-conventions/       # Luna playable authoring constraints
    luna/skills/aku-luna-build-check/        # Luna export build-settings probe + auto-fixer
```

## Rule bucketing (what lands where and why)

| Rule | OMP bucket | Trigger / cost |
| ------ | ----------- | ---------------- |
| `aku-core-rules.md` | **Sticky always-apply** | Full body every prompt; engine conventions and serialized Editor mutations. |
| `aku-code-convention-rules` | **Rulebook** | Name+desc listed; body pulled via `rule://` when editing `**/*.cs`. |
| `aku-asset-convention-rules` | **Rulebook** | On-demand for asset work. |
| `aku-sc-rules` (Supercent) | **Always-apply** | `[Dev]` commit prefix is a hard every-commit requirement. |
| `aku-luna-rules` (Luna) | **Rulebook** | On-demand for Luna authoring on C#, Animator, prefab, scene, and material surfaces; loads `skill://aku-luna-conventions`. |

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

The download-before-execute wrapper propagates curl failures instead of reporting a false success. The stable URL follows latest stable; to stay on beta, add `--channel beta` to a call (`run_agent_kit_installer <repo> --channel beta`), or set `INSTALLER` to an exact tag URL. The downloaded bootstrap then verifies its archive's embedded SHA-256 before running the packaged installer, and a channel request verifies the selected release's own bootstrap against the digest GitHub reports before running it.

This writes `.omp/{AGENTS.md,rules/*,skills/**}` and, for a matching
repo, the tier rule files below. The installer **auto-detects** tiers from the
target and records the chosen set in the lock:

- **Supercent** — `Assets/Supercent/` present → `aku-sc-rules.md`.
- **Luna playable** — a Luna/Playworks package is present AND the target is
  playable (`.omp/aku-project.json {"lunaPlayable":true}` wins; else the branch
  name contains `playable`) → `aku-luna-rules.md` plus the `aku-luna-code-review`,
  `aku-luna-conventions`, and `aku-luna-build-check` skills.

Opt in without markers, or override auto-detection: `--tier a,b` / `--no-tier a,b` — unknown tier names fail loudly. Tier flags are **per-invocation**: a later `--update` without them re-runs auto-detection and prunes forced tier overlays no marker supports; the lock's `tiers` records the last install's set, it is not selection config.

### Manage an installed kit

| Command | Effect |
| --------- | -------- |
| `run_agent_kit_installer <repo>` | Install / refresh; keeps user-edited files (conflict) unless `--force`; byte-identical no-op when already in sync. |
| `run_agent_kit_installer <repo> --check` | Report drift + available updates. Exit `0` in sync, `2` on drift/update. |
| `run_agent_kit_installer <repo> --update` | Apply upstream changes, recreate deleted managed files, and integrity-gate departed paths. |
| `run_agent_kit_installer <repo> --uninstall` | Remove integrity-gated recorded paths + the lock; preserve user or drifted files unless `--force`. |
| `run_agent_kit_installer <repo> --dry-run` | Print the plan; write nothing. |

The lock stores the kit version (from `package.json`) and a raw-byte SHA-256 per
installed file. Drift is decided by content hash, never by version string. A
committed `.omp/aku-lock.json` never churns: an unchanged re-run rewrites nothing.

Optional per-repo overrides live in `.omp/aku-project.json`, read by `AGENTS.md`
detection: `{"odin": true|false, "lunaPlayable": true}`.
The installer never writes `aku-project.json`.

The supported consumer path is the checksum-verified release bootstrap above. It requires a POSIX `sh`, `curl`, `tar`, and Node 18+; source checkout and Make commands are maintainer workflows, not alternate installs.

## Notes

- **Discovery.** Native `.omp/` rules and skills are priority-100 for OMP. Skills are discovered one level under `.omp/skills/` as `<name>/SKILL.md`, addressable via `skill://aku-<name>` and `/skill:aku-<name>`.
- **Reference-led features.** `/skill:aku-reference-feature <references + feature + constraints>` analyzes gameplay and detailed juice, adapts through local systems, then verifies the integrated result. `--analyze` stops before edits; `--copy` preserves explicit copying intent; `--port` is the adaptation default.
- **`aku-core-rules.md` is always sticky** and cannot self-gate — that is why this kit is project-scoped rather than user-global. Installing it at user scope would fire it on every project, Unity or not.
