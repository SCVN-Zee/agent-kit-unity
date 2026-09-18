#!/usr/bin/env node
/**
 * ship-kit.cjs — install / verify / update / uninstall the shared kit into a
 * repo's `.omp/`, tracking a checksum lock (`.omp/aku-lock.json`).
 *
 * Runs as `aku-ship-kit`, `node scripts/ship-kit.cjs`, or the legacy ship-omp alias
 * from a checkout: the packaged `kit/` is resolved from this module's package
 * root, so both find the same source. Target defaults to cwd or the first arg.
 *
 * Exit codes (matching the repo's --check convention):
 *   0 ok / in sync   1 fatal (bad flags, corrupt/forward lock)   2 --check drift/update
 */

const {
  printPlan,
  runCheck,
  runInstall,
  runUninstall,
} = require("./lib/ship-kit-actions");
const path = require("path");
const { assertRootNotSymlink } = require("./lib/path-safety");
const lock = require("./lib/omp-install-lock");
const { computePayload, availableTiers } = require("./lib/omp-install-payload");
const reconcile = require("./lib/omp-install-reconcile");
const apply = require("./lib/omp-install-apply");
const { detect } = require("./lib/omp-tier-detect");
const { projectPiPayload } = require("./lib/pi-install-payload");
const { preflightPiPaths, requirePiReady } = require("./lib/pi-install-safety");
const { runHost } = require("./lib/host-install-actions");

const PKG_ROOT = path.resolve(__dirname, "..");
const KIT_OMP = path.join(PKG_ROOT, "kit");

function parseArgs(argv) {
  const a = { positionals: [], tier: [], noTier: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--target") {
      if (a.target) throw new Error("--target may be supplied only once");
      a.target = argv[++i];
      if (!["pi", "omp", "codex", "claude"].includes(a.target))
        throw new Error("--target requires omp, pi, codex, or claude");
    } else if (t === "--check") a.check = true;
    else if (t === "--update") a.update = true;
    else if (t === "--uninstall") a.uninstall = true;
    else if (t === "--dry-run") a.dryRun = true;
    else if (t === "--force") a.force = true;
    else if (t === "--json") a.json = true;
    else if (t === "-h" || t === "--help") a.help = true;
    else if (t === "--tier")
      a.tier.push(...(argv[++i] || "").split(",").filter(Boolean));
    else if (t === "--no-tier")
      a.noTier.push(...(argv[++i] || "").split(",").filter(Boolean));
    else if (t.startsWith("-")) throw new Error(`unknown flag: ${t}`);
    else a.positionals.push(t);
  }
  const modes = [a.check, a.update, a.uninstall].filter(Boolean).length;
  if (modes > 1)
    throw new Error("choose at most one of --check / --update / --uninstall");
  a.target ||= "omp";
  if (a.positionals.length > 1)
    throw new Error("expected at most one repository path");
  return a;
}

const HELP = `ship-kit — install the Unity kit into a project's native host paths

Usage: ship-kit [repo] [--target omp|pi|codex|claude] [--check|--update|--uninstall] [--dry-run] [--force]
                [--tier a,b] [--no-tier a,b] [--json]

  --target     omp, pi, codex, or claude (default omp); independent install + lock
  (no mode)     install/refresh base + auto-detected tiers, write the lock
  --check       report drift + available updates; exit 2 if not in sync
  --update      apply upstream changes, recreate deleted managed files, prune
                departed tier files; keep user-edited files unless --force
  --uninstall   remove integrity-gated paths + lock; preserve orphan-marked
                entries unless --force explicitly accepts their baseline
                Codex/Claude retain edited-entry records and exit 2 if incomplete
  --dry-run     print the plan; write nothing
  --tier/--no-tier  add/remove tiers after auto-detection`;

function resolveTiers(target, args) {
  const valid = availableTiers(KIT_OMP);
  for (const t of [...args.tier, ...args.noTier]) {
    if (!valid.includes(t))
      throw new Error(
        `unknown tier '${t}' (available: ${valid.join(", ") || "none"})`,
      );
  }
  const set = new Set(detect(target, { target: args.target }));
  for (const t of args.tier) set.add(t);
  for (const t of args.noTier) set.delete(t);
  return [...set].sort();
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`ship-omp: ${e.message}\n`);
    process.exit(1);
  }
  if (args.help) {
    process.stdout.write(HELP + "\n");
    process.exit(0);
  }

  const target = path.resolve(args.positionals[0] || process.cwd());
  const ompDir = path.join(target, "." + args.target);
  const isPi = args.target === "pi";
  try {
    assertRootNotSymlink(ompDir);
  } catch (e) {
    process.stderr.write(`ship-omp: ${e.message}\n`);
    process.exit(1);
  }

  const kitVersion = require(path.join(PKG_ROOT, "package.json")).version;
  if (["codex", "claude"].includes(args.target)) {
    const tiers = args.uninstall ? [] : resolveTiers(target, args);
    const source = args.uninstall ? null : computePayload(KIT_OMP, tiers);
    return runHost(target, source, tiers, kitVersion, args);
  }
  let tiers;
  try {
    tiers = resolveTiers(target, args);
  } catch (e) {
    process.stderr.write(`ship-omp: ${e.message}\n`);
    process.exit(1);
  }
  const source = computePayload(KIT_OMP, tiers);
  const payload = isPi ? projectPiPayload(source) : source;
  if (isPi) preflightPiPaths(ompDir, [lock.LOCK_NAME]);

  let prior;
  try {
    prior = lock.read(ompDir);
  } catch (e) {
    if (args.force && e instanceof lock.CorruptLockError) prior = null;
    else {
      process.stderr.write(`ship-omp: ${e.message}\n`);
      process.exit(1);
    }
  }

  const rels = new Set([
    ...Object.keys(payload),
    ...Object.keys((prior && prior.files) || {}),
  ]);
  if (isPi) preflightPiPaths(ompDir, [...rels, lock.LOCK_NAME]);
  const installed = apply.hashInstalled(ompDir, rels);
  const plan = reconcile.plan({ payload, installed, prior, ompDir });

  if (args.uninstall) return runUninstall(ompDir, prior, args);
  if (args.check) return runCheck(plan, tiers, args);
  if (args.dryRun) {
    if (args.json)
      console.log(JSON.stringify({ target, tiers, plan }, null, 2));
    else {
      console.log(
        `ship-omp (dry-run): target ${target}, tiers [${tiers.join(", ")}]`,
      );
      printPlan(plan);
    }
    process.exit(0);
  }
  if (isPi) {
    requirePiReady(plan, args);
    console.error(
      "Pi: launch from the project root and trust the project, then restart or /reload. " +
        ".pi/APPEND_SYSTEM.md takes precedence over your global APPEND_SYSTEM.md.",
    );
  }
  return runInstall(ompDir, plan, tiers, kitVersion, prior, args);
}

try {
  main();
} catch (error) {
  console.error(`ship-kit: ${error.message}`);
  process.exitCode = 1;
}
