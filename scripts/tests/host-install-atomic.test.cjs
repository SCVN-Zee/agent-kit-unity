const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { atomicWrite, applyHost } = require("../lib/host-install-apply");
const { fixture, prepare, cleanup } = require("./helpers/host-sandbox.cjs");
test("atomic temporary name collisions are never deleted", (t) => {
  const f = fixture();
  let collision;
  const open = fs.openSync;
  try {
    t.mock.method(fs, "openSync", (file, flags, mode) => {
      if (String(file).includes(".aku-tmp.") && flags === "wx") {
        collision = file;
        const fd = open(file, "wx");
        fs.writeSync(fd, "foreign temporary bytes");
        fs.closeSync(fd);
      }
      return open(file, flags, mode);
    });
    const file = path.join(f.root, "AGENTS.md");
    assert.throws(() => atomicWrite(file, Buffer.from("new"), null), /EEXIST/);
    assert.equal(fs.readFileSync(collision, "utf8"), "foreign temporary bytes");
    assert.equal(fs.existsSync(file), false);
  } finally {
    t.mock.restoreAll();
    cleanup(f);
  }
});
test("new file commit never clobbers a destination created after its snapshot check", (t) => {
  const f = fixture();
  const link = fs.linkSync;
  try {
    t.mock.method(fs, "linkSync", (source, dest) => {
      fs.writeFileSync(dest, "concurrent writer");
      return link(source, dest);
    });
    const file = path.join(f.root, "AGENTS.md");
    assert.throws(() => atomicWrite(file, Buffer.from("kit"), null), /EEXIST/);
    assert.equal(fs.readFileSync(file, "utf8"), "concurrent writer");
    assert.deepEqual(fs.readdirSync(f.root), ["AGENTS.md"]);
  } finally {
    t.mock.restoreAll();
    cleanup(f);
  }
});
test("apply releases only its own operation guard identity", () => {
  const f = fixture();
  try {
    const guard = path.join(f.root, f.target.guard);
    const plan = prepare(f);
    assert.throws(
      () =>
        applyHost(f.root, f.target, plan, {
          fault: () => {
            fs.renameSync(guard, guard + ".old");
            fs.writeFileSync(guard, "another owner");
            throw new Error("interrupted after guard replacement");
          },
        }),
      /interrupted/,
    );
    assert.equal(fs.readFileSync(guard, "utf8"), "another owner");
  } finally {
    cleanup(f);
  }
});
