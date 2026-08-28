/**
 * build-mcp-snapshots.js — serialize merged scan results into the four
 * snapshot/flat JSON artifacts. Pure formatters: no IO, no side effects.
 */

function buildToolsSnapshot(tools, refreshedAt, sourceCounts) {
  const names = tools.map(t => t.name);
  const details = tools.map(t => ({ name: t.name, category: t.category, source: t.source }));
  return JSON.stringify({
    refreshedAt,
    count: names.length,
    sourceCounts,
    tools: names,
    toolDetails: details
  }, null, 2) + '\n';
}

function buildByCategorySnapshot(tools, refreshedAt) {
  const out = {};
  for (const t of tools) {
    if (!out[t.category]) out[t.category] = [];
    out[t.category].push(t.name);
  }
  for (const k of Object.keys(out)) out[k].sort();
  const sorted = {};
  for (const k of Object.keys(out).sort()) sorted[k] = out[k];
  return JSON.stringify({ refreshedAt, byCategory: sorted }, null, 2) + '\n';
}

function buildPromptsSnapshot(prompts, refreshedAt) {
  return JSON.stringify({
    refreshedAt,
    count: prompts.length,
    enabledCount: prompts.filter(p => p.enabled).length,
    prompts
  }, null, 2) + '\n';
}

module.exports = {
  buildToolsSnapshot,
  buildByCategorySnapshot,
  buildPromptsSnapshot
};
