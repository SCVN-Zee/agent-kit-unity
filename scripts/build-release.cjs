#!/usr/bin/env node
/** Build the immutable GitHub Release payload consumed by install.sh. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');
const { copyEntry, writeAtomic } = require('./lib/global-install-fs');

const ROOT = path.resolve(__dirname, '..');
const REPOSITORY = 'SCVN-Zee/agent-kit-unity';
const CORE = '(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)';
const STABLE = new RegExp(`^${CORE}$`);
const BETA = new RegExp(`^${CORE}-beta\\.[1-9]\\d*$`);
const REQUIRED = [
  'package/package.json',
  'package/omp/AGENTS.md',
  'package/scripts/ship-omp.cjs',
  'package/scripts/lib/path-safety.js',
  'package/scripts/lib/omp-install-lock.js',
  'package/scripts/lib/omp-install-payload.js',
  'package/scripts/lib/omp-install-reconcile.js',
  'package/scripts/lib/omp-install-apply.js',
  'package/scripts/lib/omp-tier-detect.js',
  'package/scripts/lib/global-install-fs.js'
];

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function validateRelease({ tag, pkg, lock, expectedChannel }) {
  const version = pkg.version;
  const channel = STABLE.test(version) ? 'stable' : BETA.test(version) ? 'beta' : null;
  if (!channel) throw new Error(`unsupported version '${version}' (expected stable or beta.N)`);
  if (expectedChannel && channel !== expectedChannel) {
    throw new Error(`version '${version}' is ${channel}, not ${expectedChannel}`);
  }
  if (tag !== `v${version}`) throw new Error(`tag '${tag}' must equal v${version}`);
  const rootVersion = lock.packages && lock.packages[''] && lock.packages[''].version;
  if (lock.version !== version || rootVersion !== version) {
    throw new Error(`package-lock versions must both equal ${version}`);
  }
  const repoUrl = `https://github.com/${REPOSITORY}.git`;
  if (!pkg.repository || pkg.repository.url !== repoUrl) {
    throw new Error(`package repository must be ${repoUrl}`);
  }
  return { version, tag, channel, repository: REPOSITORY };
}

function loadRelease(root, tag, expectedChannel) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  return validateRelease({ tag, pkg, lock, expectedChannel });
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} failed (${result.status}): ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function renderInstaller(template, values) {
  let rendered = template;
  for (const [key, value] of Object.entries(values)) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9._/-]+$/.test(value)) {
      throw new Error(`unsafe installer template value for ${key}`);
    }
    rendered = rendered.replaceAll(`@@${key}@@`, value);
  }
  if (/@@[A-Z_]+@@/.test(rendered)) throw new Error('unresolved installer template placeholder');
  return rendered;
}

function assertArchiveEntries(entries) {
  for (const rel of REQUIRED) {
    if (!entries.includes(rel)) throw new Error(`release archive missing ${rel}`);
  }
  for (const prefix of ['package/omp/rules/', 'package/omp/skills/']) {
    if (!entries.some((entry) => entry.startsWith(prefix))) {
      throw new Error(`release archive missing ${prefix}`);
    }
  }
  return entries;
}

function assertArchive(archive, root) {
  return assertArchiveEntries(run('tar', ['-tzf', archive], root).trim().split('\n'));
}

function buildRelease({
  root = ROOT, tag, expectedChannel, outDir = path.join(root, 'dist/release')
}) {
  const meta = loadRelease(root, tag, expectedChannel);
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'aku-release-'));
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  try {
    const packed = JSON.parse(run('npm', [
      'pack', '--ignore-scripts', '--json', '--pack-destination', staging
    ], root));
    if (!Array.isArray(packed) || packed.length !== 1 || !packed[0].filename) {
      throw new Error('npm pack did not return one archive');
    }
    const archiveName = `agent-kit-unity-v${meta.version}.tgz`;
    const archive = path.join(outDir, archiveName);
    copyEntry({ src: path.join(staging, packed[0].filename), dest: archive, kind: 'file' });
    const entries = assertArchive(archive, root);
    const hash = sha256(fs.readFileSync(archive));
    writeAtomic(path.join(outDir, 'SHA256SUMS'), `${hash}  ${archiveName}\n`);
    const template = fs.readFileSync(path.join(root, 'scripts/release/install.sh.template'), 'utf8');
    const installer = renderInstaller(template, {
      REPOSITORY: meta.repository, TAG: meta.tag, ARCHIVE: archiveName, SHA256: hash
    });
    const installerPath = path.join(outDir, 'install.sh');
    writeAtomic(installerPath, installer);
    fs.chmodSync(installerPath, 0o755);
    return { ...meta, outDir, archive, archiveName, hash, entries, installerPath };
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

function parseCli(argv) {
  const tag = argv[0];
  let expectedChannel;
  let validateOnly = false;
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === '--validate-only') validateOnly = true;
    else if (argv[i] === '--channel' && ['stable', 'beta'].includes(argv[i + 1])) {
      expectedChannel = argv[++i];
    } else throw new Error(`unknown argument '${argv[i]}'`);
  }
  if (!tag) throw new Error('release tag is required');
  return { tag, expectedChannel, validateOnly };
}

if (require.main === module) {
  try {
    const options = parseCli(process.argv.slice(2));
    const result = options.validateOnly
      ? loadRelease(ROOT, options.tag, options.expectedChannel)
      : buildRelease(options);
    const action = options.validateOnly ? 'validated' : `bundle: ${result.outDir}`;
    console.log(`release ${action} (${result.channel} ${result.tag})`);
  } catch (error) {
    process.stderr.write(`build-release: ${error.message}\n`);
    process.exit(1);
  }
}

module.exports = {
  BETA, REQUIRED, STABLE, assertArchiveEntries, buildRelease, parseCli,
  renderInstaller, sha256, validateRelease
};
