#!/usr/bin/env node
/** Validate trigger-first discovery metadata for every shipped OMP rule and skill. */

const fs = require("fs");
const path = require("path");

const KIT_ROOT = path.resolve(__dirname, "..");
const MAX_DESCRIPTION = 360;
const SKILL_NAME = /^aku-[a-z0-9]+(?:-[a-z0-9]+)*$/;

const { CONTRACTS } = require("./lib/frontmatter-contracts");

const { parseFrontmatter, scalar } = require("./lib/frontmatter-parser");

function discover(ompRoot) {
  const found = [];
  const addFiles = (dir, prefix) => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isFile() && e.name.endsWith(".md"))
        found.push(path.posix.join(prefix, e.name));
    }
  };
  const skills = path.join(ompRoot, "skills");
  if (fs.existsSync(skills))
    for (const e of fs.readdirSync(skills, { withFileTypes: true })) {
      if (e.isDirectory())
        found.push(path.posix.join("skills", e.name, "SKILL.md"));
    }
  addFiles(path.join(ompRoot, "rules"), "rules");
  const tiers = path.join(ompRoot, "tiers");
  if (fs.existsSync(tiers))
    for (const e of fs.readdirSync(tiers, { withFileTypes: true })) {
      if (!e.isDirectory()) continue;
      addFiles(
        path.join(tiers, e.name, "rules"),
        path.posix.join("tiers", e.name, "rules"),
      );
      const tierSkills = path.join(tiers, e.name, "skills");
      if (fs.existsSync(tierSkills))
        for (const s of fs.readdirSync(tierSkills, { withFileTypes: true })) {
          if (s.isDirectory())
            found.push(
              path.posix.join("tiers", e.name, "skills", s.name, "SKILL.md"),
            );
        }
    }
  return found.sort();
}

function validateTree(root = KIT_ROOT) {
  const ompRoot = path.join(root, "kit");
  const actual = discover(ompRoot);
  const expected = Object.keys(CONTRACTS).sort();
  const errors = [];
  for (const rel of expected.filter((p) => !actual.includes(p)))
    errors.push(rel + ": contracted metadata file missing");
  for (const rel of actual.filter((p) => !expected.includes(p)))
    errors.push(rel + ": shipped metadata has no discovery contract");
  for (const rel of actual.filter((p) => expected.includes(p)))
    validateFile(ompRoot, rel, CONTRACTS[rel], errors);
  const counts = {
    skills: actual.filter((p) => p.startsWith("skills/")).length,
    baseRules: actual.filter((p) => p.startsWith("rules/")).length,
    tierRules: actual.filter(
      (p) => p.startsWith("tiers/") && p.includes("/rules/"),
    ).length,
    tierSkills: actual.filter(
      (p) => p.startsWith("tiers/") && p.includes("/skills/"),
    ).length,
  };
  return { errors, counts, scanned: actual.length };
}

function validateFile(ompRoot, rel, contract, errors) {
  const file = path.join(ompRoot, ...rel.split("/"));
  if (!fs.existsSync(file)) {
    errors.push(rel + ": metadata file missing");
    return;
  }
  const parsed = parseFrontmatter(fs.readFileSync(file, "utf8"));
  if (!parsed) {
    errors.push(rel + ": missing or malformed frontmatter");
    return;
  }
  for (const e of parsed.errors) errors.push(rel + ": " + e);
  const fm = parsed.fields;
  const isSkill = rel.startsWith("skills/") || rel.includes("/skills/");
  const allowed = new Set([
    "description",
    ...Object.keys(contract.fields),
    ...(isSkill ? ["name"] : []),
  ]);
  for (const key of Object.keys(fm))
    if (!allowed.has(key))
      errors.push(rel + ': unexpected frontmatter field "' + key + '"');
  if (isSkill) {
    const expectedName = rel.split("/").slice(-2)[0];
    if (!fm.name || !SKILL_NAME.test(fm.name) || fm.name !== expectedName)
      errors.push(
        rel + ": name must equal " + expectedName + " and match aku-* syntax",
      );
  }
  const description = scalar(fm.description, errors, rel + " description");
  if (description) {
    if (description.length > MAX_DESCRIPTION)
      errors.push(
        rel + ": description exceeds " + MAX_DESCRIPTION + " characters",
      );
    if (!description.startsWith(contract.lead))
      errors.push(
        rel + ': description must start with "' + contract.lead + '"',
      );
    for (const term of contract.terms)
      if (!term.test(description))
        errors.push(rel + ": description missing discovery term " + term);
    for (const term of contract.forbidden)
      if (term.test(description))
        errors.push(
          rel + ": description contains forbidden discovery term " + term,
        );
  } else errors.push(rel + ': missing frontmatter field "description"');
  for (const [key, expected] of Object.entries(contract.fields)) {
    const tokens = Array.isArray(expected) ? expected : [expected];
    for (const token of tokens) {
      if (!fm[key] || !fm[key].includes(token))
        errors.push(
          rel + ': frontmatter field "' + key + '" must preserve ' + token,
        );
    }
  }
}

function runCli(root = KIT_ROOT) {
  const result = validateTree(root);
  const summary =
    result.scanned +
    " surfaces: " +
    result.counts.skills +
    " skills, " +
    result.counts.baseRules +
    " base rules, " +
    result.counts.tierRules +
    " tier rules, " +
    result.counts.tierSkills +
    " tier skills";
  if (!result.errors.length) {
    console.log("lint-frontmatter: OK (" + summary + ")");
    return 0;
  }
  console.error(
    "lint-frontmatter: " +
      result.errors.length +
      " error(s) after scanning " +
      summary +
      ":",
  );
  for (const error of result.errors) console.error("  " + error);
  return 2;
}

if (require.main === module) process.exitCode = runCli();
module.exports = {
  CONTRACTS,
  MAX_DESCRIPTION,
  parseFrontmatter,
  validateTree,
  runCli,
};
