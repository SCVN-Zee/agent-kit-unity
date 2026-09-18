/** Remove empty ancestor directories without removing the install root. */
const fs = require("fs");
const path = require("path");
const { assertDest } = require("./omp-install-reconcile");

function sweepEmptyDirs(ompDir, rels) {
  const root = path.resolve(ompDir);
  const dirs = new Set();
  for (const rel of rels) {
    let d = path.dirname(rel);
    while (d && d !== "." && d !== "/") {
      dirs.add(d);
      d = path.dirname(d);
    }
  }
  for (const rel of [...dirs].sort((a, b) => b.length - a.length)) {
    const abs = path.resolve(root, rel);
    if (abs === root) continue;
    try {
      assertDest(ompDir, rel);
    } catch (_) {
      continue;
    }
    try {
      if (fs.readdirSync(abs).length === 0) fs.rmdirSync(abs);
    } catch (_) {
      /* non-empty or gone */
    }
  }
}

module.exports = { sweepEmptyDirs };
