# Prefab Variant Strategy — decide base-vs-variant-vs-flat *before* you create

The decision this skill exists to force **before** creating a prefab: should the prefab(s)
you are about to make be a **base + variants**, or independent flat prefabs? The variant
*mechanic* lives in `examples/variant-create.md`; this file is the *decision* that precedes it.

A variant inherits its base and overrides a few things — edit the base later and every variant
picks the change up (except where it overrode). That inheritance is the whole point, and also the
whole risk. Reach for it when it pays; stay flat when it does not (YAGNI).

## When to run this check

Run it when the request will create prefabs **and** there is plausible sharing:

- **≥2 prefabs in one request** ("3 enemy types", "a small / medium / large crate").
- **A new prefab named or implied against an existing one** ("a fire-goblin like the Goblin",
  "another popup like the settings one"). Confirm the relative by finding the asset if only hinted.

**Skip it** for a lone prefab with no sibling in the request and no referenced relative (a one-off
UI popup, a unique manager object). Do **not** scan the whole project on every create — the cost is
not worth a nag. Flat is the correct answer for genuinely unique prefabs.

## Core heuristic

> **Share structure, diverge in data → variant. Diverge in structure or behavior → separate prefabs.**

Read the specs of what you are about to build and ask:

1. **Same skeleton?** Same mesh / rig, same component set, same child-hierarchy shape.
2. **Diverge only in data?** Differences limited to material / tint, scale / transform, a handful of
   serialized stats (HP, speed), a swapped child sprite/mesh, or enable/disable of a child.
3. **Is there an "is-a" parent?** "kinds of Monster", "sizes of Crate" — a natural conceptual base.

All three yes → variant candidate. A "no" on structure (different components, different scripts,
different hierarchy, fundamentally different behavior) → separate prefabs, even if they share a name.

## Case 1 — creating N new prefabs at once

Compute the **shared core** across the N, then:

- **One is a natural parent** (the plainest / most general — the others are it-plus-extras) →
  **promote it as the base**; the other N−1 become variants of it.
- **All are equal siblings** (none is a parent of the rest) → **extract a synthetic base**: create a
  distinct base prefab holding only the shared core, then make all N variants of it. Do **not** reuse
  one sibling as the base — its own specifics would leak into every other variant.
- **No meaningful shared core** → **flat separate prefabs**. Don't manufacture a base for its own sake.

Build order for the synthetic-base path: assemble the shared core as a scene GameObject →
create a prefab from it (the base) → for each variant follow `examples/variant-create.md`
(instantiate the base connected → tweak → save-as a new asset).

## Case 2 — a new prefab alongside an existing one

- **Existing is already a clean base** (general enough) → make the new one a **variant of the
  existing**. Nothing changes on the existing asset; the variant inherits it. This is the default.
- **Existing is too concrete** to be a good base (it carries specifics the new one should not inherit)
  → propose **extracting a new base**: refactor the existing prefab and the new one to both be
  variants of a fresh base holding the shared core. This **edits an existing asset's identity** —
  show the plan and ask the user before touching the existing prefab.

## Case 3 — variant chains (Monster → Slime → Slime-small)

A chain is base → variant → variant-of-variant, each level a small delta. Add a level **only when
that intermediate is itself reused**: if both `Slime-small` *and* `Slime-big` derive from `Slime`,
then `Slime` earns its place. If `Slime-small` is the *only* thing deriving from `Slime`, the extra
level buys nothing — flatten it (make `Slime-small` a variant of `Monster`, or a variant of `Slime`
without a deeper chain).

Depth adds override-resolution complexity and ripple risk (a change at `Monster` flows through
`Slime` to `Slime-small`; an override at `Slime` can mask it confusingly). So **keep chains shallow,
and whenever the right parent for a level is ambiguous, ask the user** — this is the main ask-the-user
zone.

## Ask the user when…

- Structural overlap is **partial** (~50%) — variant vs separate is a genuine judgment call.
- A **chain's depth or parent is ambiguous** (does X hang off the intermediate or the root?).
- The plan would **extract a base by editing an existing prefab's identity** (the Case 2 refactor).
- Among N equal siblings, **which one should be the base** is not obvious.

Frame the question with the concrete trade-off, not an abstract "variants?" — e.g.
"Make `SlimeSmall` a variant of `Slime` (inherits slime tweaks) or of `Monster` directly (flatter)?"

## Trade-offs — don't blind-push variants

- **Propagation cuts both ways:** a base edit silently changes every variant. Great for a shared
  reskin; a footgun when a base tweak was meant for one child only.
- **Depth is brittle:** deep chains are hard to reason about — prefer breadth (many variants, one
  base) over depth (long chains).
- **Overhead vs payoff (YAGNI):** for a throwaway single-playable with a few unrelated props, the
  variant graph earns nothing — flat prefabs are simpler and correct.
- **Runtime/export:** variants are editor-time asset structure resolved at build; keep chains shallow for debug simplicity.

## Mechanic handoff

Once the decision is "variant", execute via `examples/variant-create.md` — save a *connected*
instance of the base as a new asset (instantiate the base, then run an editor-side C# snippet using
`SaveAsPrefabAsset`). A fresh, unlinked prefab is created directly from a scene GameObject instead.
There is **no** single-call variant capability; the connected-instance save is what produces the
base link.

## Cross-references

- `examples/variant-create.md` — the variant-creation mechanic this decision routes into.
- `DECISION_TREE.md` — the CONSIDER spine step that triggers this check on creation intent.
- `PATTERNS.md` — asset-mode editing (apply the per-variant tweaks after the variant exists).
- `skill://aku-asset-conventions/PROJECT_LAYOUT.md` — where prefabs live; prefabs take no name prefix.
