---
name: aku-code-review
description: "Use when performing a report-only review of a Unity file, diff, commit, PR, or completed feature, including Unity C#. Owns review routing and read-only verification across runtime code, editor tooling, shaders, and serialized wiring; loads skill://aku-code-conventions as its convention lens."
---

# aku-code-review — Unity Code Review

Review correctness, regressions and maintainability through Unity-specific lenses. This protocol works standalone;
use an installed generic reviewer for additional relevant coverage, not as a required dependency. Networking,
concurrency, authentication and private-data risks still matter when the reviewed Unity code handles them.

## Resolve scope

| Input | Read |
| --- | --- |
| PR number / URL | PR description and diff; inspect affected callers and tests. |
| Commit hash | Commit diff and the relevant surrounding code. |
| `--pending` | Both staged and unstaged diffs; include relevant new files without discarding user work. |
| Explicit file / directory | Named scope and the dependencies needed to establish impact. |
| `codebase` | Agreed full scan; distinguish legacy advice from current regressions. |

Without an explicit input, use recent changes in context; ask one clarification if the reviewed revision/scope is unclear.
Do not change code, assets, configuration or user Editor state. Apply installed tier extensions only when their own
detection contract matches.

## Lenses

| Lens | Owner |
| --- | --- |
| Performance / GC | `references/checklist-perf-gc.md` |
| Lifecycle / leaks | `references/checklist-lifecycle-leaks.md` |
| Serialization / wiring | `references/checklist-serialization-wiring.md` |
| Convention compliance | `skill://aku-code-conventions`; asset naming/layout changes also load `skill://aku-asset-conventions` |
| Editor / player-build safety | `references/checklist-editor-build-hygiene.md` |

Additional surfaces: shaders/compute → `references/checklist-shader-gpu.md`; serialized references →
`references/asset-integrity-review.md`; Animator graphs/driving → `references/animator-review.md`.
Inspector/editor UX loads `skill://aku-odin` when installed. Select references by changed surface rather than
performing unrelated whole-project sweeps.

## Review protocol

1. Establish intended behavior, project version/target and changed scope. Read surrounding ownership/lifecycle code
   and tests before inferring a defect from a pattern.
2. Trace a concrete failure scenario through the relevant lenses. Separate correctness/data-loss risks from house-style
   nits; do not call an unmeasured micro-optimization critical. Cite the smallest actionable location.
3. Read available Editor diagnostics and relevant scene/prefab/controller data through surfaced read capabilities.
   A quiet Console is not proof that the changed revision compiled, nor is a dependency list a complete integrity scan.
4. Report evidence and gaps. Fresh compilation/tests may import assets, execute arbitrary project code or require
   saving/Play Mode. In report-only mode, use existing results or report **not run/blocked**. Run those operations only
   under explicit verification authorization in a suitable isolated context, never by silently saving a dirty scene.
5. Report each defect once under its most specific lens. Explain observable impact and a focused fix; do not edit it.

Bind read capabilities to whichever Unity tools are actually available; no server or dedicated missing-reference
scanner is assumed. If no live Editor is available, retain static findings and label asset/UX verification unavailable.
Never hand-edit a serialized asset as a review shortcut.

## Finding quality

- **Critical/high:** demonstrated data loss, player compile break, invalid required runtime path or equivalent impact.
- **Medium:** reproducible functional or operational problem with bounded impact.
- **Advisory/nit:** convention drift, plausible unmeasured performance concern, or an improvement without a proven failure.
- State confidence and the triggering condition. Do not invent an asset assignment or graph edge from C# alone.
- Preserve accepted house policy while distinguishing it from universal Unity behavior. Legacy conventions are advisory
  unless they cause an actual failure in the reviewed scope.

## Report shape

```text
Unity Review: N findings

[priority; confidence] file:line — observable problem
Evidence: triggering input/path and supporting source or read-back.
Fix: focused recommendation (no mutation performed).

Verification: compile passed|failed|not run|blocked; tests likewise.
Coverage gaps: missing Editor, target build, assets or UX checks.
```

If no findings: “No issues found in the reviewed scope,” followed by verification and coverage limits.
Do not turn missing evidence into a clean-build claim.
