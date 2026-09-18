const test = require("node:test");
const assert = require("node:assert/strict");
const { fixture, apply, put, cleanup } = require("./helpers/host-sandbox.cjs");
const { readHostLock } = require("../lib/host-install-lock");
test("host manifests reject invalid startup and scalar entry shapes even with force", () => {
  const f = fixture();
  try {
    apply(f);
    const good = readHostLock(f.root, f.target).prior;
    for (const startup of [
      null,
      [],
      "AGENTS.md",
      { ...good.startup, hash: [good.startup.hash] },
    ]) {
      put(f, f.target.lock, JSON.stringify({ ...good, startup }));
      assert.throws(() => readHostLock(f.root, f.target), /invalid/);
    }
    const rel = Object.keys(good.files)[0],
      entry = good.files[rel];
    for (const invalid of [
      null,
      [],
      { ...entry, hash: [entry.hash] },
      { ...entry, tier: "unknown" },
    ]) {
      put(
        f,
        f.target.lock,
        JSON.stringify({ ...good, files: { [rel]: invalid } }),
      );
      assert.throws(() => readHostLock(f.root, f.target), /invalid/);
    }
  } finally {
    cleanup(f);
  }
});
