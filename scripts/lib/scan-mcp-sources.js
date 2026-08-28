/**
 * scan-mcp-sources.js — walk a C# source directory and extract Unity MCP
 * tool ids and prompt names from IvanMurzak/Unity-MCP plugin format.
 *
 * Tools: `public const string XxxToolId = "kebab-id";` declarations.
 *   Referenced from `[AiTool(XxxToolId, Title = "...")]`. We read the
 *   constants directly — they are 1:1 with tool registrations and tolerate
 *   the multi-line `[AiTool(...)]` formatting the plugin uses.
 *
 * Prompts: single-line `[AiPrompt(Name = "kebab", Role = ..., Enabled = ...)]`.
 *
 * Exclusions:
 *   - Paths containing `Test`, `TestFiles`, or `Sample` (skill codegen samples).
 *   - Tool ids starting with `sample-` or `chess-` (demo prefixes).
 *   - Escaped/verbatim string occurrences inside other string literals
 *     (`\"id\"`, `@\"id\"`) — these are codegen templates, not registrations.
 *     Filter: only count constants that match the exact `ToolId = "kebab"` form.
 */

const fs = require('fs');
const path = require('path');

const TOOL_ID_RX = /\b(\w+ToolId)\s*=\s*"([a-z][a-z0-9-]*)"/g;
const PROMPT_RX = /\[AiPrompt\(([^)]*Name\s*=\s*"([a-z][a-z0-9-]*)"[^)]*)\)\]/g;
const ENABLED_RX = /Enabled\s*=\s*(true|false)/i;
const EXCLUDE_PATH_RX = /(?:^|[\\/])(?:Test|TestFiles|Sample|Samples|Tests)(?:[\\/]|$)/;
const EXCLUDE_ID_PREFIXES = ['sample-', 'chess-'];

function walkCs(rootDir) {
  const files = [];
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { continue; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile() && e.name.endsWith('.cs')) files.push(p);
    }
  }
  return files;
}

function isExcludedPath(absPath, rootDir) {
  const rel = path.relative(rootDir, absPath);
  return EXCLUDE_PATH_RX.test(rel) || EXCLUDE_PATH_RX.test(path.sep + rel);
}

function isExcludedId(id) {
  return EXCLUDE_ID_PREFIXES.some(p => id.startsWith(p));
}

function categoryOf(id) {
  const seg = id.split('-')[0];
  return seg || 'meta';
}

function scanSource(rootDir, sourceLabel) {
  if (!fs.existsSync(rootDir)) return { tools: [], prompts: [], newestMtimeMs: 0, missing: true };
  const stat = fs.statSync(rootDir);
  if (!stat.isDirectory()) return { tools: [], prompts: [], newestMtimeMs: 0, missing: true };

  const files = walkCs(rootDir);
  const seenTools = new Set();
  const seenPrompts = new Set();
  const tools = [];
  const prompts = [];
  let newestMtimeMs = 0;

  for (const file of files) {
    if (isExcludedPath(file, rootDir)) continue;
    let content;
    try { content = fs.readFileSync(file, 'utf8'); } catch (_) { continue; }
    const mt = fs.statSync(file).mtimeMs;
    if (mt > newestMtimeMs) newestMtimeMs = mt;

    TOOL_ID_RX.lastIndex = 0;
    let m;
    while ((m = TOOL_ID_RX.exec(content))) {
      const id = m[2];
      if (isExcludedId(id)) continue;
      if (seenTools.has(id)) continue;
      seenTools.add(id);
      tools.push({ name: id, category: categoryOf(id), source: sourceLabel });
    }

    PROMPT_RX.lastIndex = 0;
    while ((m = PROMPT_RX.exec(content))) {
      const inner = m[1];
      const name = m[2];
      if (isExcludedId(name)) continue;
      if (seenPrompts.has(name)) continue;
      seenPrompts.add(name);
      const em = inner.match(ENABLED_RX);
      const enabled = em ? em[1].toLowerCase() === 'true' : true;
      prompts.push({ name, enabled, source: sourceLabel });
    }
  }
  return { tools, prompts, newestMtimeMs, missing: false };
}

function categoryMergeMap() {
  return {
    'editor-application': 'editor',
    'editor-selection': 'editor'
  };
}

function normalizeCategory(rawCategory, fullId) {
  const merges = categoryMergeMap();
  if (merges[rawCategory]) return merges[rawCategory];
  return rawCategory || 'meta';
}

function mergeSources(results) {
  const allTools = [];
  const allPrompts = [];
  let newestMtimeMs = 0;
  const sourceCounts = {};
  const missing = [];
  for (const r of results) {
    if (r.missing) { missing.push(r.label); continue; }
    if (r.newestMtimeMs > newestMtimeMs) newestMtimeMs = r.newestMtimeMs;
    sourceCounts[r.label] = r.tools.length;
    for (const t of r.tools) {
      const cat = normalizeCategory(t.category, t.name);
      allTools.push({ ...t, category: cat });
    }
    for (const p of r.prompts) allPrompts.push(p);
  }
  allTools.sort((a, b) => a.name.localeCompare(b.name));
  allPrompts.sort((a, b) => a.name.localeCompare(b.name));
  const refreshedAt = newestMtimeMs > 0 ? new Date(newestMtimeMs).toISOString() : null;
  return { tools: allTools, prompts: allPrompts, refreshedAt, sourceCounts, missing };
}

module.exports = { scanSource, mergeSources, normalizeCategory, categoryOf };
