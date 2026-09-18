/**
 * Single-namespace guard for the shipped OMP tree.
 *
 * `ship-kit.cjs` copies kit/{skills,rules} into a repo's `.omp/`, a directory
 * the user also authors in (house-style rules, aku-project.json). One rule for
 * every shipped dir: each entry is `aku-*` (Supercent tier rule `aku-sc-*`).
 * `unity-*` is exactly the kind of name a user picks for their own rule file —
 * AGENTS.md documents the `unity-house-style.md` hazard — so it is not ours to
 * ship. Tier overlays live under kit/tiers/<tier>/ and are checked separately.
 *
 * The lock's prune-by-recorded-path (Phase 2) replaces the old
 * metadata.json `deletions[]` upstream-retirement signal: a file that leaves the
 * payload is pruned only when its on-disk hash still matches the lock record.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const KIT_ROOT = path.resolve(__dirname, "../..");
const SHIPPED_DIRS = ["skills", "rules"];
const NAMESPACE_RX = /^aku-/;

test("every shipped kit/ entry is namespaced aku-*", () => {
  const offenders = [];
  for (const sub of SHIPPED_DIRS) {
    const dir = path.join(KIT_ROOT, "kit", sub);
    const entries = fs.readdirSync(dir);
    assert.ok(entries.length > 0, `kit/${sub}/ must not be empty`);
    offenders.push(
      ...entries
        .filter((e) => !NAMESPACE_RX.test(e))
        .map((e) => `kit/${sub}/${e}`),
    );
  }
  assert.deepEqual(
    offenders,
    [],
    `entries outside the aku- namespace would collide in the shared .omp/: ${offenders.join(", ")}`,
  );
});

// Tier overlays are keyed by tier name (supercent/luna), but the rule
// files they carry are still aku-* (Supercent is aku-sc-*).
test("every tier overlay rule file is namespaced aku-*", () => {
  const tiersDir = path.join(KIT_ROOT, "kit", "tiers");
  const offenders = [];
  let seen = 0;
  for (const tier of fs.readdirSync(tiersDir)) {
    const rulesDir = path.join(tiersDir, tier, "rules");
    if (!fs.existsSync(rulesDir)) continue;
    for (const f of fs.readdirSync(rulesDir)) {
      seen += 1;
      if (!NAMESPACE_RX.test(f)) offenders.push(`kit/tiers/${tier}/rules/${f}`);
    }
  }
  assert.ok(seen > 0, "expected at least one tier overlay rule");
  assert.deepEqual(
    offenders,
    [],
    `tier rules outside the aku- namespace: ${offenders.join(", ")}`,
  );
});

// Tier overlays can also carry skills; the skill directory names are still aku-*.
test("every tier overlay skill directory is namespaced aku-*", () => {
  const offenders = [];
  let seen = 0;
  for (const tier of fs.readdirSync(path.join(KIT_ROOT, "kit", "tiers"))) {
    const skillsDir = path.join(KIT_ROOT, "kit", "tiers", tier, "skills");
    if (!fs.existsSync(skillsDir)) continue;
    for (const f of fs.readdirSync(skillsDir)) {
      seen += 1;
      if (!NAMESPACE_RX.test(f))
        offenders.push(`kit/tiers/${tier}/skills/${f}`);
    }
  }
  assert.ok(seen > 0, "expected at least one tier overlay skill");
  assert.deepEqual(
    offenders,
    [],
    `tier skills outside the aku- namespace: ${offenders.join(", ")}`,
  );
});

// Pins the Supercent tier spelling: `aku-sc-`.
test("the Supercent tier ships aku-sc-rules.md", () => {
  assert.ok(
    fs.existsSync(
      path.join(KIT_ROOT, "kit/tiers/supercent/rules/aku-sc-rules.md"),
    ),
    "missing kit/tiers/supercent/rules/aku-sc-rules.md",
  );
});
