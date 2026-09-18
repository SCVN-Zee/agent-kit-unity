/** New-host lifecycle coordinator; legacy OMP/Pi execution stays independent. */
const { hostTarget } = require("./host-targets");
const { readHostLock } = require("./host-install-lock");
const { projectHostPayload } = require("./host-install-payload");
const { planHost } = require("./host-install-plan");
const { applyHost } = require("./host-install-apply");
const {
  equalBytes,
  readBytes,
  destination,
  preflight,
} = require("./host-install-safety");

function runHost(root, source, tiers, kitVersion, args) {
  const target = hostTarget(args.target);
  preflight(root, target, []);
  const { raw, prior } = readHostLock(root, target);
  function output(result) {
    if (args.json)
      console.log(JSON.stringify({ target: target.name, ...result }, null, 2));
    else {
      console.log(`ship-kit (${target.name}): ${result.status}`);
      for (const op of result.operations || [])
        console.log(`  ${op.action} ${op.rel} (${op.kind})`);
      for (const c of result.conflicts || [])
        console.log(`  conflict ${c.rel}: ${c.reason}`);
      for (const issue of result.issues || []) console.log(`  ${issue}`);
    }
  }
  if (args.uninstall && !prior) {
    output({ status: "no lock; nothing to remove" });
    return;
  }
  const payload = args.uninstall ? {} : projectHostPayload(source, target.name);
  const plan = planHost({
    root,
    target,
    ...payload,
    prior,
    raw,
    tiers,
    kitVersion,
    args,
  });
  const report = {
    operations: plan.operations.map((o) => ({
      rel: o.rel,
      kind: o.kind,
      action:
        o.after === null ? "remove" : o.before === null ? "create" : "update",
    })),
    conflicts: plan.conflicts,
    issues: plan.issues,
    adopted: plan.adopted,
    lockChange: !equalBytes(raw, plan.lockBytes),
    wroteLock: false,
  };
  const drift =
    report.operations.length ||
    report.conflicts.length ||
    report.issues.length ||
    report.lockChange;
  if (args.check) {
    output({
      ...report,
      status: drift ? "out of sync" : "in sync",
      inSync: !drift,
    });
    process.exitCode = drift ? 2 : 0;
    return;
  }
  if (args.dryRun) {
    output({
      ...report,
      status: "dry-run; no files changed",
      wroteLock: false,
    });
    return;
  }
  if (!args.uninstall && (plan.conflicts.length || plan.issues.length)) {
    output({
      ...report,
      wroteLock: false,
      status: "blocked; no files changed",
    });
    process.exitCode = 1;
    return;
  }
  if (readBytes(destination(root, target, target.guard, true)) !== null)
    throw new Error(
      "host operation guard exists; confirm no live writer before manual recovery",
    );
  if (report.operations.length || report.lockChange)
    applyHost(root, target, plan);
  report.wroteLock = report.lockChange;
  output({
    ...report,
    status: args.uninstall
      ? plan.conflicts.length
        ? "incomplete removal; edited entries preserved"
        : "uninstalled"
      : drift
        ? "installed"
        : "unchanged",
  });
  process.exitCode = args.uninstall && plan.conflicts.length ? 2 : 0;
  if (!args.uninstall)
    console.error(
      `${target.name}: restart a trusted project session; ` +
        "startup/resource loading depends on host configuration. No MCP server or global config was installed.",
    );
}
module.exports = { runHost };
