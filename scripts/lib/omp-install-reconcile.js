/**
 * omp-install-reconcile.js — the pure three-way reconcile planner.
 *
 * For each path up to three hashes exist: S (source payload), L (prior lock
 * record), I (installed on disk). The full cell matrix — including the recovery
 * cells skills.sh's overwrite-on-update never handles — is:
 *
 *  S    L    I                         → action
 *  set  -    -                         → create
 *  set  -    =S                        → unchanged   (pre-copied, matches)
 *  set  -    ≠S                        → conflict    (hand-copied, diverged, no lock)
 *  set  set  =S                        → unchanged   (in sync / source moved to match)
 *  set  ≠S   =L                        → update      (upstream changed, user untouched)
 *  set  set  ≠S,≠L                     → conflict    (user edited a managed file)
 *  set  set  -                         → recreate    (managed file deleted / crash-lost)
 *  -    set  =L                        → prune       (left payload; delete only if I==L)
 *  -    set  ≠L                        → conflict    (departed AND user-edited → orphaned)
 *  -    set  -                         → drop        (crash: pruned before lock write)
 *  -    -    present                   → ignore      (never ours)
 *
 * Destructive-integrity gate: a prune is emitted ONLY when I==L, so the plan
 * never lists a drifted/foreign file for deletion (the lock is untrusted). The
 * caller re-verifies the on-disk hash again before unlinking.
 *
 * plan() is pure: no fs reads or writes.
 */

const path = require('path');
const { assertSafePath } = require('./path-safety');
const { isSafeKey } = require('./omp-install-lock');

/**
 * Resolve + containment-guard a single install dest. Rejects empty/`.`/`..`/
 * absolute/NUL keys (isSafeKey), the `.omp/` root itself (abs === root), and any
 * path that escapes the root. Path math only — no fs.
 */
function assertDest(ompDir, rel) {
  if (!isSafeKey(rel)) throw new Error(`unsafe install path: ${JSON.stringify(rel)}`);
  const root = path.resolve(ompDir);
  const abs = path.resolve(root, rel);
  if (abs === root) throw new Error(`refusing to operate on the .omp/ root itself: ${rel}`);
  assertSafePath(abs, root);
  return abs;
}

function classify(S, L, I) {
  const hasS = S !== undefined && S !== null;
  const hasL = L !== undefined && L !== null;
  const hasI = I !== undefined && I !== null;

  if (hasS) {
    if (!hasI) return hasL ? 'recreate' : 'create';
    if (I === S) return 'unchanged';
    // I !== S below.
    if (!hasL) return 'conflict';        // hand-copied, diverged, no lock
    if (I === L) return 'update';        // upstream changed, disk still old
    return 'conflict';                   // user edited a managed file
  }
  // S absent.
  if (!hasL) return 'ignore';            // never ours (or nothing to do)
  if (!hasI) return 'drop';              // recorded, gone from disk and source
  if (I === L) return 'prune';           // left payload, integrity gate holds
  return 'conflict';                     // departed AND user-edited → orphaned
}

function plan({ payload = {}, installed = {}, prior = null, ompDir = '.omp' }) {
  const priorFiles = (prior && prior.files) || {};
  const keys = new Set([
    ...Object.keys(payload),
    ...Object.keys(priorFiles),
    ...Object.keys(installed)
  ]);

  const out = {
    creates: [], updates: [], recreates: [], prunes: [],
    drops: [], conflicts: [], unchanged: [], ignored: []
  };

  for (const rel of [...keys].sort()) {
    const src = payload[rel];
    const priorEntry = priorFiles[rel];
    const S = src ? src.hash : undefined;
    const L = priorEntry ? priorEntry.hash : undefined;
    const rawI = installed[rel];
    const I = rawI === undefined || rawI === null ? undefined : rawI;
    let action = classify(S, L, I);
    // Old keep-mode locks may contain user bytes marked orphaned. Never use
    // that untrusted hash to justify an automatic update or prune.
    if (priorEntry && priorEntry.orphaned === true && I !== undefined && I !== S) {
      action = 'conflict';
    }

    // Every actionable dest is containment-checked here so a crafted prior lock
    // key can never smuggle a write/delete outside the root.
    if (action !== 'ignore') assertDest(ompDir, rel);

    if (action === 'create' || action === 'update' || action === 'recreate') {
      out[action + 's'].push({ rel, srcAbs: src.srcAbs, hash: S, tier: src.tier });
    } else if (action === 'unchanged') {
      out.unchanged.push({ rel, hash: S, tier: src.tier });
    } else if (action === 'prune') {
      out.prunes.push({ rel, recordedHash: L, installedHash: I });
    } else if (action === 'drop') {
      out.drops.push(rel);
    } else if (action === 'ignore') {
      out.ignored.push(rel);
    } else if (action === 'conflict') {
      const orphaned = S === undefined;             // departed payload → out of management
      out.conflicts.push({
        rel,
        srcAbs: src ? src.srcAbs : undefined,
        hash: S,                                     // source hash if the file is still packaged
        tier: src ? src.tier : (priorFiles[rel] ? priorFiles[rel].tier : undefined),
        recordedHash: L,                             // trusted baseline; never replace with user bytes
        installedHash: I,
        legacyOrphaned: priorEntry && priorEntry.orphaned === true,
        orphaned
      });
    }
  }
  return out;
}

/**
 * The set of files the NEXT lock should record after applying `p`, as a
 * `{ rel: {hash, tier?, orphaned?} }` map for omp-install-lock.buildLock.
 *
 * Records everything that remains safely managed after the op: created, updated,
 * recreated, unchanged, and conflicts with a prior trusted baseline. `mode` controls
 * conflicts:
 *  - 'keep'  (install/update without --force): preserve the prior recorded hash so
 *            user bytes remain a conflict on every cycle. A conflict with no prior
 *            baseline remains unowned and is omitted from the lock.
 *  - 'force' (--force): a still-packaged conflict is promoted to the source hash
 *            (it will be overwritten by the caller); a departed conflict is
 *            pruned by the caller and dropped from the lock.
 * Prunes and drops are removed from management, so they are never recorded.
 */
function lockEntries(p, mode = 'keep') {
  const entries = {};
  for (const bucket of ['creates', 'updates', 'recreates', 'unchanged']) {
    for (const e of p[bucket]) entries[e.rel] = { hash: e.hash, tier: e.tier };
  }
  for (const c of p.conflicts) {
    if (mode === 'force') {
      if (c.orphaned) continue;                      // caller deletes it → not recorded
      entries[c.rel] = { hash: c.hash, tier: c.tier };
    } else if (c.recordedHash != null) {
      entries[c.rel] = { hash: c.recordedHash, tier: c.tier, orphaned: c.orphaned || c.legacyOrphaned || undefined };
    }
  }
  return entries;
}

module.exports = { assertDest, classify, plan, lockEntries };
