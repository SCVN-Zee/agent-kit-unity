/**
 * Tests for lint-docs-counts.cjs.
 *
 * The gate exists because a hand-typed count sat in prose for months after
 * the real number had moved on, and nothing re-derived it. The tests that
 * matter most:
 *
 *   a) anchored component-count phrases fire on drift — heading, em-dash,
 *      and table forms;
 *   b) it stays SILENT on lookalike prose that is not a kit component count
 *      ("CI/CD Workflows (3 total)" is a real heading about .github/).
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
  assert.match(out, /2 skills, 2 rules/);
  assert.match(out, /mirror complete/);
});

test('stale component count fails and names file, line, and both numbers', () => {
  const root = makeTmpRoot();
  write(root, 'docs/summary.md', '## Skills (7 total)\n');
  const { code, out } = run(root);
  assert.equal(code, 2);
  assert.match(out, /docs\/summary\.md:1/);
  assert.match(out, /claimed 7, expected 2/);
});

test('ignore marker suppresses on same line and preceding line', () => {
  const root = makeTmpRoot();
  write(root, 'docs/same.md', 'Legacy: Skills — 7. <!-- docs-counts:ignore -->\n');
  write(root, 'docs/prev.md', '<!-- docs-counts:ignore -->\nLegacy: Skills — 7.\n');
  const { code, out } = run(root);
  assert.equal(code, 0, `ignore marker not honored:\n${out}`);
});

test('docs/journals is excluded — old entries may cite the counts of their day', () => {
  const root = makeTmpRoot();
  write(root, 'docs/journals/260101-old.md', 'Back then the kit shipped Skills — 7.\n');
  assert.equal(run(root).code, 0);
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
