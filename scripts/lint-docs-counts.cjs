#!/usr/bin/env node
/**
 * lint-docs-counts.cjs — fail when documentation states a count that source
 * disagrees with, or when a shipped component has no docs/components/ page.
 *
 * Why this exists: a hand-typed count once sat in prose for months after the
 * real number had moved on, and nothing ever re-derived it. Hand-written
 * counts drift silently — so re-derive them from source and compare.
 *
 * Scope: omp/ + README.md + AGENTS.md + docs/,
 *        minus docs/journals/ (append-only history; old entries legitimately
 *        cite the counts that were true when written).
 *
 * Two check families:
 *   A. Anchored phrases — templates that unambiguously state a component
 *      count. Deliberately NOT generic number-scraping: patterns are
 *      phrase-shaped so ordinary prose does not trip them.
 *   B. Mirror completeness — every shipped skill/rule has a
 *      docs/components/ page, and every page maps back to a shipped file.
 *
 * Inline ignore: `<!-- docs-counts:ignore -->` on the same or preceding line.
 * Exit codes: 0 ok, 1 fatal, 2 violations found.
 */

const fs = require('fs');
const path = require('path');
const { walkMd } = require('./lib/walk-md');
const { deriveFacts } = require('./lib/docs-facts');
const { buildChecks } = require('./lib/docs-count-checks');

const KIT_ROOT = path.resolve(__dirname, '..');
const IGNORE_MARKER = 'docs-counts:ignore';
const TOP_LEVEL = ['README.md', 'AGENTS.md'];

function* scanFiles(root) {
  const ompDir = path.join(root, 'omp');
  if (fs.existsSync(ompDir)) {
    for (const e of walkMd(ompDir)) yield e;
  }
  for (const top of TOP_LEVEL) {
    const p = path.join(root, top);
    if (fs.existsSync(p)) yield { path: p, content: fs.readFileSync(p, 'utf8') };
  }
  const docsDir = path.join(root, 'docs');
  if (fs.existsSync(docsDir)) {
    for (const e of walkMd(docsDir, {
      ignores: new Set(['node_modules', '.git', 'dist', 'build', '.next', '.cache', 'journals'])
    })) yield e;
  }
}

function checkCounts(root, facts) {
  const issues = [];
  const active = buildChecks(facts);
  for (const { path: filePath, content } of scanFiles(root)) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes(IGNORE_MARKER)) continue;
      if (i > 0 && lines[i - 1].includes(IGNORE_MARKER)) continue;
      for (const c of active) {
        c.rx.lastIndex = 0;
        let m;
        while ((m = c.rx.exec(line))) {
          if (c.skip && c.skip(m)) continue;
          const expected = c.pick(m);
          const got = c.got(m);
          if (expected === undefined || got === expected) continue;
          issues.push({
            filePath, line: i + 1, got, expected,
            label: c.label(m), text: m[0].trim()
          });
        }
      }
    }
  }
  return issues;
}

/**
 * Category -> the docs/components/ subdir mirroring it.
 *
 * Mirror completeness is enforced per-category only where a docs/components/
 * <category>/ dir exists. The OMP kit retired the tracked component-doc mirror
 * (docs/ is untracked, local-only working docs), so an absent dir means "this
 * kit does not maintain mirror pages here" — not "every shipped file is
 * undocumented". Where the dir does exist, both missing and orphan pages fire.
 */
function checkMirror(root, facts) {
  const issues = [];
  const base = path.join(root, 'docs/components');
  for (const [category, stems] of Object.entries(facts.inventory)) {
    const dir = path.join(base, category);
    if (!fs.existsSync(dir)) continue;
    for (const stem of stems) {
      if (!fs.existsSync(path.join(dir, `${stem}.md`))) {
        issues.push({ kind: 'missing', category, stem });
      }
    }
    let pages = [];
    try {
      pages = fs.readdirSync(dir).filter((n) => n.endsWith('.md') && n !== 'README.md');
    } catch (_) { continue; }
    const shipped = new Set(stems);
    for (const page of pages) {
      const stem = page.replace(/\.md$/, '');
      if (!shipped.has(stem)) issues.push({ kind: 'orphan', category, stem });
    }
  }
  return issues;
}

/** `--root <p>` retargets the scan at a fixture tree, so tests can run against a synthetic layout. */
function parseRoot(argv) {
  const i = argv.indexOf('--root');
  return i !== -1 && argv[i + 1] ? path.resolve(argv[i + 1]) : KIT_ROOT;
}

(function main() {
  const root = parseRoot(process.argv.slice(2));
  let facts;
  try { facts = deriveFacts(root); }
  catch (e) { process.stderr.write(`lint-docs-counts: ${e.message}\n`); process.exit(1); }

  const countIssues = checkCounts(root, facts);
  const mirrorIssues = checkMirror(root, facts);

  if (!countIssues.length && !mirrorIssues.length) {
    const c = facts.counts;
    console.log(
      `lint-docs-counts: OK (${c.skills} skills, ${c.rules} rules; mirror complete).`
    );
    process.exit(0);
  }

  if (countIssues.length) {
    console.error(`lint-docs-counts: ${countIssues.length} stale count(s):`);
    for (const u of countIssues) {
      const rel = path.relative(root, u.filePath);
      console.error(`  ${rel}:${u.line}: "${u.text}" — claimed ${u.got}, expected ${u.expected} (${u.label})`);
    }
  }
  if (mirrorIssues.length) {
    console.error(`lint-docs-counts: ${mirrorIssues.length} mirror gap(s):`);
    for (const u of mirrorIssues) {
      console.error(u.kind === 'missing'
        ? `  missing docs/components/${u.category}/${u.stem}.md (shipped, undocumented)`
        : `  orphan  docs/components/${u.category}/${u.stem}.md (documented, not shipped)`);
    }
  }
  process.exit(2);
})();
