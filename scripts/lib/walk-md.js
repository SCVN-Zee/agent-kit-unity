/**
 * walk-md.js — recursively yield markdown files under a root.
 *
 * Skips node_modules, .git, dist, build by default.
 *
 * Usage:
 *   for (const { path, content } of walkMd(rootDir)) { ... }
 *   walkMd(rootDir, { extensions: ['.md', '.markdown'] })
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_IGNORES = new Set(['node_modules', '.git', 'dist', 'build', '.next', '.cache']);

function* walkMd(rootDir, opts = {}) {
  const exts = opts.extensions || ['.md'];
  const ignores = opts.ignores || DEFAULT_IGNORES;
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { continue; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!ignores.has(e.name)) stack.push(p);
      } else if (e.isFile() && exts.some(ext => e.name.endsWith(ext))) {
        let content = '';
        try { content = fs.readFileSync(p, 'utf8'); } catch (_) { /* skip unreadable */ continue; }
        yield { path: p, content };
      }
    }
  }
}

module.exports = { walkMd };
