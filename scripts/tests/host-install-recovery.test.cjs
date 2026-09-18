const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const {
  fixture,
  payload,
  prepare,
  apply,
  put,
  cleanup,
  snapshot,
} = require("./helpers/host-sandbox.cjs");
const { applyHost } = require("../lib/host-install-apply");
const { readHostLock } = require("../lib/host-install-lock");

for (const name of ["codex", "claude"]) {
  for (const scenario of ["fresh", "update", "added", "prune", "uninstall"]) {
    for (const when of ["before", "after"]) {
      test(`${name} recovery ${scenario} at every ${when} mutation boundary`, () => {
        // First determine the ordered mutation list; then rebuild each case independently.
        function setup() {
          const f = fixture(name);
          put(f, "user.txt", "untouched");
          if (name === "codex") put(f, "AGENTS.md", "user instructions\r\n");
          if (scenario !== "fresh") apply(f);
          if (scenario === "update") {
            f.files = payload(f.target, "new skill");
            if (f.startup) f.startup = Buffer.from("new guide");
          }
          if (scenario === "added") {
            const entry = Object.values(payload(f.target, "added skill"))[0];
            f.files[`${f.target.skills}/aku-added/SKILL.md`] = entry;
          }
          if (scenario === "prune") f.files = {};
          return f;
        }
        const probe = setup();
        const args = scenario === "uninstall" ? { uninstall: true } : {};
        const paths = [
          ...prepare(probe, args).operations.map((o) => o.rel),
          probe.target.lock,
        ];
        cleanup(probe);
        for (const failPath of paths) {
          const f = setup();
          try {
            const plan = prepare(f, args);
            assert.throws(
              () =>
                applyHost(f.root, f.target, plan, {
                  fault: (stage, rel) => {
                    if (stage === when && rel === failPath)
                      throw new Error("injected interruption");
                  },
                }),
              /injected interruption/,
            );
            const retry = prepare(f, args);
            if (retry.conflicts.length && !args.uninstall) {
              const before = snapshot(f.root);
              assert.throws(() => apply(f, args), /blocked conflicts/);
              assert.deepEqual(snapshot(f.root), before);
              apply(f, { force: true });
            } else apply(f, args);
            assert.equal(
              fs.readFileSync(path.join(f.root, "user.txt"), "utf8"),
              "untouched",
            );
            if (args.uninstall)
              assert.equal(readHostLock(f.root, f.target).prior, null);
            else assert.equal(prepare(f).operations.length, 0);
            if (name === "codex")
              assert.ok(
                fs
                  .readFileSync(path.join(f.root, "AGENTS.md"), "utf8")
                  .endsWith("user instructions\r\n"),
              );
          } finally {
            cleanup(f);
          }
        }
      });
    }
  }
}
test("changed snapshots and active/stale guards fail closed", () => {
  const f = fixture();
  try {
    const plan = prepare(f);
    put(f, "AGENTS.md", "concurrent edit");
    assert.throws(
      () => applyHost(f.root, f.target, plan),
      /changed during operation/,
    );
    assert.equal(
      fs.readFileSync(path.join(f.root, "AGENTS.md"), "utf8"),
      "concurrent edit",
    );
    put(f, f.target.guard, "unknown owner");
    const before = snapshot(f.root);
    assert.throws(() => apply(f, { force: true }), /guard exists/);
    assert.deepEqual(snapshot(f.root), before);
  } finally {
    cleanup(f);
  }
});
