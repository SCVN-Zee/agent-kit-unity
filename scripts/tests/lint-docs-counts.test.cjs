/**
 * Tests for lint-docs-counts.cjs.
 *
 * The gate exists because "276 tools" (the OLD unity-mcp-pro count) sat in
 * docs/codebase-summary.md for months while the real catalog was 82. So the
 * tests that matter most are not "does it catch 276" — that is easy — but:
 *
 *   a) does it stay SILENT on real prose that merely contains a number and the
 *      word "tools"? A gate that cries wolf gets suppressed, and a suppressed
 *      gate is worse than none. Representative false-positive examples are
 *      pinned below: "chain 2-3 tools in sequence" and "~160 dropped specialty
 *      tools".
 *   b) does it distinguish "core tools" (74) from "tools" (82)? Conflating them
 *      is exactly how docs/system-architecture.md:71 went wrong.
 *
 * Fixture-driven via --root against a synthetic docs tree.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { makeTmpRoot, run, write } = require('./helpers/docs-counts-fixture.cjs');

test('clean fixture passes', () => {
  const root = makeTmpRoot();
  const { code, out } = run(root);
  assert.equal(code, 0, `expected clean pass, got:\n${out}`);
  assert.match(out, /82 tools/);
  assert.match(out, /mirror complete/);
});

test('stale tool count fails and names file, line, and both numbers', () => {
  const root = makeTmpRoot();
  write(root, 'docs/summary.md', 'The snapshot holds 276 tools today.\n');
  const { code, out } = run(root);
  assert.equal(code, 2);
  assert.match(out, /docs\/summary\.md:1/);
  assert.match(out, /claimed 276, expected 82/);
});

test('correct counts pass', () => {
  const root = makeTmpRoot();
  write(root, 'docs/summary.md', 'Ships ~82 kebab tools + 46 prompts across the catalog.\n');
  assert.equal(run(root).code, 0);
});

// The false-positive guard. These are verbatim shapes from live kit content.
test('real prose containing a small number and "tools" does not fire', () => {
  const root = makeTmpRoot();
  write(root, 'docs/prose.md',
    'Many workflows chain 2-3 tools in sequence (with `*-get-data` before `*-modify`).\n');
  const { code, out } = run(root);
  assert.equal(code, 0, `false positive on legitimate prose:\n${out}`);
});

test('counts scoped to something other than the live catalog do not fire', () => {
  const root = makeTmpRoot();
  write(root, 'docs/fallback.md',
    '## Reflection-first fallback (replaces ~160 dropped specialty tools)\n' +
    'When no dedicated tool exists (~160 specialty tools were dropped between versions):\n');
  const { code, out } = run(root);
  assert.equal(code, 0, `false positive on a historical count:\n${out}`);
});

test('"core tools" resolves to the core count, not the total', () => {
  const root = makeTmpRoot();
  write(root, 'docs/ok.md', 'Exposes ~74 core bare kebab tools plus extensions.\n');
  assert.equal(run(root).code, 0);

  const bad = makeTmpRoot();
  write(bad, 'docs/bad.md', 'Exposes ~82 core tools + 46 prompts.\n');
  const { code, out } = run(bad);
  assert.equal(code, 2);
  assert.match(out, /claimed 82, expected 74 \(core tool count\)/);
});

test('component counts are checked in heading and table form', () => {
  const root = makeTmpRoot();
  write(root, 'docs/a.md', '## Skills (7 total)\n');
  write(root, 'docs/b.md', '| Category | Count |\n|---|---|\n| Rules | 5 |\n');
  const { code, out } = run(root);
  assert.equal(code, 2);
  assert.match(out, /claimed 7, expected 2 \(skills count\)/);
  assert.match(out, /claimed 5, expected 2 \(rules count \(table\)\)/);
});

test('em-dash component headings are checked', () => {
  const root = makeTmpRoot();
  write(root, 'docs/a.md', '### Skills — 9\n');
  const { code, out } = run(root);
  assert.equal(code, 2);
  assert.match(out, /claimed 9, expected 2 \(skills count\)/);
});

// "CI/CD Workflows (3 total)" is a real heading about .github/workflows/, not a
// kit component count. The heading pattern must not claim it.
test('CI workflow headings are not mistaken for kit workflows', () => {
  const root = makeTmpRoot();
  write(root, 'docs/ci.md', '## CI/CD Workflows (3 total)\n');
  const { code, out } = run(root);
  assert.equal(code, 0, `false positive on a CI heading:\n${out}`);
});

test('ignore marker suppresses on same line and preceding line', () => {
  const root = makeTmpRoot();
  write(root, 'docs/same.md', 'Legacy note: 276 tools. <!-- docs-counts:ignore -->\n');
  write(root, 'docs/prev.md', '<!-- docs-counts:ignore -->\nLegacy note: 276 tools.\n');
  const { code, out } = run(root);
  assert.equal(code, 0, `ignore marker not honored:\n${out}`);
});

test('docs/journals is excluded — old entries may cite the counts of their day', () => {
  const root = makeTmpRoot();
  write(root, 'docs/journals/260101-old.md', 'Back then the server exposed 276 tools.\n');
  assert.equal(run(root).code, 0);
});

test('a shipped component with no mirror page fails', () => {
  const root = makeTmpRoot();
  fs.rmSync(path.join(root, 'docs/components/rules/aku-two.md'));
  const { code, out } = run(root);
  assert.equal(code, 2);
  assert.match(out, /missing docs\/components\/rules\/aku-two\.md/);
});

test('a mirror page with no shipped component fails as an orphan', () => {
  const root = makeTmpRoot();
  write(root, 'docs/components/skills/aku-ghost.md', '# ghost\n');
  const { code, out } = run(root);
  assert.equal(code, 2);
  assert.match(out, /orphan\s+docs\/components\/skills\/aku-ghost\.md/);
});

test('category README.md is not treated as an orphan page', () => {
  const root = makeTmpRoot();
  write(root, 'docs/components/skills/README.md', '# Skills index\n');
  assert.equal(run(root).code, 0);
});
