'use strict';
/**
 * luna-build-settings.cjs — validate (Phase 1) and surgically auto-fix (Phase 2)
 * Luna Playworks export build settings stored in a project's luna.json.
 *
 * Pure core (validate / computeFixes / getPath) + a thin CLI. Stdlib only.
 * Ships with the skill://aku-luna-build-check skill; invoked as:
 *   node luna-build-settings.cjs validate <luna.json> [--json]
 *   node luna-build-settings.cjs fix      <luna.json> [--write] [--json]   (Phase 2)
 *
 * Rule tables below are the machine source of truth, mirrored for humans by
 * references/luna-build-settings-checklist.md.
 */

const fs = require('node:fs');

// Boolean gates — each must equal `required`; all auto-fixable by editing luna.json.
const BOOL_GATES = [
  { key: 'aa',        path: ['unity', 'disableAntiAliasing'],                          required: false, label: 'Force-disable Anti-Aliasing OFF' },
  { key: 'meshHalf',  path: ['assets', 'rules', 'meshes', 'default', 'halfPrecision'], required: false, label: 'Mesh half-precision OFF' },
  { key: 'meshSimpl', path: ['assets', 'rules', 'meshes', 'default', 'useSimplification'], required: false, label: 'Mesh reduce-complexity OFF' },
  { key: 'animHalf',  path: ['assets', 'rules', 'animations', 'default', 'halfPrecision'], required: false, label: 'Animation half-precision OFF' },
  { key: 'animStrip', path: ['assets', 'rules', 'animations', 'default', 'stripCurves'], required: false, label: 'Animation remove-redundant-keyframes OFF' },
];

// Advisories — reported with house reference, never auto-set (judgment calls).
const ADVISORIES = [
  { key: 'shadows',      path: ['unity', 'enableRealtimeShadows'],                       ref: false, label: 'Realtime shadows', note: 'default OFF; enable only if the creative needs it' },
  { key: 'soundBitrate', path: ['assets', 'rules', 'sound', 'default', 'bitrate'],       ref: 96,    label: 'Sound default bitrate (kb/s)', note: 'house reference 96; lower shrinks build, higher improves quality' },
  { key: 'fontW',        path: ['assets', 'rules', 'font', 'default', 'data', 'textureWidth'],  ref: 256, label: 'Font atlas width',  note: '256×256 fits typical short playable copy; larger only for many/large glyphs' },
  { key: 'fontH',        path: ['assets', 'rules', 'font', 'default', 'data', 'textureHeight'], ref: 256, label: 'Font atlas height', note: 'pair with atlas width' },
];

function getPath(obj, p) {
  return p.reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

// Enabled scenes = unity.scenes minus unity.disabledScenes. undefined if scenes absent.
function enabledSceneCount(cfg) {
  const scenes = getPath(cfg, ['unity', 'scenes']);
  if (!Array.isArray(scenes)) return undefined;
  const disabled = getPath(cfg, ['unity', 'disabledScenes']);
  const dis = Array.isArray(disabled) ? disabled : [];
  return scenes.filter((s) => !dis.includes(s)).length;
}

function validate(cfg) {
  const gates = [];

  const enabled = enabledSceneCount(cfg);
  gates.push({
    key: 'scene', label: 'Exactly 1 enabled scene', pathStr: 'unity.scenes − unity.disabledScenes',
    required: 1, actual: enabled,
    status: enabled === undefined ? 'missing' : enabled === 1 ? 'pass' : 'fail',
    autofix: false,
  });

  for (const r of BOOL_GATES) {
    const actual = getPath(cfg, r.path);
    gates.push({
      key: r.key, label: r.label, pathStr: r.path.join('.'), required: r.required, actual,
      status: actual === undefined ? 'missing' : actual === r.required ? 'pass' : 'fail',
      autofix: true,
    });
  }

  const advisories = ADVISORIES.map((a) => {
    const actual = getPath(cfg, a.path);
    return {
      key: a.key, label: a.label, pathStr: a.path.join('.'), actual, ref: a.ref, note: a.note,
      deviates: actual !== undefined && actual !== a.ref,
    };
  });

  const texDefault = getPath(cfg, ['assets', 'rules', 'texture', 'default']);
  const texOverrides = getPath(cfg, ['assets', 'rules', 'texture', 'overrides']);
  advisories.push({
    key: 'texture', label: 'Texture default + per-asset overrides', pathStr: 'assets.rules.texture',
    actual: texDefault ? { maxWidth: texDefault.maxWidth, maxHeight: texDefault.maxHeight, compression: texDefault.compression } : undefined,
    overrideCount: Array.isArray(texOverrides) ? texOverrides.length : 0,
    note: 'global default keeps build small; override hero/high-detail textures individually for sharpness',
    deviates: false,
  });

  return { gates, advisories };
}

// Fixes only for auto-fixable gates that are present AND wrong (never create missing keys).
function computeFixes(cfg) {
  const fixes = [];
  for (const r of BOOL_GATES) {
    const actual = getPath(cfg, r.path);
    if (actual !== undefined && actual !== r.required) {
      fixes.push({ key: r.key, path: r.path, pathStr: r.path.join('.'), from: actual, to: r.required });
    }
  }
  return fixes;
}

// Build a /g regex anchored on the unique container key (meshes|animations) so a
// repeated leaf like `halfPrecision` resolves to one place. Top-level-unique leaves
// (disableAntiAliasing) need no container anchor.
function buildAnchor(fix) {
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const p = fix.path;
  const leaf = p[p.length - 1];
  if (p.length < 3) return new RegExp(`("${esc(leaf)}"\\s*:\\s*)(true|false)`, 'g');
  // Anchor grandparent key → parent ("default") object, then stay INSIDE that object via
  // [^{}] so the match can never cross into a sibling overrides[] array, regardless of
  // key order. ("meshes" as a string value can't false-match: requires a trailing ":{".)
  const grand = esc(p[p.length - 3]);
  const parent = esc(p[p.length - 2]);
  return new RegExp(`("${grand}"\\s*:\\s*\\{[\\s\\S]*?"${parent}"\\s*:\\s*\\{[^{}]*?"${esc(leaf)}"\\s*:\\s*)(true|false)`, 'g');
}

// Surgically set each fix's leaf to fix.to, changing ONLY that value token (no
// reserialize). Requires exactly one anchor match, else skip (key-not-found | ambiguous).
function applyFixes(rawText, fixes) {
  let text = rawText;
  const applied = [];
  const skipped = [];
  for (const fix of fixes) {
    const re = buildAnchor(fix);
    const hits = text.match(re);
    if (!hits) { skipped.push({ ...fix, reason: 'key-not-found' }); continue; }
    if (hits.length > 1) { skipped.push({ ...fix, reason: 'ambiguous' }); continue; }
    const next = text.replace(re, (_m, g1) => g1 + String(fix.to));
    // Backstop: re-parse and confirm the edit landed on the DECLARED path; if a mis-anchored
    // match flipped some other token, refuse it so the diff can never lie.
    let landed; try { landed = getPath(JSON.parse(next), fix.path) === fix.to; } catch { landed = false; }
    if (!landed) { skipped.push({ ...fix, reason: 'target-mismatch' }); continue; }
    text = next;
    applied.push(fix);
  }
  return { text, applied, skipped };
}

function fixCli(file, cfg, raw, flags) {
  const fixes = computeFixes(cfg);
  if (fixes.length === 0) { process.stdout.write('No gate fixes needed (auto-fixable gates already pass or are absent).\n'); return 0; }
  const { text, applied, skipped } = applyFixes(raw, fixes);
  const diff = applied.map((f) => `  ${f.pathStr}: ${f.from} → ${f.to}`).join('\n');
  const warn = skipped.map((s) => `  SKIP ${s.pathStr}: ${s.reason} (fix manually)`).join('\n');
  if (!flags.includes('--write')) {
    process.stdout.write(`Would apply ${applied.length} fix(es) [dry-run]:\n${diff}\n${warn ? warn + '\n' : ''}Re-run with --write to apply.\n`);
    return 0;
  }
  if (applied.length) fs.writeFileSync(file, text);
  const residual = validate(JSON.parse(text)).gates.filter((g) => g.status === 'fail');
  process.stdout.write(`Applied ${applied.length} fix(es):\n${diff}\n${warn ? warn + '\n' : ''}Re-validate: ${residual.length ? `❌ ${residual.length} gate(s) still failing` : '✅ gates pass'}\n`);
  return residual.length ? 1 : 0;
}

const ICON = { pass: '✅', fail: '❌', missing: '⚠️' };

function formatReport(file, result) {
  const { gates, advisories } = result;
  const out = [`## Luna Build-Settings Check — ${file}`, '', '### 🔴 Gates'];
  for (const g of gates) {
    const act = g.key === 'scene' ? `${g.actual} enabled` : String(g.actual);
    const tail = g.status === 'fail' ? ` → should be ${g.required}${g.autofix ? ' (auto-fixable)' : ' (manual)'}`
      : g.status === 'missing' ? ' (key absent)' : '';
    out.push(`${ICON[g.status] || '?'} ${g.label} — ${g.pathStr} = ${act}${tail}`);
  }
  out.push('', '### 🟡 Advisories');
  for (const a of advisories) {
    const val = a.key === 'texture'
      ? (a.actual ? `${a.actual.maxWidth}×${a.actual.maxHeight} ${a.actual.compression}, ${a.overrideCount} override(s)` : 'n/a')
      : String(a.actual);
    out.push(`${a.deviates ? '⚠️' : 'ℹ️'} ${a.label} = ${val}${a.deviates ? ` (ref ${a.ref})` : ''} — ${a.note}`);
  }
  const fails = gates.filter((g) => g.status === 'fail').length;
  const miss = gates.filter((g) => g.status === 'missing').length;
  out.push('', `### Verdict: ${fails ? `❌ ${fails} gate(s) failed` : '✅ gates pass'}${miss ? ` · ${miss} key(s) missing` : ''}`);
  return out.join('\n');
}

function runCli(argv) {
  const [cmd, file, ...flags] = argv;
  if (!cmd || !file || !['validate', 'fix'].includes(cmd)) {
    process.stderr.write('usage: luna-build-settings.cjs <validate|fix> <luna.json> [--json] [--write]\n');
    return 2;
  }
  let raw, cfg;
  try { raw = fs.readFileSync(file, 'utf8'); cfg = JSON.parse(raw); }
  catch (e) { process.stderr.write(`error: cannot read/parse ${file}: ${e.message}\n`); return 2; }

  if (cmd === 'validate') {
    const result = validate(cfg);
    process.stdout.write((flags.includes('--json') ? JSON.stringify(result, null, 2) : formatReport(file, result)) + '\n');
    return result.gates.some((g) => g.status === 'fail') ? 1 : 0;
  }
  return fixCli(file, cfg, raw, flags);
}

if (require.main === module) process.exit(runCli(process.argv.slice(2)));

module.exports = { validate, computeFixes, getPath, applyFixes, BOOL_GATES, ADVISORIES, formatReport };
