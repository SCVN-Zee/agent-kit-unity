const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const stable = fs.readFileSync(path.join(ROOT, '.github/workflows/release-stable.yml'), 'utf8');
const beta = fs.readFileSync(path.join(ROOT, '.github/workflows/release-beta.yml'), 'utf8');

function assertSharedContract(workflow, channel) {
  const validation = `--channel ${channel} --validate-only`;
  for (const required of [
    'permissions:\n  contents: write',
    validation,
    'fetch-depth: 0',
    'if [ "$GITHUB_REPOSITORY" != "SCVN-Zee/agent-kit-unity" ]; then',
    'git fetch --no-tags origin main:refs/remotes/origin/main',
    'git merge-base --is-ancestor "$GITHUB_SHA" origin/main',
    'run: npm ci',
    'run: make check',
    `--channel ${channel}`,
    'gh api --paginate --slurp',
    '> release-pages.json || return 1',
    'if (matches.length === 0) process.exit(4)',
    "throw Error('multiple releases found for ' + tag)",
    "find_release || { echo 'draft disappeared before upload'",
    'gh release create "$tag" --verify-tag --draft',
    'dist/release/install.sh',
    'dist/release/SHA256SUMS',
    'gh release upload',
    'gh release view "$tag" --json assets',
    'gh release edit'
  ]) assert.ok(workflow.includes(required), `missing workflow contract: ${required}`);
  const upload = workflow.indexOf('gh release upload');
  const provenance = workflow.indexOf('if [ "$GITHUB_REPOSITORY"');
  const ancestry = workflow.indexOf('git merge-base --is-ancestor');
  assert.ok(provenance < workflow.indexOf(validation));
  assert.ok(ancestry < workflow.indexOf(validation));
  assert.ok(workflow.indexOf(validation) < workflow.indexOf('run: npm ci'));
  assert.ok(workflow.indexOf('run: make check') < workflow.indexOf('gh release create'));
  assert.ok(workflow.lastIndexOf('find_release', upload) < upload);
  assert.ok(workflow.lastIndexOf('assert_draft', upload) < upload);
  assert.ok(upload < workflow.indexOf('gh release edit'));
  assert.doesNotMatch(workflow, /releases\/tags|npm publish|semantic-release|macos|codesign|electron/i);
}

test('stable workflow routes plain tags and publishes latest', () => {
  assertSharedContract(stable, 'stable');
  assert.match(stable, /- 'v\*'\n\s+- '!v\*-\*'/);
  assert.match(stable, /--draft=false --prerelease=false --latest/);
  assert.equal(stable.trim().endsWith('gh release edit "$tag" --draft=false --prerelease=false --latest'), true);
  assert.doesNotMatch(stable, /tags:\n\s+- 'v\*-beta\.\*'/);
});

test('beta workflow routes beta.N tags and remains prerelease', () => {
  assertSharedContract(beta, 'beta');
  assert.match(beta, /tags:\n\s+- 'v\*-beta\.\*'/);
  assert.match(beta, /release create[^\n]+--draft --prerelease/);
  assert.match(beta, /--draft=false --prerelease=true/);
  assert.equal(beta.trim().endsWith('gh release edit "$tag" --draft=false --prerelease=true'), true);
  assert.doesNotMatch(beta, /--latest/);
});

test('semantic-release publisher is fully removed', () => {
  const pkg = require('../../package.json');
  assert.equal(fs.existsSync(path.join(ROOT, '.releaserc.cjs')), false);
  assert.equal(pkg.scripts['semantic-release'], undefined);
  assert.equal(pkg.devDependencies, undefined);
  assert.equal(pkg.publishConfig, undefined);
});
