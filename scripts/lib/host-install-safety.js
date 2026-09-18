/** Explicit destination mapping and fail-closed filesystem reads. */
const fs = require("fs");
const path = require("path");
const { ownsFile } = require("./host-targets");

function destination(root, target, rel, control = false) {
  const controls = [target.lock, target.guard];
  if (target.name === "codex") controls.push("AGENTS.md", "AGENTS.override.md");
  if (!(ownsFile(target, rel) || (control && controls.includes(rel))))
    throw new Error(`unsafe ${target.name} ownership path: ${rel}`);
  return path.join(root, rel);
}
function inspectPath(file, directory = false) {
  const chain = [];
  let parent = path.dirname(file);
  while (true) {
    chain.push(parent);
    if (parent === path.dirname(parent)) break;
    parent = path.dirname(parent);
  }
  for (const item of [...chain.reverse(), file]) {
    let stat;
    try {
      stat = fs.lstatSync(item);
    } catch (e) {
      if (e.code === "ENOENT") continue;
      throw e;
    }
    if (stat.isSymbolicLink()) throw new Error(`refusing symlink: ${item}`);
    const dir = item !== file || directory;
    if (dir ? !stat.isDirectory() : !stat.isFile())
      throw new Error(`unexpected file type: ${item}`);
  }
}
function readBytes(file) {
  inspectPath(file);
  try {
    return fs.readFileSync(file);
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
function preflight(root, target, rels) {
  inspectPath(root, true);
  for (const rel of new Set([...rels, target.lock, target.guard]))
    inspectPath(destination(root, target, rel, true));
}
function equalBytes(a, b) {
  return a === null || b === null ? a === b : a.equals(b);
}
function unchanged(file, expected) {
  if (!equalBytes(readBytes(file), expected))
    throw new Error(
      `file changed during operation; retry without concurrent edits: ${file}`,
    );
}
module.exports = {
  destination,
  inspectPath,
  readBytes,
  preflight,
  equalBytes,
  unchanged,
};
