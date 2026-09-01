/**
 * Tests for omp-install-payload.js against the REAL packaged omp/ tree.
 *
 * The load-bearing guarantees: non-`.md` skill subfiles are enumerated and
 * hashed by raw bytes (the walk-md.js trap), tier overlays land at rules/<name>
 * tagged with their tier, README/tiers are excluded from the base set, and a
 * base-vs-tier dest collision throws.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const payload = require('../lib/omp-install-payload');
const { hashBytes } = require('../lib/omp-install-lock');

const KIT_OMP = path.resolve(__dirname, '../../omp');
const CODE_CONVENTION_FILES = [
  'ANIMATOR_DRIVING.md',
  'BOUNDED_DOMAIN_FIELDS.md',
  'NAMING.md',
  'REFERENCE_WIRING.md',
  'REQUIRED_FIELDS.md',
  'SKILL.md',
  'STRUCTURE.md',
  'examples/bounded-domain-fields.md',
  'examples/identifier-pickers.md',
  'examples/init-release-pattern.md',
  'examples/monobehaviour-template.md',
  'examples/scriptableobject-pattern.md',
  'examples/setup-refs-pattern.md'
];
const ASSET_CONVENTION_FILES = [
  'ASSET_PREFIXES.md',
  'HIERARCHY_NAMING.md',
  'PROJECT_LAYOUT.md',
  'SKILL.md'
];

function skillFiles(base, name) {
  const prefix = 'skills/' + name + '/';
  return Object.keys(base)
    .filter((dest) => dest.startsWith(prefix))
    .map((dest) => dest.slice(prefix.length))
    .sort();
}

test('base payload includes AGENTS.md, rules/*, and skills/**', () => {
  const base = payload.baseFiles(KIT_OMP);
  assert.ok(base['AGENTS.md'], 'AGENTS.md');
  assert.ok(base['rules/aku-core-rules.md'], 'the always-apply base rule');
  assert.ok(base['rules/aku-mcp-policy.md'], 'a base rule');
  assert.ok(base['skills/aku-scene/SKILL.md'], 'a skill SKILL.md');
  assert.ok(base['skills/aku-scene/CINEMACHINE.md'], 'the focused Cinemachine recipe');
});

test('convention split ships exact inventories without the legacy skill or URI', () => {
  const base = payload.baseFiles(KIT_OMP);
  assert.deepEqual(skillFiles(base, 'aku-code-conventions'), CODE_CONVENTION_FILES);
  assert.deepEqual(skillFiles(base, 'aku-asset-conventions'), ASSET_CONVENTION_FILES);
  assert.equal(skillFiles(base, 'aku-conventions').length, 0, 'legacy skill must be absent');

  for (const [dest, meta] of Object.entries(base)) {
    if (!/\.(?:c?js|json|md)$/.test(dest)) continue;
    const text = fs.readFileSync(meta.srcAbs, 'utf8');
    assert.equal(text.includes('skill://aku-conventions'), false, 'legacy URI in ' + dest);
  }
});
test('generic router is absent from every shipped payload file', () => {
  const base = payload.baseFiles(KIT_OMP);
  const retired = ['aku', 'unity'].join('-');
  const stale = [`skill://${retired}`, `/skill:${retired}`, `skills/${retired}/`, ['aku', 'unity'].join(':')];
  assert.equal(skillFiles(base, retired).length, 0, 'retired skill directory must be absent');
  for (const [dest, meta] of Object.entries(base)) {
    if (!/\.(?:c?js|json|md)$/.test(dest)) continue;
    const text = fs.readFileSync(meta.srcAbs, 'utf8');
    for (const needle of stale) assert.equal(text.includes(needle), false, `retired route ${needle} in ${dest}`);
  }
});

test('base payload excludes README.md and tiers/', () => {
  const base = payload.baseFiles(KIT_OMP);
  assert.ok(!base['README.md'], 'omp/README.md must not be installed');
  for (const k of Object.keys(base)) {
    assert.ok(!k.startsWith('tiers/'), `tiers must not be in the base set: ${k}`);
  }
});

test('availableTiers lists the shipped tiers sorted', () => {
  assert.deepEqual(payload.availableTiers(KIT_OMP), ['luna', 'supercent']);
});

test('non-.md tier-skill subfiles are enumerated with a correct raw-byte hash', () => {
  const rel = 'skills/aku-luna-build-check/scripts/luna-build-settings.cjs';
  const tf = payload.tierFiles(KIT_OMP, 'luna');
  const cjs = tf[rel];
  assert.ok(cjs, 'luna-build-settings.cjs must be in the luna tier payload');
  assert.equal(cjs.tier, 'luna');

  const bytes = fs.readFileSync(path.join(KIT_OMP, 'tiers/luna', rel));
  const expected = 'sha256:' + crypto.createHash('sha256').update(bytes).digest('hex');
  assert.equal(cjs.hash, expected);
});

test('tier overlay maps to rules/<name> tagged with the tier', () => {
  const tf = payload.tierFiles(KIT_OMP, 'supercent');
  assert.ok(tf['rules/aku-sc-rules.md'], 'supercent rule at rules/aku-sc-rules.md');
  assert.equal(tf['rules/aku-sc-rules.md'].tier, 'supercent');
});

test('computePayload merges base + tier', () => {
  const full = payload.computePayload(KIT_OMP, ['supercent']);
  assert.ok(full['skills/aku-scene/SKILL.md']);
  assert.equal(full['rules/aku-sc-rules.md'].tier, 'supercent');
});

test('a base-vs-tier dest collision throws', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aku-payload-'));
  fs.mkdirSync(path.join(root, 'rules'), { recursive: true });
  fs.mkdirSync(path.join(root, 'skills/x'), { recursive: true });
  fs.mkdirSync(path.join(root, 'tiers/dup/rules'), { recursive: true });
  fs.writeFileSync(path.join(root, 'AGENTS.md'), 'a');
  fs.writeFileSync(path.join(root, 'skills/x/SKILL.md'), 's');
  // A base rule and a tier rule that both resolve to rules/clash.md.
  fs.writeFileSync(path.join(root, 'rules/clash.md'), 'base');
  fs.writeFileSync(path.join(root, 'tiers/dup/rules/clash.md'), 'tier');
  assert.throws(() => payload.computePayload(root, ['dup']), /collision/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('hashBytes exposure matches payload hashing', () => {
  const b = Buffer.from('hi');
  assert.equal(hashBytes(b), 'sha256:' + crypto.createHash('sha256').update(b).digest('hex'));
});
