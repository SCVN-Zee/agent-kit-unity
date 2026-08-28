/**
 * Tests for omp-install-reconcile.js — the full 12-cell classify matrix, the
 * destructive-integrity gate (prune only when I==L), assertDest containment,
 * and lockEntries orphan tracking for kept conflicts.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { assertDest, classify, plan, lockEntries } = require('../lib/omp-install-reconcile');

const S = 'sha256:S';
const L = 'sha256:L';
const X = 'sha256:X'; // a third, user-edited value

test('classify covers every cell of the matrix', () => {
  // S set
  assert.equal(classify(S, undefined, undefined), 'create');
  assert.equal(classify(S, undefined, S), 'unchanged');       // pre-copied matches
  assert.equal(classify(S, undefined, X), 'conflict');        // hand-copied diverged, no lock
  assert.equal(classify(S, S, S), 'unchanged');               // in sync
  assert.equal(classify(S, L, L), 'update');                  // upstream changed, untouched
  assert.equal(classify(S, L, X), 'conflict');                // user edited a managed file
  assert.equal(classify(S, L, S), 'unchanged');               // source moved, disk already matches
  assert.equal(classify(S, L, undefined), 'recreate');        // managed file deleted
  // S absent
  assert.equal(classify(undefined, L, L), 'prune');           // left payload, I==L
  assert.equal(classify(undefined, L, X), 'conflict');        // departed AND edited → orphan
  assert.equal(classify(undefined, L, undefined), 'drop');    // crash: pruned before lock
  assert.equal(classify(undefined, undefined, X), 'ignore');  // never ours
});

test('plan buckets a fresh install', () => {
  const p = plan({
    payload: { 'AGENTS.md': { srcAbs: '/k/AGENTS.md', hash: S } },
    installed: {}, prior: null
  });
  assert.equal(p.creates.length, 1);
  assert.equal(p.creates[0].rel, 'AGENTS.md');
  assert.equal(p.creates[0].srcAbs, '/k/AGENTS.md');
});

test('plan: no-op has only unchanged', () => {
  const p = plan({
    payload: { 'R.md': { srcAbs: '/k/R.md', hash: S } },
    installed: { 'R.md': S },
    prior: { files: { 'R.md': { hash: S } } }
  });
  assert.deepEqual(p.creates, []);
  assert.deepEqual(p.updates, []);
  assert.equal(p.unchanged.length, 1);
});

test('plan: upstream update vs user-edit conflict', () => {
  const p = plan({
    payload: { 'up.md': { srcAbs: '/k/up.md', hash: S }, 'edit.md': { srcAbs: '/k/edit.md', hash: S } },
    installed: { 'up.md': L, 'edit.md': X },
    prior: { files: { 'up.md': { hash: L }, 'edit.md': { hash: L } } }
  });
  assert.deepEqual(p.updates.map((u) => u.rel), ['up.md']);
  assert.deepEqual(p.conflicts.map((c) => c.rel), ['edit.md']);
  assert.equal(p.conflicts[0].orphaned, false);
});

test('plan: hand-copied diverged with no prior lock is a conflict, not a clobber', () => {
  const p = plan({
    payload: { 'hc.md': { srcAbs: '/k/hc.md', hash: S } },
    installed: { 'hc.md': X },
    prior: null
  });
  assert.deepEqual(p.updates, []);
  assert.deepEqual(p.creates, []);
  assert.equal(p.conflicts.length, 1);
  assert.equal(p.conflicts[0].rel, 'hc.md');
});

test('plan: recreate a deleted managed file', () => {
  const p = plan({
    payload: { 'gone.md': { srcAbs: '/k/gone.md', hash: S } },
    installed: {},
    prior: { files: { 'gone.md': { hash: S } } }
  });
  assert.deepEqual(p.recreates.map((r) => r.rel), ['gone.md']);
});

test('plan: prune only when I==L; drifted departed file becomes an orphaned conflict', () => {
  const p = plan({
    payload: {},
    installed: { 'left.md': L, 'drift.md': X },
    prior: { files: { 'left.md': { hash: L, tier: 'luna' }, 'drift.md': { hash: L } } }
  });
  assert.deepEqual(p.prunes.map((x) => x.rel), ['left.md']);
  assert.equal(p.prunes[0].recordedHash, L);
  assert.equal(p.prunes[0].installedHash, L);
  assert.deepEqual(p.conflicts.map((c) => c.rel), ['drift.md']);
  assert.equal(p.conflicts[0].orphaned, true);
});

test('plan: legacy orphan marker protects a promoted user hash across cycles', () => {
  const installed = { 'current.md': X, 'legacy.md': X, 'returned.md': X };
  const prior = { files: { 'current.md': { hash: X, orphaned: true },
    'legacy.md': { hash: X, orphaned: true }, 'missing.md': { hash: X, orphaned: true },
    'returned.md': { hash: X, orphaned: true } } };
  const first = plan({ payload: { 'current.md': { hash: X }, 'returned.md': { hash: S } }, installed, prior });
  assert.deepEqual([first.prunes, first.conflicts.map((entry) => entry.rel)], [[], ['legacy.md', 'returned.md']]);
  assert.deepEqual([first.unchanged.map((e) => e.rel), first.drops], [['current.md'], ['missing.md']]);
  const entries = lockEntries(first, 'keep'); assert.deepEqual(
    [entries['legacy.md'].orphaned, entries['returned.md'].orphaned], [true, true]);
  const second = plan({ payload: { 'returned.md': { hash: S } }, installed, prior: { files: entries } });
  assert.deepEqual(second.conflicts.map((entry) => entry.rel), ['legacy.md', 'returned.md']);
  const forced = lockEntries(second, 'force'); assert.deepEqual(forced, { 'returned.md': { hash: S, tier: undefined } });
});

test('plan: crash-drop (recorded, gone from disk and source)', () => {
  const p = plan({
    payload: {},
    installed: {},
    prior: { files: { 'ghost.md': { hash: L } } }
  });
  assert.deepEqual(p.drops, ['ghost.md']);
});

test('plan: an unowned on-disk file is ignored', () => {
  const p = plan({
    payload: {},
    installed: { 'mine.md': X },
    prior: null
  });
  assert.deepEqual(p.ignored, ['mine.md']);
});

test('assertDest rejects empty / . / .. / absolute / root keys', () => {
  const root = '/tmp/repo/.omp';
  assert.throws(() => assertDest(root, ''), /unsafe/);
  assert.throws(() => assertDest(root, '.'), /unsafe/);
  assert.throws(() => assertDest(root, '..'), /unsafe/);
  assert.throws(() => assertDest(root, 'a/../../escape'), /unsafe/);
  assert.throws(() => assertDest(root, '/etc/passwd'), /unsafe/);
  // A key that normalizes to the root itself would be caught as the root.
  assert.equal(assertDest(root, 'rules/x.md'), '/tmp/repo/.omp/rules/x.md');
});

test('plan raises on a crafted unsafe prior-lock key', () => {
  assert.throws(() => plan({
    payload: {},
    installed: { '../../evil': X },
    prior: { files: { '../../evil': { hash: L } } },
    ompDir: '/tmp/repo/.omp'
  }), /unsafe/);
});

test('lockEntries preserves trusted baselines across repeated kept conflicts', () => {
  const payload = { 'edit.md': { srcAbs: '/k/edit.md', hash: S } };
  const installed = { 'edit.md': X, 'left.md': X };
  const prior = { files: { 'edit.md': { hash: L }, 'left.md': { hash: L } } };
  const first = plan({ payload, installed, prior });
  const entries = lockEntries(first, 'keep');
  assert.equal(entries['edit.md'].hash, L, 'still-packaged conflict keeps trusted baseline');
  assert.equal(entries['edit.md'].orphaned, undefined);
  assert.equal(entries['left.md'].hash, L, 'departed conflict keeps trusted baseline');
  assert.equal(entries['left.md'].orphaned, true);

  const second = plan({ payload, installed, prior: { files: entries } });
  assert.deepEqual(second.conflicts.map((entry) => entry.rel), ['edit.md', 'left.md']);
});

test('lockEntries does not adopt conflicts without a trusted baseline', () => {
  const payload = { 'edit.md': { srcAbs: '/k/edit.md', hash: S } };
  const installed = { 'edit.md': X };
  assert.deepEqual(lockEntries(plan({ payload, installed }), 'keep'), {});
  assert.deepEqual(lockEntries(plan({
    payload, installed, prior: { files: { 'edit.md': { hash: null } } }
  }), 'keep'), {});
});

test('lockEntries in force mode promotes a still-packaged conflict to source and drops departed', () => {
  const p = plan({
    payload: { 'edit.md': { srcAbs: '/k/edit.md', hash: S } },
    installed: { 'edit.md': X, 'left.md': X },
    prior: { files: { 'edit.md': { hash: L }, 'left.md': { hash: L } } }
  });
  const entries = lockEntries(p, 'force');
  assert.equal(entries['edit.md'].hash, S, 'force promotes to source hash (about to overwrite)');
  assert.ok(!('left.md' in entries), 'departed conflict is dropped in force mode');
});

test('lockEntries records unchanged, created, updated, recreated', () => {
  const p = plan({
    payload: {
      'c.md': { srcAbs: '/k/c.md', hash: S },
      'u.md': { srcAbs: '/k/u.md', hash: S },
      'un.md': { srcAbs: '/k/un.md', hash: S }
    },
    installed: { 'u.md': L, 'un.md': S },
    prior: { files: { 'u.md': { hash: L }, 'un.md': { hash: S } } }
  });
  const entries = lockEntries(p);
  assert.equal(entries['c.md'].hash, S);
  assert.equal(entries['u.md'].hash, S);
  assert.equal(entries['un.md'].hash, S);
});
