# Adaptation challenge framework

Stress-test a reference port before it becomes implementation work. A decision that survives these questions is cheap to defend later; one that skips them usually returns as duplicate feedback, a throughput regression, or a transplanted system the project cannot maintain.

## Universal challenges

Ask at least these five; record reference answer, local answer, and risk-if-wrong in the packet:

1. **Necessity.** Do we need the reference's mechanism, or only the observable experience it produces?
2. **Smallest local mechanism.** What is the least code/config in this project that reaches the target feel? (Existing phase/curve/clip beats a new component; a component beats a subsystem.)
3. **Existing overlap.** Which local system already does part of this — and does importing the reference version duplicate or fight it?
4. **Ownership after the port.** Who maintains the imported behavior; which team conventions, tests, and docs does it now touch?
5. **Dependency and perf cost.** What new packages, services, allocations, or frame-time costs does this introduce on the target platform?

## Unity-specific challenges

| Question | Red flag | Green flag |
| --- | --- | --- |
| Does the local pipeline already express this (phases, timelines, animator, VFX graph)? | New parallel motion system | Authored data in the existing seam |
| Who writes the changed channel per frame? | Two writers at overlapping times | One owner; documented handoff points |
| Does the reference mechanism fight local scale/parenting rules? | Root-transform scale on pooled items | Preserved world size + relative envelope |
| Do consumers gate on busy/settled? | Cosmetic tail extends a gameplay lock | Contact, availability, feedback completion stay separable |
| What happens on every lifecycle exit (take/give/clear/overflow/pool/destroy)? | One showcase path verified | Exit matrix derived from code, each answered |
| Is the effect readable at real camera distance and clutter? | Verified only in close-up showcase | Verified in normal gameplay framing |
| Does it survive repeated trigger (restart/accumulate/replace policy)? | New policy invented silently | Existing policy discovered and reused |

## Decision matrix

```markdown
| # | Decision | Reference way | Local way | Choice | Risk |
| --- | --- | --- | --- | --- | --- |
| 1 | Landing scale | Post-seat punch driver | Existing feedback hook and busy gate | compare ownership options | throughput / duplicate feedback |
| 2 | Flight / parenting | Timing as reported; tween space and cancellation ownership unknown until inspected | Existing local-space entry | compare ownership before proposing adaptation | conditional cancellation risk / copy-intent conflict |
```

When literal copying conflicts with local contracts, record the exact conflict and the minimum deviation. Recommend an adaptation but do not silently apply it against an explicit as-is request. Reproducing visible motion need not reproduce source internals when only media is available.
In copy mode, unknown timing, blending, retrigger, or restart policies remain unknown. A typical local default is not a source fact or a new hard requirement. Recommend a conditional direction for analysis; any material difference from the requested copy must await explicit user authorization before implementation.

## Risk gate

Judge severity and uncertainty, not a count-based score. One unresolved critical risk is enough to block the affected implementation.

| Risk | Action |
| --- | --- |
| Critical: possible data/pool corruption, gameplay-contract break, unsafe disclosure, or silent throughput regression | Prove a mitigation or obtain an authorized contract decision before implementing the affected change |
| Material uncertainty: mechanism or scope may need redesign | Run a discriminating probe or ask for the unresolved material choice |
| Reversible tuning uncertainty | Label the assumption; choose a bounded experiment and acceptance gate |

An analysis-only deliverable may finish with unresolved risks disclosed. An implementation request remains blocked where a required decision is missing; do not relabel it analysis to claim success. Never count an unmeasured hazard as harmless simply because there are few hazards.

## Delegation contract

Scouts, researchers, and reviewers may gather evidence, but the orchestrator owns every decision. Each delegated report ends with a status:

- **DONE** — evidence complete, verified preconditions.
- **DONE_WITH_CONCERNS** — usable, concerns recorded in the packet.
- **BLOCKED** — named exact obstacle and what was tried.
- **NEEDS_CONTEXT** — names the missing input.

Never resend a failing prompt unchanged; change context or scope first.
