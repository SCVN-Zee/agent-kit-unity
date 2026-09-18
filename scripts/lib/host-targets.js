/** Native project discovery and explicit ownership boundaries for new hosts. */
const { isSafeKey } = require("./omp-install-lock");

function hostTarget(name) {
  if (!["codex", "claude"].includes(name))
    throw new Error(`unsupported host: ${name}`);
  const root = `.${name}`;
  return {
    name,
    root,
    skills: name === "codex" ? ".agents/skills" : ".claude/skills",
    rules: `${root}/aku-rules`,
    marker: `${root}/aku-project.json`,
    lock: `${root}/aku-lock.json`,
    guard: `${root}/aku-operation.lock`,
    startup: name === "codex" ? "AGENTS.md" : ".claude/rules/aku-project.md",
    invocation: name === "codex" ? "$" : "/",
  };
}
function ownsFile(target, rel) {
  if (!isSafeKey(rel)) return false;
  if (target.name === "claude" && rel === target.startup) return true;
  if (rel.startsWith(`${target.rules}/`))
    return /^aku-[a-z0-9-]+\.md$/.test(rel.slice(target.rules.length + 1));
  if (!rel.startsWith(`${target.skills}/`)) return false;
  return /^aku-[a-z0-9-]+\/.+/.test(rel.slice(target.skills.length + 1));
}
module.exports = { hostTarget, ownsFile };
