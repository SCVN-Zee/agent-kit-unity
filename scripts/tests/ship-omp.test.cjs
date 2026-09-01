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

test('fresh default install writes the .omp tree + a valid lock, without Luna skills', () => {
  const t = sandbox();
  try {
    const r = ship(t);
    assert.equal(r.code, 0, r.out);
    for (const rel of ['AGENTS.md', 'rules/aku-core-rules.md', 'rules/aku-mcp-policy.md',
      'skills/aku-scene/SKILL.md', 'skills/aku-scene/CINEMACHINE.md', 'aku-lock.json']) {
      assert.ok(fs.existsSync(omp(t, rel)), `missing ${rel}`);
    }
    assert.ok(!fs.existsSync(omp(t, 'skills/aku-luna-build-check')), 'luna skill absent from default install');
    assert.ok(!fs.existsSync(omp(t, 'skills/aku-luna-code-review')), 'luna review skill absent from default install');
    const lock = readLock(t);
    assert.equal(lock.lockVersion, 1);
    assert.equal(lock.kitVersion, KIT_VERSION);
    assert.equal(Object.keys(lock.files).filter((rel) => rel.includes('aku-luna-')).length, 0, 'no luna lock entries');
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
    const rel = 'rules/aku-core-rules.md';
    const old = Buffer.from('OLD RULES CONTENT\n');
    fs.writeFileSync(omp(t, rel), old);
    const lock = readLock(t);
    lock.files[rel].hash = sha(old);
    fs.writeFileSync(omp(t, 'aku-lock.json'), JSON.stringify(lock, null, 2) + '\n');

    const chk = ship(t, ['--check']);
    assert.equal(chk.code, 2, chk.out);
    assert.match(chk.out, /aku-core-rules\.md/);

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

