/**
 * ship-omp.cjs integration — the destructive-safety guarantees: symlinked-root
 * refusal, uninstall never removing the root or a drifted file, user-file
 * survival across install/update/uninstall, and flag validation.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { sandbox, ship, omp, cleanup } = require('./helpers/omp-sandbox.cjs');

test('a symlinked .omp/ root is refused, writing nothing', () => {
  const t = sandbox();
  const away = fs.mkdtempSync(path.join(require('os').tmpdir(), 'aku-away-'));
  try {
    fs.symlinkSync(away, path.join(t, '.omp'));
    const r = ship(t);
    assert.equal(r.code, 1);
    assert.match(r.out, /symlink/i);
    assert.deepEqual(fs.readdirSync(away), [], 'nothing written through the symlink');
  } finally { cleanup(t, away); }
});

test('user files survive install, update, and uninstall', () => {
  const t = sandbox();
  try {
    ship(t);
    fs.writeFileSync(omp(t, 'aku-project.json'), '{"odin":false}\n');
    fs.writeFileSync(omp(t, 'rules/house-style.md'), '# my house style\n');
    assert.equal(ship(t, ['--update']).code, 0);
    assert.ok(fs.existsSync(omp(t, 'aku-project.json')), 'marker survives update');
    assert.ok(fs.existsSync(omp(t, 'rules/house-style.md')), 'unowned rule survives update');
    assert.equal(ship(t, ['--uninstall']).code, 0);
    assert.ok(fs.existsSync(omp(t, 'aku-project.json')), 'marker survives uninstall');
    assert.ok(fs.existsSync(omp(t, 'rules/house-style.md')), 'unowned rule survives uninstall');
    assert.ok(!fs.existsSync(omp(t, 'aku-lock.json')), 'lock removed on uninstall');
    assert.ok(fs.existsSync(path.join(t, '.omp')), '.omp root itself is never removed');
  } finally { cleanup(t); }
});

test('uninstall keeps a drifted managed file, never deleting it', () => {
  const t = sandbox();
  try {
    ship(t);
    fs.appendFileSync(omp(t, 'rules/aku-core-rules.md'), '\nUSER EDIT\n');
    const r = ship(t, ['--uninstall']);
    assert.equal(r.code, 0);
    assert.match(r.out, /kept/i);
    assert.ok(fs.existsSync(omp(t, 'rules/aku-core-rules.md')), 'drifted file kept');
    assert.ok(!fs.existsSync(omp(t, 'AGENTS.md')), 'clean managed file removed');
  } finally { cleanup(t); }
});

test('uninstall preview and apply protect legacy orphan-marked bytes unless forced', () => {
  const t = sandbox();
  const mismatchRel = 'skills/aku-scene/SKILL.md';
  const absentRel = 'skills/aku-prefab/SKILL.md';
  const driftedRel = 'rules/aku-core-rules.md';
  try {
    ship(t);
    const lockPath = omp(t, 'aku-lock.json');
    const data = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    const mismatchHash = data.files[mismatchRel].hash;
    data.files['AGENTS.md'].orphaned = true;
    data.files[mismatchRel].orphaned = true;
    fs.writeFileSync(lockPath, JSON.stringify(data, null, 2) + '\n');
    fs.appendFileSync(omp(t, mismatchRel), '\nUSER EDIT\n');
    fs.appendFileSync(omp(t, driftedRel), '\nUSER EDIT\n');
    fs.unlinkSync(omp(t, absentRel));

    const normalDry = ship(t, ['--uninstall', '--dry-run']);
    assert.match(normalDry.out, /would keep.*AGENTS\.md/is);
    assert.match(normalDry.out, /would keep.*aku-scene\/SKILL\.md/is);
    assert.match(normalDry.out, /would keep.*aku-core-rules\.md/is);
    assert.match(normalDry.out, /already absent.*aku-prefab\/SKILL\.md/is);
    const forceDry = ship(t, ['--uninstall', '--dry-run', '--force']);
    assert.match(forceDry.out, /would remove.*AGENTS\.md/is);
    assert.match(forceDry.out, /would keep.*aku-scene\/SKILL\.md/is);
    assert.match(forceDry.out, /already absent.*aku-prefab\/SKILL\.md/is);

    const kept = ship(t, ['--uninstall']);
    assert.equal(kept.code, 0, kept.out);
    for (const rel of ['AGENTS.md', mismatchRel, driftedRel]) assert.ok(fs.existsSync(omp(t, rel)));
    assert.ok(!fs.existsSync(omp(t, absentRel)));
    assert.ok(!fs.existsSync(lockPath), 'normal uninstall removes the lock after relinquishing kept files');

    ship(t);
    const next = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    next.files['AGENTS.md'].orphaned = true;
    next.files[mismatchRel] = { hash: mismatchHash, orphaned: true };
    fs.writeFileSync(lockPath, JSON.stringify(next, null, 2) + '\n');
    const forced = ship(t, ['--uninstall', '--force']);
    assert.equal(forced.code, 0, forced.out);
    assert.ok(!fs.existsSync(omp(t, 'AGENTS.md')), 'matching marker bytes deleted when forced');
    assert.ok(fs.existsSync(omp(t, mismatchRel)), 'force still keeps marker bytes that drifted again');
  } finally { cleanup(t); }
});

test('a corrupt lock is fatal (exit 1) but --force rebuilds it', () => {
  const t = sandbox();
  try {
    ship(t);
    fs.writeFileSync(omp(t, 'aku-lock.json'), '{ this is not json');
    assert.equal(ship(t, ['--check']).code, 1);
    const r = ship(t, ['--force']);
    assert.equal(r.code, 0, r.out);
    assert.equal(ship(t, ['--check']).code, 0, 'lock rebuilt and in sync');
  } finally { cleanup(t); }
});

test('bad flags and conflicting modes exit 1', () => {
  const t = sandbox();
  try {
    assert.equal(ship(t, ['--bogus']).code, 1);
    assert.equal(ship(t, ['--check', '--uninstall']).code, 1);
  } finally { cleanup(t); }
});

test('--dry-run writes nothing', () => {
  const t = sandbox();
  try {
    const r = ship(t, ['--dry-run']);
    assert.equal(r.code, 0);
    assert.ok(!fs.existsSync(path.join(t, '.omp')), 'dry-run created no .omp');
  } finally { cleanup(t); }
});

test('a crash-stranded .aku-tmp.* staging entry is swept on the next run', () => {
  const t = sandbox();
  try {
    ship(t);
    // Simulate a prior run that crashed between write and rename: strays whose
    // embedded pid no run will ever match again, in the root and a subdir.
    fs.writeFileSync(omp(t, '.aku-tmp.99999.aku-lock.json'), 'stale');
    fs.writeFileSync(omp(t, 'rules/.aku-tmp.99999.aku-mcp-policy.md'), 'stale');
    // Delete a managed rule so the retry has a pending op in rules/ (the crash
    // that stranded the tmp would itself have left that op incomplete).
    fs.rmSync(omp(t, 'rules/aku-mcp-policy.md'));
    const r = ship(t);
    assert.equal(r.code, 0, r.out);
    assert.ok(!fs.existsSync(omp(t, '.aku-tmp.99999.aku-lock.json')), 'root stray swept');
    assert.ok(!fs.existsSync(omp(t, 'rules/.aku-tmp.99999.aku-mcp-policy.md')), 'subdir stray swept');
    assert.ok(fs.existsSync(omp(t, 'rules/aku-mcp-policy.md')), 'deleted managed rule recreated');
    assert.equal(ship(t, ['--check']).code, 0, 'in sync after recovery');
  } finally { cleanup(t); }
});
