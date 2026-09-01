---
name: aku-luna-code-review
description: "Use when reviewing C#, shaders, Animator assets, or other content that ships to a Luna (Playwork) playable, especially Editor-only success or export regressions. Report-only; detect Bridge.NET forbidden APIs, stripping, culling, WriteDefaults, and shader risks. For luna.json export settings, use skill://aku-luna-build-check."
---

# aku-luna-code-review — Luna Playable Compatibility Review

A focused run of `skill://aku-code-review`'s **Lens 6 (Luna compatibility)**. Use it standalone for a Luna-only pass;
`skill://aku-code-review` invokes the same lens automatically on Luna projects. Same machinery, one extra lens — this
skill is a thin router, not a second protocol.

**Principles:** YAGNI, KISS, DRY | Token efficiency | Honest, brutal, concise. **Report-only.**

## Single source of truth

All Luna rules live in **`skill://aku-luna-code-review/references/checklist-luna-compatibility.md`** (Tier 1 source-static + Tier 2 read-only asset-MCP). This skill does not restate them — it loads that file and runs it. If a rule
seems wrong, fix the lens, not a copy here.

## When it applies

Luna playable project only — `luna.json` present, Luna/Playworks in `Packages/manifest.json` or `Assets/Luna/`,
a diff under `**/Playable*/`, or the prompt names Luna. If none of those hold, say so and suggest plain
`/skill:aku-code-review` instead of running an empty Luna pass.

## Inherited machinery (do NOT re-implement)

| Concern | Reuse from |
| --- | --- |
| Input modes (`#PR` / commit / `--pending` / none / `codebase`) | resolve per the installed generic code-review skill, or infer from the argument |
| MCP verification gate (compile + tests, read-only, PLAY-MODE exit) | `skill://aku-code-review` Review protocol, Stage 2 |
| Report shape | `skill://aku-code-review` output format (see below) |
| C# convention rules | `skill://aku-code-conventions` (don't restate) |

## Protocol

1. **Detect** Luna context (above). Not Luna → stop with the suggestion to use `/skill:aku-code-review`.
2. **Resolve input** mode from the argument (per the inherited resolver).
3. **Load the lens** `skill://aku-luna-code-review/references/checklist-luna-compatibility.md`.
4. **Tier 1 — source-static.** Read the changed `.cs`/`.shader` (diff, or read the in-Editor script); walk the
   Tier-1 tables + run the grep audit. Flag only real hazards, `file:line` + one-line Luna-safe fix.
5. **Tier 2 — asset (read-only MCP, when the detection ladder finds a reachable Editor).** Run the automated checks; surface the
   advisory ones as manual-inspect. No reachable channel (ladder fails: no live Editor, no connected MCP) → note `luna asset-tier: skipped (no reachable Editor)`.
6. **Verify** (Stage 2): read the console (Error filter); run tests (save dirty scenes first — a dirty scene aborts the test runner) if they cover the change. Read-only.
   **Channel** (mirror of `skill://aku-code-review` Stage 2): verification reads are CLI-first where the ladder passes — `unity command console --tail <n>`, `list_tests --mode EditMode` (both proven-run 2026-08-30). **Test execution is MCP-primary in-session** via `tests-run`; `run_tests` + `test_status` are verify-at-use alternatives; headless `unity test` only with the project closed in the interactive Editor (spellings help-verified; re-verify at use). Other reads: MCP fallback when the CLI ladder fails. Terminal fallback: read via the Editor.

Bind each capability to the Unity MCP tools already surfaced in your in-context tool list — match the capability, not a hardcoded name. If none matches, read via the Editor. Never hand-edit a serialized asset file.

## Report-only

Findings + one-line fixes only. **Never edit code or assets.** Fixes happen in a separate implementation pass; Editor-state changes are applied through the connected Unity MCP, not in this read-only pass.

## Output format

Mirror `skill://aku-code-review`; tag every finding lens `luna`.

```
Luna Review: N issues (X critical, Y informational)

**CRITICAL** (blocking):
- [file:line] Problem  (lens: luna)
  Fix: one line

**Issues** (non-blocking):
- [file:line] Problem
  Fix: one line

Verify: compile <ok|errors>; tests <pass N | fail N | none>; luna asset-tier: <ran|skipped>
```

If clean: `Luna Review: No issues found.`

## Workflow position

**Typically follows:** the focused Unity domain workflow or implementation pass used on a Luna playable.
**Typically precedes:** shipping, release, or a Luna build (Cmd+E export).
**Related:** `skill://aku-luna-build-check` (export build-settings tuning — complementary: this is *will-it-transpile*, that is *is-it-tuned*), `/skill:aku-code-review` (parent; this is its Lens 6 as a standalone entry), `/skill:aku-code-conventions`
(convention lens). Run this review inline — the main agent walks the protocol directly.
