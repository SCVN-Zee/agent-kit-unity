const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  BETA,
  REQUIRED,
  STABLE,
  assertArchiveEntries,
  parseCli,
  renderInstaller,
  validateRelease
} = require('../build-release.cjs');

const repository = { url: 'https://github.com/SCVN-Zee/agent-kit-unity.git' };

function metadata(version, tag = `v${version}`, expectedChannel) {
  return {
    tag,
    expectedChannel,
    pkg: { version, repository: { ...repository } },
    lock: { version, packages: { '': { version } } }
  };
}

test('release metadata accepts only exact stable and positive beta tags', () => {
  assert.equal(validateRelease(metadata('0.1.0')).channel, 'stable');
  assert.equal(validateRelease(metadata('0.1.0-beta.1')).channel, 'beta');
  for (const version of [
    '0.1.0-rc.1', '0.1.0-alpha.1', '01.1.0', '0.1.0-beta.0', '0.1.0-beta.01'
  ]) assert.throws(() => validateRelease(metadata(version)), /unsupported version/);
});

test('channel rule regexes reject beta.0, zero-padded cores, and v-prefixed input', () => {
  for (const version of ['0.1.0-beta.0', '01.2.3', '1.2', 'v0.1.0']) {
    assert.equal(STABLE.test(version), false, `STABLE must reject ${version}`);
    assert.equal(BETA.test(version), false, `BETA must reject ${version}`);
  }
  assert.equal(STABLE.test('0.1.0'), true);
  assert.equal(BETA.test('0.1.0-beta.8'), true);
});

test('release metadata rejects channel, tag, lock, and repository disagreement', () => {
  assert.throws(() => validateRelease(metadata('0.1.0', 'v0.1.0', 'beta')), /not beta/);
  assert.throws(() => validateRelease(metadata('0.1.0', 'v0.1.1')), /must equal/);
  const wrongTopLock = metadata('0.1.0');
  wrongTopLock.lock.version = '0.0.9';
  assert.throws(() => validateRelease(wrongTopLock), /package-lock versions/);
  const wrongRootLock = metadata('0.1.0');
  wrongRootLock.lock.packages[''].version = '0.0.9';
  assert.throws(() => validateRelease(wrongRootLock), /package-lock versions/);
  const wrongRepo = metadata('0.1.0');
  wrongRepo.pkg.repository.url = 'https://github.com/example/fork.git';
  assert.throws(() => validateRelease(wrongRepo), /package repository/);
});

test('archive closure fails when any runtime module or OMP surface is absent', () => {
  const complete = [...REQUIRED, 'package/omp/rules/rule.md', 'package/omp/skills/skill/SKILL.md'];
  assert.deepEqual(assertArchiveEntries(complete), complete);
  for (const missing of REQUIRED) {
    assert.throws(
      () => assertArchiveEntries(complete.filter((entry) => entry !== missing)),
      new RegExp(`missing ${missing.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
    );
  }
  assert.throws(() => assertArchiveEntries(complete.filter((entry) => !entry.includes('/rules/'))), /rules/);
  assert.throws(() => assertArchiveEntries(complete.filter((entry) => !entry.includes('/skills/'))), /skills/);
});

test('installer rendering is deterministic and rejects unsafe or unresolved values', () => {
  const values = { TAG: 'v0.1.0-beta.1' };
  const first = renderInstaller('tag=@@TAG@@\n', values);
  assert.equal(first, renderInstaller('tag=@@TAG@@\n', values));
  assert.equal(first, 'tag=v0.1.0-beta.1\n');
  assert.throws(() => renderInstaller('@@TAG@@', { TAG: "v0.1.0'; echo unsafe" }), /unsafe/);
  assert.throws(() => renderInstaller('@@MISSING@@', {}), /unresolved/);
});

test('CLI parser requires explicit known channel options', () => {
  assert.deepEqual(parseCli(['v0.1.0', '--channel', 'stable', '--validate-only']), {
    tag: 'v0.1.0', expectedChannel: 'stable', validateOnly: true
  });
  assert.throws(() => parseCli([]), /tag is required/);
  assert.throws(() => parseCli(['v0.1.0', '--channel', 'rc']), /unknown argument/);
});

test('make bump strips a leading v and no longer requires a changelog section', () => {
  const root = path.resolve(__dirname, '..', '..');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aku-bump-guard-'));
  try {
    fs.copyFileSync(path.join(root, 'Makefile'), path.join(dir, 'Makefile'));
    fs.mkdirSync(path.join(dir, 'scripts', 'lib'), { recursive: true });
    fs.copyFileSync(path.join(root, 'scripts', 'build-release.cjs'), path.join(dir, 'scripts', 'build-release.cjs'));
    fs.copyFileSync(
      path.join(root, 'scripts', 'lib', 'global-install-fs.js'),
      path.join(dir, 'scripts', 'lib', 'global-install-fs.js')
    );
    fs.writeFileSync(path.join(dir, 'CHANGELOG.md'), '# Changelog\n\n## [Unreleased]\n');
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'aku-bump-fixture', version: '0.1.0-beta.7' }));
    fs.writeFileSync(
      path.join(dir, 'README.md'),
      'install: https://github.com/SCVN-Zee/agent-kit-unity/releases/download/v0.1.0-beta.7/install.sh\n'
    );
    const r = spawnSync('make', ['bump', 'VERSION=v0.1.0-beta.8'], { cwd: dir, encoding: 'utf8' });
    assert.match(r.stdout, /v0\.1\.0-beta\.8/, `bump stopped before npm version — stderr: ${r.stderr}`);
    assert.doesNotMatch(r.stderr, /CHANGELOG\.md/);
    assert.notEqual(r.status, 0, `expected fixture failure after the removed gate, stderr: ${r.stderr}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
