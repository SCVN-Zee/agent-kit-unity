/**
 * Tests for omp-tier-detect.js — marker/branch/package gating, with the branch
 * injected so no real git checkout is needed.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { detect } = require('../lib/omp-tier-detect');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'aku-tier-'));
}
function write(root, rel, text) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, text);
}
function unity(root) {
  write(root, 'ProjectSettings/ProjectVersion.txt', 'm_EditorVersion: 2022.3\n');
}

test('bare Unity project → no tiers', () => {
  const root = tmp();
  unity(root);
  assert.deepEqual(detect(root, { branch: 'main' }), []);
});

test('Assets/Supercent/ → supercent', () => {
  const root = tmp();
  unity(root);
  fs.mkdirSync(path.join(root, 'Assets/Supercent'), { recursive: true });
  assert.deepEqual(detect(root, { branch: 'main' }), ['supercent']);
});

test('luna package + playable branch → luna', () => {
  const root = tmp();
  unity(root);
  write(root, 'Packages/manifest.json', JSON.stringify({ dependencies: { 'com.luna.playworks': '1.0.0' } }));
  assert.deepEqual(detect(root, { branch: 'feature/playable-halloween' }), ['luna']);
});

test('luna package but non-playable branch → no luna', () => {
  const root = tmp();
  unity(root);
  write(root, 'Packages/manifest.json', JSON.stringify({ dependencies: { 'com.luna.playworks': '1.0.0' } }));
  assert.deepEqual(detect(root, { branch: 'main' }), []);
});

test('playable branch but no luna package → no luna (gate is playable && luna)', () => {
  const root = tmp();
  unity(root);
  assert.deepEqual(detect(root, { branch: 'playable/x' }), []);
});

test('marker lunaPlayable:true on main branch + luna → luna (marker wins)', () => {
  const root = tmp();
  unity(root);
  write(root, 'luna.json', '{}');
  write(root, '.omp/aku-project.json', JSON.stringify({ lunaPlayable: true }));
  assert.deepEqual(detect(root, { branch: 'main' }), ['luna']);
});

test('marker lunaPlayable:false beats a playable branch → no luna', () => {
  const root = tmp();
  unity(root);
  write(root, 'luna.json', '{}');
  write(root, '.omp/aku-project.json', JSON.stringify({ lunaPlayable: false }));
  assert.deepEqual(detect(root, { branch: 'playable/x' }), []);
});

test('marker concurrentSessions:true → concurrent', () => {
  const root = tmp();
  unity(root);
  write(root, '.omp/aku-project.json', JSON.stringify({ concurrentSessions: true }));
  assert.deepEqual(detect(root, { branch: 'main' }), ['concurrent']);
});

test('all three markers combine and sort', () => {
  const root = tmp();
  unity(root);
  fs.mkdirSync(path.join(root, 'Assets/Supercent'), { recursive: true });
  write(root, 'luna.json', '{}');
  write(root, '.omp/aku-project.json', JSON.stringify({ lunaPlayable: true, concurrentSessions: true }));
  assert.deepEqual(detect(root, { branch: 'main' }), ['concurrent', 'luna', 'supercent']);
});
