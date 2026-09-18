const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { computePayload } = require("../lib/omp-install-payload");
const { projectHostPayload } = require("../lib/host-install-payload");
const { hashBytes } = require("../lib/omp-install-lock");
const { ownsFile } = require("../lib/host-targets");
const KIT = path.resolve(__dirname, "../../kit");
for (const name of ["codex", "claude"]) {
  for (const tiers of [[], ["supercent"], ["luna"], ["supercent", "luna"]]) {
    test(`${name} native projection: ${tiers.join(",") || "base"}`, () => {
      const source = computePayload(KIT, tiers);
      const { target, files, startup } = projectHostPayload(source, name);
      const text = startup || files[target.startup].content;
      assert.ok(
        text.toString().includes("never dispatch Editor write ops in parallel"),
      );
      assert.equal(
        text.toString().includes("[Dev]"),
        tiers.includes("supercent"),
      );
      assert.ok(text.toString().split("\n").length <= 200);
      const count = Object.keys(source).filter((p) =>
        p.endsWith("/SKILL.md"),
      ).length;
      assert.equal(
        Object.keys(files).filter((p) => p.endsWith("/SKILL.md")).length,
        count,
      );
      for (const [rel, meta] of Object.entries(files)) {
        assert.ok(ownsFile(target, rel), rel);
        assert.equal(hashBytes(meta.content), meta.hash);
        if (!rel.endsWith(".md")) continue;
        const body = meta.content.toString();
        assert.doesNotMatch(
          body,
          /(?:skill|rule):\/\/|\/skill:|\.omp\/aku-project/,
        );
        for (const m of body.matchAll(
          /\.(?:agents|codex|claude)\/(?:skills|aku-rules)\/[\w/.-]+\.md/g,
        ))
          assert.ok(files[m[0]], `${rel}: unresolved ${m[0]}`);
        if (rel.includes("/aku-rules/"))
          assert.doesNotMatch(body, /alwaysApply:|globs:/);
      }
      const feature =
        files[
          `${target.skills}/aku-reference-feature/SKILL.md`
        ].content.toString();
      assert.ok(feature.includes(`${target.invocation}aku-reference-feature`));
      const review =
        files[`${target.skills}/aku-code-review/SKILL.md`].content.toString();
      assert.match(review, /report-only/i);
      assert.ok(!files[`${target.root}/settings.json`]);
    });
  }
}
test("native projection preserves non-Markdown bytes and rejects unknown references", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aku-host-bytes-"));
  try {
    const source = computePayload(KIT);
    const srcAbs = path.join(tmp, "bytes");
    const bytes = Buffer.from([0, 255, 128, 13, 10]);
    fs.writeFileSync(srcAbs, bytes);
    source["skills/aku-code-review/example.bin"] = { srcAbs };
    for (const name of ["codex", "claude"]) {
      const { target, files } = projectHostPayload(source, name);
      assert.deepEqual(
        files[`${target.skills}/aku-code-review/example.bin`].content,
        bytes,
      );
    }
    fs.writeFileSync(srcAbs, "skill://aku-not-installed");
    source["skills/aku-code-review/broken.md"] = { srcAbs };
    assert.throws(() => projectHostPayload(source, "codex"), /unresolved/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
