/** Release identity and supported channel validation. */
const REPOSITORY = "SCVN-Zee/agent-kit-unity";
const CORE = "(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)";
const STABLE = new RegExp(`^${CORE}$`);
const BETA = new RegExp(`^${CORE}-beta\\.[1-9]\\d*$`);

function validateRelease({ tag, pkg, lock, expectedChannel }) {
  const version = pkg.version;
  const channel = STABLE.test(version)
    ? "stable"
    : BETA.test(version)
      ? "beta"
      : null;
  if (!channel)
    throw new Error(
      `unsupported version '${version}' (expected stable or beta.N)`,
    );
  if (expectedChannel && channel !== expectedChannel) {
    throw new Error(
      `version '${version}' is ${channel}, not ${expectedChannel}`,
    );
  }
  if (tag !== `v${version}`)
    throw new Error(`tag '${tag}' must equal v${version}`);
  const rootVersion =
    lock.packages && lock.packages[""] && lock.packages[""].version;
  if (lock.version !== version || rootVersion !== version) {
    throw new Error(`package-lock versions must both equal ${version}`);
  }
  const repoUrl = `https://github.com/${REPOSITORY}.git`;
  if (!pkg.repository || pkg.repository.url !== repoUrl) {
    throw new Error(`package repository must be ${repoUrl}`);
  }
  return { version, tag, channel, repository: REPOSITORY };
}

module.exports = { STABLE, BETA, validateRelease };
