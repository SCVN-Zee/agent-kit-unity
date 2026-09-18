const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("node:child_process");
const { sandbox, cleanup, KIT_ROOT } = require("./helpers/omp-sandbox.cjs");
const { hashBytes } = require("../lib/omp-install-lock");
const SHIP = path.join(KIT_ROOT, "scripts/ship-kit.cjs");
const run = (root, target, args = []) => {
  const result = spawnSync(
    process.execPath,
    [SHIP, root, "--target", target, ...args],
    {
      encoding: "utf8",
    },
  );
  return { code: result.status, out: result.stdout + result.stderr };
};

for (const target of ["omp", "pi"]) {
  test(`${target}: Odin recipes survive install, stale update and conflict preservation`, () => {
    const root = sandbox();
    const dest = path.join(root, `.${target}`);
    const lockPath = path.join(dest, "aku-lock.json");
    const rel = "skills/aku-odin/PICKERS_AND_VALIDATION.md";
    try {
      const installed = run(root, target);
      assert.equal(installed.code, 0, installed.out);
      const expected = fs.readFileSync(path.join(dest, rel));
      const old = Buffer.from("previous recipe bytes\n");
      const lock = JSON.parse(fs.readFileSync(lockPath));
      fs.writeFileSync(path.join(dest, rel), old);
      lock.files[rel].hash = hashBytes(old);
      fs.writeFileSync(lockPath, JSON.stringify(lock));
      assert.equal(run(root, target, ["--check"]).code, 2);
      const update = run(root, target, ["--update"]);
      assert.equal(update.code, 0, update.out);
      assert.deepEqual(fs.readFileSync(path.join(dest, rel)), expected);
      assert.equal(run(root, target, ["--check"]).code, 0);
      const updatedLock = JSON.parse(fs.readFileSync(lockPath));
      for (const [name, entry] of Object.entries(updatedLock.files)) {
        assert.equal(
          hashBytes(fs.readFileSync(path.join(dest, name))),
          entry.hash,
          name,
        );
      }
      const bytes = fs.readFileSync(lockPath);
      assert.equal(run(root, target, ["--update"]).code, 0);
      assert.deepEqual(fs.readFileSync(lockPath), bytes);
      const userBytes = Buffer.concat([
        expected,
        Buffer.from("\nUser-owned note.\n"),
      ]);
      fs.writeFileSync(path.join(dest, rel), userBytes);
      const conflict = run(root, target, ["--update"]);
      assert.equal(conflict.code, target === "pi" ? 1 : 0, conflict.out);
      assert.deepEqual(fs.readFileSync(path.join(dest, rel)), userBytes);
      assert.equal(
        JSON.parse(fs.readFileSync(lockPath)).files[rel].hash,
        updatedLock.files[rel].hash,
      );
    } finally {
      cleanup(root);
    }
  });
}
