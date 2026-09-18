/** Real generated-bootstrap HTTP execution; no shell interpolation of argv. */
const { spawn } = require("child_process");
const FETCH_AND_RUN = `
installer=$(mktemp "\${TMPDIR:-/tmp}/aku-bootstrap-entry.XXXXXX") || exit
trap 'rm -f "$installer"' 0 HUP INT TERM
curl -fsSL "$AKU_RELEASE_BASE_URL/install.sh" -o "$installer" || exit
sh "$installer" "$@"
`;
function runBootstrap(baseUrl, args, tmpDir) {
  return new Promise((resolve, reject) => {
    const child = spawn("sh", ["-c", FETCH_AND_RUN, "bootstrap", ...args], {
      env: { ...process.env, AKU_RELEASE_BASE_URL: baseUrl, TMPDIR: tmpDir },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, output }));
  });
}
function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address()));
  });
}
module.exports = { runBootstrap, listen };
