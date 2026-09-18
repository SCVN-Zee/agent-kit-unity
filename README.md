# Agent Kit Unity

Unity coding, asset, and Inspector conventions for **OMP, Pi, Codex, and Claude Code**. Project-local; no agents or MCP servers are installed.

Explore the rules and skills in the [visual kit guide](kit-guide.html) (open locally in a browser).

## 1. Install

Requires **Node 18+**, macOS or Linux, `curl`, and `tar`. Run from your Unity project root in Bash or Zsh:

```sh
set -o pipefail
curl -fsSL https://github.com/SCVN-Zee/agent-kit-unity/releases/latest/download/install.sh | sh
```

This installs the latest stable release for **OMP**. To choose another host, append `-s -- --target pi` to `sh`; valid targets are `omp`, `pi`, `codex`, and `claude`.

**New target support requires a release containing it.** If the published installer lacks your target, run from this kit checkout instead:

```sh
node scripts/ship-kit.cjs /path/to/unity-project --target pi
```

Replace `pi` with your host. Each target has independent ownership:

| Target | Skills | Startup guidance |
| --- | --- | --- |
| `omp` | `.omp/skills/` | `.omp/AGENTS.md` and always-apply rules |
| `pi` | `.pi/skills/` | `.pi/APPEND_SYSTEM.md` |
| `codex` | `.agents/skills/` | Managed section in root `AGENTS.md` |
| `claude` | `.claude/skills/` | `.claude/rules/aku-project.md` |

Pi's project append file takes precedence over its global append file. Codex preserves surrounding `AGENTS.md` content; its paths are shared discovery surfaces, not host-exclusive. Claude leaves `CLAUDE.md` and settings alone.

## 2. Try it

1. Start or restart your agent in the Unity project root; trust the project when prompted. Pi also supports `/reload`.
2. Ask: **“Add a serialized movement speed to PlayerController.”**
3. For reference-led gameplay, invoke the skill below with your reference and desired feature.

| Host | Invocation |
| --- | --- |
| OMP / Pi | `/skill:aku-reference-feature` |
| Codex | `$aku-reference-feature` |
| Claude Code | `/aku-reference-feature` |

Connect your preferred Unity MCP for Editor operations. The kit uses whichever capabilities are available; it registers none.

## 3. Update or remove

Use the **same target every time**; omitting it selects OMP. Example for Pi:

```sh
set -o pipefail
curl -fsSL https://github.com/SCVN-Zee/agent-kit-unity/releases/latest/download/install.sh | sh -s -- --target pi --update
```

Replace `--update` with `--check` to check drift, `--dry-run` to preview, or `--uninstall` to remove the kit. From a checkout, use the same flags with `node scripts/ship-kit.cjs /path/to/unity-project`.

Edited files are preserved as conflicts. Back up and resolve them before retrying; use `--force` only to deliberately adopt or replace conflicting content. Unsafe paths and symlinks remain blocked. `--check` exits 2 for drift; incomplete Codex/Claude uninstall also exits 2 and retains edited files and ownership records.

## Optional settings

- **Tiers:** append `--tier supercent` or `--tier luna`. Supported project markers also enable auto-detection. Repeat explicit tier flags on updates; they are not saved preferences.
- **Beta:** append `--channel beta` to the bootstrap command (requires a bootstrap supporting channels). No stable fallback occurs. For a fixed release, replace `/releases/latest/download/` in the URL with `/releases/download/<tag>/`.
- **Overrides:** your target's `aku-project.json` (`.omp/`, `.pi/`, `.codex/`, or `.claude/`) accepts `lunaPlayable` and `odin` booleans. Markers are optional, user-owned, and never shared across targets.

## Contribute

Edit shared content in `kit/`, then run `make check`. See [AGENTS.md](AGENTS.md) for contributor and release rules. `docs/` stays local-only and Git-ignored.

[MIT License](LICENSE)
