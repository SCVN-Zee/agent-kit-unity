const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const os = require("os");
const path = require("path");
const { runBootstrap, listen } = require("./helpers/release-http.cjs");
const { buildRelease, sha256 } = require("../build-release.cjs");

const ROOT = path.resolve(__dirname, "../..");
const TAG = `v${require("../../package.json").version}`;
function assertLock(target, agentTarget = "omp") {
  const omp = path.join(target, "." + agentTarget);
  const lock = JSON.parse(
    fs.readFileSync(path.join(omp, "aku-lock.json"), "utf8"),
  );
  for (const [rel, entry] of Object.entries(lock.files)) {
    const installed = path.join(omp, rel);
    assert.ok(fs.existsSync(installed), `lock path missing: ${rel}`);
    assert.equal(
      `sha256:${sha256(fs.readFileSync(installed))}`,
      entry.hash,
      `bad lock hash: ${rel}`,
    );
  }
  return fs.readFileSync(path.join(omp, "aku-lock.json"));
}

test("curl bootstrap forwards every mode and cleans temporary state", async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "aku-bootstrap-"));
  const scratch = path.join(temp, "bootstrap-tmp");
  fs.mkdirSync(scratch);
  const outDir = path.join(temp, "release");
  const release = buildRelease({ root: ROOT, tag: TAG, outDir });
  const assets = fs.readdirSync(outDir).sort();
  assert.deepEqual(
    assets,
    ["SHA256SUMS", release.archiveName, "install.sh"].sort(),
  );
  assert.equal(
    fs.readFileSync(path.join(outDir, "SHA256SUMS"), "utf8"),
    `${sha256(fs.readFileSync(release.archive))}  ${release.archiveName}\n`,
  );
  const installerBytes = fs.readFileSync(release.installerPath);
  let archiveBytes = fs.readFileSync(release.archive);
  const server = http.createServer((request, response) => {
    if (request.url === "/install.sh") {
      response.writeHead(200, { "content-type": "text/x-shellscript" });
      response.end(installerBytes);
    } else if (request.url === `/${release.archiveName}`) {
      response.writeHead(200, { "content-type": "application/gzip" });
      response.end(archiveBytes);
    } else response.writeHead(404).end();
  });
  const address = await listen(server);
  const baseUrl = `http://${address.address}:${address.port}`;
  const target = path.join(temp, "target with spaces");
  fs.mkdirSync(target);
  try {
    const installed = await runBootstrap(baseUrl, [target], scratch);
    assert.equal(installed.code, 0, installed.output);
    const firstLock = assertLock(target);

    const repeated = await runBootstrap(baseUrl, [target], scratch);
    assert.equal(repeated.code, 0, repeated.output);
    assert.deepEqual(
      assertLock(target),
      firstLock,
      "repeat install rewrote lock",
    );

    const checked = await runBootstrap(baseUrl, [target, "--check"], scratch);
    assert.equal(checked.code, 0, checked.output);
    const dryRun = await runBootstrap(baseUrl, [target, "--dry-run"], scratch);
    assert.equal(dryRun.code, 0, dryRun.output);
    assert.deepEqual(assertLock(target), firstLock, "dry-run rewrote lock");

    const piArgs = [target, "--target", "pi"];
    const piInstalled = await runBootstrap(baseUrl, piArgs, scratch);
    assert.equal(piInstalled.code, 0, piInstalled.output);
    const piLock = assertLock(target, "pi");
    for (const mode of ["--check", "--update", "--dry-run"]) {
      const result = await runBootstrap(baseUrl, [...piArgs, mode], scratch);
      assert.equal(result.code, 0, result.output);
      assert.deepEqual(assertLock(target, "pi"), piLock);
      assert.deepEqual(assertLock(target), firstLock);
    }
    const piRemoved = await runBootstrap(
      baseUrl,
      [...piArgs, "--uninstall"],
      scratch,
    );
    assert.equal(piRemoved.code, 0, piRemoved.output);
    assert.equal(fs.existsSync(path.join(target, ".pi/aku-lock.json")), false);
    assert.deepEqual(assertLock(target), firstLock);

    const managed = path.join(target, ".omp/AGENTS.md");
    fs.appendFileSync(managed, "\nUSER EDIT\n");
    const updated = await runBootstrap(baseUrl, [target, "--update"], scratch);
    assert.equal(updated.code, 0, updated.output);
    assert.match(updated.output, /conflict/);
    assert.match(fs.readFileSync(managed, "utf8"), /USER EDIT/);

    const forced = await runBootstrap(
      baseUrl,
      [target, "--update", "--force"],
      scratch,
    );
    assert.equal(forced.code, 0, forced.output);
    assert.doesNotMatch(fs.readFileSync(managed, "utf8"), /USER EDIT/);
    const uninstalled = await runBootstrap(
      baseUrl,
      [target, "--uninstall"],
      scratch,
    );
    assert.equal(uninstalled.code, 0, uninstalled.output);
    assert.equal(fs.existsSync(path.join(target, ".omp/aku-lock.json")), false);

    const missingTarget = path.join(temp, "missing-bootstrap-target");
    fs.mkdirSync(missingTarget);
    const missing = await runBootstrap(
      `${baseUrl}/missing`,
      [missingTarget],
      scratch,
    );
    assert.notEqual(
      missing.code,
      0,
      "bootstrap download failure reported success",
    );
    assert.equal(fs.existsSync(path.join(missingTarget, ".omp")), false);

    archiveBytes = Buffer.concat([archiveBytes, Buffer.from("corrupt")]);
    const corruptTarget = path.join(temp, "corrupt-target");
    fs.mkdirSync(corruptTarget);
    const corrupted = await runBootstrap(baseUrl, [corruptTarget], scratch);
    assert.notEqual(corrupted.code, 0);
    assert.match(corrupted.output, /checksum mismatch/);
    assert.equal(fs.existsSync(path.join(corruptTarget, ".omp")), false);
    assert.deepEqual(
      fs.readdirSync(scratch),
      [],
      "bootstrap left temporary residue",
    );
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
