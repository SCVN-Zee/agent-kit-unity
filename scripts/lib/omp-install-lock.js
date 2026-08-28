/**
 * omp-install-lock.js — the `.omp/aku-lock.json` install record.
 *
 * The lock maps every installer-owned file under a repo's `.omp/` to a raw-byte
 * SHA-256 (our local-source analog of skills.sh's remote skillFolderHash), plus
 * per-entry installedAt/updatedAt provenance and the selected tiers. It is the
 * only thing that lets `ship-omp` tell an untouched managed file from a
 * user-edited one, detect an upstream change, and prune what it once installed.
 *
 * Design points the red team pinned:
 *  - No root-level wall-clock field: a no-op run must reproduce a byte-identical
 *    lock. installedAt is preserved; updatedAt bumps only when a file's hash
 *    changes. `buildLock` encodes that so the caller can skip writing on a no-op.
 *  - read() never throws a bare error that bricks every command: absent → null,
 *    unparseable → CorruptLockError, forward lockVersion → LockVersionError.
 *  - Keys are validated non-empty POSIX `.omp/`-relative paths, sorted.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { writeAtomic } = require('./global-install-fs');

const LOCK_NAME = 'aku-lock.json';
const LOCK_VERSION = 1;
const KIT = 'agentkit-unity';

class CorruptLockError extends Error {
  constructor(message) { super(message); this.name = 'CorruptLockError'; }
}
class LockVersionError extends Error {
  constructor(message) { super(message); this.name = 'LockVersionError'; }
}

function lockPath(ompDir) {
  return path.join(ompDir, LOCK_NAME);
}

function hashBytes(buf) {
  return 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex');
}

// A lock key must be a real POSIX-relative path below the root: no absolute
// paths, no `.`/`..` segments, no NUL, no backslashes (the on-disk lock is
// user/VCS-writable, so a crafted key is an untrusted delete/write target).
function isSafeKey(rel) {
  if (typeof rel !== 'string' || rel === '' || rel.includes('\0')) return false;
  if (rel.includes('\\') || path.isAbsolute(rel)) return false;
  const parts = rel.split('/');
  return parts.every((p) => p !== '' && p !== '.' && p !== '..');
}

/** Parse + version-gate a lock. absent → null; malformed → typed error. */
function read(ompDir) {
  const p = lockPath(ompDir);
  let raw;
  try { raw = fs.readFileSync(p); }
  catch (_) { return null; }
  let obj;
  try { obj = JSON.parse(raw.toString('utf8')); }
  catch (e) { throw new CorruptLockError(`lock is not valid JSON: ${p} (${e.message})`); }
  if (!obj || typeof obj !== 'object' || typeof obj.lockVersion !== 'number' ||
      typeof obj.files !== 'object' || obj.files === null) {
    throw new CorruptLockError(`lock shape is invalid: ${p}`);
  }
  if (obj.lockVersion > LOCK_VERSION) {
    throw new LockVersionError(
      `lock was written by a newer installer (lockVersion ${obj.lockVersion} > ${LOCK_VERSION}): ${p}`);
  }
  for (const key of Object.keys(obj.files)) {
    if (!isSafeKey(key)) throw new CorruptLockError(`lock contains an unsafe path key: ${JSON.stringify(key)}`);
  }
  return obj;
}

// Stable serialization: fixed top-level order, sorted tiers, sorted file keys,
// fixed per-entry key order. Two locks with the same content serialize
// byte-for-byte identically regardless of insertion order.
function serialize(lock) {
  const files = {};
  for (const key of Object.keys(lock.files).sort()) {
    const e = lock.files[key];
    const entry = { hash: e.hash };
    if (e.tier) entry.tier = e.tier;
    if (e.orphaned) entry.orphaned = true;
    entry.installedAt = e.installedAt;
    entry.updatedAt = e.updatedAt;
    files[key] = entry;
  }
  const out = {
    lockVersion: LOCK_VERSION,
    kit: lock.kit || KIT,
    kitVersion: lock.kitVersion,
    tiers: [...(lock.tiers || [])].sort(),
    files
  };
  return JSON.stringify(out, null, 2) + '\n';
}

function write(ompDir, lock) {
  writeAtomic(lockPath(ompDir), Buffer.from(serialize(lock), 'utf8'));
}

/**
 * Assemble the next lock from a prior lock + the files it should now record.
 *
 * `entries` is `{ rel: { hash, tier?, orphaned? } }`. installedAt is carried
 * forward from the prior entry (or set to `now` on first record); updatedAt is
 * carried forward when the hash is unchanged and set to `now` only when it
 * changes — so a no-op run produces a byte-identical lock and a committed lock
 * never churns in CI.
 */
function buildLock({ kitVersion, tiers, entries, prior, now }) {
  const prevFiles = (prior && prior.files) || {};
  const files = {};
  for (const [rel, e] of Object.entries(entries)) {
    if (!isSafeKey(rel)) throw new Error(`refusing unsafe lock key: ${JSON.stringify(rel)}`);
    const prev = prevFiles[rel];
    const installedAt = prev ? prev.installedAt : now;
    const updatedAt = prev && prev.hash === e.hash ? prev.updatedAt : now;
    files[rel] = { hash: e.hash, installedAt, updatedAt };
    if (e.tier) files[rel].tier = e.tier;
    if (e.orphaned) files[rel].orphaned = true;
  }
  return { lockVersion: LOCK_VERSION, kit: KIT, kitVersion, tiers: [...(tiers || [])], files };
}

module.exports = {
  LOCK_NAME, LOCK_VERSION, KIT, CorruptLockError, LockVersionError,
  lockPath, hashBytes, isSafeKey, read, write, serialize, buildLock
};
