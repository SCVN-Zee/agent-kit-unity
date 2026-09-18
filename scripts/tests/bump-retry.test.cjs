const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "../..");

test("bump retries a failed gate at the same version before commit and tag", () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "aku-bump-retry-"));
  try {
    fs.copyFileSync(path.join(ROOT, "Makefile"), path.join(cwd, "Makefile"));
    fs.cpSync(path.join(ROOT, "scripts"), path.join(cwd, "scripts"), {
      recursive: true,
    });
    const pkg = { name: "bump-fixture", version: "0.1.0" };
    fs.writeFileSync(path.join(cwd, "package.json"), JSON.stringify(pkg));
    fs.writeFileSync(
      path.join(cwd, "package-lock.json"),
      JSON.stringify({
        ...pkg,
        lockfileVersion: 3,
        packages: { "": pkg },
      }),
    );
    const bin = path.join(cwd, "bin");
    fs.mkdirSync(bin);
    const calls = path.join(cwd, "git-calls");
    // No real Git mutation: record the recipe's intended commands only.
    fs.writeFileSync(
      path.join(bin, "git"),
      '#!/bin/sh\nprintf "%s\\n" "$*" >> "$GIT_CALLS"\n',
      { mode: 0o755 },
    );
    const run = (gate) =>
      spawnSync("make", ["bump", "VERSION=0.2.0-beta.1", `MAKE=${gate}`], {
        cwd,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${bin}${path.delimiter}${process.env.PATH}`,
          GIT_CALLS: calls,
        },
      });
    const failed = run("false");
    assert.notEqual(failed.status, 0, failed.stdout + failed.stderr);
    assert.equal(
      fs.existsSync(calls),
      false,
      "failed gate must not invoke git",
    );
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(cwd, "package.json"))).version,
      "0.2.0-beta.1",
    );
    const retried = run("true");
    assert.equal(retried.status, 0, retried.stdout + retried.stderr);
    const commands = fs.readFileSync(calls, "utf8").trim().split("\n");
    assert.match(
      commands[0],
      /^commit -q -m chore\(release\): v0\.2\.0-beta\.1 /,
    );
    assert.equal(commands[1], "tag -a v0.2.0-beta.1 -m v0.2.0-beta.1");
    const lock = JSON.parse(
      fs.readFileSync(path.join(cwd, "package-lock.json")),
    );
    assert.equal(lock.version, "0.2.0-beta.1");
    assert.equal(lock.packages[""].version, lock.version);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
