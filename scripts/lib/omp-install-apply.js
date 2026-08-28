/**
 * omp-install-apply.js — the fs-touching half of the OMP installer.
 *
 * Turns a pure reconcile plan into real writes/deletes under `<target>/.omp/`
 * with the destructive-safety guards the red team required:
 *  - every dest goes through reconcile.assertDest (no root, no escape);
 *  - a path is deleted ONLY when its on-disk hash still equals the recorded
 *    hash (the lock is untrusted — re-verify at delete time, not just plan time);
 *  - the empty-dir sweep removes only now-empty dirs strictly BELOW the root and
 *    never rmdirs the `.omp/` root itself.
 *  - a crash-stranded `.aku-tmp.*` staging entry from a prior run is swept at
 *    apply start (`.omp/` is kit-owned, so a pid-agnostic sweep is safe).
 */

const fs = require('fs');
const path = require('path');
const { copyEntry, TMP_PREFIX } = require('./global-install-fs');
const { hashBytes } = require('./omp-install-lock');
const { assertDest } = require('./omp-install-reconcile');

function onDiskHash(abs) {
  try { return hashBytes(fs.readFileSync(abs)); }
  catch (_) { return null; }
}

/** Hash each rel that exists on disk under ompDir → { rel: hash }. */
function hashInstalled(ompDir, rels) {
  const out = {};
  for (const rel of rels) {
    const h = onDiskHash(path.join(ompDir, rel));
    if (h !== null) out[rel] = h;
  }
  return out;
}

function copyOne(ompDir, rel, srcAbs) {
  const dest = assertDest(ompDir, rel);
  copyEntry({ src: srcAbs, dest, kind: 'file' });
}

// Delete only if the on-disk hash still equals `expected`. Returns 'deleted',
// 'kept' (drifted/foreign — never touched), or 'absent'.
function integrityDelete(ompDir, rel, expected) {
  const dest = assertDest(ompDir, rel);
  const cur = onDiskHash(dest);
  if (cur === null) return 'absent';
  if (cur !== expected) return 'kept';
  fs.unlinkSync(dest);
  return 'deleted';
}

// rmdir now-empty ancestor dirs of the given rels, deepest first, stopping at
// (and never removing) the `.omp/` root.
function sweepEmptyDirs(ompDir, rels) {
  const root = path.resolve(ompDir);
  const dirs = new Set();
  for (const rel of rels) {
    let d = path.dirname(rel);
    while (d && d !== '.' && d !== '/') { dirs.add(d); d = path.dirname(d); }
  }
  for (const rel of [...dirs].sort((a, b) => b.length - a.length)) {
    const abs = path.resolve(root, rel);
    if (abs === root) continue;
    try { assertDest(ompDir, rel); } catch (_) { continue; }
    try { if (fs.readdirSync(abs).length === 0) fs.rmdirSync(abs); } catch (_) { /* non-empty or gone */ }
  }
}

// Recover `.aku-tmp.*` staging entries a crash stranded between write and rename
// in a PRIOR run: tmpFor() embeds the pid, so a new run's own-name cleanup never
// reaches them and they would litter `.omp/` forever. `.omp/` is kit-owned (a
// symlinked root is refused, the whole tree is ours), so a pid-agnostic sweep of
// the directories this plan touches is safe — no foreign-dir / concurrency hazard.
function sweepStaleTmps(ompDir, rels) {
  const root = path.resolve(ompDir);
  const dirs = new Set(['.']);
  for (const rel of rels) dirs.add(path.dirname(rel));
  for (const dirRel of dirs) {
    const abs = dirRel === '.' ? root : path.resolve(root, dirRel);
    if (abs !== root && path.relative(root, abs).startsWith('..')) continue;
    let entries;
    try { entries = fs.readdirSync(abs); } catch (_) { continue; }
    for (const name of entries) {
      if (name.startsWith(TMP_PREFIX)) {
        try { fs.rmSync(path.join(abs, name), { recursive: true, force: true }); } catch (_) { /* ignore */ }
      }
    }
  }
}

/**
 * Apply an install/update plan. `force` promotes a still-packaged conflict to an
 * overwrite and removes a departed (orphaned) conflict. Returns a summary of
 * what changed plus the conflicts that were kept (for reporting).
 */
function applyPlan(ompDir, plan, { force = false } = {}) {
  const sum = { created: [], updated: [], recreated: [], pruned: [], kept: [], conflicts: [] };
  const removed = [];
  const allRels = [...plan.creates, ...plan.updates, ...plan.recreates, ...plan.prunes, ...plan.conflicts].map((e) => e.rel);
  sweepStaleTmps(ompDir, allRels);
  for (const [bucket, key] of [['creates', 'created'], ['updates', 'updated'], ['recreates', 'recreated']]) {
    for (const e of plan[bucket]) { copyOne(ompDir, e.rel, e.srcAbs); sum[key].push(e.rel); }
  }
  for (const p of plan.prunes) {
    const r = integrityDelete(ompDir, p.rel, p.recordedHash);
    if (r === 'deleted') { sum.pruned.push(p.rel); removed.push(p.rel); }
    else if (r === 'kept') sum.kept.push(p.rel);
  }
  for (const c of plan.conflicts) {
    if (force && !c.orphaned && c.srcAbs) { copyOne(ompDir, c.rel, c.srcAbs); sum.updated.push(c.rel); }
    else if (force && c.orphaned) {
      const r = integrityDelete(ompDir, c.rel, c.installedHash);
      if (r === 'deleted') { sum.pruned.push(c.rel); removed.push(c.rel); }
      else if (r === 'kept') sum.kept.push(c.rel);
    } else {
      sum.conflicts.push(c.rel);
    }
  }
  sweepEmptyDirs(ompDir, removed);
  return sum;
}

/**
 * Remove exactly the lock's integrity-gated recorded paths, then the lock file.
 * Drifted paths and legacy orphan-marked hashes are kept unless force explicitly
 * accepts that untrusted baseline. User files outside the lock are untouched.
 */
function uninstall(ompDir, prior, lockName, { force = false, dryRun = false } = {}) {
  const sum = { removed: [], kept: [], absent: [] };
  const files = (prior && prior.files) || {};
  for (const rel of Object.keys(files)) {
    const entry = files[rel];
    if (dryRun) {
      const cur = onDiskHash(assertDest(ompDir, rel));
      if (cur === null) sum.absent.push(rel);
      else if (entry.orphaned === true && !force) sum.kept.push(rel);
      else (cur === entry.hash ? sum.removed : sum.kept).push(rel);
      continue;
    }
    if (entry.orphaned === true && !force) {
      (onDiskHash(assertDest(ompDir, rel)) === null ? sum.absent : sum.kept).push(rel);
      continue;
    }
    const r = integrityDelete(ompDir, rel, entry.hash);
    sum[r === 'deleted' ? 'removed' : r].push(rel);
  }
  if (!dryRun) {
    sweepEmptyDirs(ompDir, sum.removed);
    try { fs.unlinkSync(path.join(ompDir, lockName)); } catch (_) { /* already gone */ }
  }
  return sum;
}

module.exports = { onDiskHash, hashInstalled, integrityDelete, sweepEmptyDirs, sweepStaleTmps, applyPlan, uninstall };
