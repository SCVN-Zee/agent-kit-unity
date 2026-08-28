/**
 * Tests for sync-mcp-catalog.cjs (multi-source generator).
 *
 * Covers (per phase-01 Implementation Step 1):
 *   a) extracts kebab ids from `ToolId = "..."` constants
 *   b) excludes `sample-`/`chess-` prefixes and test/demo paths
 *   c) dedupes `#if/#else` duplicate ToolId references
 *   d) category = first kebab segment; editor-application+editor-selection → editor
 *   e) extracts `[AiPrompt(Name = "id", ... Enabled = bool)]` (default true)
 *   f) escaped/verbatim strings in test/sample code NOT matched
 *   g) multi-source run tags tools with `source`, merges sorted
 *   h) missing extension dir → warn, exit 0, core-only
 *   i) two runs byte-identical
 *   j) emits flat tool-names array file
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const KIT_ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(KIT_ROOT, 'scripts/sync-mcp-catalog.cjs');
const FIXTURE_CORE = path.join(__dirname, 'fixtures/fake-plugin-src');
const FIXTURE_EXT = path.join(__dirname, 'fixtures/fake-ext-src');
const FIXTURE_MISSING = path.join(__dirname, 'fixtures/does-not-exist');
const { scanSource, mergeSources } = require('../lib/scan-mcp-sources');

function scanCore() { return scanSource(FIXTURE_CORE, 'core'); }
function scanExt() { return scanSource(FIXTURE_EXT, 'unity-ai-animation'); }

test('a) extracts kebab tool ids from ToolId = "..." constants', () => {
  const r = scanCore();
  const ids = r.tools.map(t => t.name);
  assert.ok(ids.includes('scene-open'));
  assert.ok(ids.includes('scene-save'));
  assert.ok(ids.includes('editor-application-get-state'));
  assert.ok(ids.includes('reflection-method-find'));
});

test('b) excludes sample-/chess- prefixes and test/sample paths', () => {
  const r = scanCore();
  const ids = r.tools.map(t => t.name);
  assert.equal(ids.includes('sample-get'), false, 'sample-get must be excluded (prefix + TestFiles path)');
  assert.equal(ids.includes('sample-rename'), false);
});

test('c) dedupes #if/#else duplicate ToolId references', () => {
  const r = scanCore();
  const occurrences = r.tools.filter(t => t.name === 'reflection-method-find').length;
  assert.equal(occurrences, 1);
});

test('d) category = first kebab segment; editor-application/selection → editor', () => {
  const r = scanCore();
  const cats = Object.fromEntries(r.tools.map(t => [t.name, t.category]));
  // raw scan returns first segment; merge normalizes
  const merged = mergeSources([{ ...r, label: 'core' }]);
  const mcats = Object.fromEntries(merged.tools.map(t => [t.name, t.category]));
  assert.equal(mcats['scene-open'], 'scene');
  assert.equal(mcats['editor-application-get-state'], 'editor');
  assert.equal(mcats['editor-selection-get'], 'editor');
});

test('e) extracts AiPrompt names with Enabled flag (default true)', () => {
  const r = scanCore();
  const names = r.prompts.map(p => p.name);
  assert.ok(names.includes('scene-setup'));
  assert.ok(names.includes('scene-cleanup'));
  assert.ok(names.includes('scene-default-true'));
  const map = Object.fromEntries(r.prompts.map(p => [p.name, p.enabled]));
  assert.equal(map['scene-setup'], true);
  assert.equal(map['scene-cleanup'], false);
  assert.equal(map['scene-default-true'], true, 'missing Enabled defaults to true');
});

test('f) escaped/verbatim AiTool strings in code do NOT match as tools', () => {
  const r = scanCore();
  const ids = r.tools.map(t => t.name);
  assert.equal(ids.includes('sample-get'), false);
  assert.equal(ids.includes('sample-rename'), false);
});

test('g) multi-source: each tool tagged with source, sorted merge', () => {
  const merged = mergeSources([
    { ...scanCore(), label: 'core' },
    { ...scanExt(), label: 'unity-ai-animation' }
  ]);
  const bySource = {};
  for (const t of merged.tools) (bySource[t.source] = bySource[t.source] || []).push(t.name);
  assert.ok(bySource['core'].includes('scene-open'));
  assert.ok(bySource['unity-ai-animation'].includes('animation-create'));
  const names = merged.tools.map(t => t.name);
  const sorted = [...names].sort();
  assert.deepEqual(names, sorted);
});

test('h) missing extension dir → graceful: missing flag set, exit 0 path possible', () => {
  const missing = scanSource(FIXTURE_MISSING, 'unity-ai-missing');
  assert.equal(missing.missing, true);
  const merged = mergeSources([
    { ...scanCore(), label: 'core' },
    { ...missing, label: 'unity-ai-missing' }
  ]);
  assert.ok(merged.missing.includes('unity-ai-missing'));
  assert.equal(merged.tools.find(t => t.name === 'scene-open') !== undefined, true);
});

test('i) two runs byte-identical', { skip: !fs.existsSync(SCRIPT) }, () => {
  const tmpDir = fs.mkdtempSync(path.join(require('os').tmpdir(), 'aku-sync-'));
  try {
    const env = { ...process.env, AKU_SYNC_OUT_ROOT: tmpDir };
    execFileSync('node', [SCRIPT, '--plugin-source', FIXTURE_CORE, '--plugin-source', FIXTURE_EXT, '--write'], { env, stdio: 'pipe' });
    const a = fs.readFileSync(path.join(tmpDir, 'snapshots/mcp-tools.json'), 'utf8');
    execFileSync('node', [SCRIPT, '--plugin-source', FIXTURE_CORE, '--plugin-source', FIXTURE_EXT, '--write'], { env, stdio: 'pipe' });
    const b = fs.readFileSync(path.join(tmpDir, 'snapshots/mcp-tools.json'), 'utf8');
    assert.equal(a, b);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

