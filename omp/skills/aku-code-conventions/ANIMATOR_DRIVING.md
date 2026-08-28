# Animator Driving — parameters, not `Play()`

How runtime C# talks to an AnimatorController. Authoring the controller graph itself is `skill://aku-animator`; this file is the code side of the same contract.

**The rule:** set parameters and let the graph decide. `Animator.Play` / `CrossFade` forces a state directly, bypassing the transition's conditions, exit-time semantics, blend duration, and interruption rules — and leaves the state machine out of sync with the parameters that are supposed to describe it.

## 1. Drive with parameters

```csharp
// Wrong — forces the state, bypasses the graph
_animator.Play("Attack");

// Right — the graph owns the transition
_animator.SetTrigger(ATTACK_HASH);
```

If `SetTrigger` doesn't produce the animation, the defect is a missing or misconfigured transition in the controller, **not** a reason to call `Play`. Fix the graph — `skill://aku-animator`.

### Normal gameplay completion contract

Runtime code is not complete until the controller side is proven:

1. Add or reuse a parameter whose type matches the intent.
2. Build the reachable entry and required exit transitions.
3. Set `hasExitTime` explicitly on every edge.
4. Assign `runtimeAnimatorController` to the target `Animator`.
5. Read the animator data back and verify the graph is wired as intended.
6. Cache the selected parameter's hash once, then call the integer setter overload.

Bind the read-back to whatever Unity MCP animator-read capability is surfaced in your in-context tool list — match the capability, not a hardcoded name.

When the parameter is configurable, its serialized name comes from the assigned controller through a dropdown — see
[`examples/identifier-pickers.md`](examples/identifier-pickers.md). The dropdown constrains authoring; the
cached hash keeps runtime calls allocation-free and typo-resistant.

### Legitimate `Play` / `CrossFade`

Narrow, and worth naming so the rule stays credible. Each use must carry a nearby reason a normal transition is
unsuitable:

- **Restarting the same state deliberately** — replaying a hit reaction already playing, where a Trigger would be swallowed by `canTransitionToSelf: false`.
- **Editor tooling, preview, cutscene scrubbing** — driving the Animator outside normal gameplay flow.
- **Exceptional direct-state control** — a one-off state intentionally outside normal gameplay transitions.

Exceptional state fields still use a controller-backed full-path dropdown (`Layer.State`), then cache the full-path
hash and layer index once. A free-text state name is not part of the exception.

Everything else is a graph defect wearing a workaround.

## 2. Match parameter type to intent

| Type | Use for | Setter | Lifecycle |
| --- | --- | --- | --- |
| `Trigger` | one-shot: attack, jump, hit, die | `SetTrigger` | auto-consumed by the transition that uses it |
| `Bool` | sustained: isRunning, isGrounded, isAiming | `SetBool` | persists until explicitly set false |
| `Float` | blend axis / threshold: Speed, Health | `SetFloat` | continuous |
| `Int` | discrete selection: WeaponIndex | `SetInteger` | discrete |

A `Bool` used for a one-shot never clears, so the state re-enters forever. A `Trigger` used for a sustained state is consumed on entry and falls straight back out.

## 3. Cache parameter hashes

Every string overload hashes the string on each call. Cache once in a `static readonly int`.

```csharp
private static readonly int SPEED_HASH  = Animator.StringToHash("Speed");
private static readonly int ATTACK_HASH = Animator.StringToHash("Attack");
```

This is the animator-specific case of the magic-string rule already carried by `skill://aku-code-review/references/checklist-serialization-wiring.md` — that row owns the general guidance; this is where it applies to `Animator`.

## 4. Reset triggers you abandon

A `SetTrigger` that no transition consumes stays queued and fires on the next state that accepts it — an attack that plays seconds later, after the player let go.

```csharp
public void CancelAttack()
{
    _animator.ResetTrigger(ATTACK_HASH);
}
```

Reset on cancel, on state exit, and on any hard state change (death, respawn, scene reset).

## 5. Full example

```csharp
using UnityEngine;

public class PlayerAnimatorController : MonoBehaviour
{
    // Serialized Fields
    //----------------------------------------------------------------------
    [SerializeField] private Animator _animator;

    // Private Fields
    //----------------------------------------------------------------------
    private static readonly int SPEED_HASH     = Animator.StringToHash("Speed");
    private static readonly int ATTACK_HASH    = Animator.StringToHash("Attack");
    private static readonly int IS_AIMING_HASH = Animator.StringToHash("IsAiming");

    // Logic
    //----------------------------------------------------------------------
    public void SetMoveSpeed(float speed)
    {
        _animator.SetFloat(SPEED_HASH, speed);
    }

    public void PlayAttack()
    {
        _animator.SetTrigger(ATTACK_HASH);
    }

    public void CancelAttack()
    {
        _animator.ResetTrigger(ATTACK_HASH);
    }

    public void SetAiming(bool isAiming)
    {
        _animator.SetBool(IS_AIMING_HASH, isAiming);
    }
}
```

`_animator` is Inspector-wired, not fetched with `GetComponent` — see [`REFERENCE_WIRING.md`](REFERENCE_WIRING.md).

## 6. Layer weights

`defaultWeight` on a layer is the authored starting value, not a lock. Blend a layer in at runtime with `SetLayerWeight`:

```csharp
_animator.SetLayerWeight(_upperBodyLayerIndex, _aimBlend);
```

When the layer is configurable, select its name from the assigned controller and cache `_upperBodyLayerIndex` with
`Animator.GetLayerIndex` during initialization.

A layer authored at weight 0 that no code ever blends in plays nothing — see `skill://aku-animator/PATTERNS.md` trap 6.

## Cross-references

- `skill://aku-animator` — authoring the controller graph: build order, transition kinds, layers, the verify gate.
- `skill://aku-animator/PATTERNS.md` — the failure modes this file's rules prevent.
- `skill://aku-code-review/references/animator-review.md` — the review lens that flags violations of these rules.
- `skill://aku-code-review/references/checklist-serialization-wiring.md` — general magic-string / `StringToHash` guidance.
- `skill://aku-asset-conventions/ASSET_PREFIXES.md` — `C_` controllers, `A_` clips.
- `REFERENCE_WIRING.md` — why `_animator` is a `[SerializeField]`.
