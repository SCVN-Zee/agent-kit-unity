const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  fixture,
  put,
  snapshot,
  cleanup,
} = require("./helpers/host-sandbox.cjs");
const SHIP = path.resolve(__dirname, "../ship-kit.cjs");
for (const order of [
  ["omp", "pi", "codex", "claude"],
  ["claude", "codex", "pi", "omp"],
]) {
  test(`four-target coexistence: ${order.join(",")}`, () => {
    const f = fixture();
    try {
      put(f, "AGENTS.md", "user rules\r\n");
      put(f, "CLAUDE.md", "user claude rules");
      put(f, ".agents/skills/user/SKILL.md", "foreign skill");
      function run(target, mode = []) {
        const r = spawnSync(
          process.execPath,
          [SHIP, f.root, "--target", target, ...mode],
          { encoding: "utf8" },
        );
        assert.equal(r.status, 0, r.stdout + r.stderr);
      }
      for (const name of order) run(name);
      const installed = snapshot(f.root);
      for (const name of order) {
        run(name, ["--update"]);
        assert.deepEqual(snapshot(f.root), installed);
      }
      const legacy = Object.fromEntries(
        Object.entries(installed).filter(([p]) => /^\.(omp|pi)\//.test(p)),
      );
      for (const name of ["codex", "claude"]) {
        run(name, ["--uninstall"]);
        const after = snapshot(f.root);
        for (const [rel, bytes] of Object.entries(legacy))
          assert.equal(after[rel], bytes);
      }
      assert.equal(
        fs.readFileSync(path.join(f.root, "AGENTS.md"), "utf8"),
        "user rules\r\n",
      );
      assert.equal(
        fs.readFileSync(path.join(f.root, "CLAUDE.md"), "utf8"),
        "user claude rules",
      );
      assert.equal(
        fs.readFileSync(
          path.join(f.root, ".agents/skills/user/SKILL.md"),
          "utf8",
        ),
        "foreign skill",
      );
      run("omp", ["--uninstall"]);
      run("pi", ["--uninstall"]);
    } finally {
      cleanup(f);
    }
  });
}
