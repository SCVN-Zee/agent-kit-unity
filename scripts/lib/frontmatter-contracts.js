/** Discovery contracts for shipped rules and skills. */
function c(lead, terms, fields = {}, forbidden = []) {
  return { lead, terms, fields, forbidden };
}

const CONTRACTS = {
  "skills/aku-codebase-memory/SKILL.md": c("Use when", [
    /explicitly setting up or repairing codebase-memory-mcp/i,
    /project-local Graft setup/i,
    /Not for ordinary code navigation, code review, or Unity Editor operations/i,
  ]),
  "skills/aku-reference-feature/SKILL.md": c("Use when", [
    /Unity gameplay features/i,
    /videos/i,
    /screenshots/i,
    /game juice/i,
    /Not for unrelated bug fixes/i,
  ]),
  "rules/aku-core-rules.md": c(
    "Always applies",
    [/MonoBehaviour lifecycle/i, /mobile performance/i, /every prompt/i],
    { alwaysApply: "true" },
  ),
  "rules/aku-asset-convention-rules.md": c(
    "Use when",
    [
      /naming/i,
      /importing|folder organization|importer intent/i,
      /hierarchy/i,
      /serialized mutation/i,
    ],
    { globs: ["**/Assets/**", ".prefab", ".unity", ".asset", ".mat"] },
  ),
  "rules/aku-code-convention-rules.md": c(
    "Use when",
    [
      /Unity C# policy/i,
      /generating, editing, or refactoring/i,
      /bounded-domain/i,
      /Asset names\/layout use skill:\/\/aku-asset-conventions/i,
      /Do not activate for report-only file, diff, commit, or PR review/i,
      /skill:\/\/aku-code-review owns it/i,
    ],
    { globs: "**/*.cs" },
    [/^Use when[^.]*\breview(?:ing)?\b/i],
  ),
  "tiers/supercent/rules/aku-sc-rules.md": c(
    "Always applies",
    [/Supercent/i, /\[Dev\]/i, /Assets\/Supercent/i],
    { alwaysApply: "true" },
  ),
  "tiers/luna/rules/aku-luna-rules.md": c(
    "Use when",
    [/Odin-decorated C#/i, /Luna/i, /editor-strip guard/i, /focused skills/i],
    { globs: "**/*.cs" },
  ),
  "tiers/luna/skills/aku-luna-build-check/SKILL.md": c("Use when", [
    /luna\.json/i,
    /six scene, AA, mesh, and animation gates/i,
    /not source or asset compatibility review/i,
  ]),
  "tiers/luna/skills/aku-luna-conventions/SKILL.md": c("Use when", [
    /Luna/i,
    /authoring/i,
    /editor-strip/i,
    /skill:\/\/aku-luna-code-review/i,
  ]),
  "skills/aku-odin/SKILL.md": c("Use when", [
    /Sirenix Odin Inspector is installed/i,
    /Inspector UX/i,
    /Without Odin/i,
    /does not activate/i,
  ]),
  "skills/aku-code-conventions/SKILL.md": c(
    "Use when",
    [
      /Unity C# policy/i,
      /generating, editing, or refactoring/i,
      /reference wiring/i,
      /skill:\/\/aku-asset-conventions/i,
      /skill:\/\/aku-odin/i,
      /Do not activate for report-only review; use skill:\/\/aku-code-review/i,
    ],
    {},
    [/^Use when[^.]*\breview(?:ing)?\b/i],
  ),
  "tiers/luna/skills/aku-luna-code-review/SKILL.md": c("Use when", [
    /Luna/i,
    /Report-only/i,
    /Bridge\.NET/i,
    /skill:\/\/aku-luna-build-check/i,
  ]),
  "skills/aku-code-review/SKILL.md": c("Use when", [
    /report-only review/i,
    /Unity file, diff, commit, PR/i,
    /including Unity C#/i,
    /read-only verification/i,
    /loads skill:\/\/aku-code-conventions/i,
  ]),
  "skills/aku-asset-conventions/SKILL.md": c("Use when", [
    /naming/i,
    /importing|folder layout|importer intent/i,
    /hierarchy/i,
    /owns conventions, not mutation/i,
    /serialized operations/i,
  ]),
};

module.exports = { CONTRACTS };
