/**
 * ship-omp.cjs integration — upgrade/migration flows: the aku-core-rules
 * rename migration (integrity-gated prune + install) and Luna-tier skill
 * install plus integrity-gated pruning on tier loss.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { sandbox, ship, omp, readLock, sha, cleanup } = require('./helpers/omp-sandbox.cjs');

test('--tier luna installs both Luna skills flattened, tier-tagged, bytes intact', () => {
  const t = sandbox();
  try {
    const r = ship(t, ['--tier', 'luna']);
    assert.equal(r.code, 0, r.out);
    for (const rel of ['skills/aku-luna-build-check/SKILL.md',
      'skills/aku-luna-build-check/scripts/luna-build-settings.cjs',
      'skills/aku-luna-code-review/SKILL.md', 'rules/aku-luna-rules.md']) {
      assert.ok(fs.existsSync(omp(t, rel)), `missing ${rel}`);
    }
    const script = 'skills/aku-luna-build-check/scripts/luna-build-settings.cjs';
    const src = path.join(__dirname, '../../omp/tiers/luna', script);
    assert.deepEqual(fs.readFileSync(omp(t, script)), fs.readFileSync(src), 'byte-identical .cjs');
    const lock = readLock(t);
    assert.deepEqual(lock.tiers, ['luna']);
    assert.equal(lock.files[script].tier, 'luna');
    assert.equal(lock.files['skills/aku-luna-code-review/SKILL.md'].tier, 'luna');
  } finally { cleanup(t); }
});

test('former base Luna skills prune on a non-Luna update only when bytes match', () => {
  const t = sandbox();
  try {
    ship(t, ['--tier', 'luna']);
    const editedRel = 'skills/aku-luna-code-review/SKILL.md';
    fs.appendFileSync(omp(t, editedRel), '\nUSER EDIT\n');
    const lock = readLock(t);
    const now = new Date().toISOString();
    const src = path.join(__dirname, '../../omp/tiers/luna', editedRel);
    lock.files[editedRel] = { hash: sha(fs.readFileSync(src)), installedAt: now, updatedAt: now };
    delete lock.files[editedRel].tier;
    const retiredRel = 'skills/aku-code-review-luna/SKILL.md';
    const retiredBytes = Buffer.from('# pre-rename install\n');
    fs.mkdirSync(path.dirname(omp(t, retiredRel)), { recursive: true });
    fs.writeFileSync(omp(t, retiredRel), retiredBytes);
    lock.files[retiredRel] = { hash: sha(retiredBytes), installedAt: now, updatedAt: now };
    fs.writeFileSync(omp(t, 'aku-lock.json'), JSON.stringify(lock, null, 2) + '\n');
    const r = ship(t, ['--update']);
    assert.equal(r.code, 0, r.out);
    assert.ok(!fs.existsSync(omp(t, 'skills/aku-luna-build-check/SKILL.md')), 'clean luna skill pruned (I==L)');
    assert.ok(!fs.existsSync(omp(t, 'skills/aku-luna-build-check/scripts/luna-build-settings.cjs')), 'nested tier script pruned (I==L)');
    assert.ok(!fs.existsSync(omp(t, retiredRel)), 'retired-name skill pruned (I==L)');
    assert.ok(fs.existsSync(omp(t, editedRel)), 'edited luna skill kept');
    const after = readLock(t);
    assert.deepEqual(after.tiers, []);
    assert.equal(after.files[editedRel].orphaned, true);
  } finally { cleanup(t); }
});

test('upgrade: retired aku-engine-rules.md prunes when unmodified, renamed rule installs', () => {
  const t = sandbox();
  try {
    ship(t);
    const legacy = Buffer.from('# Unity Rules (sticky)\nlegacy body\n');
    fs.writeFileSync(omp(t, 'rules/aku-engine-rules.md'), legacy);
    fs.unlinkSync(omp(t, 'rules/aku-core-rules.md'));
    const lock = readLock(t);
    const now = new Date().toISOString();
    lock.files['rules/aku-engine-rules.md'] = { hash: sha(legacy), installedAt: now, updatedAt: now };
    delete lock.files['rules/aku-core-rules.md'];
    fs.writeFileSync(omp(t, 'aku-lock.json'), JSON.stringify(lock, null, 2) + '\n');
    const r = ship(t, ['--update']);
    assert.equal(r.code, 0, r.out);
    assert.ok(!fs.existsSync(omp(t, 'rules/aku-engine-rules.md')), 'retired rule pruned (I==L)');
    assert.ok(fs.existsSync(omp(t, 'rules/aku-core-rules.md')), 'renamed rule installed');
    const after = readLock(t);
    assert.ok(!after.files['rules/aku-engine-rules.md'], 'lock no longer records the retired rule');
    assert.ok(after.files['rules/aku-core-rules.md'], 'lock records the renamed rule');
    assert.equal(ship(t, ['--check']).code, 0, 'in sync after upgrade');
  } finally { cleanup(t); }
});

test('upgrade keeps a user-edited retired rule as a conflict', () => {
  const t = sandbox();
  try {
    ship(t);
    const edited = Buffer.concat([Buffer.from('# Unity Rules (sticky)\n'), Buffer.from('USER EDIT\n')]);
    fs.writeFileSync(omp(t, 'rules/aku-engine-rules.md'), edited);
    fs.unlinkSync(omp(t, 'rules/aku-core-rules.md'));
    const lock = readLock(t);
    const now = new Date().toISOString();
    lock.files['rules/aku-engine-rules.md'] = { hash: sha(Buffer.from('# Unity Rules (sticky)\n')), installedAt: now, updatedAt: now };
    delete lock.files['rules/aku-core-rules.md'];
    fs.writeFileSync(omp(t, 'aku-lock.json'), JSON.stringify(lock, null, 2) + '\n');
    const r = ship(t, ['--update']);
    assert.equal(r.code, 0, r.out);
    assert.deepEqual(fs.readFileSync(omp(t, 'rules/aku-engine-rules.md')), edited, 'edited retired file kept');
    const after = readLock(t);
    assert.equal(after.files['rules/aku-engine-rules.md'].orphaned, true, 'kept as orphaned conflict');
    assert.ok(after.files['rules/aku-core-rules.md'], 'renamed rule still installs');
  } finally { cleanup(t); }
});
