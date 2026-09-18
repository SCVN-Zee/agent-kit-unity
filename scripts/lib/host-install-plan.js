/** Three-way host reconciliation, with explicit adoption of shared resources. */
const { hashBytes } = require("./omp-install-lock");
const { classify } = require("./omp-install-reconcile");
const { destination, readBytes, preflight } = require("./host-install-safety");
const {
  section,
  parseSection,
  replaceSection,
} = require("./host-startup-section");
const { record, buildHostLock, serialize } = require("./host-install-lock");

function planHost({
  root,
  target,
  files = {},
  startup,
  prior,
  raw,
  tiers = [],
  kitVersion,
  args = {},
}) {
  const uninstall = !!args.uninstall;
  const desired = uninstall ? {} : files;
  const oldFiles = prior ? prior.files : {};
  const rels = [
    ...new Set([...Object.keys(desired), ...Object.keys(oldFiles)]),
  ].sort();
  const hasStartup =
    target.name === "codex" && (!uninstall || !!prior?.startup);
  preflight(root, target, [...rels, ...(hasStartup ? ["AGENTS.md"] : [])]);
  const snapshots = new Map([[target.lock, raw]]);
  const operations = [],
    conflicts = [],
    unchanged = [],
    adopted = [];
  const nextFiles = {};
  const now = new Date().toISOString();
  function decide(rel, current, src, old, span = false) {
    const I = current === null ? undefined : hashBytes(current);
    const S = src ? src.hash : undefined;
    let action = classify(S, old?.hash, I);
    if (src && !old && current !== null) action = "conflict";
    if (action === "conflict" && args.force && src && (!span || old || I === S))
      action = I === S ? "adopt" : "update";
    if (action === "conflict") {
      conflicts.push({
        rel,
        kind: span ? "managed-section" : "file",
        reason: old ? "edited" : "unowned",
      });
      return { entry: old, after: undefined };
    }
    if (action === "prune") return { after: null };
    if (src) {
      if (action === "adopt") adopted.push(rel);
      else if (action === "unchanged") unchanged.push(rel);
      return {
        entry: record(S, old, src.tier, now),
        after: I === S ? undefined : src.content,
      };
    }
    return {};
  }
  for (const rel of rels) {
    const bytes = readBytes(destination(root, target, rel));
    snapshots.set(rel, bytes);
    const result = decide(rel, bytes, desired[rel], oldFiles[rel]);
    if (result.entry) nextFiles[rel] = result.entry;
    if (result.after !== undefined)
      operations.push({
        rel,
        kind: "file",
        before: bytes,
        after: result.after,
      });
  }
  let nextStartup;
  const issues = [];
  if (hasStartup) {
    const bytes = readBytes(destination(root, target, "AGENTS.md", true));
    snapshots.set("AGENTS.md", bytes);
    const found = parseSection(bytes);
    const content = uninstall ? null : section(startup);
    const result = decide(
      "AGENTS.md",
      found ? found.content : null,
      content ? { content, hash: hashBytes(content) } : null,
      prior?.startup,
      true,
    );
    nextStartup = result.entry;
    const next =
      result.after === undefined ? bytes : replaceSection(bytes, result.after);
    if (result.after !== undefined)
      operations.push({
        rel: "AGENTS.md",
        kind: "managed-section",
        before: bytes,
        after: next,
      });
    if (!uninstall) {
      const override = readBytes(
        destination(root, target, "AGENTS.override.md", true),
      );
      snapshots.set("AGENTS.override.md", override);
      if (override?.length)
        issues.push(
          "AGENTS.override.md masks startup; resolve it manually (whitespace is conservatively blocked)",
        );
      if (next && next.length > 32768)
        issues.push("AGENTS.md exceeds the default 32 KiB instruction budget");
    }
  }
  const nextLock = buildHostLock(
    target,
    kitVersion,
    uninstall ? prior?.tiers || [] : tiers,
    nextFiles,
    nextStartup,
    prior,
  );
  // Stamp source version only on real content/ownership/tier change, not a version-only rerun.
  if (!prior || !serialize(nextLock).equals(raw))
    nextLock.kitVersion = kitVersion;
  const lockBytes =
    uninstall && !Object.keys(nextFiles).length && !nextStartup
      ? null
      : serialize(nextLock);
  return {
    operations,
    conflicts,
    issues,
    unchanged,
    adopted,
    snapshots,
    lockBytes,
  };
}
module.exports = { planHost };
