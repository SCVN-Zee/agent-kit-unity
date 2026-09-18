/** Strict new-host manifest. Legacy OMP/Pi lock formats are never reinterpreted. */
const { ownsFile } = require("./host-targets");
const { readBytes, destination } = require("./host-install-safety");
const HASH = /^sha256:[a-f0-9]{64}$/;
const object = (x) => x !== null && typeof x === "object" && !Array.isArray(x);
function validateEntry(e) {
  if (
    !object(e) ||
    typeof e.hash !== "string" ||
    !HASH.test(e.hash) ||
    typeof e.installedAt !== "string" ||
    typeof e.updatedAt !== "string" ||
    (e.tier !== undefined && !["luna", "supercent"].includes(e.tier))
  )
    throw new Error("invalid host lock entry");
}
function readHostLock(root, target) {
  const raw = readBytes(destination(root, target, target.lock, true));
  if (!raw) return { raw: null, prior: null };
  let prior;
  try {
    prior = JSON.parse(raw.toString("utf8"));
  } catch (_) {
    throw new Error("corrupt host lock; restore or resolve manually");
  }
  if (
    !object(prior) ||
    prior.lockVersion !== 1 ||
    prior.kit !== "agent-kit-unity" ||
    prior.target !== target.name ||
    prior.scope !== "repository" ||
    !object(prior.files) ||
    !Array.isArray(prior.tiers) ||
    prior.tiers.some((t) => !["luna", "supercent"].includes(t)) ||
    typeof prior.kitVersion !== "string"
  )
    throw new Error("invalid, wrong-target, or unsupported host lock");
  for (const [rel, e] of Object.entries(prior.files)) {
    if (!ownsFile(target, rel))
      throw new Error(`unsafe host lock path: ${rel}`);
    validateEntry(e);
  }
  if (prior.startup !== undefined) {
    if (
      target.name !== "codex" ||
      !object(prior.startup) ||
      prior.startup.path !== "AGENTS.md" ||
      prior.startup.kind !== "managed-section"
    )
      throw new Error("invalid host startup record");
    validateEntry(prior.startup);
  }
  return { raw, prior };
}
function record(hash, old, tier, now) {
  return {
    hash,
    ...(tier ? { tier } : {}),
    installedAt: old ? old.installedAt : now,
    updatedAt: old && old.hash === hash ? old.updatedAt : now,
  };
}
function buildHostLock(target, kitVersion, tiers, files, startup, prior) {
  return {
    lockVersion: 1,
    kit: "agent-kit-unity",
    target: target.name,
    scope: "repository",
    // Version alone is provenance, not a reason to rewrite an otherwise unchanged lock.
    kitVersion: prior ? prior.kitVersion : kitVersion,
    tiers: [...tiers].sort(),
    files: Object.fromEntries(
      Object.keys(files)
        .sort()
        .map((k) => [k, files[k]]),
    ),
    ...(startup
      ? { startup: { path: "AGENTS.md", kind: "managed-section", ...startup } }
      : {}),
  };
}
const serialize = (value) => Buffer.from(JSON.stringify(value, null, 2) + "\n");
module.exports = { readHostLock, record, buildHostLock, serialize };
