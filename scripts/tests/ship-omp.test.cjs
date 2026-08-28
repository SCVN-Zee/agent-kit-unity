/**
 * ship-omp.cjs integration — install, idempotency, drift, update-available,
 * recreate, and tier overlay, driven through the real CLI in a sandbox.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { sandbox, ship, omp, readLock, sha, cleanup } = require('./helpers/omp-sandbox.cjs');

const KIT_VERSION = require('../../package.json').version;

test('fresh install writes the .omp tree (incl. a non-.md skill file) + a valid lock', () => {
  const t = sandbox();
  try {
    const r = ship(t);
    assert.equal(r.code, 0, r.out);
    for (const rel of ['AGENTS.md', 'rules/aku-engine-rules.md', 'rules/aku-mcp-policy.md',
      'skills/aku-scene/SKILL.md', 'skills/aku-scene/CINEMACHINE.md',
      'skills/aku-luna-build-check/scripts/luna-build-settings.cjs', 'aku-lock.json']) {
      assert.ok(fs.existsSync(omp(t, rel)), `missing ${rel}`);
    }
    const lock = readLock(t);
    assert.equal(lock.lockVersion, 1);
    assert.equal(lock.kitVersion, KIT_VERSION);
    const script = 'skills/aku-luna-build-check/scripts/luna-build-settings.cjs';
    assert.equal(lock.files[script].hash, sha(fs.readFileSync(omp(t, script))));
  } finally { cleanup(t); }
});

test('re-install on unchanged source+target is a byte-identical no-op', () => {
  const t = sandbox();
  try {
    ship(t);
    const first = fs.readFileSync(omp(t, 'aku-lock.json'));
    const mtime = fs.statSync(omp(t, 'AGENTS.md')).mtimeMs;
    const r = ship(t);
    assert.equal(r.code, 0);
    assert.deepEqual(fs.readFileSync(omp(t, 'aku-lock.json')), first, 'lock must be byte-identical');
    assert.equal(fs.statSync(omp(t, 'AGENTS.md')).mtimeMs, mtime, 'unchanged file must not be rewritten');
  } finally { cleanup(t); }
});

test('--check reports drift on a hand-edited file (exit 2), 0 in sync', () => {
  const t = sandbox();
  try {
    ship(t);
    assert.equal(ship(t, ['--check']).code, 0);
    fs.appendFileSync(omp(t, 'AGENTS.md'), '\nUSER EDIT\n');
    const r = ship(t, ['--check']);
    assert.equal(r.code, 2);
    assert.match(r.out, /AGENTS\.md/);
  } finally { cleanup(t); }
});

test('repeated --update keeps a still-packaged user edit until --force', () => {
  const t = sandbox();
  try {
    ship(t);
    const baseline = readLock(t).files['AGENTS.md'].hash;
    fs.appendFileSync(omp(t, 'AGENTS.md'), '\nUSER EDIT\n');
    for (let cycle = 1; cycle <= 2; cycle++) {
      const kept = ship(t, ['--update']);
      assert.equal(kept.code, 0);
      assert.match(kept.out, /conflict/);
      assert.ok(fs.readFileSync(omp(t, 'AGENTS.md'), 'utf8').includes('USER EDIT'));
      assert.equal(readLock(t).files['AGENTS.md'].hash, baseline, 'trusted baseline changed');
    }
    const forced = ship(t, ['--update', '--force']);
    assert.equal(forced.code, 0);
    assert.ok(!fs.readFileSync(omp(t, 'AGENTS.md'), 'utf8').includes('USER EDIT'));
  } finally { cleanup(t); }
});

test('update-available by hash: stale disk+lock → --check exit 2, --update re-syncs', () => {
  const t = sandbox();
  try {
    ship(t);
    // Simulate an upstream change: rewrite disk to OLD bytes and point the lock
    // at those same old bytes, so source ≠ lock == disk → an available update.
    const rel = 'rules/aku-engine-rules.md';
    const old = Buffer.from('OLD RULES CONTENT\n');
    fs.writeFileSync(omp(t, rel), old);
    const lock = readLock(t);
    lock.files[rel].hash = sha(old);
    fs.writeFileSync(omp(t, 'aku-lock.json'), JSON.stringify(lock, null, 2) + '\n');

    const chk = ship(t, ['--check']);
    assert.equal(chk.code, 2, chk.out);
    assert.match(chk.out, /aku-engine-rules\.md/);

    assert.equal(ship(t, ['--update']).code, 0);
    assert.equal(ship(t, ['--check']).code, 0, 'update should re-sync to source');
    assert.equal(readLock(t).files[rel].hash, sha(fs.readFileSync(omp(t, rel))));
  } finally { cleanup(t); }
});

test('--update recreates a deleted managed file', () => {
  const t = sandbox();
  try {
    ship(t);
    fs.unlinkSync(omp(t, 'rules/aku-mcp-policy.md'));
    const r = ship(t, ['--update']);
    assert.equal(r.code, 0);
    assert.ok(fs.existsSync(omp(t, 'rules/aku-mcp-policy.md')), 'recreated');
  } finally { cleanup(t); }
});

test('tier overlay installs on marker and prunes when the marker is removed', () => {
  const t = sandbox();
  try {
    fs.mkdirSync(path.join(t, 'Assets/Supercent'), { recursive: true });
    ship(t);
    assert.ok(fs.existsSync(omp(t, 'rules/aku-sc-rules.md')), 'supercent rule installed');
    assert.deepEqual(readLock(t).tiers, ['supercent']);
    fs.rmdirSync(path.join(t, 'Assets/Supercent'));
    const r = ship(t, ['--update']);
    assert.equal(r.code, 0);
    assert.ok(!fs.existsSync(omp(t, 'rules/aku-sc-rules.md')), 'tier rule pruned (I==L)');
    assert.deepEqual(readLock(t).tiers, []);
  } finally { cleanup(t); }
});

test('removed generic router prunes clean siblings and preserves edited bytes', () => {
  const t = sandbox();
  const root = ['skills', 'aku-unity'].join('/');
  const clean = root + '/SKILL.md';
  const nested = root + '/examples/basic.md';
  const edited = root + '/references/workflow.md';
  const baseline = Buffer.from('# retired router\n');
  const editedBytes = Buffer.concat([baseline, Buffer.from('USER EDIT\n')]);
  try {
    ship(t);
    const lockPath = omp(t, 'aku-lock.json');
    const lock = readLock(t);
    const now = new Date().toISOString();
    for (const rel of [clean, nested, edited]) {
      fs.mkdirSync(path.dirname(omp(t, rel)), { recursive: true });
      fs.writeFileSync(omp(t, rel), baseline);
      lock.files[rel] = { hash: sha(baseline), installedAt: now, updatedAt: now };
    }
    fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
    fs.writeFileSync(omp(t, edited), editedBytes);

    const updated = ship(t, ['--update']);
    assert.equal(updated.code, 0, updated.out);
    assert.ok(!fs.existsSync(omp(t, clean)) && !fs.existsSync(omp(t, nested)));
    assert.deepEqual(fs.readFileSync(omp(t, edited)), editedBytes);
    let next = readLock(t);
    assert.deepEqual(Object.keys(next.files).filter((rel) => rel.startsWith(root)), [edited]);
    assert.equal(next.files[edited].hash, sha(baseline), 'trusted baseline changed');
    assert.equal(next.files[edited].orphaned, true);

    assert.equal(ship(t, ['--update']).code, 0);
    assert.deepEqual(fs.readFileSync(omp(t, edited)), editedBytes);
    assert.equal(ship(t, ['--update', '--force']).code, 0);
    assert.ok(!fs.existsSync(omp(t, root)), 'force should remove the retired directory');
    next = readLock(t);
    assert.equal(Object.keys(next.files).some((rel) => rel.startsWith(root)), false);
    assert.equal(ship(t, ['--check']).code, 0);
  } finally { cleanup(t); }
});

test('upgrade from the pre-move layout: managed top-level RULES.md is pruned, relocated rule installs', () => {
  const t = sandbox();
  try {
    ship(t);
    // Simulate an install made BEFORE RULES.md moved into rules/: the old
    // top-level file is on disk and in the lock, and the relocated rule absent.
    const legacy = Buffer.from('# Unity Rules (sticky)\nlegacy body\n');
    fs.writeFileSync(omp(t, 'RULES.md'), legacy);
    fs.unlinkSync(omp(t, 'rules/aku-engine-rules.md'));
    const lock = readLock(t);
    const now = new Date().toISOString();
    lock.files['RULES.md'] = { hash: sha(legacy), installedAt: now, updatedAt: now };
    delete lock.files['rules/aku-engine-rules.md'];
    fs.writeFileSync(omp(t, 'aku-lock.json'), JSON.stringify(lock, null, 2) + '\n');

    const r = ship(t, ['--update']);
    assert.equal(r.code, 0, r.out);
    assert.ok(!fs.existsSync(omp(t, 'RULES.md')), 'legacy top-level RULES.md pruned (I==L)');
    assert.ok(fs.existsSync(omp(t, 'rules/aku-engine-rules.md')), 'relocated rule installed');
    const after = readLock(t);
    assert.ok(!after.files['RULES.md'], 'lock no longer records RULES.md');
    assert.ok(after.files['rules/aku-engine-rules.md'], 'lock records the relocated rule');
    assert.equal(ship(t, ['--check']).code, 0, 'in sync after upgrade');
  } finally { cleanup(t); }
});
