---
name: aku-code-review
description: "Use when performing a report-only review of a Unity file, diff, commit, PR, or completed feature, including Unity C#. Owns review routing and read-only verification across runtime code, editor tooling, shaders, and serialized wiring; loads skill://aku-code-conventions as its convention lens."
---

# aku-code-review — Unity Code Review

Game-dev code review for Unity. Replaces the SRE/web lenses of the installed generic code-review skill (race conditions, N+1, auth, PII) with Unity lenses: **perf/GC · lifecycle/leaks · serialization/wiring · convention-compliance · editor/build hygiene** — bugs that compile clean but tank framerate, leak memory, or break in player builds.

**Principles:** YAGNI, KISS, DRY | Token efficiency | Be honest, brutal, concise.

## Layering (do NOT duplicate)

Apply the host's normal code-review machinery; this skill adds the Unity lenses and MCP-native verification.

| Concern | Owned by | This skill |
| --- | --- | --- |
| Input-mode resolution, reception, spec-compliance, verification-gate philosophy | the installed generic code-review skill | reference, don't copy |
| C# formatting / naming / structure / reference-wiring rules | `skill://aku-code-conventions` | lens 4 delegates |
| Unity perf / lifecycle / serialization / editor-build / shader / asset-integrity | **this skill** | the 6 reference files |

## Input modes

Same as the installed generic code-review skill — auto-detect from args; if ambiguous, `AskUserQuestion`.

| Input | Mode |
| --- | --- |
| `#123` / PR URL | PR diff (`gh pr diff`) |
| `abc1234` (7+ hex) | commit (`git show`) |
| `--pending` | staged + unstaged (`git diff`) |
| *(none)* | recent changes in context |
| `codebase` | full scan |

Resolution detail: resolve input mode (PR / commit / `--pending` / none / codebase) per the installed generic code-review skill, or infer from the argument.

## The lenses

| # | Lens | Reference |
| --- | --- | --- |
| 1 | Performance & GC | `references/checklist-perf-gc.md` |
| 2 | Lifecycle & leaks | `references/checklist-lifecycle-leaks.md` |
| 3 | Serialization & wiring | `references/checklist-serialization-wiring.md` |
| 4 | Convention compliance | **inline** → load `skill://aku-code-conventions` and check all 12 rules; when asset paths/names or scene/prefab hierarchy names change, also load `skill://aku-asset-conventions` and check all 4 rules |
| 5 | Editor & build hygiene | `references/checklist-editor-build-hygiene.md` |
| 6 | Project-specific compatibility *(conditional — installed extensions only)* | the installed tier extension |

Surface extensions (reviewed through the lenses above): **shaders/compute** → `references/checklist-shader-gpu.md`; **scene/prefab/SO reference integrity** → `references/asset-integrity-review.md`; **Animator graph + driving code** → `references/animator-review.md`.

**Project-specific compatibility.** Before Stage 1, apply any installed compatibility extension according to that extension's own detection contract. No matching extension → skip it; ordinary Unity reviews are unchanged.

## Review protocol (2 stages)

**Stage 1 — Static review.** Read the changed `.cs`/`.shader` (diff, or read the in-Editor script). Walk each lens; flag only real problems. Then asset-integrity per `references/asset-integrity-review.md` (read-only — scene/prefab traversal by reading scene + component data; no dedicated find-missing-references capability is assumed — see the reference for fallbacks).

**Stage 2 — verification.** Back findings with the live Editor:

1. Read the console (Error filter) — confirm the change compiles cleanly.
2. If tests cover the touched code: save the scene first (a dirty scene aborts the test runner) → run tests.
3. Cite results in the report. **Read-only** — never mutate; don't enter Play Mode for mutations (tests are read-only intent).

Bind each capability to the Unity MCP tools already surfaced in your in-context tool list — match the capability, not a hardcoded name. If none matches, read via the Editor. Never hand-edit a serialized asset file.

**Channel.** Verification reads are CLI-first where the ladder passes (`rule://aku-mcp-policy`): console read via `unity command console --tail <n>` (proven-run 2026-08-30); tests inventory via `unity command list_tests --mode EditMode` (proven-run 2026-08-30); asset lookups via `find_assets` (proven-run 2026-08-30). **Test execution is MCP-primary in-session** — run via MCP `tests-run` (save the scene first; a dirty scene aborts the runner); `unity command run_tests` + `test_status` are verify-at-use alternatives, not the default route. Headless `unity test --mode EditMode --report-format nunit` (spellings help-verified) applies only with the project closed in the interactive Editor. Other verification reads fall back to the MCP console-read capability; terminal fallback: read via the Editor.

No profiler step — perf findings are reasoned statically (kept light by design).

## Report-only

Findings + fix examples only. **Never edit code/assets.** Fixes happen in a separate implementation pass; Editor-state fixes (scene/prefab/animator) are applied through the connected Unity MCP, not in this read-only pass.

## Output format

Mirror the installed generic code-review skill's base checklist format. Terse, no preamble.

```
Unity Review: N issues (X critical, Y informational)

**CRITICAL** (blocking):
- [file:line] Problem  (lens: perf|lifecycle|serialization|convention|editor-build|asset)
  Fix: one line

**Issues** (non-blocking):
- [file:line] Problem
  Fix: one line

Verify: compile <ok|errors>; tests <pass N | fail N | none>
```

If clean: `Unity Review: No issues found.`

## Skill priority

Flag a finding once, under its most specific lens. If a finding is also a convention violation, cite `skill://aku-code-conventions` or `skill://aku-asset-conventions` according to the violated policy rather than restating the rule.

## References

| File | Lens |
| --- | --- |
| `references/checklist-perf-gc.md` | allocations, hot paths, pooling, draw calls, NonAlloc, material leaks |
| `references/checklist-lifecycle-leaks.md` | Awake/Start order, OnDestroy cleanup, event/native leaks |
| `references/checklist-serialization-wiring.md` | SerializeField, SO pattern, magic strings, wiring, bounded-domain fields (enum vs picker) |
| `references/checklist-editor-build-hygiene.md` | Debug.Log/#if UNITY_EDITOR gating, asmdef, dev cheats |
| `references/checklist-shader-gpu.md` | precision, variants, frag cost, overdraw |
| `references/asset-integrity-review.md` | read-only MCP reference-integrity protocol |
| `references/animator-review.md` | read-only Animator protocol: forced `Play`/`CrossFade`, unreachable states, conditionless transitions, weight-0 layers |
| Project-specific compatibility | installed tier extension | target-specific checks owned by that extension |

## Workflow position

**Typically follows:** the focused Unity domain workflow or implementation pass used for the change.
**Typically precedes:** shipping or release.
**Related:** the installed generic code-review skill (generic protocol it layers on), `/skill:aku-code-conventions` and `/skill:aku-asset-conventions` (convention lenses). Run this review inline — the main agent walks the protocol directly.
