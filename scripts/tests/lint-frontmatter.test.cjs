const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const LINTER = path.join(ROOT, "scripts/lint-frontmatter.cjs");
const { CONTRACTS, MAX_DESCRIPTION, validateTree } = require(LINTER);

const {
  metadataPath,
  replaceDescription,
  falsify,
  withSandbox,
} = require("./frontmatter-helpers.cjs");

test("inventory rejects missing files and uncontracted additions", () =>
  withSandbox((root) => {
    const skill = metadataPath(root, "skills/aku-asset-conventions/SKILL.md");
    const original = fs.readFileSync(skill, "utf8");
    try {
      fs.rmSync(skill);
      assert.ok(
        validateTree(root).errors.some((e) =>
          e.includes("metadata file missing"),
        ),
      );
    } finally {
      fs.writeFileSync(skill, original);
    }

    const extra = metadataPath(root, "rules/aku-uncontracted.md");
    fs.writeFileSync(
      extra,
      '---\ndescription: "Use when doing extra work."\n---\n',
    );
    try {
      assert.ok(
        validateTree(root).errors.some((e) =>
          e.includes("has no discovery contract"),
        ),
      );
    } finally {
      fs.rmSync(extra);
    }
    assert.deepEqual(validateTree(root).errors, []);
  }));

test("description shape failures are observable and restore cleanly", () =>
  withSandbox((root) => {
    const rel = "skills/aku-asset-conventions/SKILL.md";
    const cases = [
      ['description: ""', 'missing frontmatter field "description"'],
      [
        "description: |\n  Use when working with Unity scenes.",
        "unsupported YAML block scalar",
      ],
      [
        "description: Use when working with Unity scenes.\n  continued",
        "single-line scalar",
      ],
      [
        `description: "Use when ${"x".repeat(MAX_DESCRIPTION)}"`,
        `exceeds ${MAX_DESCRIPTION}`,
      ],
      [
        'description: "Handles Unity scenes and Cinemachine."',
        'must start with "Use when"',
      ],
    ];
    for (const [replacement, expected] of cases) {
      falsify(
        root,
        rel,
        (body) => replaceDescription(body, replacement),
        expected,
      );
    }
  }));

test("every surface rejects generic trigger-first prose", () =>
  withSandbox((root) => {
    for (const [rel, contract] of Object.entries(CONTRACTS)) {
      const generic = `description: ${JSON.stringify(`${contract.lead} doing Unity work with conventions and tools.`)}`;
      falsify(
        root,
        rel,
        (body) => replaceDescription(body, generic),
        "missing discovery term",
      );
    }
  }));

test("report-only review has one discovery owner", () =>
  withSandbox((root) => {
    const cases = [
      [
        "skills/aku-code-conventions/SKILL.md",
        (body) =>
          body.replace(
            "Do not activate for report-only review; use skill://aku-code-review.",
            "",
          ),
        "missing discovery term",
      ],
      [
        "rules/aku-code-convention-rules.md",
        (body) =>
          body.replace(
            /Do not activate for report-only file, diff, commit, or PR review;[^\"]+/,
            "",
          ),
        "missing discovery term",
      ],
      [
        "skills/aku-code-conventions/SKILL.md",
        (body) =>
          body.replace(
            "generating, editing, or refactoring",
            "generating, editing, refactoring, or reviewing",
          ),
        "forbidden discovery term",
      ],
      [
        "rules/aku-code-convention-rules.md",
        (body) =>
          body.replace(
            "generating, editing, or refactoring",
            "generating, editing, refactoring, or reviewing",
          ),
        "forbidden discovery term",
      ],
      [
        "rules/aku-code-convention-rules.md",
        (body) =>
          body.replace(
            "Asset names/layout use skill://aku-asset-conventions.",
            "",
          ),
        "missing discovery term",
      ],
      [
        "skills/aku-code-review/SKILL.md",
        (body) => body.replace("including Unity C#.", ""),
        "missing discovery term",
      ],
      [
        "skills/aku-code-review/SKILL.md",
        (body) =>
          body.replace(
            "loads skill://aku-code-conventions",
            "mentions code conventions",
          ),
        "missing discovery term",
      ],
    ];
    for (const [rel, mutate, expected] of cases)
      falsify(root, rel, mutate, expected);
  }));

test("always-apply and glob trigger metadata cannot drift", () =>
  withSandbox((root) => {
    const cases = [
      [
        "rules/aku-core-rules.md",
        (b) => b.replace("alwaysApply: true", "alwaysApply: false"),
        "must preserve true",
      ],
      [
        "rules/aku-code-convention-rules.md",
        (b) => b.replace("**/*.cs", "**/*.txt"),
        "must preserve **/*.cs",
      ],
      [
        "tiers/luna/rules/aku-luna-rules.md",
        (b) => b.replace(/^globs:.*$/m, 'globs: "**/*.js"'),
        "must preserve **/*.cs",
      ],
    ];
    for (const [rel, mutate, expected] of cases)
      falsify(root, rel, mutate, expected);
  }));
