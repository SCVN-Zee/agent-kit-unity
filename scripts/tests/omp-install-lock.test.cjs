/**
 * Tests for omp-install-lock.js — schema round-trip, stable byte-identical
 * serialization, the corrupt/forward-version gate, and buildLock's
 * installedAt-preserve / updatedAt-bump-only-on-change contract (the property
 * that makes a no-op ship-omp run leave the committed lock untouched).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const lock = require('../lib/omp-install-lock');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'aku-lock-'));
}

test('hashBytes is sha256 of raw bytes, prefixed', () => {
  const buf = Buffer.from([0, 1, 2, 255]);
  const expected = 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex');
  assert.equal(lock.hashBytes(buf), expected);
});

test('read: absent → null', () => {
  assert.equal(lock.read(tmp()), null);
});

test('read: unparseable → CorruptLockError', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, lock.LOCK_NAME), '{not json');
  assert.throws(() => lock.read(dir), lock.CorruptLockError);
});

test('read: forward lockVersion → LockVersionError', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, lock.LOCK_NAME),
    JSON.stringify({ lockVersion: lock.LOCK_VERSION + 1, files: {} }));
  assert.throws(() => lock.read(dir), lock.LockVersionError);
});

test('read: unsafe path key → CorruptLockError', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, lock.LOCK_NAME),
    JSON.stringify({ lockVersion: 1, files: { '../evil': { hash: 'sha256:x' } } }));
  assert.throws(() => lock.read(dir), lock.CorruptLockError);
});

test('write → read round-trips and sorts keys stably', () => {
  const dir = tmp();
  const built = lock.buildLock({
    kitVersion: '1.0.0-rc.1',
    tiers: ['supercent'],
    entries: {
      'rules/aku-engine-rules.md': { hash: 'sha256:bb' },
      'AGENTS.md': { hash: 'sha256:aa' },
      'rules/aku-sc-rules.md': { hash: 'sha256:cc', tier: 'supercent' }
    },
    prior: null,
    now: '2026-01-01T00:00:00.000Z'
  });
  lock.write(dir, built);
  const back = lock.read(dir);
  assert.equal(back.kitVersion, '1.0.0-rc.1');
  assert.deepEqual(back.tiers, ['supercent']);
  assert.deepEqual(Object.keys(back.files), ['AGENTS.md', 'rules/aku-engine-rules.md', 'rules/aku-sc-rules.md']);
  assert.equal(back.files['rules/aku-sc-rules.md'].tier, 'supercent');
});

test('serialize is byte-identical for equal content regardless of key order', () => {
  const a = lock.buildLock({
    kitVersion: '1', tiers: ['b', 'a'],
    entries: { 'z.md': { hash: 'sha256:z' }, 'a.md': { hash: 'sha256:a' } },
    prior: null, now: 'T'
  });
  const b = lock.buildLock({
    kitVersion: '1', tiers: ['a', 'b'],
    entries: { 'a.md': { hash: 'sha256:a' }, 'z.md': { hash: 'sha256:z' } },
    prior: null, now: 'T'
  });
  assert.equal(lock.serialize(a), lock.serialize(b));
});

test('buildLock preserves installedAt and bumps updatedAt only when hash changes', () => {
  const prior = lock.buildLock({
    kitVersion: '1', tiers: [],
    entries: { 'A.md': { hash: 'sha256:a' }, 'B.md': { hash: 'sha256:b' } },
    prior: null, now: 'T0'
  });
  // Re-derive over UNCHANGED input at a later wall-clock: must equal prior byte-for-byte.
  const same = lock.buildLock({
    kitVersion: '1', tiers: [],
    entries: { 'A.md': { hash: 'sha256:a' }, 'B.md': { hash: 'sha256:b' } },
    prior, now: 'T1'
  });
  assert.equal(lock.serialize(same), lock.serialize(prior), 'no-op re-derive must be byte-identical');

  // Change B's hash: A untouched (T0/T0), B bumps updatedAt to T1, installedAt kept.
  const changed = lock.buildLock({
    kitVersion: '1', tiers: [],
    entries: { 'A.md': { hash: 'sha256:a' }, 'B.md': { hash: 'sha256:b2' } },
    prior, now: 'T1'
  });
  assert.equal(changed.files['A.md'].installedAt, 'T0');
  assert.equal(changed.files['A.md'].updatedAt, 'T0');
  assert.equal(changed.files['B.md'].installedAt, 'T0', 'installedAt is preserved across an update');
  assert.equal(changed.files['B.md'].updatedAt, 'T1', 'updatedAt bumps on hash change');
});

test('buildLock refuses an unsafe key', () => {
  assert.throws(() => lock.buildLock({
    kitVersion: '1', tiers: [], entries: { '/etc/passwd': { hash: 'sha256:x' } }, prior: null, now: 'T'
  }), /unsafe lock key/);
});
