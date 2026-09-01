#!/usr/bin/env node
/**
 * lint-loc.cjs — fail CI if any kit code/skill file exceeds 200 LOC, with
 * documented carve-outs (CHANGELOG.md and README.md are prose, not behavior).
 *
 * Walks omp/ and scripts/. Skips node_modules and tests fixtures.
 */

const fs = require('fs');
const path = require('path');

const KIT_ROOT = path.resolve(__dirname, '..');
const ROOTS = [path.join(KIT_ROOT, 'omp'), path.join(KIT_ROOT, 'scripts')];
const EXTS = ['.md', '.cjs', '.js'];
const HARD_CAP = 200;

// Files explicitly exempted (reference data, not behavior).
const CARVE_OUTS = new Set([
  path.join(KIT_ROOT, 'CHANGELOG.md'),
  path.join(KIT_ROOT, 'README.md')
]);

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next']);

function* walk(root) {
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { continue; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (!IGNORE_DIRS.has(e.name)) stack.push(p); }
      else if (e.isFile() && EXTS.some(ext => e.name.endsWith(ext))) yield p;
    }
  }
}

function lineCount(p) {
  // A file with N lines and a trailing newline split('\n') gives N+1 entries.
  // Count newlines and add 1 only when the file does NOT end in a newline so
  // a 200-line file is not falsely flagged as 201.
  const content = fs.readFileSync(p, 'utf8');
  const newlines = (content.match(/\n/g) || []).length;
  return newlines + (content.length === 0 || content.endsWith('\n') ? 0 : 1);
}

(function main() {
  const offenders = [];
  for (const root of ROOTS) {
    for (const p of walk(root)) {
      if (CARVE_OUTS.has(p)) continue;
      const lines = lineCount(p);
      if (lines > HARD_CAP) offenders.push({ p, lines });
    }
  }
  if (offenders.length === 0) {
    console.log(`lint-loc: OK (max=${HARD_CAP}, all files within budget).`);
    process.exit(0);
  }
  console.error(`lint-loc: ${offenders.length} offender(s) over ${HARD_CAP} LOC:`);
  for (const o of offenders.sort((a, b) => b.lines - a.lines)) {
    console.error(`  ${o.lines.toString().padStart(4, ' ')}  ${o.p}`);
  }
  console.error('Modularize or add to CARVE_OUTS in scripts/lint-loc.cjs with justification.');
  process.exit(2);
})();
