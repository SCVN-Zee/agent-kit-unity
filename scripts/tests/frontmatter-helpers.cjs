/** Isolated frontmatter mutation fixtures. */
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");
const { validateTree } = require("../lint-frontmatter.cjs");

function sandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aku-frontmatter-"));
  fs.cpSync(path.join(ROOT, "kit"), path.join(root, "kit"), {
    recursive: true,
  });
  return root;
}

function metadataPath(root, rel) {
  return path.join(root, "kit", ...rel.split("/"));
}

function replaceDescription(body, value) {
  return body.replace(/^description:.*$/m, value);
}

function falsify(root, rel, transform, expected) {
  const file = metadataPath(root, rel);
  const original = fs.readFileSync(file, "utf8");
  let result;
  try {
    fs.writeFileSync(file, transform(original));
    result = validateTree(root);
    assert.ok(
      result.errors.some((e) => e.includes(expected)),
      `${rel}: expected ${JSON.stringify(expected)} in ${result.errors.join(" | ")}`,
    );
  } finally {
    fs.writeFileSync(file, original);
  }
  assert.deepEqual(
    validateTree(root).errors,
    [],
    `${rel}: fixture did not restore`,
  );
}

function withSandbox(run) {
  const root = sandbox();
  try {
    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

module.exports = { metadataPath, replaceDescription, falsify, withSandbox };
