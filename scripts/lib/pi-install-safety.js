/** Fail closed before touching any Pi payload, including prior-lock paths. */
const fs = require("fs");
const path = require("path");
const { assertDest } = require("./omp-install-reconcile");

function preflightPiPaths(root, rels) {
  const paths = new Map([[root, true]]);
  for (const rel of rels) {
    const dest = assertDest(root, rel);
    paths.set(dest, false);
    let parent = path.dirname(dest);
    while (parent !== root) {
      paths.set(parent, true);
      parent = path.dirname(parent);
    }
  }
  for (const [entry, directory] of paths) {
    let stat;
    try {
      stat = fs.lstatSync(entry);
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    if (stat.isSymbolicLink())
      throw new Error(`refusing symlink in Pi install: ${entry}`);
    if (directory ? !stat.isDirectory() : !stat.isFile()) {
      throw new Error(`unexpected file type in Pi install: ${entry}`);
    }
  }
}

function requirePiReady(plan, args) {
  if (!args.force && plan.conflicts.length) {
    throw new Error(
      "Pi install has conflicts; no files changed. Back up and resolve these files, " +
        "or explicitly use --force to replace them: " +
        plan.conflicts.map((entry) => entry.rel).join(", "),
    );
  }
}
module.exports = { preflightPiPaths, requirePiReady };
