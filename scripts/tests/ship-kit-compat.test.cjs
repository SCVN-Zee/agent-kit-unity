const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const { buildRelease } = require("../build-release.cjs");
const ROOT = path.resolve(__dirname, "../..");

function run(script, args, cwd) {
  const r = spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf8",
  });
  return { code: r.status, out: r.stdout + r.stderr };
}

test("packaged kit has both CLI names, identical lifecycle behavior, no old source tree", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aku-kit-compat-"));
  try {
    const release = buildRelease({
      root: ROOT,
      tag: "v" + require("../../package.json").version,
      outDir: path.join(tmp, "release"),
    });
    assert.ok(release.entries.includes("package/kit/AGENTS.md"));
    assert.ok(
      !release.entries.some((entry) => entry.startsWith("package/omp/")),
    );
    const unpacked = path.join(tmp, "unpacked");
    fs.mkdirSync(unpacked);
    const tar = spawnSync("tar", ["-xzf", release.archive, "-C", unpacked]);
    assert.equal(tar.status, 0);
    const pkgRoot = path.join(unpacked, "package");
    const pkg = JSON.parse(fs.readFileSync(path.join(pkgRoot, "package.json")));
    assert.equal(pkg.bin["aku-ship-kit"], "./scripts/ship-kit.cjs");
    assert.equal(pkg.bin["aku-ship-omp"], "./scripts/ship-omp.cjs");
    const canonical = path.join(pkgRoot, "scripts/ship-kit.cjs");
    const legacy = path.join(pkgRoot, "scripts/ship-omp.cjs");
    for (const target of ["omp", "pi"]) {
      const repo = path.join(tmp, "consumer " + target);
      fs.mkdirSync(repo);
      const args = [repo, "--target", target, "--tier", "supercent,luna"];
      const installed = run(canonical, args, tmp);
      assert.equal(installed.code, 0, installed.out);
      const lockPath = path.join(repo, "." + target, "aku-lock.json");
      const first = fs.readFileSync(lockPath);
      const checked = run(legacy, [...args, "--check"], tmp);
      assert.equal(checked.code, 0, checked.out);
      assert.equal(run(legacy, [...args, "--update"], tmp).code, 0);
      assert.deepEqual(fs.readFileSync(lockPath), first);
      assert.equal(run(canonical, [...args, "--check"], tmp).code, 0);
      assert.equal(
        run(legacy, [repo, "--target", target, "--uninstall"], tmp).code,
        0,
      );
      assert.ok(!fs.existsSync(lockPath));
    }
    for (const script of [canonical, legacy]) {
      assert.equal(run(script, ["--target", "invalid"], tmp).code, 1);
      assert.equal(run(script, ["--help"], tmp).code, 0);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
