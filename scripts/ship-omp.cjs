#!/usr/bin/env node
/**
 * ship-omp.cjs — install / verify / update / uninstall the OMP kit into a
 * repo's `.omp/`, tracking a checksum lock (`.omp/aku-lock.json`).
 *
 * Runs both as the global `aku-ship-omp` bin and as `node scripts/ship-omp.cjs`
 * from a checkout: the packaged `omp/` is resolved from this module's package
 * root, so both find the same source. Target defaults to cwd or the first arg.
 *
 * Exit codes (matching the repo's --check convention):
 *   0 ok / in sync   1 fatal (bad flags, corrupt/forward lock)   2 --check drift/update
 */

const fs = require('fs');
const path = require('path');
const { assertRootNotSymlink } = require('./lib/path-safety');
const lock = require('./lib/omp-install-lock');
const { computePayload, availableTiers } = require('./lib/omp-install-payload');
const reconcile = require('./lib/omp-install-reconcile');
const apply = require('./lib/omp-install-apply');
const { detect } = require('./lib/omp-tier-detect');

const PKG_ROOT = path.resolve(__dirname, '..');
const KIT_OMP = path.join(PKG_ROOT, 'omp');

function parseArgs(argv) {
  const a = { positionals: [], tier: [], noTier: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--check') a.check = true;
    else if (t === '--update') a.update = true;
    else if (t === '--uninstall') a.uninstall = true;
    else if (t === '--dry-run') a.dryRun = true;
    else if (t === '--force') a.force = true;
    else if (t === '--json') a.json = true;
    else if (t === '-h' || t === '--help') a.help = true;
    else if (t === '--tier') a.tier.push(...(argv[++i] || '').split(',').filter(Boolean));
    else if (t === '--no-tier') a.noTier.push(...(argv[++i] || '').split(',').filter(Boolean));
    else if (t.startsWith('-')) throw new Error(`unknown flag: ${t}`);
    else a.positionals.push(t);
  }
  const modes = [a.check, a.update, a.uninstall].filter(Boolean).length;
  if (modes > 1) throw new Error('choose at most one of --check / --update / --uninstall');
  return a;
}

const HELP = `ship-omp — install the agent-kit-unity OMP kit into a repo's .omp/

Usage: ship-omp [target] [--check|--update|--uninstall] [--dry-run] [--force]
                [--tier a,b] [--no-tier a,b] [--json]

  (no mode)     install/refresh base + auto-detected tiers, write the lock
  --check       report drift + available updates; exit 2 if not in sync
  --update      apply upstream changes, recreate deleted managed files, prune
                departed tier files; keep user-edited files unless --force
  --uninstall   remove integrity-gated paths + lock; preserve orphan-marked
                entries unless --force explicitly accepts their baseline
  --dry-run     print the plan; write nothing
  --tier/--no-tier  add/remove tiers after auto-detection`;

function resolveTiers(target, args) {
  const valid = availableTiers(KIT_OMP);
  for (const t of [...args.tier, ...args.noTier]) {
    if (!valid.includes(t)) throw new Error(`unknown tier '${t}' (available: ${valid.join(', ') || 'none'})`);
  }
  const set = new Set(detect(target));
  for (const t of args.tier) set.add(t);
  for (const t of args.noTier) set.delete(t);
  return [...set].sort();
}

function report(label, items) {
  for (const it of items) console.log(`  ${label} ${typeof it === 'string' ? it : it.rel}`);
}

function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); }
  catch (e) { process.stderr.write(`ship-omp: ${e.message}\n`); process.exit(1); }
  if (args.help) { process.stdout.write(HELP + '\n'); process.exit(0); }

  const target = path.resolve(args.positionals[0] || process.cwd());
  const ompDir = path.join(target, '.omp');
  try { assertRootNotSymlink(ompDir); }
  catch (e) { process.stderr.write(`ship-omp: ${e.message}\n`); process.exit(1); }

  const kitVersion = require(path.join(PKG_ROOT, 'package.json')).version;
  let tiers;
  try { tiers = resolveTiers(target, args); }
  catch (e) { process.stderr.write(`ship-omp: ${e.message}\n`); process.exit(1); }
  const payload = computePayload(KIT_OMP, tiers);

  let prior;
  try { prior = lock.read(ompDir); }
  catch (e) {
    if (args.force && e instanceof lock.CorruptLockError) prior = null;
    else { process.stderr.write(`ship-omp: ${e.message}\n`); process.exit(1); }
  }

  const rels = new Set([...Object.keys(payload), ...Object.keys((prior && prior.files) || {})]);
  const installed = apply.hashInstalled(ompDir, rels);
  const plan = reconcile.plan({ payload, installed, prior, ompDir });

  if (args.uninstall) return runUninstall(ompDir, prior, args);
  if (args.check) return runCheck(plan, tiers, args);
  if (args.dryRun) {
    if (args.json) console.log(JSON.stringify({ target, tiers, plan }, null, 2));
    else { console.log(`ship-omp (dry-run): target ${target}, tiers [${tiers.join(', ')}]`); printPlan(plan); }
    process.exit(0);
  }
  return runInstall(ompDir, plan, tiers, kitVersion, prior, args);
}

function printPlan(plan) {
  report('+ create', plan.creates);
  report('~ update', plan.updates);
  report('^ recreate', plan.recreates);
  report('- prune', plan.prunes);
  report('x drop', plan.drops);
  report('! conflict', plan.conflicts);
}

function runCheck(plan, tiers, args) {
  const inSync = !plan.creates.length && !plan.updates.length && !plan.recreates.length &&
    !plan.prunes.length && !plan.drops.length && !plan.conflicts.length;
  if (args.json) console.log(JSON.stringify({ inSync, tiers, plan }, null, 2));
  else if (inSync) console.log('ship-omp --check: OK (in sync).');
  else { console.log('ship-omp --check: OUT OF SYNC'); printPlan(plan); }
  process.exit(inSync ? 0 : 2);
}

function runInstall(ompDir, plan, tiers, kitVersion, prior, args) {
  const sum = apply.applyPlan(ompDir, plan, { force: args.force });
  const entries = reconcile.lockEntries(plan, args.force ? 'force' : 'keep');
  const next = lock.buildLock({ kitVersion, tiers, entries, prior, now: new Date().toISOString() });
  const nextStr = lock.serialize(next);
  const priorStr = prior ? lock.serialize(prior) : null;
  const mutated = sum.created.length || sum.updated.length || sum.recreated.length ||
    sum.pruned.length || nextStr !== priorStr;
  if (mutated) lock.write(ompDir, next);
  if (args.json) { console.log(JSON.stringify({ tiers, summary: sum, wroteLock: !!mutated }, null, 2)); process.exit(0); }
  console.log(`ship-omp: ${sum.created.length} created, ${sum.updated.length} updated, ` +
    `${sum.recreated.length} recreated, ${sum.pruned.length} pruned` +
    (sum.conflicts.length ? `, ${sum.conflicts.length} conflict(s) kept (use --force to overwrite)` : '') +
    (mutated ? '' : ' (no changes; lock untouched)') + `. tiers: [${tiers.join(', ')}]`);
  if (sum.conflicts.length) report('! conflict', sum.conflicts);
  if (sum.kept.length) report('~ kept (drifted, not deleted)', sum.kept);
  process.exit(0);
}

function runUninstall(ompDir, prior, args) {
  if (!prior) { console.log('ship-omp --uninstall: no lock found; nothing to remove.'); process.exit(0); }
  if (args.dryRun) {
    const sum = apply.uninstall(ompDir, prior, lock.LOCK_NAME, { force: args.force, dryRun: true });
    console.log('ship-omp --uninstall (dry-run):');
    report('- would remove', sum.removed);
    report('~ would keep (protected/drifted)', sum.kept);
    report('x already absent', sum.absent);
    process.exit(0);
  }
  const sum = apply.uninstall(ompDir, prior, lock.LOCK_NAME, { force: args.force });
  if (args.json) { console.log(JSON.stringify(sum, null, 2)); process.exit(0); }
  console.log(`ship-omp --uninstall: removed ${sum.removed.length} file(s) + lock` +
    (sum.kept.length ? `; kept ${sum.kept.length} protected/drifted file(s)` : '') + '.');
  if (sum.kept.length) report('~ kept (protected/drifted)', sum.kept);
  process.exit(0);
}

main();
