/**
 * path-safety.js — containment guards for installer file operations.
 *
 * `assertSafePath` is what stands between a crafted lock entry and a
 * deletion outside the target `.omp/`, a directory the kit shares with the
 * user's own files.
 */

const fs = require('fs');
const path = require('path');

// Prefix-startswith on resolved paths is unsafe — `/foo/kit-evil/x`
// "starts with" `/foo/kit`. Use path.relative and reject if it escapes.
//
// Note the `rel === ''` case: a path equal to the root counts as within it.
// Callers that delete must additionally require the target to be strictly
// below the root, or a manifest entry of `.` resolves to the root itself.
function isWithin(parent, child) {
  const rel = path.relative(parent, path.resolve(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

function assertSafePath(p, root) {
  if (typeof p !== 'string' || p.includes('\0')) throw new Error('Bad path');
  if (!isWithin(root, p)) {
    throw new Error(`Refusing to operate outside root: ${p}`);
  }
}

/**
 * Refuse to install into a symlinked root.
 *
 * The containment guard above is purely lexical, so a root that is itself a
 * symlink passes every check while writes and recursive deletes go straight
 * through it to wherever it points. Absent → fine: it gets created as a real dir.
 */
function assertRootNotSymlink(root) {
  let stat;
  try { stat = fs.lstatSync(root); } catch (_) { return; }
  if (stat.isSymbolicLink()) {
    throw new Error(`refusing: install root is a symlink and may redirect writes outside it — ${root}`);
  }
}

module.exports = { assertSafePath, isWithin, assertRootNotSymlink };
