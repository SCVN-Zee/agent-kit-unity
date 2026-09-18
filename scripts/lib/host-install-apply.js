/** Guarded per-file commits, never a claim of multi-file transactionality. */
const fs = require("fs");
const path = require("path");
const { randomUUID } = require("crypto");
const {
  destination,
  inspectPath,
  unchanged,
  equalBytes,
} = require("./host-install-safety");
function removeOwned(file, identity) {
  if (!identity) return;
  try {
    const stat = fs.lstatSync(file);
    if (stat.ino === identity.ino && stat.dev === identity.dev && stat.isFile())
      fs.unlinkSync(file);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}

function atomicWrite(file, content, before) {
  inspectPath(file);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = path.join(path.dirname(file), `.aku-tmp.${randomUUID()}`);
  let fd, tempIdentity;
  try {
    const mode = before === null ? 0o644 : fs.statSync(file).mode & 0o777;
    fd = fs.openSync(temp, "wx", mode);
    tempIdentity = fs.fstatSync(fd);
    fs.writeFileSync(fd, content);
    fs.closeSync(fd);
    fd = undefined;
    unchanged(file, before);
    // Atomic no-clobber creation: a new concurrent destination must win, not be replaced.
    if (before === null) fs.linkSync(temp, file);
    else fs.renameSync(temp, file);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    // Preserve observed collisions/replacements; hostile concurrent swaps are unsupported.
    removeOwned(temp, tempIdentity);
  }
}
function applyHost(root, target, plan, { fault = () => {} } = {}) {
  const guard = destination(root, target, target.guard, true);
  inspectPath(guard);
  fs.mkdirSync(path.dirname(guard), { recursive: true });
  let fd;
  try {
    fd = fs.openSync(guard, "wx", 0o600);
  } catch (e) {
    if (e.code === "EEXIST")
      throw new Error(
        "host operation guard exists; confirm no live writer before manual recovery",
      );
    throw e;
  }
  const identity = fs.fstatSync(fd);
  const changed = [];
  try {
    fs.writeFileSync(
      fd,
      JSON.stringify({ pid: process.pid, target: target.name }) + "\n",
    );
    fs.closeSync(fd);
    fd = undefined;
    for (const [rel, before] of plan.snapshots)
      unchanged(destination(root, target, rel, true), before);
    for (const op of plan.operations) {
      const file = destination(
        root,
        target,
        op.rel,
        op.kind === "managed-section",
      );
      fault("before", op.rel);
      unchanged(file, op.before);
      if (op.after === null) fs.unlinkSync(file);
      else atomicWrite(file, op.after, op.before);
      changed.push(op.rel);
      fault("after", op.rel);
    }
    const lock = destination(root, target, target.lock, true);
    const before = plan.snapshots.get(target.lock);
    fault("before", target.lock);
    unchanged(lock, before);
    if (!equalBytes(before, plan.lockBytes)) {
      if (plan.lockBytes === null) {
        if (before !== null) fs.unlinkSync(lock);
      } else atomicWrite(lock, plan.lockBytes, before);
    }
    fault("after", target.lock);
    return changed;
  } catch (e) {
    throw new Error(
      `${e.message}; operation incomplete; changed paths: ${changed.join(", ") || "none"}. ` +
        "Committed ownership was not advanced unless the final lock write completed. Preview before retry/adoption.",
    );
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    removeOwned(guard, identity);
  }
}
module.exports = { applyHost, atomicWrite };
