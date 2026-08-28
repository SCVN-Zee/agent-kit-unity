const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const LINTER = path.join(ROOT, 'scripts/lint-frontmatter.cjs');
const { CONTRACTS, MAX_DESCRIPTION, validateTree } = require(LINTER);

function sandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aku-frontmatter-'));
  fs.cpSync(path.join(ROOT, 'omp'), path.join(root, 'omp'), { recursive: true });
  return root;
}

function metadataPath(root, rel) {
  return path.join(root, 'omp', ...rel.split('/'));
}

function replaceDescription(body, value) {
  return body.replace(/^description:.*$/m, value);
}

function falsify(root, rel, transform, expected) {
  const file = metadataPath(root, rel);
  const original = fs.readFileSync(file, 'utf8');
  let result;
  try {
    fs.writeFileSync(file, transform(original));
    result = validateTree(root);
    assert.ok(result.errors.some((e) => e.includes(expected)),
      `${rel}: expected ${JSON.stringify(expected)} in ${result.errors.join(' | ')}`);
  } finally {
    fs.writeFileSync(file, original);
  }
  assert.deepEqual(validateTree(root).errors, [], `${rel}: fixture did not restore`);
}

function withSandbox(run) {
  const root = sandbox();
  try { run(root); }
  finally { fs.rmSync(root, { recursive: true, force: true }); }
}

test('CLI scans the complete 9/7/3 metadata inventory', () => {
  const run = spawnSync(process.execPath, [LINTER], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /19 surfaces: 9 skills, 7 base rules, 3 tier rules/);
});

test('inventory rejects missing files and uncontracted additions', () => withSandbox((root) => {
  const scene = metadataPath(root, 'skills/aku-scene/SKILL.md');
  const original = fs.readFileSync(scene, 'utf8');
  try {
    fs.rmSync(scene);
    assert.ok(validateTree(root).errors.some((e) => e.includes('metadata file missing')));
  } finally {
    fs.writeFileSync(scene, original);
  }

  const extra = metadataPath(root, 'rules/aku-uncontracted.md');
  fs.writeFileSync(extra, '---\ndescription: "Use when doing extra work."\n---\n');
  try {
    assert.ok(validateTree(root).errors.some((e) => e.includes('has no discovery contract')));
  } finally {
    fs.rmSync(extra);
  }
  assert.deepEqual(validateTree(root).errors, []);
}));

test('description shape failures are observable and restore cleanly', () => withSandbox((root) => {
  const rel = 'skills/aku-scene/SKILL.md';
  const cases = [
    ['description: ""', 'missing frontmatter field "description"'],
    ['description: |\n  Use when working with Unity scenes.', 'unsupported YAML block scalar'],
    ['description: Use when working with Unity scenes.\n  continued', 'single-line scalar'],
    [`description: "Use when ${'x'.repeat(MAX_DESCRIPTION)}"`, `exceeds ${MAX_DESCRIPTION}`],
    ['description: "Handles Unity scenes and Cinemachine."', 'must start with "Use when"']
  ];
  for (const [replacement, expected] of cases) {
    falsify(root, rel, (body) => replaceDescription(body, replacement), expected);
  }
}));

test('every surface rejects generic trigger-first prose', () => withSandbox((root) => {
  for (const [rel, contract] of Object.entries(CONTRACTS)) {
    const generic = `description: ${JSON.stringify(`${contract.lead} doing Unity work with conventions and tools.`)}`;
    falsify(root, rel, (body) => replaceDescription(body, generic), 'missing discovery term');
  }
}));

test('report-only review has one discovery owner', () => withSandbox((root) => {
  const cases = [
    ['skills/aku-code-conventions/SKILL.md', (body) => body.replace('Do not activate for report-only review; use skill://aku-code-review.', ''), 'missing discovery term'],
    ['rules/aku-code-convention-rules.md', (body) => body.replace(/Do not activate for report-only file, diff, commit, or PR review;[^\"]+/, ''), 'missing discovery term'],
    ['skills/aku-code-conventions/SKILL.md', (body) => body.replace('generating, editing, or refactoring', 'generating, editing, refactoring, or reviewing'), 'forbidden discovery term'],
    ['rules/aku-code-convention-rules.md', (body) => body.replace('generating, editing, or refactoring', 'generating, editing, refactoring, or reviewing'), 'forbidden discovery term'],
    ['rules/aku-code-convention-rules.md', (body) => body.replace('Asset names/layout use skill://aku-asset-conventions.', ''), 'missing discovery term'],
    ['skills/aku-code-review/SKILL.md', (body) => body.replace('including Unity C#.', ''), 'missing discovery term'],
    ['skills/aku-code-review/SKILL.md', (body) => body.replace('loads skill://aku-code-conventions', 'mentions code conventions'), 'missing discovery term']
  ];
  for (const [rel, mutate, expected] of cases) falsify(root, rel, mutate, expected);
}));

test('always, glob, and TTSR trigger metadata cannot drift', () => withSandbox((root) => {
  const cases = [
    ['rules/aku-engine-rules.md', (b) => b.replace('alwaysApply: true', 'alwaysApply: false'), 'must preserve true'],
    ['rules/aku-code-convention-rules.md', (b) => b.replace('**/*.cs', '**/*.txt'), 'must preserve **/*.cs'],
    ['rules/aku-mcp-guard.md', (b) => b.replace('scope: [tool:edit, tool:write]', 'scope: [tool:edit]'), 'must preserve tool:write'],
    ['tiers/concurrent/rules/aku-session-commit-rules.md', (b) => b.replace(/^condition:.*$/m, 'condition: ["safe"]'), 'must preserve git']
  ];
  for (const [rel, mutate, expected] of cases) falsify(root, rel, mutate, expected);
}));
