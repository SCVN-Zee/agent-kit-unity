/** CLI lifecycle execution and reporting. */
const lock = require("./omp-install-lock");
const reconcile = require("./omp-install-reconcile");
const apply = require("./omp-install-apply");

function report(label, items) {
  for (const it of items)
    console.log(`  ${label} ${typeof it === "string" ? it : it.rel}`);
}

function printPlan(plan) {
  report("+ create", plan.creates);
  report("~ update", plan.updates);
  report("^ recreate", plan.recreates);
  report("- prune", plan.prunes);
  report("x drop", plan.drops);
  report("! conflict", plan.conflicts);
}

function runCheck(plan, tiers, args) {
  const inSync =
    !plan.creates.length &&
    !plan.updates.length &&
    !plan.recreates.length &&
    !plan.prunes.length &&
    !plan.drops.length &&
    !plan.conflicts.length;
  if (args.json) console.log(JSON.stringify({ inSync, tiers, plan }, null, 2));
  else if (inSync) console.log("ship-omp --check: OK (in sync).");
  else {
    console.log("ship-omp --check: OUT OF SYNC");
    printPlan(plan);
  }
  process.exit(inSync ? 0 : 2);
}

function runInstall(ompDir, plan, tiers, kitVersion, prior, args) {
  const sum = apply.applyPlan(ompDir, plan, { force: args.force });
  const entries = reconcile.lockEntries(plan, args.force ? "force" : "keep");
  const next = lock.buildLock({
    kitVersion,
    tiers,
    entries,
    prior,
    now: new Date().toISOString(),
  });
  const nextStr = lock.serialize(next);
  const priorStr = prior ? lock.serialize(prior) : null;
  const mutated =
    sum.created.length ||
    sum.updated.length ||
    sum.recreated.length ||
    sum.pruned.length ||
    nextStr !== priorStr;
  if (mutated) lock.write(ompDir, next);
  if (args.json) {
    console.log(
      JSON.stringify({ tiers, summary: sum, wroteLock: !!mutated }, null, 2),
    );
    process.exit(0);
  }
  console.log(
    `ship-omp: ${sum.created.length} created, ${sum.updated.length} updated, ` +
      `${sum.recreated.length} recreated, ${sum.pruned.length} pruned` +
      (sum.conflicts.length
        ? `, ${sum.conflicts.length} conflict(s) kept (use --force to overwrite)`
        : "") +
      (mutated ? "" : " (no changes; lock untouched)") +
      `. tiers: [${tiers.join(", ")}]`,
  );
  if (sum.conflicts.length) report("! conflict", sum.conflicts);
  if (sum.kept.length) report("~ kept (drifted, not deleted)", sum.kept);
  process.exit(0);
}

function runUninstall(ompDir, prior, args) {
  if (!prior) {
    console.log("ship-omp --uninstall: no lock found; nothing to remove.");
    process.exit(0);
  }
  if (args.dryRun) {
    const sum = apply.uninstall(ompDir, prior, lock.LOCK_NAME, {
      force: args.force,
      dryRun: true,
    });
    console.log("ship-omp --uninstall (dry-run):");
    report("- would remove", sum.removed);
    report("~ would keep (protected/drifted)", sum.kept);
    report("x already absent", sum.absent);
    process.exit(0);
  }
  const sum = apply.uninstall(ompDir, prior, lock.LOCK_NAME, {
    force: args.force,
  });
  if (args.json) {
    console.log(JSON.stringify(sum, null, 2));
    process.exit(0);
  }
  console.log(
    `ship-omp --uninstall: removed ${sum.removed.length} file(s) + lock` +
      (sum.kept.length
        ? `; kept ${sum.kept.length} protected/drifted file(s)`
        : "") +
      ".",
  );
  if (sum.kept.length) report("~ kept (protected/drifted)", sum.kept);
  process.exit(0);
}

module.exports = { printPlan, runCheck, runInstall, runUninstall };
