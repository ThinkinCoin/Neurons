const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

function sha256Hex(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filePath) {
  return sha256Hex(fs.readFileSync(filePath));
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function walkFiles(rootDir, relativeDir = '', results = []) {
  const dir = path.join(rootDir, relativeDir);
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const relativePath = path.posix.join(relativeDir.replaceAll(path.sep, '/'), entry.name);
    if (entry.isDirectory()) walkFiles(rootDir, relativePath, results);
    else if (entry.isFile()) results.push(relativePath);
  }
  return results;
}

const FINGERPRINT_FILES = ['.npmrc', '.nvmrc', 'AGENTS.md', 'README.md', 'hardhat.config.js', 'package-lock.json', 'package.json'];
const FINGERPRINT_DIRECTORIES = ['.github', 'contracts', 'docs', 'schemas', 'scripts', 'test'];

function fingerprintInputFiles(repoDir) {
  const files = new Set(FINGERPRINT_FILES.filter(file => fs.existsSync(path.join(repoDir, file))));
  for (const directory of FINGERPRINT_DIRECTORIES) walkFiles(repoDir, directory).forEach(file => files.add(file));
  return [...files].sort();
}

function computeSourceTreeFingerprint(repoDir) {
  const inputs = fingerprintInputFiles(repoDir).map(file => `${file}:${sha256File(path.join(repoDir, file))}`);
  return sha256Hex(inputs.join('\n'));
}

function packageNameFromNodeModulesPath(packagePath) {
  const marker = 'node_modules/';
  const index = packagePath.lastIndexOf(marker);
  return index >= 0 ? packagePath.slice(index + marker.length) : packagePath;
}

function scanInstalledPackages(repoDir) {
  const nodeModules = path.join(repoDir, 'node_modules');
  const packages = [];
  function scan(directory, scope = '') {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === '.bin' || entry.name.startsWith('.')) continue;
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory() && entry.name.startsWith('@')) scan(entryPath, `${entry.name}/`);
      else if (entry.isDirectory()) {
        const packageJson = path.join(entryPath, 'package.json');
        if (!fs.existsSync(packageJson)) continue;
        const metadata = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
        packages.push({ name: scope + entry.name, version: metadata.version || 'UNKNOWN' });
      }
    }
  }
  scan(nodeModules);
  packages.sort((left, right) => left.name.localeCompare(right.name) || left.version.localeCompare(right.version));
  return packages;
}

function findSolcBinary() {
  const candidates = [];
  if (process.env.SOLC_BINARY_PATH) candidates.push(process.env.SOLC_BINARY_PATH);
  const platform = process.platform === 'linux' ? 'linux-amd64' : process.platform === 'darwin' ? 'macosx-amd64' : null;
  if (platform) {
    const compilerDir = path.join(os.homedir(), '.cache', 'hardhat-nodejs', 'compilers-v2', platform);
    if (fs.existsSync(compilerDir)) {
      for (const file of fs.readdirSync(compilerDir)) if (file.includes('v0.8.22+commit.4fc1097e')) candidates.push(path.join(compilerDir, file));
    }
  }
  return candidates.find(candidate => fs.existsSync(candidate)) || null;
}

function readCompilerIdentity(repoDir) {
  const buildInfoDir = path.join(repoDir, 'artifacts', 'build-info');
  const infoFiles = fs.existsSync(buildInfoDir) ? fs.readdirSync(buildInfoDir).filter(file => file.endsWith('.json')).sort() : [];
  if (infoFiles.length === 0) throw new Error('Hardhat build-info is required before generating an artifact manifest');
  const buildInfo = JSON.parse(fs.readFileSync(path.join(buildInfoDir, infoFiles[0]), 'utf8'));
  const binaryPath = findSolcBinary();
  if (!binaryPath) throw new Error('Pinned solc 0.8.22 compiler binary was not found in the Hardhat cache');
  const settings = buildInfo.input && buildInfo.input.settings;
  if (!settings) throw new Error('Hardhat build-info is missing compiler settings');
  return {
    solc_version: buildInfo.solcLongVersion || buildInfo.solcVersion,
    solc_binary_sha256: sha256File(binaryPath),
    optimizer_enabled: settings.optimizer?.enabled === true,
    optimizer_runs: settings.optimizer?.runs ?? 0,
    evm_target: settings.evmVersion || 'default',
    settings_sha256: sha256Hex(canonicalJson(settings))
  };
}

function isEmptyBytecode(value) { return !value || value === '0x'; }
function bytecodeHash(value) { return isEmptyBytecode(value) ? 'EMPTY' : sha256Hex(value); }

function classifyArtifact(artifact) {
  const source = artifact.sourceName || '';
  const empty = isEmptyBytecode(artifact.bytecode) && isEmptyBytecode(artifact.deployedBytecode);
  if (source.startsWith('contracts/test/')) return empty ? 'INTERFACE_ONLY' : 'TEST_ONLY_DEPLOYABLE';
  if (source.startsWith('contracts/src/')) return empty ? 'PRODUCTION_ABSTRACT' : 'PRODUCTION_DEPLOYABLE_CANDIDATE';
  return empty ? 'INTERFACE_ONLY' : 'SUPPORT_LIBRARY';
}

function computeArtifactsRootFingerprint(entries) {
  return sha256Hex(entries.map(entry => [entry.fully_qualified_name, entry.abi_sha256, entry.creation_bytecode_sha256, entry.runtime_bytecode_sha256, entry.classification].join('|')).sort().join('\n'));
}

module.exports = { bytecodeHash, canonicalJson, classifyArtifact, computeArtifactsRootFingerprint, computeSourceTreeFingerprint, fingerprintInputFiles, findSolcBinary, isEmptyBytecode, packageNameFromNodeModulesPath, readCompilerIdentity, scanInstalledPackages, sha256File, sha256Hex, walkFiles };
