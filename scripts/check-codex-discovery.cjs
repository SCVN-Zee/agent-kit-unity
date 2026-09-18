#!/usr/bin/env node
/** Opt-in native skills/list smoke. No thread, turn, inference or authentication. */
const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert/strict");
const { spawn, spawnSync } = require("child_process");
const { computePayload } = require("./lib/omp-install-payload");
const { projectHostPayload } = require("./lib/host-install-payload");
const { section } = require("./lib/host-startup-section");
const { rpcClient } = require("./lib/codex-discovery-rpc");
const KIT = path.resolve(__dirname, "../kit");

function verifyRows(result, expected) {
  assert.deepEqual(
    result.data.map((row) => row.cwd).sort(),
    [...expected.keys()].sort(),
  );
  for (const row of result.data) {
    assert.deepEqual(row.errors, []);
    const skills = row.skills.filter((s) => s.name.startsWith("aku-"));
    assert.deepEqual(skills.map((s) => s.name).sort(), expected.get(row.cwd));
    assert.ok(skills.every((s) => s.enabled && s.scope === "repo"));
  }
}
async function main() {
  const tmp = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), "aku-codex-discovery-")),
  );
  let child;
  try {
    const home = path.join(tmp, "home");
    fs.mkdirSync(home);
    const env = {
      PATH: process.env.PATH,
      HOME: home,
      CODEX_HOME: path.join(home, ".codex"),
      XDG_CONFIG_HOME: home,
      XDG_CACHE_HOME: path.join(home, "cache"),
      TMPDIR: tmp,
    };
    fs.mkdirSync(env.CODEX_HOME);
    const expected = new Map();
    for (const tiers of [[], ["supercent"], ["luna"], ["supercent", "luna"]]) {
      const root = path.join(tmp, tiers.join("-") || "base");
      fs.mkdirSync(path.join(root, "nested"), { recursive: true });
      const git = spawnSync(
        "git",
        ["-c", "init.templateDir=", "init", "-q", root],
        { env, encoding: "utf8" },
      );
      assert.equal(git.status, 0, git.stderr);
      const projected = projectHostPayload(computePayload(KIT, tiers), "codex");
      for (const [rel, entry] of Object.entries(projected.files)) {
        const file = path.join(root, rel);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, entry.content);
      }
      fs.writeFileSync(
        path.join(root, "AGENTS.md"),
        section(projected.startup),
      );
      const names = Object.keys(projected.files)
        .filter((p) => p.endsWith("/SKILL.md"))
        .map((p) => p.split("/").at(-2))
        .sort();
      expected.set(root, names);
      expected.set(path.join(root, "nested"), names);
    }
    child = spawn("codex", ["app-server", "--listen", "stdio://"], {
      cwd: tmp,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const rpc = rpcClient(child);
    child.stderr.resume(); // No private logs or model output copied into evidence.
    await rpc.request("initialize", {
      clientInfo: { name: "aku-discovery", version: "1" },
    });
    rpc.notify("initialized");
    const result = await rpc.request("skills/list", {
      cwds: [...expected.keys()],
      forceReload: true,
    });
    verifyRows(result, expected);
    console.log(
      "Codex native skill discovery: PASS, 8 root/nested tier cases (6/6/9/9 skills).",
    );
    console.log(
      "Startup loading and actual invocation were NOT tested; no model call was made.",
    );
  } finally {
    if (child?.pid && child.exitCode === null && child.signalCode === null) {
      const exited = new Promise((resolve) => child.once("exit", resolve));
      const timeout = setTimeout(() => child.kill("SIGKILL"), 1500);
      child.kill();
      await exited;
      clearTimeout(timeout);
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
if (require.main === module)
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
module.exports = { verifyRows };
