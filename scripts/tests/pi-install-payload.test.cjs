const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { computePayload } = require("../lib/omp-install-payload");
const { projectPiPayload } = require("../lib/pi-install-payload");
const { hashBytes } = require("../lib/omp-install-lock");
const KIT = path.resolve(__dirname, "../../kit");

for (const tiers of [[], ["supercent"], ["luna"], ["supercent", "luna"]]) {
  test(`Pi projection parity, routing and references: ${tiers.join(",") || "base"}`, () => {
    const source = computePayload(KIT, tiers);
    const payload = projectPiPayload(source);
    assert.deepEqual(
      Object.keys(payload).sort(),
      Object.keys(source)
        .map((rel) => (rel === "AGENTS.md" ? "APPEND_SYSTEM.md" : rel))
        .sort(),
    );
    for (const [rel, entry] of Object.entries(payload)) {
      assert.equal(hashBytes(entry.content), entry.hash);
      if (!rel.endsWith(".md")) {
        assert.deepEqual(entry.content, fs.readFileSync(source[rel].srcAbs));
        continue;
      }
      const text = entry.content.toString();
      assert.doesNotMatch(text, /(?:rule|skill):\/\/|\.omp\//);
      for (const match of text.matchAll(
        /\.pi\/((?:skills|rules)\/[\w/.-]+\.md)/g,
      )) {
        assert.ok(payload[match[1]], `${rel}: missing ${match[1]}`);
      }
      if (rel.startsWith("rules/"))
        assert.doesNotMatch(text, /alwaysApply:|globs:/);
    }
    const startup = payload["APPEND_SYSTEM.md"].content.toString();
    assert.match(startup, /never dispatch Editor write ops in parallel/);
    assert.match(startup, /Before.*Unity C#/);
    assert.match(startup, /report-only/i);
    assert.equal(startup.includes("[Dev]"), tiers.includes("supercent"));
    assert.equal(
      !!payload["skills/aku-luna-build-check/SKILL.md"],
      tiers.includes("luna"),
    );
    assert.ok(startup.split("\n").length <= 200);
    assert.equal(source["skills/aku-graft/SKILL.md"], undefined);
    assert.equal(payload["skills/aku-graft/SKILL.md"], undefined);
  });
}

test("non-Markdown payload bytes are never UTF-8 decoded", () => {
  const source = computePayload(KIT);
  const temp = fs.mkdtempSync(
    path.join(require("os").tmpdir(), "aku-pi-binary-"),
  );
  try {
    const srcAbs = path.join(temp, "binary");
    const bytes = Buffer.from([0, 255, 128, 13, 10]);
    fs.writeFileSync(srcAbs, bytes);
    source["skills/aku-code-review/binary"] = {
      srcAbs,
      hash: hashBytes(bytes),
    };
    assert.deepEqual(
      projectPiPayload(source)["skills/aku-code-review/binary"].content,
      bytes,
    );
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
