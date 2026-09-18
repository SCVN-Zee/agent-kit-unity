# Unity integration and verification

Use this guide to prevent a convincing isolated demo from hiding a broken gameplay integration.

## Inspect the effective system

Confirm the intended Editor/project, current scene, play/pause state, Unity version, render pipeline, and Inspector tooling. Bind to available Unity capabilities; do not hard-code a server, port, bridge, or project path.

Read source and effective serialized values. Trace scene instances, prefab overrides, ScriptableObjects, runtime-generated objects, cloned motion definitions, and setup/build routines. A code default or factory edit may not update an existing asset or an embedded copy.

Map the actual trigger path and downstream consumers before changing contracts. Search for busy/in-flight/settled predicates, events, coroutines, animation events, pooling callbacks, and frame-order-sensitive writers.

## Ownership table

For each changed channel, record:

| Channel | Current writer(s) | Phase/update order | Captured baseline | Handoff/reset owner |
|---|---|---|---|---|
| Position | Discover | Discover | World/local pose | Discover |
| Rotation | Discover | Discover | Parent-relative or world rotation | Discover |
| Scale | Discover | Discover | Resting world size vs deformation | Discover |
| Other relevant channels | Discover | Discover | Material/camera/audio state | Discover |

One feedback effect must not have two independent owners of the same channel at the same time. Preserve necessary compensation and unrelated side effects when removing duplicate feedback.

Examples:

- A motion with a landing pulse plus a post-seat punch can create two bumps. Inspect the semantic landing phase; an earlier Action pulse does not make a legacy entry own landing feedback.
- When a remaining driver rotates under a non-uniform parent, it may still need to preserve world size with a neutral multiplier even though it no longer owns a scale pulse.
- Repeated triggers need an explicit existing policy: restart, accumulate, replace, or ignore. Discover it rather than introducing another policy incidentally.

## Separate clocks and meanings

Record three independent moments where relevant:

1. Visual contact/arrival.
2. Gameplay acceptance/readiness/availability.
3. Feedback completion.

Adding a cosmetic tail to a flight can extend an in-flight lock and lower throughput. Prove which consumers wait on which moment. Prefer existing post-contact channels or independent feedback when needed to preserve the contract; do not impose one mechanism on every feature.

Keep scaled time, unscaled time, capture rate, and video playback speed distinct. Restore their captured original values after probes; do not assume the user's original time scale was one.

## Discover the complete exit matrix

Enumerate transitions from source, not from memory. Include every real entry/exit and alternate path for the affected owner:

| Transition when present | What to prove |
|---|---|
| Natural completion | Exact final pose/size; one completion event |
| Retrigger/overlap | Intended blending/restart; no accidental compounding |
| Cancellation or new target | Old writer stops; new owner captures the correct baseline |
| Take top/bottom/direct give | Correct identity/count; no transient deformation becomes permanent |
| Clear/reset | Baseline normalized before release callbacks or immediate reuse |
| Overflow completion/drain | Same restoration and exactly-once release on both paths |
| Disable/destroy/scene exit | No orphan callbacks, active effects, or leaked state |
| Pool return/reacquisition | No stale scale, rotation, trail, material, or emitter state |
| Moving/reparented carrier | Correct live target and world-size preservation |
| Refusal/full capacity/missing target | No lost ownership or unintended state change |

Do not stop at successful transfer. A clear loop or overflow drain may call Release without using the transfer helpers. Trace each release callback before mutating its bookkeeping: it may synchronously recycle or re-receive the same instance.
Parenting timing does not prove tween space or cancellation safety. Arrival-only parenting can strand a transit item only if no other owner cleans it up; a reference may already have that owner. Keep source space and cleanup behavior unknown until inspected. Trace ownership and release on every exit before calling it a defect or proposing a change to an explicit copy request.

For each exit, name who restores the baseline and when, who stops the old writer, and what the next owner observes. Check both ordinary and exceptional paths. Change the common ownership seam where possible, then migrate every affected caller; do not fix only the showcase path.

## Design valid probes

Before accepting a result, prove the intended scenario occurred:

- Correct project, active runtime instance, effective config, actor identities, and requested count.
- Reference baseline captured before deformation, not from an already-pulsing transform.
- Runtime recreation/reset did not replace the object after parameters were set.
- A moving target actually changed position, not merely had a Boolean enabled.
- The sampled clock and speed match the reported recording.
- Samples cover the event and recovery; counts are nonzero and complete.
- Observe after the relevant writers. Update-only sampling can misreport a one-frame delay; use the appropriate final-update/render boundary.

Defer probe actions past compilation/reload stalls. Store results through a supported persistent mechanism; do not assume statics in freshly compiled execution snippets survive across calls.

Use teardown/finally and a bounded callback lifetime. Capture original state before mutation. If the tool disconnects, inspect whether the operation executed before retrying; do not create duplicate callbacks or test objects blindly.

## Evidence ladder

Use complementary proof rather than substituting one layer for another:

1. Pure evaluation checks timing, shape, continuity, and endpoints.
2. Serialized read-back confirms the actual configuration is wired.
3. Real host execution proves behavior and ownership through gameplay.
4. Render/audio inspection proves the player can perceive the cue.
5. Stress/lifecycle scenarios prove the effect does not corrupt reuse or other systems.

A showcase is useful for tuning but cannot replace a real-host check. A render-property write alone cannot establish visible color, flash, or scale. Tone mapping, occlusion, hierarchy, and other writers can defeat it.

Use a paired control for important uncertain checks: disable the effect or run the known-broken recipe on an isolated instance and require the gate to reject it. Then restore and require a pass. Keep the user's authored assets untouched by control experiments.

## Tests and failures

Discover actual assembly, fixture, and case names. File names need not equal class names; one file may contain several fixtures. Count selected and executed cases independently of the test runner's global discovery total.

Run full affected fixtures, including parameterized cases, setup/teardown, and supported coroutine execution. Never report "all tests passed" for a filtered empty run, ignored IEnumerator, skipped TestCase methods, or swallowed teardown failure.

Distinguish assertion failures from environment/setup failures. If the runner's temporary unsaved scene blocks additive-scene setup, use a supported isolated route or a lifecycle-complete fallback; do not rewrite assertions or save/discard unrelated user scenes merely to obtain green output. State the fallback and exact coverage.

Add permanent tests for plausible regressions in observable behavior: wrong event order, duplicate feedback, leaked baseline, double release, or loss under cancellation. Do not assert source text, incidental defaults, or mock echoes. Keep one-off parameter sampling and captures outside production code.

## Final cleanup and stop condition

Check temporary objects, probe callbacks, event subscriptions, cameras, input state, time scale, capture rate, pause, and transient material/physics overrides. Restore originals, not guessed defaults. Compare owned changes with the intended scope before any scene save.

Stop only when the packet's required behavioral, fidelity, and lifecycle criteria are verified, or when an exact prerequisite is genuinely unavailable after reachable work is complete. Record unrelated defects without absorbing them into the feature. Never change tests, tolerances, or the declared scope to hide a failed gate.
