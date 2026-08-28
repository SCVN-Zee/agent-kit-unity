/**
 * omp-tier-detect.js — pick the tier overlays a target repo needs.
 *
 * Unlike the OMP rules (which describe tier detection as agent behavior), the
 * installer must decide which tier rule files to physically copy into `.omp/`.
 * It reads target markers only; the branch is injectable so the logic is
 * deterministically testable without a real git checkout.
 *
 * Tiers:
 *  - supercent   : <target>/Assets/Supercent/ is a directory.
 *  - luna        : a Luna/Playworks package is present AND the target is a
 *                  playable build. playable = .omp/aku-project.json
 *                  {lunaPlayable:<bool>} when set (team-shared marker wins),
 *                  else the current branch name contains "playable".
 *  - concurrent  : .omp/aku-project.json {concurrentSessions:true}.
 *
 * Reads are guarded; a bare/borked target degrades to [] and never throws.
 */

const fs = require('fs');
const path = require('path');

function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch (_) { return false; }
}
function exists(p) {
  try { fs.statSync(p); return true; } catch (_) { return false; }
}
function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return null; }
}

function readMarker(target) {
  return readJSON(path.join(target, '.omp', 'aku-project.json')) || {};
}

function hasLunaPackage(target) {
  if (exists(path.join(target, 'luna.json'))) return true;
  if (isDir(path.join(target, 'Assets', 'Luna'))) return true;
  const manifest = readJSON(path.join(target, 'Packages', 'manifest.json'));
  const deps = manifest && manifest.dependencies;
  return !!(deps && Object.keys(deps).some((k) => /luna|playwork/i.test(k)));
}

// Resolve the current branch from .git/HEAD, following a worktree/submodule
// `.git` file one hop. null on detached HEAD or any unreadable state.
function currentBranch(target) {
  const gitPath = path.join(target, '.git');
  let stat;
  try { stat = fs.statSync(gitPath); } catch (_) { return null; }
  let headPath;
  if (stat.isDirectory()) {
    headPath = path.join(gitPath, 'HEAD');
  } else {
    let ref;
    try { ref = fs.readFileSync(gitPath, 'utf8'); } catch (_) { return null; }
    const m = ref.match(/gitdir:\s*(.+?)\s*$/m);
    if (!m) return null;
    const gitdir = path.isAbsolute(m[1]) ? m[1] : path.resolve(target, m[1]);
    headPath = path.join(gitdir, 'HEAD');
  }
  let head;
  try { head = fs.readFileSync(headPath, 'utf8'); } catch (_) { return null; }
  const b = head.match(/ref:\s*refs\/heads\/(.+?)\s*$/m);
  return b ? b[1] : null;
}

function isPlayable(target, marker, branch) {
  if (typeof marker.lunaPlayable === 'boolean') return marker.lunaPlayable;
  const b = branch !== undefined ? branch : currentBranch(target);
  return b ? /playable/i.test(b) : false;
}

/**
 * @param {string} target repo root
 * @param {{branch?: string|null}} [opts] inject a branch to bypass git reads
 * @returns {string[]} sorted detected tiers
 */
function detect(target, opts = {}) {
  const marker = readMarker(target);
  const tiers = [];
  if (isDir(path.join(target, 'Assets', 'Supercent'))) tiers.push('supercent');
  if (hasLunaPackage(target) && isPlayable(target, marker, opts.branch)) tiers.push('luna');
  if (marker.concurrentSessions === true) tiers.push('concurrent');
  return tiers.sort();
}

module.exports = { detect, hasLunaPackage, currentBranch, isPlayable };
