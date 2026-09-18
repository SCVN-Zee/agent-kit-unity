const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { buildRelease, sha256 } = require("../build-release.cjs");

const ROOT = path.resolve(__dirname, "../..");

test("beta bootstrap selects across pages numerically and rejects an altered installer", async () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "aku-channel-"));
  let server;
  try {
    const source = path.join(temp, "source");
    fs.mkdirSync(source);
    for (const name of ["scripts", "kit"]) {
      fs.cpSync(path.join(ROOT, name), path.join(source, name), {
        recursive: true,
      });
    }
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json")));
    const lock = JSON.parse(
      fs.readFileSync(path.join(ROOT, "package-lock.json")),
    );
    const releases = [];
    for (const version of ["0.1.5-beta.9", "0.1.5-beta.10"]) {
      pkg.version = version;
      lock.version = version;
      lock.packages[""].version = version;
      fs.writeFileSync(path.join(source, "package.json"), JSON.stringify(pkg));
      fs.writeFileSync(
        path.join(source, "package-lock.json"),
        JSON.stringify(lock),
      );
      const release = buildRelease({
        root: source,
        tag: `v${version}`,
        outDir: path.join(temp, version),
      });
      release.script = fs.readFileSync(release.installerPath);
      release.bytes = fs.readFileSync(release.archive);
      release.row = {
        tag_name: `v${version}`,
        draft: false,
        prerelease: true,
        published_at: "2026-09-17T00:00:00Z",
        assets: [
          { name: "install.sh", digest: `sha256:${sha256(release.script)}` },
        ],
      };
      releases.push(release);
    }
    const [older, latest] = releases;
    const firstPage = [
      older.row,
      { ...latest.row, tag_name: "v99.0.0-beta.1", draft: true },
      ...Array(98).fill({
        ...latest.row,
        tag_name: "v99.0.0",
        prerelease: false,
      }),
    ];
    let corrupt = false;
    const requests = [];
    server = http.createServer((request, response) => {
      requests.push(request.url);
      if (request.url.startsWith("/api?")) {
        response.setHeader("Content-Type", "application/json");
        response.end(
          JSON.stringify(
            request.url.endsWith("page=1") ? firstPage : [latest.row],
          ),
        );
      } else if (request.url === "/download/install.sh") {
        response.end(
          corrupt
            ? Buffer.concat([latest.script, Buffer.from("\nchanged")])
            : latest.script,
        );
      } else if (request.url === `/download/${latest.archiveName}`) {
        response.end(latest.bytes);
      } else {
        response.writeHead(404);
        response.end();
      }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const scratch = path.join(temp, "scratch");
    fs.mkdirSync(scratch);
    async function run(target, agentTarget = "omp") {
      return new Promise((resolve, reject) => {
        const child = spawn(
          "sh",
          [
            older.installerPath,
            target,
            "--channel",
            "beta",
            "--target",
            agentTarget,
            "--tier",
            "supercent",
          ],
          {
            env: {
              ...process.env,
              TMPDIR: scratch,
              AKU_RELEASE_API_URL: `${base}/api`,
              AKU_RELEASE_BASE_URL: `${base}/download`,
            },
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
        let output = "";
        child.stdout.on("data", (data) => {
          output += data;
        });
        child.stderr.on("data", (data) => {
          output += data;
        });
        child.on("error", reject);
        child.on("close", (code) => resolve({ code, output }));
      });
    }
    const target = path.join(temp, "target with spaces");
    fs.mkdirSync(target);
    const installed = await run(target);
    assert.equal(installed.code, 0, installed.output);
    assert.ok(requests.includes("/api?per_page=100&page=2"));
    const installedLock = JSON.parse(
      fs.readFileSync(path.join(target, ".omp/aku-lock.json")),
    );
    assert.equal(installedLock.kitVersion, "0.1.5-beta.10");
    assert.ok(fs.existsSync(path.join(target, ".omp/rules/aku-sc-rules.md")));
    assert.deepEqual(fs.readdirSync(scratch), []);

    const piInstalled = await run(target, "pi");
    assert.equal(piInstalled.code, 0, piInstalled.output);
    const piLock = JSON.parse(
      fs.readFileSync(path.join(target, ".pi/aku-lock.json")),
    );
    assert.equal(piLock.kitVersion, "0.1.5-beta.10");
    assert.ok(fs.existsSync(path.join(target, ".pi/APPEND_SYSTEM.md")));
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(target, ".omp/aku-lock.json"))),
      installedLock,
    );

    corrupt = true;
    requests.length = 0;
    const untouched = path.join(temp, "untouched");
    fs.mkdirSync(untouched);
    const rejected = await run(untouched);
    assert.notEqual(rejected.code, 0);
    assert.equal(fs.existsSync(path.join(untouched, ".omp")), false);
    assert.equal(
      requests.some((url) => url.endsWith(".tgz")),
      false,
    );
    assert.deepEqual(fs.readdirSync(scratch), []);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
