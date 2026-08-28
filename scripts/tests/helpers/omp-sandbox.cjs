/**
 * Shared harness for ship-omp integration tests: build a Unity-marker sandbox
 * and drive the real CLI by absolute path from a FOREIGN cwd (so a test also
 * proves the packaged omp/ is resolved from the module root, not from cwd).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const KIT_ROOT = path.resolve(__dirname, '../../..');
const SHIP = path.join(KIT_ROOT, 'scripts/ship-omp.cjs');

function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aku-ship-'));
  fs.mkdirSync(path.join(dir, 'ProjectSettings'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'ProjectSettings/ProjectVersion.txt'), 'm_EditorVersion: 2022.3\n');
  return dir;
}

// Run from os.tmpdir() (a cwd with no omp/) so kitOmpDir must resolve from the
// module package root for the install to find any source at all.
function ship(target, args = []) {
  const r = spawnSync('node', [SHIP, target, ...args], { encoding: 'utf8', cwd: os.tmpdir() });
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}

function omp(target, rel) { return path.join(target, '.omp', rel); }
function readLock(target) { return JSON.parse(fs.readFileSync(omp(target, 'aku-lock.json'), 'utf8')); }
function sha(buf) { return 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex'); }
function cleanup(...dirs) { for (const d of dirs) fs.rmSync(d, { recursive: true, force: true }); }

module.exports = { KIT_ROOT, SHIP, sandbox, ship, omp, readLock, sha, cleanup };
