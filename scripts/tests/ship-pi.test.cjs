const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { sandbox, ship, cleanup } = require("./helpers/omp-sandbox.cjs");
const { hashBytes } = require("../lib/omp-install-lock");
const pi = (t, rel) => path.join(t, ".pi", rel);
const run = (t, args = []) => ship(t, ["--target", "pi", ...args]);
function snapshot(root) {
  if (!fs.existsSync(root)) return {};
  const out = {};
  for (const name of fs.readdirSync(root, { recursive: true })) {
    const file = path.join(root, name);
    if (fs.lstatSync(file).isFile())
      out[name] = fs.readFileSync(file).toString("base64");
  }
  return out;
}

test("strict target values reject before mutation; dry-run writes nothing", () => {
  const t = sandbox();
  try {
    const before = snapshot(t);
    for (const args of [
      ["--target"],
      ["--target", "bad"],
      ["--target", "--update"],
      ["--target", "pi", "--target", "omp"],
    ]) {
      assert.equal(ship(t, args).code, 1);
      assert.deepEqual(snapshot(t), before);
    }
    assert.equal(run(t, ["--dry-run"]).code, 0);
    assert.deepEqual(snapshot(t), before);
  } finally {
    cleanup(t);
  }
});

for (const order of [
  ["pi", "omp"],
  ["omp", "pi"],
]) {
  test(`independent lifecycles in order ${order.join(",")}`, () => {
    const t = sandbox();
    try {
      for (const target of order)
        assert.equal(ship(t, ["--target", target]).code, 0);
      const omp = snapshot(path.join(t, ".omp"));
      const first = snapshot(pi(t, ""));
      assert.equal(run(t).code, 0);
      assert.deepEqual(snapshot(pi(t, "")), first);
      assert.equal(run(t, ["--check"]).code, 0);
      const lock = JSON.parse(fs.readFileSync(pi(t, "aku-lock.json")));
      for (const [rel, entry] of Object.entries(lock.files)) {
        assert.equal(hashBytes(fs.readFileSync(pi(t, rel))), entry.hash);
      }
      fs.unlinkSync(pi(t, "skills/aku-code-review/SKILL.md"));
      assert.equal(run(t, ["--check"]).code, 2);
      assert.equal(run(t, ["--update"]).code, 0);
      fs.appendFileSync(pi(t, "APPEND_SYSTEM.md"), "\nuser edit\n");
      const before = snapshot(pi(t, ""));
      assert.equal(run(t, ["--update"]).code, 1);
      assert.deepEqual(snapshot(pi(t, "")), before);
      assert.equal(run(t, ["--update", "--force"]).code, 0);
      fs.writeFileSync(pi(t, "user-config.json"), "{}");
      fs.appendFileSync(
        pi(t, "skills/aku-code-review/SKILL.md"),
        "\nuser edit\n",
      );
      assert.equal(run(t, ["--uninstall"]).code, 0);
      assert.ok(fs.existsSync(pi(t, "user-config.json")));
      assert.match(
        fs.readFileSync(pi(t, "skills/aku-code-review/SKILL.md"), "utf8"),
        /user edit/,
      );
      assert.ok(!fs.existsSync(pi(t, "aku-lock.json")));
      assert.deepEqual(snapshot(path.join(t, ".omp")), omp);
    } finally {
      cleanup(t);
    }
  });
}

test("startup collision fails before creating skills or lock", () => {
  const t = sandbox();
  try {
    fs.mkdirSync(pi(t, ""));
    fs.writeFileSync(pi(t, "APPEND_SYSTEM.md"), "user startup");
    const before = snapshot(t);
    const result = run(t);
    assert.equal(result.code, 1, result.out);
    assert.match(result.out, /no files changed/);
    assert.deepEqual(snapshot(t), before);
  } finally {
    cleanup(t);
  }
});

test("tier marker is target-local and removal prunes only Pi tier paths", () => {
  const t = sandbox();
  try {
    fs.mkdirSync(path.join(t, "Assets/Luna"), { recursive: true });
    fs.mkdirSync(pi(t, ""));
    fs.writeFileSync(pi(t, "aku-project.json"), '{"lunaPlayable":true}');
    assert.equal(run(t).code, 0);
    assert.equal(ship(t).code, 0);
    assert.ok(fs.existsSync(pi(t, "skills/aku-luna-build-check/SKILL.md")));
    assert.ok(!fs.existsSync(path.join(t, ".omp/skills/aku-luna-build-check")));
    const omp = snapshot(path.join(t, ".omp"));
    fs.writeFileSync(pi(t, "aku-project.json"), '{"lunaPlayable":false}');
    assert.equal(run(t, ["--update"]).code, 0);
    assert.ok(!fs.existsSync(pi(t, "skills/aku-luna-build-check")));
    assert.deepEqual(snapshot(path.join(t, ".omp")), omp);
    assert.equal(run(t, ["--tier", "supercent,luna"]).code, 0);
    assert.equal(run(t, ["--uninstall", "--dry-run"]).code, 0);
    assert.ok(fs.existsSync(pi(t, "aku-lock.json")));
    assert.equal(run(t, ["--uninstall"]).code, 0);
    assert.equal(
      fs.readFileSync(pi(t, "aku-project.json"), "utf8"),
      '{"lunaPlayable":false}',
    );
  } finally {
    cleanup(t);
  }
});

for (const rel of ["", "skills", "APPEND_SYSTEM.md", "aku-lock.json"]) {
  test(`Pi rejects symlink at ${rel || "root"} even with force`, () => {
    const t = sandbox();
    const outside = sandbox();
    try {
      if (rel) fs.mkdirSync(pi(t, ""));
      const target = ["APPEND_SYSTEM.md", "aku-lock.json"].includes(rel)
        ? path.join(outside, "file")
        : outside;
      if (target !== outside) fs.writeFileSync(target, "{}");
      fs.symlinkSync(target, pi(t, rel));
      const before = snapshot(outside);
      const result = run(t, ["--force"]);
      assert.equal(result.code, 1, result.out);
      assert.match(result.out, /symlink/);
      assert.deepEqual(snapshot(outside), before);
    } finally {
      cleanup(t);
      cleanup(outside);
    }
  });
}
