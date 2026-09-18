/** Parse the single-line scalar frontmatter subset used by the kit. */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const fields = {};
  const errors = [];
  let lastKey = null;
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z][a-zA-Z0-9_-]*)\s*:\s*(.*)$/);
    if (!kv) {
      if (lastKey === "description" && /^\s+\S/.test(line))
        errors.push("description must be a single-line scalar");
      continue;
    }
    const key = kv[1];
    const raw = kv[2].trim();
    lastKey = key;
    if (/^[|>][-+]?$/.test(raw))
      errors.push(
        'field "' + key + '" uses unsupported YAML block scalar ' + raw,
      );
    else fields[key] = raw;
  }
  return { fields, errors };
}

function scalar(raw, errors, label) {
  if (!raw) return "";
  if (raw.startsWith('"')) {
    try {
      return JSON.parse(raw);
    } catch (_) {
      errors.push(label + ": invalid quoted scalar");
      return "";
    }
  }
  if (raw.startsWith("'") && raw.endsWith("'"))
    return raw.slice(1, -1).replace(/''/g, "'");
  return raw;
}

module.exports = { parseFrontmatter, scalar };
