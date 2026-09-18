const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sandbox, ship, cleanup } = require("./helpers/omp-sandbox.cjs");

for (const target of ["omp", "pi"]) {
  test(`${target} ships opt-in Codebase Memory skill without setup side effects`, () => {
    const dir = sandbox();
    try {
      const sentinels = {
        ".mcp.json": '{"mcpServers":{"unity":{"command":"existing"}}}\n',
        ".cbmignore": "custom/\n!custom/source/\n",
        ".ignore": "unrelated/\n",
        ".gitignore": "Library/\n",
      };
      for (const [name, content] of Object.entries(sentinels))
        fs.writeFileSync(path.join(dir, name), content);
      const args = ["--target", target];
      const result = ship(dir, args);
      assert.equal(result.code, 0, result.out);
      const root = path.join(dir, `.${target}`);
      const rel = "skills/aku-codebase-memory/SKILL.md";
      const skill = fs.readFileSync(path.join(root, rel), "utf8");
      assert.match(skill, /name: aku-codebase-memory/);
      assert.match(skill, /Not for ordinary code navigation, code review/);
      assert.match(skill, /skip-config[\s\S]*still changes shell PATH/);
      assert.match(skill, /Verify the replacement before removing/);
      assert.match(skill, /partial parses, and unusable/);
      assert.match(skill, /mark discovery pending until observed/);
      assert.match(skill, /adding `\.cbmignore`/);
      assert.match(skill, /git rev-parse --git-path info\/exclude/);
      assert.match(skill, /append the entry only if absent/);
      assert.match(skill, /git check-ignore -v -- \.cbmignore/);
      assert.match(skill, /excludes cannot hide tracked files/);
      assert.doesNotMatch(skill, /can be committed to share/);
      const lockFile = path.join(root, "aku-lock.json");
      const before = fs.readFileSync(lockFile, "utf8");
      assert.ok(JSON.parse(before).files[rel]);
      const again = ship(dir, [...args, "--update"]);
      assert.equal(again.code, 0, again.out);
      assert.equal(fs.readFileSync(lockFile, "utf8"), before);
      for (const [name, content] of Object.entries(sentinels))
        assert.equal(fs.readFileSync(path.join(dir, name), "utf8"), content);
      assert.equal(fs.existsSync(path.join(dir, "graft")), false);
      const checked = ship(dir, [...args, "--check"]);
      assert.equal(checked.code, 0, checked.out);
    } finally {
      cleanup(dir);
    }
  });
}
