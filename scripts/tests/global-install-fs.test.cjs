/**
 * Tests for global-install-fs.writeAtomic — the buffer-atomic write the OMP
 * lock writer reuses. Proves it creates parent dirs, writes exact bytes,
 * overwrites in place, and leaves no `.aku-tmp.*` staging entry behind.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { writeAtomic, TMP_PREFIX } = require('../lib/global-install-fs');

function tmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'aku-fs-'));
}

test('writeAtomic creates parent dirs and writes exact bytes', () => {
  const root = tmpRoot();
  try {
    const dest = path.join(root, 'nested/deep/file.bin');
    const bytes = Buffer.from([0x00, 0x01, 0xff, 0x7f, 0x0a]);
    writeAtomic(dest, bytes);
    assert.deepEqual(fs.readFileSync(dest), bytes);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('writeAtomic overwrites an existing file and strands no tmp entry', () => {
  const root = tmpRoot();
  try {
    const dest = path.join(root, 'lock.json');
    writeAtomic(dest, Buffer.from('old'));
    writeAtomic(dest, Buffer.from('new-content'));
    assert.equal(fs.readFileSync(dest, 'utf8'), 'new-content');
    const strays = fs.readdirSync(root).filter((n) => n.startsWith(TMP_PREFIX));
    assert.deepEqual(strays, [], `no staging tmp should remain, saw: ${strays.join(', ')}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('writeAtomic accepts a string payload', () => {
  const root = tmpRoot();
  try {
    const dest = path.join(root, 'a.txt');
    writeAtomic(dest, 'hello\n');
    assert.equal(fs.readFileSync(dest, 'utf8'), 'hello\n');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
