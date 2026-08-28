/**
 * render-mcp-catalog.js — render the slim MCP_CATALOG.md from the merged
 * scan result. Keeps the catalog compact: one line per tool, source badge
 * for extension tools, prompts split enabled/disabled, table of remaining
 * extensions (uninstalled).
 *
 * Overrides JSON is kit-controlled — concatenated without sanitization.
 * Kept under 200 LOC per the kit's LOC rule.
 */

const KEBAB_RX = /^[a-z][a-z0-9-]*$/;

function autoStub(name) {
  return name.replace(/-/g, ' ').replace(/^./, c => c.toUpperCase()) + '.';
}

function buildByCategory(tools) {
  const by = {};
  for (const t of tools) {
    if (!by[t.category]) by[t.category] = [];
    by[t.category].push(t);
  }
  for (const k of Object.keys(by)) by[k].sort((a, b) => a.name.localeCompare(b.name));
  return by;
}

function sourceBadge(t, coreLabel) {
  return t.source === coreLabel ? '' : ` _(${t.source})_`;
}

function renderHeader(scan, coreLabel) {
  const lines = [
    '# Unity MCP Catalog (illustrative reference)',
    '',
    '> Illustrative inventory of ONE Unity MCP\'s tools — **ai-game-developer** (IvanMurzak Unity-MCP), shown purely as an example of what a Unity MCP can expose. **Not a dependency of this kit**: at runtime, bind to whatever Unity MCP tools your session surfaces in its in-context tool list, not to this list. **Auto-generated** by `scripts/sync-mcp-catalog.cjs` from the vendored plugin sources; curated descriptions live in `scripts/data/mcp-catalog-overrides.json`. The live MCP server remains the source of truth — this is a navigational map.',
    '',
    '> **Reference form**: bare kebab ids in backticks (`scene-open`). The reference server exposes each via an MCP-client prefix (`mcp__ai-game-developer__<id>`) and an auto-generated skill of the same bare id; map the capability to whatever your connected server calls it.',
    '',
    'This catalog is intentionally above 200 LOC because it is reference data, not behavioral code; it has a carve-out in `lint-loc.cjs`.',
    ''
  ];
  lines.push('## Sources', '');
  lines.push('| Source | Tools |', '|---|---|');
  for (const src of Object.keys(scan.sourceCounts).sort()) {
    lines.push(`| ${src} | ${scan.sourceCounts[src]} |`);
  }
  if (scan.missing && scan.missing.length) {
    lines.push('', `> Missing (graceful degradation): ${scan.missing.join(', ')}`);
  }
  lines.push('', `_refreshedAt: ${scan.refreshedAt || 'unknown'}_`, '');
  return lines;
}

function renderCategories(byCategory, overrides, coreLabel) {
  const lines = [];
  const descs = overrides.categoryDescriptions || {};
  const toolOv = overrides.toolOverrides || {};
  const footnotes = overrides.categoryFootnotes || {};
  for (const cat of Object.keys(byCategory).sort()) {
    lines.push(`## ${cat}`, '');
    if (descs[cat]) lines.push(descs[cat], '');
    lines.push('| Tool | Use |', '|---|---|');
    for (const t of byCategory[cat]) {
      const desc = toolOv[t.name] || autoStub(t.name);
      lines.push(`| \`${t.name}\` | ${desc}${sourceBadge(t, coreLabel)} |`);
    }
    lines.push('');
    if (footnotes[cat]) lines.push(footnotes[cat], '');
  }
  return lines;
}

function renderPrompts(prompts) {
  const enabled = prompts.filter(p => p.enabled);
  const disabled = prompts.filter(p => !p.enabled);
  const lines = ['## Prompts', ''];
  lines.push(`Generated MCP prompts. ${enabled.length} enabled, ${disabled.length} disabled by default.`, '');
  if (enabled.length) {
    lines.push('### Enabled (workflow starters)', '', '| Prompt | Source |', '|---|---|');
    for (const p of enabled) lines.push(`| \`${p.name}\` | ${p.source} |`);
    lines.push('');
  }
  if (disabled.length) {
    lines.push('### Disabled by default', '', '<details><summary>Show ' + disabled.length + ' disabled prompts</summary>', '', '| Prompt | Source |', '|---|---|');
    for (const p of disabled) lines.push(`| \`${p.name}\` | ${p.source} |`);
    lines.push('', '</details>', '');
  }
  return lines;
}

function renderRemainingExtensions(overrides) {
  const installed = new Set((overrides.assumedExtensions || []).map(s => s.toLowerCase()));
  const all = [
    { name: 'Unity-AI-Animation', slug: 'unity-ai-animation', replaces: 'animator/animation tools (dropped: animation-keyframe, animator-state, blend-tree, ...)'  },
    { name: 'Unity-AI-ParticleSystem', slug: 'unity-ai-particlesystem', replaces: 'particle modules, sub-emitters, renderer settings' },
    { name: 'Unity-AI-Timeline', slug: 'unity-ai-timeline', replaces: 'timeline tracks/clips/signals — fallback: reflection-method-call + ExecuteMenuItem' },
    { name: 'Unity-AI-Terrain', slug: 'unity-ai-terrain', replaces: 'terrain heightmaps, layers, details, trees' },
    { name: 'Unity-AI-Tilemap', slug: 'unity-ai-tilemap', replaces: 'tilemap layers, tiles, brushes' },
    { name: 'Unity-AI-Splines', slug: 'unity-ai-splines', replaces: 'spline containers, knots, paths' },
    { name: 'Unity-AI-Navigation', slug: 'unity-ai-navigation', replaces: 'navmesh agents, obstacles, off-mesh links' },
    { name: 'Unity-AI-ProBuilder', slug: 'unity-ai-probuilder', replaces: 'probuilder meshes, faces, vertices' },
    { name: 'Unity-AI-InputSystem', slug: 'unity-ai-inputsystem', replaces: 'input actions, bindings, control schemes' }
  ];
  const remaining = all.filter(e => !installed.has(e.slug));
  if (!remaining.length) return [];
  const lines = ['## Remaining extensions (not vendored — install + reflection fallback)', ''];
  lines.push('| Package | Replaces (if installed) |', '|---|---|');
  for (const e of remaining) lines.push(`| \`${e.name}\` | ${e.replaces} |`);
  lines.push('', '> Fallback for all uninstalled extensions: `reflection-method-find` → `reflection-method-call`, or `script-execute` for one-off ops.', '');
  return lines;
}

function render(scan, overrides, coreLabel) {
  const byCategory = buildByCategory(scan.tools);
  const lines = [
    ...renderHeader(scan, coreLabel),
    ...renderCategories(byCategory, overrides, coreLabel),
    ...renderPrompts(scan.prompts),
    ...renderRemainingExtensions(overrides)
  ];
  return lines.join('\n');
}

module.exports = { render, buildByCategory, autoStub, KEBAB_RX };
