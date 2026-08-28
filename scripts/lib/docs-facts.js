/**
 * docs-facts.js — derive the kit's real counts from source.
 *
 * Every fact here is computed, never written down. That is the whole point:
 * `docs/codebase-summary.md` claimed 276 tools for months because the number was
 * typed into prose once (it was the OLD unity-mcp-pro server's count) and nothing
 * ever re-derived it. A count that lives in two places drifts; a count that lives
 * in one place and is read cannot.
 *
 * Consumed by scripts/lint-docs-counts.cjs.
 */

const fs = require('fs');
const path = require('path');

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/** Entries of `dir` matching `pred`, or [] when the dir is absent. */
function entries(dir, pred) {
  let list;
  try { list = fs.readdirSync(dir, { withFileTypes: true }); }
  catch (_) { return []; }
  return list.filter(pred).map((e) => e.name);
}

const isDir = (e) => e.isDirectory();
const isExt = (ext) => (e) => e.isFile() && e.name.endsWith(ext);

/**
 * Shipped component inventory, keyed by the docs/components/ category that
 * mirrors it. The OMP kit ships skills (folders) and rules (markdown) only —
 * the retired claude/codex build's agents, hooks, workflows, and lib have no
 * counterpart under omp/.
 */
function componentInventory(root) {
  const c = (sub) => path.join(root, 'omp', sub);
  return {
    skills: entries(c('skills'), isDir),
    rules: entries(c('rules'), isExt('.md')).map((n) => n.replace(/\.md$/, ''))
  };
}

function deriveFacts(root) {
  const tools = readJson(path.join(root, 'snapshots/mcp-tools.json'));
  const prompts = readJson(path.join(root, 'snapshots/mcp-prompts.json'));

  const inventory = componentInventory(root);
  const sourceCounts = tools.sourceCounts || {};

  return {
    inventory,
    tools: {
      total: tools.count,
      core: sourceCounts.core,
      bySource: sourceCounts
    },
    prompts: {
      total: prompts.count,
      enabled: prompts.enabledCount
    },
    counts: {
      skills: inventory.skills.length,
      rules: inventory.rules.length
    }
  };
}

module.exports = { deriveFacts, componentInventory };
