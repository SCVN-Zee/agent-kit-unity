/**
 * Fixture kit for lint-docs-counts tests.
 *
 * Builds the smallest tree deriveFacts() can read for the OMP kit: two snapshots
 * and a component inventory (skills + rules) with a COMPLETE docs/components
 * mirror — so family B (mirror completeness) stays silent unless a test
 * deliberately perturbs it, and family A (count phrases) can be exercised alone.
 *
 * Fixture counts: 82 tools (74 core), 46 prompts, 2 skills, 2 rules.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const KIT_ROOT = path.resolve(__dirname, '../../..');
const SCRIPT = path.join(KIT_ROOT, 'scripts/lint-docs-counts.cjs');

const DIRS = [
  'omp/skills/aku-alpha', 'omp/skills/aku-beta', 'omp/rules',
  'snapshots', 'docs', 'docs/journals',
  'docs/components/skills', 'docs/components/rules'
];

const MIRROR = {
  skills: ['aku-alpha', 'aku-beta'],
  rules: ['aku-one', 'aku-two']
};

function makeTmpRoot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aku-counts-'));
  for (const d of DIRS) fs.mkdirSync(path.join(dir, d), { recursive: true });

  write(dir, 'snapshots/mcp-tools.json', JSON.stringify({
    count: 82,
    sourceCounts: { core: 74, 'unity-ai-animation': 6, 'unity-ai-particlesystem': 2 },
    tools: []
  }));
  write(dir, 'snapshots/mcp-prompts.json', JSON.stringify({ count: 46, enabledCount: 0, prompts: [] }));

  write(dir, 'omp/skills/aku-alpha/SKILL.md', '# alpha\n');
  write(dir, 'omp/skills/aku-beta/SKILL.md', '# beta\n');
  write(dir, 'omp/rules/aku-one.md', '# one\n');
  write(dir, 'omp/rules/aku-two.md', '# two\n');

  for (const [cat, stems] of Object.entries(MIRROR)) {
    for (const s of stems) write(dir, `docs/components/${cat}/${s}.md`, `# ${s}\n`);
  }
  return dir;
}

function write(root, rel, text) {
  fs.writeFileSync(path.join(root, rel), text);
}

/** Run the gate against `root`; never throws — returns { code, out }. */
function run(root) {
  try {
    const out = execFileSync('node', [SCRIPT, '--root', root], { encoding: 'utf8', stdio: 'pipe' });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: `${e.stdout || ''}${e.stderr || ''}` };
  }
}

module.exports = { makeTmpRoot, run, write };
