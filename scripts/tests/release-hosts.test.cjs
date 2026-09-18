const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const path = require("path");
const { buildRelease } = require("../build-release.cjs");
const { runBootstrap, listen } = require("./helpers/release-http.cjs");
const { fixture, snapshot, cleanup } = require("./helpers/host-sandbox.cjs");
const { hostTarget } = require("../lib/host-targets");
const { readHostLock } = require("../lib/host-install-lock");
const { hashBytes } = require("../lib/omp-install-lock");
const { parseSection } = require("../lib/host-startup-section");

test("real release bootstrap installs both native hosts and integrity-checks every mapped entry", async () => {
  const f = fixture();
  const scratch = path.join(f.root, "scratch");
  fs.mkdirSync(scratch);
  const release = buildRelease({
    tag: `v${require("../../package.json").version}`,
    outDir: path.join(f.root, "release"),
  });
  let archive = fs.readFileSync(release.archive);
  const installer = fs.readFileSync(release.installerPath);
  const server = http.createServer((req, res) => {
    if (req.url === "/install.sh") res.end(installer);
    else if (req.url === `/${release.archiveName}`) res.end(archive);
    else res.writeHead(404).end();
  });
  const address = await listen(server);
  const url = `http://${address.address}:${address.port}`;
  try {
    const root = path.join(f.root, "Unity with spaces");
    fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, "AGENTS.md"), "user rules");
    for (const name of ["codex", "claude"]) {
      const target = hostTarget(name);
      const args = [root, "--target", name, "--tier", "supercent,luna"];
      const pre = snapshot(root);
      let r = await runBootstrap(url, [...args, "--dry-run"], scratch);
      assert.equal(r.code, 0, r.output);
      assert.deepEqual(snapshot(root), pre);
      r = await runBootstrap(url, args, scratch);
      assert.equal(r.code, 0, r.output);
      const first = snapshot(root);
      for (const mode of ["--check", "--update", "--dry-run"]) {
        r = await runBootstrap(url, [...args, mode], scratch);
        assert.equal(r.code, 0, r.output);
        assert.deepEqual(snapshot(root), first);
      }
      const { prior } = readHostLock(root, target);
      for (const [rel, meta] of Object.entries(prior.files))
        assert.equal(
          hashBytes(fs.readFileSync(path.join(root, rel))),
          meta.hash,
        );
      if (prior.startup)
        assert.equal(
          hashBytes(
            parseSection(fs.readFileSync(path.join(root, "AGENTS.md"))).content,
          ),
          prior.startup.hash,
        );
      const skill = path.join(root, target.skills, "aku-code-review/SKILL.md");
      fs.appendFileSync(skill, "\nuser edit");
      const edited = snapshot(root);
      r = await runBootstrap(url, [...args, "--update"], scratch);
      assert.equal(r.code, 1);
      assert.deepEqual(snapshot(root), edited);
      r = await runBootstrap(url, [...args, "--update", "--force"], scratch);
      assert.equal(r.code, 0, r.output);
      r = await runBootstrap(
        url,
        [...args, "--uninstall", "--dry-run"],
        scratch,
      );
      assert.equal(r.code, 0, r.output);
      assert.ok(readHostLock(root, target).prior);
      r = await runBootstrap(url, [...args, "--uninstall"], scratch);
      assert.equal(r.code, 0, r.output);
      assert.equal(readHostLock(root, target).prior, null);
      assert.equal(
        fs.readFileSync(path.join(root, "AGENTS.md"), "utf8"),
        "user rules",
      );
    }
    archive = Buffer.concat([archive, Buffer.from("tampered")]);
    for (const name of ["codex", "claude"]) {
      const before = snapshot(root);
      const r = await runBootstrap(url, [root, "--target", name], scratch);
      assert.notEqual(r.code, 0);
      assert.match(r.output, /checksum mismatch/);
      assert.deepEqual(snapshot(root), before);
    }
    assert.deepEqual(fs.readdirSync(scratch), []);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    cleanup(f);
  }
});
