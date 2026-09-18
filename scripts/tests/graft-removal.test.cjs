const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { sandbox, ship, sha, cleanup } = require("./helpers/omp-sandbox.cjs");

for (const target of ["omp", "pi"]) {
  for (const edited of [false, true]) {
    test(`${target} update ${edited ? "preserves edited" : "prunes unchanged"} retired Graft skill`, () => {
      const dir = sandbox();
      try {
        const args = ["--target", target];
        const installed = ship(dir, args);
        assert.equal(installed.code, 0, installed.out);
        const root = path.join(dir, `.${target}`);
        const rel = "skills/aku-graft/SKILL.md";
        const file = path.join(root, rel);
        const lockPath = path.join(root, "aku-lock.json");
        const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
        const original = "# Previously installed Graft skill\n";
        const content = edited ? original + "User customization\n" : original;
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, content);
        lock.files[rel] = { hash: sha(original) };
        fs.writeFileSync(lockPath, JSON.stringify(lock));
        const updated = ship(dir, [...args, "--update"]);
        if (edited) {
          assert.equal(updated.code, target === "pi" ? 1 : 0, updated.out);
          assert.match(updated.out, /conflict/i);
          assert.equal(fs.readFileSync(file, "utf8"), content);
          const next = JSON.parse(fs.readFileSync(lockPath, "utf8"));
          assert.equal(next.files[rel].hash, sha(original));
          if (target === "omp") assert.equal(next.files[rel].orphaned, true);
        } else {
          assert.equal(updated.code, 0, updated.out);
          assert.equal(fs.existsSync(file), false);
          const next = JSON.parse(fs.readFileSync(lockPath, "utf8"));
          assert.equal(next.files[rel], undefined);
          const checked = ship(dir, [...args, "--check"]);
          assert.equal(checked.code, 0, checked.out);
        }
      } finally {
        cleanup(dir);
      }
    });
  }
}
