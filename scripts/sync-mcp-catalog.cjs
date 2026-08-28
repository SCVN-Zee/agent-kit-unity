#!/usr/bin/env node
/**
 * sync-mcp-catalog.cjs — regenerate MCP_CATALOG.md + snapshots from
 * IvanMurzak Unity-MCP plugin C# sources (core + optional extensions).
 *
 * Sources are passed via `--plugin-source <path>` (repeatable). First =
 * core; remainder = extensions. Each tool/prompt is tagged with a `source`
 * label derived from the source directory name (e.g. `unity-ai-animation`)
 * or the literal `core` for the first source.
 *
 * Tool inventory comes from `\w+ToolId = "kebab-id"` constants (the plugin
 * registers tools via these constants and multi-line `[AiTool(Const, ...)]`
 * attributes; reading the constants is the empirically reliable path).
 *
 * Prompt inventory comes from `[AiPrompt(Name = "...", ... Enabled = bool)]`
 * (single-line in current sources). Missing `Enabled` defaults to `true`.
 *
 * Usage: --help, or --plugin-source <p> [--plugin-source <p> ...] --write,
 *        or --check.
 * Exit:  0 ok, 1 fatal, 2 --check drift.
 *
 * Output (relative to repo root, or to AKU_SYNC_OUT_ROOT for tests):
 *   snapshots/mcp-tools.json
 *   snapshots/mcp-tools-by-category.json
 *   snapshots/mcp-prompts.json
 *   docs/MCP_CATALOG.md   (illustrative reference — repo-side only, not shipped)
 */

const fs = require('fs');
const path = require('path');
const { scanSource, mergeSources } = require('./lib/scan-mcp-sources');
const { render } = require('./lib/render-mcp-catalog');
const {
  buildToolsSnapshot,
  buildByCategorySnapshot,
  buildPromptsSnapshot
} = require('./lib/build-mcp-snapshots');

const KIT_ROOT = path.resolve(__dirname, '..');
const OUT_ROOT = process.env.AKU_SYNC_OUT_ROOT
  ? path.resolve(process.env.AKU_SYNC_OUT_ROOT)
  : KIT_ROOT;

const OVERRIDES_PATH = path.join(KIT_ROOT, 'scripts/data/mcp-catalog-overrides.json');

const SNAPSHOT_TOOLS = path.join(OUT_ROOT, 'snapshots/mcp-tools.json');
const SNAPSHOT_BY_CAT = path.join(OUT_ROOT, 'snapshots/mcp-tools-by-category.json');
const SNAPSHOT_PROMPTS = path.join(OUT_ROOT, 'snapshots/mcp-prompts.json');
const CATALOG_MD = path.join(OUT_ROOT, 'docs/MCP_CATALOG.md');

const HELP = `sync-mcp-catalog.cjs — regenerate MCP catalog + snapshots from C# sources.

Usage:
  node scripts/sync-mcp-catalog.cjs --plugin-source <path> [--plugin-source <path> ...] --write
  node scripts/sync-mcp-catalog.cjs --check
  node scripts/sync-mcp-catalog.cjs --help

Flags:
  --plugin-source <path>  Repeatable. First = core; rest = extensions. Label = basename.
  --write                 Regenerate all artifacts atomically.
  --check                 Re-render catalog from snapshot; exit 2 on drift.
  --help                  Print this help, exit 0.

Exit codes: 0 ok, 1 fatal, 2 --check drift.`;

function parseArgs(argv) {
  const args = { sources: [], write: false, check: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--plugin-source') args.sources.push(argv[++i]);
    else if (a === '--write') args.write = true;
    else if (a === '--check') args.check = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Unknown flag: ${a}`);
  }
  return args;
}

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (_) { return fallback; }
}

function loadOverrides() {
  if (!fs.existsSync(OVERRIDES_PATH)) {
    throw new Error(`overrides file missing: ${OVERRIDES_PATH}`);
  }
  const ov = readJson(OVERRIDES_PATH, null);
  if (!ov) throw new Error(`overrides file is not valid JSON: ${OVERRIDES_PATH}`);
  ov.categoryDescriptions = ov.categoryDescriptions || {};
  ov.toolOverrides = ov.toolOverrides || {};
  ov.categoryFootnotes = ov.categoryFootnotes || {};
  ov.assumedExtensions = ov.assumedExtensions || [];
  // Drop stale snake-case keys; log to stderr.
  const dropped = [];
  for (const k of Object.keys(ov.toolOverrides || {})) {
    if (k.includes('_')) { dropped.push(k); delete ov.toolOverrides[k]; }
  }
  if (dropped.length) {
    process.stderr.write(`sync-mcp-catalog: dropped ${dropped.length} stale snake_case overrides: ${dropped.slice(0, 5).join(', ')}${dropped.length > 5 ? '…' : ''}\n`);
  }
  return ov;
}

function labelFor(srcPath, isFirst) {
  if (isFirst) return 'core';
  const base = path.basename(path.resolve(srcPath));
  return base.toLowerCase();
}

function writeAtomic(p, content) {
  const tmp = `${p}.tmp.${process.pid}`;
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, p);
}

function runScan(sources) {
  const results = sources.map((p, i) => {
    const label = labelFor(p, i === 0);
    const r = scanSource(p, label);
    if (r.missing) process.stderr.write(`sync-mcp-catalog: source missing → ${p} (label=${label}); continuing.\n`);
    return { ...r, label };
  });
  return mergeSources(results);
}

function doWrite(sources) {
  if (sources.length === 0) throw new Error('--write requires at least one --plugin-source <path>');
  const overrides = loadOverrides();
  const scan = runScan(sources);
  const refreshedAt = scan.refreshedAt;
  writeAtomic(SNAPSHOT_TOOLS, buildToolsSnapshot(scan.tools, refreshedAt, scan.sourceCounts));
  writeAtomic(SNAPSHOT_BY_CAT, buildByCategorySnapshot(scan.tools, refreshedAt));
  writeAtomic(SNAPSHOT_PROMPTS, buildPromptsSnapshot(scan.prompts, refreshedAt));
  const md = render(scan, overrides, 'core');
  writeAtomic(CATALOG_MD, md.endsWith('\n') ? md : md + '\n');
  const summary = Object.entries(scan.sourceCounts).map(([k, v]) => `${k}=${v}`).join(' ');
  console.log(`sync-mcp-catalog: wrote ${scan.tools.length} tools (${summary}), ${scan.prompts.length} prompts.`);
  return 0;
}

function doCheck() {
  if (!fs.existsSync(SNAPSHOT_BY_CAT) || !fs.existsSync(SNAPSHOT_PROMPTS) || !fs.existsSync(SNAPSHOT_TOOLS)) {
    throw new Error('Snapshots missing. Run with --plugin-source ... --write first.');
  }
  const tools = JSON.parse(fs.readFileSync(SNAPSHOT_TOOLS, 'utf8'));
  const byCat = JSON.parse(fs.readFileSync(SNAPSHOT_BY_CAT, 'utf8'));
  const prompts = JSON.parse(fs.readFileSync(SNAPSHOT_PROMPTS, 'utf8'));
  // Reconstruct merged scan from snapshots. toolDetails preserves source/category exactly.
  const sourceCountMap = tools.sourceCounts || { core: tools.count };
  const allTools = (tools.toolDetails || []).slice();
  allTools.sort((a, b) => a.name.localeCompare(b.name));
  const scan = {
    tools: allTools,
    prompts: prompts.prompts || [],
    refreshedAt: byCat.refreshedAt,
    sourceCounts: sourceCountMap,
    missing: []
  };
  const rendered = render(scan, loadOverrides(), 'core');
  const renderedFinal = rendered.endsWith('\n') ? rendered : rendered + '\n';
  const committed = fs.existsSync(CATALOG_MD) ? fs.readFileSync(CATALOG_MD, 'utf8') : '';
  if (renderedFinal === committed) {
    console.log('sync-mcp-catalog: OK (catalog matches snapshots).');
    return 0;
  }
  console.error('sync-mcp-catalog: DRIFT — catalog out of sync with snapshots. Rerun with --write.');
  return 2;
}

(function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); }
  catch (e) { process.stderr.write(`sync-mcp-catalog: ${e.message}\n`); process.exit(1); }
  if (args.help) { process.stdout.write(HELP + '\n'); process.exit(0); }
  try {
    if (args.write && args.check) throw new Error('--write and --check are mutually exclusive');
    if (args.write) process.exit(doWrite(args.sources));
    if (args.check) process.exit(doCheck());
    process.stderr.write('sync-mcp-catalog: pass --write, --check, or --help\n');
    process.exit(1);
  } catch (e) {
    process.stderr.write(`sync-mcp-catalog: ${e.message}\n`);
    process.exit(1);
  }
})();
