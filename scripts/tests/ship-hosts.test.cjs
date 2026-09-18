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
const { readHostLock } = require("../lib/host-install-lock");
const { hashBytes } = require("../lib/omp-install-lock");
const { parseSection } = require("../lib/host-startup-section");
const SHIP = path.resolve(__dirname, "../ship-kit.cjs");
function run(f, args = []) {
  const r = spawnSync(
    process.execPath,
    [SHIP, f.root, "--target", f.target.name, ...args],
    { encoding: "utf8", cwd: require("os").tmpdir() },
  );
  return { code: r.status, out: r.stdout, error: r.stderr };
}
for (const name of ["codex", "claude"]) {
  test(`${name}: full CLI lifecycle and mapped lock hashes`, () => {
    const f = fixture(name);
    try {
      put(f, "AGENTS.md", "user instructions");
      put(f, ".mcp.json", '{"user":true}');
      const initial = snapshot(f.root);
      const checked = run(f, ["--check", "--json"]);
      assert.equal(checked.code, 2);
      assert.equal(JSON.parse(checked.out).wroteLock, false);
      assert.equal(JSON.parse(checked.out).lockChange, true);
      assert.equal(run(f, ["--dry-run"]).code, 0);
      assert.deepEqual(snapshot(f.root), initial);
      const installed = run(f, ["--json"]);
      assert.equal(installed.code, 0, installed.error);
      assert.equal(JSON.parse(installed.out).target, name);
      const first = snapshot(f.root);
      for (const flags of [
        [],
        ["--update"],
        ["--check"],
        ["--dry-run"],
        ["--uninstall", "--dry-run"],
      ]) {
        assert.equal(run(f, flags).code, 0);
        assert.deepEqual(snapshot(f.root), first);
      }
      const { prior } = readHostLock(f.root, f.target);
      for (const [rel, meta] of Object.entries(prior.files))
        assert.equal(
          hashBytes(fs.readFileSync(path.join(f.root, rel))),
          meta.hash,
        );
      if (prior.startup)
        assert.equal(
          hashBytes(
            parseSection(fs.readFileSync(path.join(f.root, "AGENTS.md")))
              .content,
          ),
          prior.startup.hash,
        );
      const rel = `${f.target.skills}/aku-code-review/SKILL.md`;
      fs.unlinkSync(path.join(f.root, rel));
      assert.equal(run(f, ["--check"]).code, 2);
      assert.equal(run(f, ["--update"]).code, 0);
      fs.appendFileSync(path.join(f.root, rel), "\nuser edit");
      const edited = snapshot(f.root);
      assert.equal(run(f, ["--update"]).code, 1);
      assert.deepEqual(snapshot(f.root), edited);
      assert.equal(run(f, ["--update", "--force"]).code, 0);
      assert.equal(run(f, ["--uninstall"]).code, 0);
      assert.deepEqual(snapshot(f.root), initial);
    } finally {
      cleanup(f);
    }
  });
  test(`${name}: target-local markers and tier prune`, () => {
    const f = fixture(name);
    try {
      put(
        f,
        "Packages/manifest.json",
        '{"dependencies":{"com.luna.playworks":"1"}}',
      );
      put(f, ".omp/aku-project.json", '{"lunaPlayable":true}');
      assert.equal(run(f).code, 0);
      assert.deepEqual(readHostLock(f.root, f.target).prior.tiers, []);
      put(f, f.target.marker, '{"lunaPlayable":true}');
      assert.equal(run(f, ["--tier", "supercent"]).code, 0);
      assert.deepEqual(readHostLock(f.root, f.target).prior.tiers, [
        "luna",
        "supercent",
      ]);
      put(f, f.target.marker, '{"lunaPlayable":false}');
      assert.equal(run(f, ["--update"]).code, 0);
      assert.deepEqual(readHostLock(f.root, f.target).prior.tiers, []);
      assert.equal(
        fs.existsSync(
          path.join(f.root, f.target.skills, "aku-luna-code-review/SKILL.md"),
        ),
        false,
      );
      assert.equal(run(f, ["--uninstall"]).code, 0);
      assert.equal(
        fs.readFileSync(path.join(f.root, f.target.marker), "utf8"),
        '{"lunaPlayable":false}',
      );
    } finally {
      cleanup(f);
    }
  });
  test(`${name}: incomplete uninstall is exit 2 and can be resumed`, () => {
    const f = fixture(name);
    try {
      assert.equal(run(f).code, 0);
      const rel = `${f.target.skills}/aku-code-review/SKILL.md`;
      const original = fs.readFileSync(path.join(f.root, rel));
      put(f, rel, "user-owned edit");
      const removed = run(f, ["--uninstall", "--json"]);
      assert.equal(removed.code, 2);
      assert.equal(JSON.parse(removed.out).conflicts[0].rel, rel);
      assert.ok(readHostLock(f.root, f.target).prior.files[rel]);
      put(f, rel, original);
      assert.equal(run(f, ["--uninstall"]).code, 0);
      assert.equal(readHostLock(f.root, f.target).prior, null);
    } finally {
      cleanup(f);
    }
  });
}
test("Codex override blocks install/update/check but never safe uninstall", () => {
  const f = fixture();
  try {
    assert.equal(run(f).code, 0);
    put(f, "AGENTS.override.md", "override");
    const before = snapshot(f.root);
    assert.equal(run(f, ["--update", "--force"]).code, 1);
    assert.equal(run(f, ["--check"]).code, 2);
    assert.deepEqual(snapshot(f.root), before);
    assert.equal(run(f, ["--uninstall"]).code, 0);
    assert.equal(
      fs.readFileSync(path.join(f.root, "AGENTS.override.md"), "utf8"),
      "override",
    );
  } finally {
    cleanup(f);
  }
});
