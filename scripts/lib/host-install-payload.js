/** Byte-oriented projections; shared kit remains the only content source. */
const fs = require("fs");
const { hashBytes } = require("./omp-install-lock");
const { hostTarget } = require("./host-targets");
const { parseFrontmatter, scalar } = require("./frontmatter-parser");
const strip = (text) =>
  text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();

function projectHostPayload(source, name) {
  const target = hostTarget(name);
  const files = {};
  const destination = (rel) =>
    rel.startsWith("skills/")
      ? `${target.skills}/${rel.slice(7)}`
      : `${target.rules}/${rel.slice(6)}`;
  function adapt(text) {
    return text
      .replace(
        /\b(skill|rule):\/\/([\w-]+(?:\/[\w.-]+)*)/g,
        (all, kind, id) => {
          const rel =
            kind === "rule"
              ? `rules/${id}.md`
              : `skills/${id}${id.includes("/") ? "" : "/SKILL.md"}`;
          if (!source[rel]) {
            if (id === "aku-sc-rules" || id.startsWith("aku-luna-"))
              return `${id} (only available when its tier is installed)`;
            throw new Error(`unresolved ${name} reference: ${all}`);
          }
          return destination(rel);
        },
      )
      .replaceAll("skill://<name>", `${target.skills}/<name>/SKILL.md`)
      .replaceAll("rule://<name>", `${target.rules}/<name>.md`)
      .replace(
        /\/skill:(aku-[\w-]+(?:<name>)?)/g,
        (_, id) => target.invocation + id,
      )
      .replaceAll(".omp/aku-project.json", target.marker)
      .replaceAll(".omp/rules/", `${target.rules}/`)
      .replaceAll("automatic activation bridge", "task-routing guidance")
      .replaceAll("automatic C# activation bridge", "C# task-routing guidance")
      .replaceAll(
        "automatic bridge for **/*.cs work",
        "task-routing guidance for **/*.cs work",
      )
      .replaceAll("per `AGENTS.md`", `per \`${target.startup}\``)
      .replaceAll("check `AGENTS.md`", `check \`${target.startup}\``)
      .replace(
        "(`.pi/`, `.omp/`)",
        "(`.pi/`, `.omp/`, `.codex/`, `.claude/`, `.agents/`)",
      )
      .replace(
        "Pi has\n   no built-in MCP client or universal config schema; OMP configuration also\n   requires its installed integration's documented format. Do not assume a root\n   `.mcp.json` is consumed.",
        "The host configuration\n   surface is client-specific; inspect the installed version's documented project\n   scope. Do not modify global settings or infer a schema from another host.",
      );
  }
  function add(rel, content, tier) {
    files[rel] = {
      content,
      hash: hashBytes(content),
      ...(tier ? { tier } : {}),
    };
  }
  for (const [rel, meta] of Object.entries(source)) {
    if (rel === "AGENTS.md") continue;
    let bytes = fs.readFileSync(meta.srcAbs);
    if (rel.endsWith(".md")) {
      const text = bytes.toString("utf8");
      bytes = Buffer.from(adapt(rel.startsWith("rules/") ? strip(text) : text));
    }
    add(destination(rel), bytes, meta.tier);
  }
  let intro = fs
    .readFileSync(source["AGENTS.md"].srcAbs, "utf8")
    .replace(
      "# agent-kit-unity (OMP)",
      `# agent-kit-unity (${name === "codex" ? "Codex" : "Claude Code"})`,
    )
    .replace(/The hard, always-on invariants[^\n]+/, "")
    .replace(
      "OMP rules cannot run detection code",
      "These instructions cannot run detection code",
    );
  if (!source["rules/aku-sc-rules.md"])
    intro = intro.replace(/^- \*\*Supercent project\*\*[^\n]+\n/m, "");
  const sections = [
    name === "codex"
      ? "For Codex sessions only. Other hosts: use your own installed target guidance, not this section."
      : "# Claude Code project guidance",
    "Paths below are relative to the Unity repository root, not the skill directory.",
    "Read the referenced skills before relevant tasks. Detailed rulebooks remain on demand.",
    "Task routing is instruction-based, not a tool-enforced policy. Bind capabilities only to available tools.",
    adapt(intro).trim(),
  ];
  for (const rel of Object.keys(source)
    .filter((x) => x.startsWith("rules/"))
    .sort()) {
    const fm = parseFrontmatter(fs.readFileSync(source[rel].srcAbs, "utf8"));
    const errors = fm ? [...fm.errors] : ["missing rule metadata"];
    const description = scalar(fm?.fields.description, errors, rel);
    if (errors.length) throw new Error(errors.join("; "));
    if (
      fm.fields.alwaysApply === "true" ||
      /aku-(code|asset)-convention-rules/.test(rel)
    )
      sections.push(files[destination(rel)].content.toString("utf8"));
    else
      sections.push(
        `${adapt(description)}\nBefore that task, read and apply ${destination(rel)}.`,
      );
  }
  const startup = Buffer.from(sections.join("\n\n") + "\n");
  if (name === "claude") add(target.startup, startup);
  return { target, files, startup: name === "codex" ? startup : null };
}
module.exports = { projectHostPayload };
