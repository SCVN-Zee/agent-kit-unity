/**
 * Tier opt-in integration — the explicit --tier/--no-tier surface, driven
 * through the real CLI in a sandbox (helpers shared with ship-omp.test.cjs).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { sandbox, ship, omp, readLock, cleanup } = require('./helpers/omp-sandbox.cjs');

test('--tier opts in on a repo with no tier markers', () => {
  const t = sandbox();
  try {
    const dry = ship(t, ['--dry-run', '--json', '--tier', 'supercent']);
    assert.equal(dry.code, 0, dry.out);
    const plan = JSON.parse(dry.out);
    assert.deepEqual(plan.tiers, ['supercent']);
    assert.ok(plan.plan.creates.some((c) => (c.rel || c) === 'rules/aku-sc-rules.md'),
      'tier rule appears in the dry-run plan');
    const inst = ship(t, ['--tier', 'supercent']);
    assert.equal(inst.code, 0, inst.out);
    assert.ok(fs.existsSync(omp(t, 'rules/aku-sc-rules.md')), 'opted-in rule installed');
    assert.deepEqual(readLock(t).tiers, ['supercent']);
  } finally { cleanup(t); }
});

test('unknown --tier name fails loud instead of silently installing nothing', () => {
  const t = sandbox();
  try {
    const bad = ship(t, ['--dry-run', '--tier', 'bogus']);
    assert.equal(bad.code, 1);
    assert.match(bad.out, /unknown tier 'bogus'/);
    assert.match(bad.out, /luna, supercent/);
  } finally { cleanup(t); }
});
