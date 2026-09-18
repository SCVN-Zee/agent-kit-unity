const fs = require("fs");
const os = require("os");
const path = require("path");
const { hostTarget } = require("../../lib/host-targets");
const { hashBytes } = require("../../lib/omp-install-lock");
const { readHostLock } = require("../../lib/host-install-lock");
const { planHost } = require("../../lib/host-install-plan");
const { applyHost } = require("../../lib/host-install-apply");
function fixture(name = "codex") {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "aku-host-")),
  );
  const target = hostTarget(name);
  return {
    root,
    target,
    files: payload(target),
    startup: name === "codex" ? Buffer.from("Guide\n") : null,
    kitVersion: "1.0.0",
    tiers: [],
  };
}
function payload(target, text = "skill") {
  const content = Buffer.from(text);
  return {
    [`${target.skills}/aku-example/SKILL.md`]: {
      content,
      hash: hashBytes(content),
    },
  };
}
function prepare(f, args = {}) {
  return planHost({ ...f, ...readHostLock(f.root, f.target), args });
}
function apply(f, args = {}, options = {}) {
  const plan = prepare(f, args);
  if (!args.uninstall && (plan.conflicts.length || plan.issues.length))
    throw new Error("blocked conflicts");
  applyHost(f.root, f.target, plan, options);
  return plan;
}
function put(f, rel, bytes) {
  const dest = path.join(f.root, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, bytes);
}
function snapshot(root) {
  const out = {};
  for (const rel of fs.readdirSync(root, { recursive: true })) {
    const p = path.join(root, rel);
    if (fs.lstatSync(p).isFile())
      out[rel] = fs.readFileSync(p).toString("base64");
  }
  return out;
}
function cleanup(f) {
  fs.rmSync(f.root, { recursive: true, force: true });
}
module.exports = { fixture, payload, prepare, apply, put, snapshot, cleanup };
