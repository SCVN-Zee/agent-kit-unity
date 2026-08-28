/**
 * global-install-fs.js — atomic filesystem primitives for kit installers.
 *
 * Shared by the OMP installer (`ship-omp.cjs`). Every operation writes inside a
 * target directory a repo shares with the user's own files, so callers must have
 * resolved and containment-guarded each dest first (see path-safety.js and the
 * installer's assertDest). All writes materialise beside the target and rename
 * into place, so an interrupted run never leaves a half-written entry.
 */

const fs = require('fs');
const path = require('path');

const TMP_PREFIX = '.aku-tmp.';

/**
 * Remove one target. Never recurse *through* a symlink: lstat first, and unlink
 * a link rather than following it out of the target `.omp/`. fs.rmSync unlinks symlinks
 * it meets while recursing rather than dereferencing them.
 */
function removeTarget(dest) {
  let st;
  try { st = fs.lstatSync(dest); } catch (_) { return false; }
  if (st.isSymbolicLink() || !st.isDirectory()) fs.unlinkSync(dest);
  else fs.rmSync(dest, { recursive: true, force: true });
  return true;
}

// Dot-prefixed and *beside* the target rather than suffixed onto it: a crashed
// run leaves `skills/.aku-tmp.123.aku-scene/`, which no skill scanner picks up,
// where `skills/aku-scene.aku-tmp.123/` would look like a second aku-* skill.
function tmpFor(dest) {
  return path.join(path.dirname(dest), `${TMP_PREFIX}${process.pid}.${path.basename(dest)}`);
}

// Materialise beside the target, then swap. An interrupted copy leaves the
// previous install untouched rather than a half-written directory.
function copyEntry({ src, dest, kind }) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = tmpFor(dest);
  fs.rmSync(tmp, { recursive: true, force: true });
  if (kind === 'dir') fs.cpSync(src, tmp, { recursive: true, dereference: false });
  else fs.copyFileSync(src, tmp);
  removeTarget(dest);
  fs.renameSync(tmp, dest);
}

// Write a Buffer (or string) to `dest` atomically: materialise a sibling tmp,
// fsync-free rename over the target. The lock writer and any single-file
// installer output reuse this instead of a raw writeFileSync, so a crash mid-
// write never leaves a truncated file where a valid one used to be.
function writeAtomic(dest, buf) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const tmp = tmpFor(dest);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, dest);
}

module.exports = { TMP_PREFIX, removeTarget, tmpFor, copyEntry, writeAtomic };
