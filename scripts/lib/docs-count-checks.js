/**
 * docs-count-checks.js — phrase templates that assert a catalog count, so
 * lint-docs-counts can flag docs prose that drifts from the real numbers.
 *
 * Split from lint-docs-counts.cjs to stay under the 200-LOC cap and because this
 * pattern table is the part that gets edited (a new documented count = one entry
 * here, not a scanner change).
 *
 * Every pattern is PHRASE-shaped, never generic number-scraping — a gate that
 * fires on real prose trains people to suppress it. Two guards enforce that:
 * counts require 2+ digits (so "chain 2-3 tools" cannot trip them), and
 * NON_CATALOG_RX exempts counts scoped elsewhere ("~160 dropped specialty tools").
 *
 * Each check: { rx, skip?, pick, got, label }. `pick` gets the match plus facts
 * so one pattern can resolve to different facts ("core tools" -> 74).
 */

const NON_CATALOG_RX = /\b(specialty|dropped|removed|legacy|deprecated|old|snake)\b/i;

function buildChecks(f) {
  return [
    {
      // "~82 kebab tools" | "74 core bare kebab tools" | "250+ MCP tools" | "276 tools"
      rx: /~?\b(\d{2,})\s*\+?\s*((?:[a-z-]+\s+){0,3}?)tools?\b/gi,
      skip: (m) => NON_CATALOG_RX.test(m[2]),
      pick: (m) => (/\bcore\b/i.test(m[2]) ? f.tools.core : f.tools.total),
      got: (m) => Number(m[1]),
      label: (m) => (/\bcore\b/i.test(m[2]) ? 'core tool count' : 'total tool count')
    },
    {
      rx: /\b(\d{2,})\s+prompts\b/gi,
      pick: () => f.prompts.total,
      got: (m) => Number(m[1]),
      label: () => 'prompt count'
    },
    {
      // "Skills (4 total)" | "Skills — 4".
      // Workflows is deliberately absent: "CI/CD Workflows (3 total)" is a real
      // heading about .github/workflows/, not a kit component count.
      // The table form below keeps Workflows covered, where context is unambiguous.
      rx: /\b(Skills|Agents|Hooks|Rules)\s*(?:\((\d+)\s+total\)|—\s*(\d+))/gi,
      pick: (m) => f.counts[m[1].toLowerCase()],
      got: (m) => Number(m[2] ?? m[3]),
      label: (m) => `${m[1].toLowerCase()} count`
    },
    {
      // "| Skills | 7 |" — the docs/components category table
      rx: /\|\s*(Skills|Agents|Hooks|Rules|Workflows)\s*\|\s*(\d+)\s*\|/gi,
      pick: (m) => f.counts[m[1].toLowerCase()],
      got: (m) => Number(m[2]),
      label: (m) => `${m[1].toLowerCase()} count (table)`
    },
    {
      // "7 domain + specialist skills"
      rx: /\b(\d+)\s+domain\s*\+\s*specialist\s+skills\b/gi,
      pick: () => f.counts.skills,
      got: (m) => Number(m[1]),
      label: () => 'skill count'
    }
  ];
}

module.exports = { buildChecks, NON_CATALOG_RX };
