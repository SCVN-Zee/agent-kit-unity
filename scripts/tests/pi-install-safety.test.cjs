const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { sandbox, ship, cleanup } = require("./helpers/omp-sandbox.cjs");
const { hashBytes } = require("../lib/omp-install-lock");
const run = (t, ...args) => ship(t, ["--target", "pi", ...args]);

for (const rel of [
  "APPEND_SYSTEM.md",
  "skills/aku-code-review/SKILL.md",
  "aku-lock.json",
]) {
  test(`Pi non-file blocker ${rel} fails before writes, even with force`, () => {
    const t = sandbox();
    try {
      fs.mkdirSync(path.join(t, ".pi", rel), { recursive: true });
      const result = run(t, "--force");
      assert.equal(result.code, 1, result.out);
      assert.match(result.out, /unexpected file type/);
      assert.ok(!fs.existsSync(path.join(t, ".pi/rules")));
    } finally {
      cleanup(t);
    }
  });
}

test("prior-lock symlink paths cannot delete outside Pi, including force uninstall", () => {
  const t = sandbox();
  const other = sandbox();
  try {
    assert.equal(run(t).code, 0);
    const marker = path.join(other, "keep");
    fs.writeFileSync(marker, "outside");
    fs.symlinkSync(other, path.join(t, ".pi/retired"));
    const lockPath = path.join(t, ".pi/aku-lock.json");
    const lock = JSON.parse(fs.readFileSync(lockPath));
    lock.files["retired/keep"] = { hash: hashBytes(Buffer.from("outside")) };
    fs.writeFileSync(lockPath, JSON.stringify(lock));
    const before = fs.readFileSync(lockPath);
    for (const mode of ["--update", "--uninstall", "--check"]) {
      const result = run(t, mode, "--force");
      assert.equal(result.code, 1, result.out);
      assert.match(result.out, /symlink/);
      assert.equal(fs.readFileSync(marker, "utf8"), "outside");
      assert.deepEqual(fs.readFileSync(lockPath), before);
      assert.ok(fs.existsSync(path.join(t, ".pi/APPEND_SYSTEM.md")));
    }
  } finally {
    cleanup(t, other);
  }
});

test("generated Pi payload updates old trusted bytes and preserves edited departed tier", () => {
  const t = sandbox();
  try {
    assert.equal(run(t, "--tier", "supercent").code, 0);
    const lockPath = path.join(t, ".pi/aku-lock.json");
    const startup = path.join(t, ".pi/APPEND_SYSTEM.md");
    const lock = JSON.parse(fs.readFileSync(lockPath));
    fs.writeFileSync(startup, "old startup");
    lock.files["APPEND_SYSTEM.md"].hash = hashBytes(Buffer.from("old startup"));
    fs.writeFileSync(lockPath, JSON.stringify(lock));
    assert.equal(run(t, "--tier", "supercent", "--check").code, 2);
    assert.equal(run(t, "--tier", "supercent", "--update").code, 0);
    assert.match(fs.readFileSync(startup, "utf8"), /Pi project guidance/);
    const rule = path.join(t, ".pi/rules/aku-sc-rules.md");
    fs.appendFileSync(rule, "\nuser edit");
    const before = fs.readFileSync(lockPath);
    assert.equal(run(t, "--update").code, 1);
    assert.deepEqual(fs.readFileSync(lockPath), before);
    assert.match(fs.readFileSync(rule, "utf8"), /user edit/);
    assert.equal(run(t, "--update", "--force").code, 0);
    assert.ok(!fs.existsSync(rule));
  } finally {
    cleanup(t);
  }
});
