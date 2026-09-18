#!/usr/bin/env node
/** Optional host smoke: node scripts/check-pi-discovery.cjs /path/to/pi/dist/index.js
 * Uses an already installed SDK; no model calls, extensions, or new dependencies.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { spawnSync } = require("node:child_process");

async function main() {
  if (!process.argv[2])
    throw new Error("provide the installed Pi SDK entry point");
  const sdkPath = path.resolve(process.argv[2]);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "aku-pi-discovery-"));
  const originalHome = process.env.HOME;
  try {
    process.env.HOME = temp;
    process.env.PI_OFFLINE = "1";
    process.env.PI_CODING_AGENT_DIR = path.join(temp, "agent");
    const { DefaultResourceLoader, SettingsManager } = await import(
      pathToFileURL(sdkPath).href
    );
    const agentDir = path.join(temp, "agent");
    fs.mkdirSync(agentDir);
    fs.writeFileSync(
      path.join(agentDir, "APPEND_SYSTEM.md"),
      "GLOBAL APPEND SENTINEL",
    );
    for (const tiers of ["", "supercent", "luna", "supercent,luna"]) {
      const cwd = path.join(temp, "project-" + (tiers || "base"));
      fs.mkdirSync(cwd);
      const args = [
        path.join(__dirname, "ship-kit.cjs"),
        cwd,
        "--target",
        "pi",
      ];
      if (tiers) args.push("--tier", tiers);
      const installed = spawnSync(process.execPath, args, { encoding: "utf8" });
      assert.equal(installed.status, 0, installed.stderr);
      const settingsManager = SettingsManager.inMemory(
        {},
        { projectTrusted: true },
      );
      const loader = new DefaultResourceLoader({
        cwd,
        agentDir,
        settingsManager,
        noExtensions: true,
        noPromptTemplates: true,
        noThemes: true,
      });
      await loader.reload();
      const { skills, diagnostics } = loader.getSkills();
      const owned = skills.filter((skill) =>
        skill.filePath.startsWith(cwd + path.sep),
      );
      const expected = [
        "aku-asset-conventions",
        "aku-code-conventions",
        "aku-code-review",
        "aku-codebase-memory",
        "aku-odin",
        "aku-reference-feature",
      ];
      if (tiers.includes("luna"))
        expected.push(
          "aku-luna-build-check",
          "aku-luna-code-review",
          "aku-luna-conventions",
        );
      assert.deepEqual(
        owned.map((skill) => skill.name).sort(),
        expected.sort(),
      );
      assert.deepEqual(
        diagnostics.filter((item) => item.path?.startsWith(cwd)),
        [],
      );
      const append = loader.getAppendSystemPrompt().join("\n");
      assert.match(append, /never dispatch Editor write ops in parallel/);
      assert.equal(append.includes("[Dev]"), tiers.includes("supercent"));
      assert.ok(!append.includes("GLOBAL APPEND SENTINEL"));
      settingsManager.setProjectTrusted(false);
      await loader.reload();
      assert.equal(
        loader
          .getSkills()
          .skills.filter((skill) => skill.filePath.startsWith(cwd + path.sep))
          .length,
        0,
      );
      assert.deepEqual(loader.getAppendSystemPrompt(), [
        "GLOBAL APPEND SENTINEL",
      ]);
      console.log(
        `PASS Pi discovery + trust isolation: ${tiers || "base"} (${owned.length} skills)`,
      );
    }
  } finally {
    if (originalHome === undefined) delete process.env.HOME;
    else process.env.HOME = originalHome;
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
