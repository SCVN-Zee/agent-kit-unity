const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const {
  fixture,
  prepare,
  apply,
  put,
  cleanup,
  snapshot,
} = require("./helpers/host-sandbox.cjs");
const { readHostLock } = require("../lib/host-install-lock");
const { section } = require("../lib/host-startup-section");
for (const name of ["codex", "claude"]) {
  test(`${name}: identical unowned bytes require explicit adoption; lock stable`, () => {
    const f = fixture(name);
    try {
      const rel = Object.keys(f.files)[0];
      put(f, rel, f.files[rel].content);
      assert.equal(prepare(f).conflicts[0].reason, "unowned");
      apply(f, { force: true });
      const before = snapshot(f.root);
      apply(f);
      assert.deepEqual(snapshot(f.root), before);
      apply({ ...f, kitVersion: "2.0.0" });
      assert.deepEqual(snapshot(f.root), before);
    } finally {
      cleanup(f);
    }
  });
  test(`${name}: edited uninstall entries retain baseline until manually resolved`, () => {
    const f = fixture(name);
    try {
      apply(f);
      const rel = Object.keys(f.files)[0];
      const initial = readHostLock(f.root, f.target).prior.files[rel];
      put(f, rel, "user edit");
      const p = apply(f, { uninstall: true, force: true });
      assert.equal(p.conflicts.length, 1);
      assert.deepEqual(
        readHostLock(f.root, f.target).prior.files[rel],
        initial,
      );
      assert.equal(
        fs.readFileSync(path.join(f.root, rel), "utf8"),
        "user edit",
      );
      put(f, rel, f.files[rel].content);
      apply(f, { uninstall: true });
      assert.equal(readHostLock(f.root, f.target).prior, null);
    } finally {
      cleanup(f);
    }
  });
  for (const rel of [
    `.${name}`,
    name === "codex" ? ".agents" : ".claude/skills",
    `.${name}/aku-lock.json`,
    name === "codex" ? "AGENTS.md" : ".claude/skills/aku-example/SKILL.md",
  ]) {
    test(`${name}: refuses symlink ${rel}`, () => {
      const f = fixture(name),
        outside = fixture();
      try {
        const dest = path.join(f.root, rel);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.symlinkSync(outside.root, dest);
        assert.throws(() => prepare(f, { force: true }), /symlink/);
        assert.deepEqual(snapshot(outside.root), {});
      } finally {
        cleanup(f);
        cleanup(outside);
      }
    });
  }
}
test("Codex outside-span edits survive updates and removal", () => {
  const f = fixture();
  try {
    put(f, "AGENTS.md", "\ufeffuser\r\n");
    apply(f);
    fs.appendFileSync(path.join(f.root, "AGENTS.md"), "more user");
    apply({ ...f, startup: Buffer.from("New guide\n") });
    apply(f, { uninstall: true });
    assert.equal(
      fs.readFileSync(path.join(f.root, "AGENTS.md"), "utf8"),
      "\ufeffuser\r\nmore user",
    );
  } finally {
    cleanup(f);
  }
});
test("Codex override, budget and malformed/unowned spans cannot be forced", () => {
  for (const [rel, content] of [
    ["AGENTS.override.md", "override"],
    ["AGENTS.override.md", "  "],
    ["AGENTS.md", "x".repeat(32768)],
  ]) {
    const f = fixture();
    try {
      put(f, rel, content);
      assert.ok(prepare(f, { force: true }).issues.length);
    } finally {
      cleanup(f);
    }
  }
  const f = fixture();
  try {
    put(f, "AGENTS.md", section(Buffer.from("foreign guide")));
    assert.ok(prepare(f, { force: true }).conflicts.length);
    put(f, "AGENTS.md", "<!-- aku:codex:begin -->\n");
    assert.throws(() => prepare(f, { force: true }), /ambiguous/);
  } finally {
    cleanup(f);
  }
});
test("crafted locks cannot claim arbitrary or cross-target resources", () => {
  const f = fixture();
  try {
    apply(f);
    const good = readHostLock(f.root, f.target).prior;
    for (const rel of [
      "AGENTS.md",
      "../outside",
      ".claude/skills/aku-example/SKILL.md",
      ".codex/config.toml",
      ".codex/aku-project.json",
      ".agents/skills/user/SKILL.md",
      ".agents/skills/aku-example/../user",
    ]) {
      const bad = { ...good, files: { [rel]: Object.values(good.files)[0] } };
      put(f, f.target.lock, JSON.stringify(bad));
      assert.throws(() => prepare(f, { force: true }), /unsafe/);
    }
    for (const mutation of [
      { target: "claude" },
      { lockVersion: 99 },
      { files: [] },
      { files: { [Object.keys(good.files)[0]]: { hash: "bad" } } },
    ]) {
      put(f, f.target.lock, JSON.stringify({ ...good, ...mutation }));
      assert.throws(() => prepare(f), /invalid|unsupported/);
    }
  } finally {
    cleanup(f);
  }
});
