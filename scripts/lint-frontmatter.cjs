#!/usr/bin/env node
/** Validate trigger-first discovery metadata for every shipped OMP rule and skill. */

const fs = require('fs');
const path = require('path');

const KIT_ROOT = path.resolve(__dirname, '..');
const MAX_DESCRIPTION = 360;
const SKILL_NAME = /^aku-[a-z0-9]+(?:-[a-z0-9]+)*$/;

const CONTRACTS = {
  'rules/aku-mcp-policy.md': c('Use when', [/Editor state|serialized assets/i, /connected Unity MCP/i, /never raw file edits/i], { globs: ['.prefab', '.unity', '.controller', '.anim', '.mat'] }),
  'rules/aku-mcp-guard.md': c('Triggers when', [/corruptible Unity asset/i, /\.prefab/i, /connected Unity MCP/i, /TTSR/i], { scope: ['tool:edit', 'tool:write'], globs: ['.prefab', '.unity', '.controller', '.anim', '.mat', '.playable', '.signal'], condition: '[\\\\s\\\\S]', interruptMode: 'tool-only' }),
  'rules/aku-capability-routing.md': c('Use when', [/C# authoring/i, /planning/i, /best installed skill/i, /native fallback/i, /never invent/i]),
  'rules/aku-engine-rules.md': c('Always applies', [/MonoBehaviour lifecycle/i, /mobile performance/i, /connected-Unity-MCP/i, /every prompt/i], { alwaysApply: 'true' }),
  'rules/aku-asset-convention-rules.md': c('Use when', [/naming/i, /importing|folder organization|importer intent/i, /hierarchy/i, /serialized mutation/i, /connected Unity MCP/i], { globs: ['**/Assets/**', '.prefab', '.unity', '.asset', '.mat'] }),
  'rules/aku-code-convention-rules.md': c('Use when', [/Unity C# policy/i, /generating, editing, or refactoring/i, /bounded-domain/i, /Asset names\/layout use skill:\/\/aku-asset-conventions/i, /Do not activate for report-only file, diff, commit, or PR review/i, /skill:\/\/aku-code-review owns it/i], { globs: '**/*.cs' }, [/^Use when[^.]*\breview(?:ing)?\b/i]),
  'rules/aku-parallel-rules.md': c('Use when', [/subagents|parallel execution/i, /read-only/i, /serialize/i]),
  'tiers/supercent/rules/aku-sc-rules.md': c('Always applies', [/Supercent/i, /\[Dev\]/i, /Assets\/Supercent/i], { alwaysApply: 'true' }),
  'tiers/luna/rules/aku-luna-rules.md': c('Use when', [/Odin-decorated C#/i, /Luna/i, /editor-strip guard/i, /focused skills/i], { globs: '**/*.cs' }),
  'tiers/concurrent/rules/aku-session-commit-rules.md': c('Triggers when', [/blanket staging/i, /git add -A/i, /explicit-path staging/i], { scope: 'tool:bash', condition: ['git\\\\s+add\\\\s+-A', 'git\\\\s+add\\\\s+--all', 'git\\\\s+add\\\\s+\\\\.', 'git\\\\s+commit\\\\s+-'], interruptMode: 'tool-only' }),
  'skills/aku-scene/SKILL.md': c('Use when', [/Unity scenes/i, /Cinemachine/i, /prefab instances/i, /skill:\/\/aku-prefab/i, /never hand-edit/i]),
  'skills/aku-luna-build-check/SKILL.md': c('Use when', [/luna\.json/i, /six scene, AA, mesh, and animation gates/i, /not source or asset compatibility review/i]),
  'skills/aku-odin/SKILL.md': c('Use when', [/Sirenix Odin Inspector is installed/i, /Inspector UX/i, /Without Odin/i, /does not activate/i]),
  'skills/aku-prefab/SKILL.md': c('Use when', [/named Unity prefab asset/i, /prefab stage/i, /skill:\/\/aku-scene/i, /never hand-edit/i]),
  'skills/aku-code-conventions/SKILL.md': c('Use when', [/Unity C# policy/i, /generating, editing, or refactoring/i, /reference wiring/i, /skill:\/\/aku-asset-conventions/i, /skill:\/\/aku-odin/i, /Do not activate for report-only review; use skill:\/\/aku-code-review/i], {}, [/^Use when[^.]*\breview(?:ing)?\b/i]),
  'skills/aku-code-review-luna/SKILL.md': c('Use when', [/Luna/i, /Report-only/i, /Bridge\.NET/i, /skill:\/\/aku-luna-build-check/i]),
  'skills/aku-code-review/SKILL.md': c('Use when', [/report-only review/i, /Unity file, diff, commit, PR/i, /including Unity C#/i, /read-only verification/i, /loads skill:\/\/aku-code-conventions/i, /skill:\/\/aku-code-review-luna/i]),
  'skills/aku-animator/SKILL.md': c('Use when', [/AnimatorControllers/i, /AnimationClips/i, /parameter-driven/i, /connected Unity MCP/i, /never direct file edits/i]),
  'skills/aku-asset-conventions/SKILL.md': c('Use when', [/naming/i, /importing|folder layout|importer intent/i, /hierarchy/i, /owns conventions, not mutation/i, /serialized operations/i, /connected Unity MCP/i])
};

function c(lead, terms, fields = {}, forbidden = []) { return { lead, terms, fields, forbidden }; }

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const fields = {};
  const errors = [];
  let lastKey = null;
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*)\s*:\s*(.*)$/);
    if (!kv) {
      if (lastKey === 'description' && /^\s+\S/.test(line)) errors.push('description must be a single-line scalar');
      continue;
    }
    const key = kv[1];
    const raw = kv[2].trim();
    lastKey = key;
    if (/^[|>][-+]?$/.test(raw)) errors.push('field "' + key + '" uses unsupported YAML block scalar ' + raw);
    else fields[key] = raw;
  }
  return { fields, errors };
}

function scalar(raw, errors, label) {
  if (!raw) return '';
  if (raw.startsWith('"')) {
    try { return JSON.parse(raw); }
    catch (_) { errors.push(label + ': invalid quoted scalar'); return ''; }
  }
  if (raw.startsWith("'") && raw.endsWith("'")) return raw.slice(1, -1).replace(/''/g, "'");
  return raw;
}

function discover(ompRoot) {
  const found = [];
  const addFiles = (dir, prefix) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isFile() && e.name.endsWith('.md')) found.push(path.posix.join(prefix, e.name));
    }
  };
  const skills = path.join(ompRoot, 'skills');
  if (fs.existsSync(skills)) for (const e of fs.readdirSync(skills, { withFileTypes: true })) {
    if (e.isDirectory()) found.push(path.posix.join('skills', e.name, 'SKILL.md'));
  }
  addFiles(path.join(ompRoot, 'rules'), 'rules');
  const tiers = path.join(ompRoot, 'tiers');
  if (fs.existsSync(tiers)) for (const e of fs.readdirSync(tiers, { withFileTypes: true })) {
    if (e.isDirectory()) addFiles(path.join(tiers, e.name, 'rules'), path.posix.join('tiers', e.name, 'rules'));
  }
  return found.sort();
}

function validateTree(root = KIT_ROOT) {
  const ompRoot = path.join(root, 'omp');
  const actual = discover(ompRoot);
  const expected = Object.keys(CONTRACTS).sort();
  const errors = [];
  for (const rel of expected.filter((p) => !actual.includes(p))) errors.push(rel + ': contracted metadata file missing');
  for (const rel of actual.filter((p) => !expected.includes(p))) errors.push(rel + ': shipped metadata has no discovery contract');
  for (const rel of actual.filter((p) => expected.includes(p))) validateFile(ompRoot, rel, CONTRACTS[rel], errors);
  const counts = {
    skills: actual.filter((p) => p.startsWith('skills/')).length,
    baseRules: actual.filter((p) => p.startsWith('rules/')).length,
    tierRules: actual.filter((p) => p.startsWith('tiers/')).length
  };
  return { errors, counts, scanned: actual.length };
}

function validateFile(ompRoot, rel, contract, errors) {
  const file = path.join(ompRoot, ...rel.split('/'));
  if (!fs.existsSync(file)) { errors.push(rel + ': metadata file missing'); return; }
  const parsed = parseFrontmatter(fs.readFileSync(file, 'utf8'));
  if (!parsed) { errors.push(rel + ': missing or malformed frontmatter'); return; }
  for (const e of parsed.errors) errors.push(rel + ': ' + e);
  const fm = parsed.fields;
  const isSkill = rel.startsWith('skills/');
  const allowed = new Set(['description', ...Object.keys(contract.fields), ...(isSkill ? ['name'] : [])]);
  for (const key of Object.keys(fm)) if (!allowed.has(key)) errors.push(rel + ': unexpected frontmatter field "' + key + '"');
  if (isSkill) {
    const expectedName = rel.split('/')[1];
    if (!fm.name || !SKILL_NAME.test(fm.name) || fm.name !== expectedName) errors.push(rel + ': name must equal ' + expectedName + ' and match aku-* syntax');
  }
  const description = scalar(fm.description, errors, rel + ' description');
  if (!description) errors.push(rel + ': missing frontmatter field "description"');
  else {
    if (description.length > MAX_DESCRIPTION) errors.push(rel + ': description exceeds ' + MAX_DESCRIPTION + ' characters');
    if (!description.startsWith(contract.lead)) errors.push(rel + ': description must start with "' + contract.lead + '"');
    for (const term of contract.terms) if (!term.test(description)) errors.push(rel + ': description missing discovery term ' + term);
    for (const term of contract.forbidden) if (term.test(description)) errors.push(rel + ': description contains forbidden discovery term ' + term);
  }
  for (const [key, expected] of Object.entries(contract.fields)) {
    const tokens = Array.isArray(expected) ? expected : [expected];
    for (const token of tokens) {
      if (!fm[key] || !fm[key].includes(token)) errors.push(rel + ': frontmatter field "' + key + '" must preserve ' + token);
    }
  }
}

function runCli(root = KIT_ROOT) {
  const result = validateTree(root);
  const summary = result.scanned + ' surfaces: ' + result.counts.skills + ' skills, ' + result.counts.baseRules + ' base rules, ' + result.counts.tierRules + ' tier rules';
  if (!result.errors.length) { console.log('lint-frontmatter: OK (' + summary + ')'); return 0; }
  console.error('lint-frontmatter: ' + result.errors.length + ' error(s) after scanning ' + summary + ':');
  for (const error of result.errors) console.error('  ' + error);
  return 2;
}

if (require.main === module) process.exitCode = runCli();
module.exports = { CONTRACTS, MAX_DESCRIPTION, parseFrontmatter, validateTree, runCli };
