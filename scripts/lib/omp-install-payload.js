/**
 * omp-install-payload.js — enumerate the packaged `omp/` kit into the set of
 * files a `.omp/` install should contain, each with a raw-byte SHA-256.
 *
 * Byte-oriented on purpose (RT-S6/F7/A2): it does NOT reuse walk-md.js, which
 * filters to `.md` and decodes UTF-8. Skill folders can carry non-`.md` payload,
 * such as `skills/aku-luna-build-check/scripts/luna-build-settings.cjs`; every
 * file must be tracked and drift-checked. We hash raw Buffers so a one-byte change in any
 * file, text or binary, is detected.
 *
 * Base payload = AGENTS.md, rules/* (incl. the always-apply aku-engine-rules.md), and
 * the full skills/** tree.
 * The kit's own omp/README.md and omp/tiers/ are deliberately excluded from the
 * base set (README is not installed; tiers are overlaid explicitly per tier).
 */

const fs = require('fs');
const path = require('path');
const { hashBytes } = require('./omp-install-lock');

const NOISE = new Set(['.DS_Store', '.git', 'node_modules']);

// Recursively yield absolute paths of every real file under `dir`, skipping
// editor/VCS noise. Symlinks are not followed (lstat).
function* walkFiles(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (_) { return; }
  for (const e of entries) {
    if (NOISE.has(e.name)) continue;
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) { yield* walkFiles(abs); }
    else if (e.isFile()) { yield abs; }
  }
}

function toRel(kitOmpDir, abs) {
  return path.relative(kitOmpDir, abs).split(path.sep).join('/');
}

function hashFile(abs) {
  return hashBytes(fs.readFileSync(abs));
}

/** Base (tier-independent) files: AGENTS.md, rules/*, skills/**. */
function baseFiles(kitOmpDir) {
  const out = {};
  const agents = path.join(kitOmpDir, 'AGENTS.md');
  if (fs.existsSync(agents) && fs.statSync(agents).isFile()) {
    out['AGENTS.md'] = { srcAbs: agents, hash: hashFile(agents) };
  }
  for (const root of ['rules', 'skills']) {
    for (const abs of walkFiles(path.join(kitOmpDir, root))) {
      out[toRel(kitOmpDir, abs)] = { srcAbs: abs, hash: hashFile(abs) };
    }
  }
  return out;
}

/** Tier overlay: omp/tiers/<tier>/rules/* → dest rules/<name>, tagged {tier}. */
function tierFiles(kitOmpDir, tier) {
  const out = {};
  const dir = path.join(kitOmpDir, 'tiers', tier, 'rules');
  for (const abs of walkFiles(dir)) {
    const dest = 'rules/' + path.basename(abs);
    out[dest] = { srcAbs: abs, hash: hashFile(abs), tier };
  }
  return out;
}

/**
 * Full payload = base ∪ selected tiers, keyed by install-relative dest.
 * A tier rule whose dest collides with a base file or another tier is a
 * packaging error — throw loud rather than let one silently shadow the other.
 */
function computePayload(kitOmpDir, tiers = []) {
  const payload = baseFiles(kitOmpDir);
  for (const tier of tiers) {
    const tf = tierFiles(kitOmpDir, tier);
    for (const [dest, meta] of Object.entries(tf)) {
      if (payload[dest]) {
        throw new Error(`payload dest collision at ${dest}: tier ${tier} vs ${payload[dest].tier || 'base'}`);
      }
      payload[dest] = meta;
    }
  }
  return payload;
}

module.exports = { walkFiles, baseFiles, tierFiles, computePayload, hashFile };
