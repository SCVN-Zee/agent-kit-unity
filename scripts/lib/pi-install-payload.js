/** Project-scoped Pi projection. OMP remains the content source of truth. */
const fs = require("fs");
const { hashBytes } = require("./omp-install-lock");

function withoutFrontmatter(text) {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
}

function projectPiPayload(source) {
  const out = {};
  function adapt(text) {
    return text
      .replace(
        /\b(skill|rule):\/\/([\w-]+(?:\/[\w.-]+)*)/g,
        (match, kind, name) => {
          const rel =
            kind === "rule"
              ? `rules/${name}.md`
              : `skills/${name}${name.includes("/") ? "" : "/SKILL.md"}`;
          if (!source[rel]) {
            if (name === "aku-sc-rules" || name.startsWith("aku-luna-")) {
              return `${name} (only available when its tier is installed)`;
            }
            throw new Error(`unresolved Pi reference: ${match}`);
          }
          return `.pi/${rel}`;
        },
      )
      .replaceAll(".omp", ".pi")
      .replaceAll("skill://<name>", ".pi/skills/<name>/SKILL.md")
      .replaceAll("rule://<name>", ".pi/rules/<name>.md")
      .replaceAll("automatic activation bridge", "task-routing guidance")
      .replaceAll("automatic C# activation bridge", "C# task-routing guidance")
      .replaceAll(
        "automatic bridge for **/*.cs work",
        "task-routing guidance for **/*.cs work",
      );
  }
  function add(rel, bytes, tier) {
    out[rel] = {
      content: bytes,
      hash: hashBytes(bytes),
      ...(tier ? { tier } : {}),
    };
  }
  for (const [rel, meta] of Object.entries(source)) {
    if (rel === "AGENTS.md") continue;
    let bytes = fs.readFileSync(meta.srcAbs);
    if (rel.endsWith(".md")) {
      let text = bytes.toString("utf8");
      if (rel.startsWith("rules/")) text = withoutFrontmatter(text);
      text = adapt(text)
        .replaceAll("per `AGENTS.md`", "per `.pi/APPEND_SYSTEM.md`")
        .replaceAll("check `AGENTS.md`", "check `.pi/APPEND_SYSTEM.md`");
      bytes = Buffer.from(text);
    }
    add(rel, bytes, meta.tier);
  }
  let intro = fs.readFileSync(source["AGENTS.md"].srcAbs, "utf8");
  intro = intro
    .replace("# agent-kit-unity (OMP)", "# agent-kit-unity (Pi)")
    .replace(/The hard, always-on invariants[^\n]+/, "")
    .replace(
      "OMP rules cannot run detection code",
      "These instructions cannot run detection code",
    );
  if (!source["rules/aku-sc-rules.md"])
    intro = intro.replace(/^- \*\*Supercent project\*\*[^\n]+\n/m, "");
  const guidance = [
    "# Pi project guidance",
    "Paths beginning `.pi/` below are relative to the Unity project root, not the skill directory.",
    "Core and selected sticky tier rules are included below. Other rulebooks remain on demand.",
    "Before the relevant task, read the referenced skill with the read tool; `/skill:aku-<name>` also loads skills.",
    "This is instruction-based task routing, not OMP glob activation or a tool-enforced policy.",
    "Pi has no built-in MCP client. Use the session’s configured integration or CLI; never invent tool bindings.",
    adapt(intro).trim(),
  ];
  // Include small activation bridges so instructions remain active without a rule loader.
  for (const rel of Object.keys(source)
    .filter((key) => key.startsWith("rules/"))
    .sort()) {
    guidance.push(out[rel].content.toString("utf8"));
  }
  add("APPEND_SYSTEM.md", Buffer.from(guidance.join("\n\n") + "\n"));
  return out;
}

module.exports = { projectPiPayload };
