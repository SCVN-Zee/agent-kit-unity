'use strict';
// Unit tests for the Luna build-settings validator core (Phase 1) + auto-fix (Phase 2).
// Runs via `node --test test/`. Lives outside omp/+scripts/ so it is neither
// LOC-capped by lint-loc nor shipped in package.json `files`.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const mod = require('../omp/skills/aku-luna-build-check/scripts/luna-build-settings.cjs');
const { validate, computeFixes, applyFixes } = mod;

const FIX = path.join(__dirname, 'fixtures');
const load = (name) => JSON.parse(fs.readFileSync(path.join(FIX, name), 'utf8'));
const loadRaw = (name) => fs.readFileSync(path.join(FIX, name), 'utf8');
const clone = (o) => JSON.parse(JSON.stringify(o));
const byKey = (arr, k) => arr.find((x) => x.key === k);
const failed = (gates) => gates.filter((g) => g.status === 'fail');
const MESH_HALF = { key: 'meshHalf', path: ['assets', 'rules', 'meshes', 'default', 'halfPrecision'], from: true, to: false };

// ---- validate(): gates ----------------------------------------------------

test('conforming → zero gate failures', () => {
  const { gates } = validate(load('luna-conforming.json'));
  assert.equal(failed(gates).length, 0);
  for (const g of gates) assert.notEqual(g.status, 'missing');
});

test('nonconforming → exactly meshHalf + animHalf fail; siblings pass', () => {
  const { gates } = validate(load('luna-nonconforming.json'));
  const f = failed(gates).map((g) => g.key).sort();
  assert.deepEqual(f, ['animHalf', 'meshHalf']);
  assert.equal(byKey(gates, 'aa').status, 'pass');
  assert.equal(byKey(gates, 'meshSimpl').status, 'pass');
  assert.equal(byKey(gates, 'animStrip').status, 'pass');
  assert.equal(byKey(gates, 'scene').status, 'pass');
});

test('missing-assets → mesh/anim gates are missing, not fail', () => {
  const { gates } = validate(load('luna-missing-assets.json'));
  for (const k of ['meshHalf', 'meshSimpl', 'animHalf', 'animStrip']) {
    assert.equal(byKey(gates, k).status, 'missing', `${k} should be missing`);
  }
  // unity-block gates still resolve
  assert.equal(byKey(gates, 'aa').status, 'pass');
  assert.equal(byKey(gates, 'scene').status, 'pass');
});

test('scene gate: 2 enabled, none disabled → fail with enabled count 2', () => {
  const { gates } = validate(load('luna-multiscene.json'));
  const scene = byKey(gates, 'scene');
  assert.equal(scene.status, 'fail');
  assert.equal(scene.actual, 2);
});

test('scene gate: 2 listed but 1 disabled → pass with enabled count 1', () => {
  const { gates } = validate(load('luna-scenes-with-disabled.json'));
  const scene = byKey(gates, 'scene');
  assert.equal(scene.status, 'pass');
  assert.equal(scene.actual, 1);
});

// ---- validate(): advisories ----------------------------------------------

test('advisory soundBitrate reports actual + deviation vs ref 96', () => {
  const nc = validate(load('luna-nonconforming.json'));
  const s = byKey(nc.advisories, 'soundBitrate');
  assert.equal(s.actual, 64);
  assert.equal(s.ref, 96);
  assert.equal(s.deviates, true);

  const ok = validate(load('luna-conforming.json'));
  const s2 = byKey(ok.advisories, 'soundBitrate');
  assert.equal(s2.actual, 96);
  assert.equal(s2.deviates, false);
});

test('advisory shadows + font present', () => {
  const { advisories } = validate(load('luna-conforming.json'));
  assert.equal(byKey(advisories, 'shadows').actual, false);
  assert.equal(byKey(advisories, 'fontW').actual, 256);
  assert.equal(byKey(advisories, 'fontH').actual, 256);
});

// ---- computeFixes() -------------------------------------------------------

test('computeFixes(nonconforming) → 2 fixes flipping halfPrecision true→false', () => {
  const fixes = computeFixes(load('luna-nonconforming.json'));
  const keys = fixes.map((f) => f.key).sort();
  assert.deepEqual(keys, ['animHalf', 'meshHalf']);
  for (const f of fixes) {
    assert.equal(f.from, true);
    assert.equal(f.to, false);
    assert.ok(Array.isArray(f.path) && f.path.length > 0);
  }
});

test('computeFixes(conforming) → []', () => {
  assert.deepEqual(computeFixes(load('luna-conforming.json')), []);
});

test('computeFixes(missing-assets) → [] and does not throw', () => {
  assert.deepEqual(computeFixes(load('luna-missing-assets.json')), []);
});

// ---- applyFixes() (Phase 2) ----------------------------------------------

test('applyFixes flips meshHalf true→false; sibling animations untouched; no reflow', () => {
  const raw = loadRaw('luna-nonconforming.json');
  const { text, applied, skipped } = applyFixes(raw, [MESH_HALF]);
  assert.equal(applied.length, 1);
  assert.equal(skipped.length, 0);
  const before = JSON.parse(raw);
  const after = JSON.parse(text);
  assert.equal(after.assets.rules.meshes.default.halfPrecision, false);
  assert.equal(after.assets.rules.animations.default.halfPrecision, true); // untouched
  // ONLY the target path differs at the parse level
  const restored = clone(after);
  restored.assets.rules.meshes.default.halfPrecision = true;
  assert.deepEqual(restored, before);
  assert.equal(text.split('\n').length, raw.split('\n').length); // no reflow
});

test('applyFixes batch: does not clobber overrides[] decoy or non-ASCII', () => {
  const raw = loadRaw('luna-overrides-trap.json');
  const fixes = computeFixes(JSON.parse(raw)); // aa, meshHalf, animHalf
  const { text, applied } = applyFixes(raw, fixes);
  const after = JSON.parse(text);
  assert.equal(applied.length, 3);
  assert.equal(after.unity.disableAntiAliasing, false);
  assert.equal(after.assets.rules.meshes.default.halfPrecision, false);
  assert.equal(after.assets.rules.animations.default.halfPrecision, false);
  assert.equal(after.assets.rules.texture.overrides[0].halfPrecision, true); // decoy untouched
  assert.ok(text.includes('Tét-ad')); // non-ASCII preserved
});

test('applyFixes targets default even when overrides[] precede it (H1 regression)', () => {
  const raw = loadRaw('luna-overrides-before-default.json');
  const { text, applied, skipped } = applyFixes(raw, [MESH_HALF]);
  const after = JSON.parse(text);
  assert.equal(after.assets.rules.meshes.default.halfPrecision, false); // real gate fixed
  assert.equal(after.assets.rules.meshes.overrides[0].halfPrecision, true); // decoy untouched
  assert.equal(applied.length, 1);
  assert.equal(skipped.length, 0);
});

test('applyFixes skips missing key (no write)', () => {
  const raw = loadRaw('luna-missing-assets.json');
  const { text, applied, skipped } = applyFixes(raw, [MESH_HALF]);
  assert.equal(applied.length, 0);
  assert.equal(skipped[0].reason, 'key-not-found');
  assert.equal(text, raw);
});

test('applyFixes idempotent when value already at target', () => {
  const raw = loadRaw('luna-conforming.json'); // meshHalf already false
  const { text } = applyFixes(raw, [{ ...MESH_HALF, from: false }]);
  assert.equal(text, raw);
});

test('applyFixes flags ambiguous (>1 match) and skips', () => {
  const raw = '{"meshes":{"default":{"halfPrecision":true}},"dup":{"meshes":{"default":{"halfPrecision":true}}}}';
  const { text, applied, skipped } = applyFixes(raw, [MESH_HALF]);
  assert.equal(applied.length, 0);
  assert.equal(skipped[0].reason, 'ambiguous');
  assert.equal(text, raw);
});

test('applyFixes preserves trailing newline', () => {
  const raw = loadRaw('luna-nonconforming.json');
  const { text } = applyFixes(raw, computeFixes(JSON.parse(raw)));
  assert.equal(text.endsWith('\n'), raw.endsWith('\n'));
});
