const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { runBuildAndGenerateManifest } = require('../build/build-runner');
const { verifyBuildManifest } = require('./verify-runner');

function gitHead(repoDir) { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoDir, encoding: 'utf8' }).trim(); }
function gitBranch(repoDir) { return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoDir, encoding: 'utf8' }).trim(); }

function sanitizedEnvironment() {
  const allowed = ['HOME', 'LANG', 'LC_ALL', 'PATH', 'TMP', 'TMPDIR', 'TEMP'];
  const env = { CI: 'true', NPM_CONFIG_AUDIT: 'false', NPM_CONFIG_FUND: 'false', NPM_CONFIG_USERCONFIG: '/dev/null' };
  for (const key of allowed) if (process.env[key]) env[key] = process.env[key];
  return env;
}

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const input = path.join(source, entry.name);
    const output = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(input, output);
    else fs.copyFileSync(input, output);
  }
}

function createSnapshot(source, destination) {
  const files = ['.npmrc', '.nvmrc', 'AGENTS.md', 'README.md', 'hardhat.config.js', 'package.json', 'package-lock.json'];
  const directories = ['.github', 'contracts', 'docs', 'schemas', 'scripts', 'test'];
  fs.mkdirSync(destination, { recursive: true });
  for (const file of files) fs.copyFileSync(path.join(source, file), path.join(destination, file));
  for (const directory of directories) {
    const from = path.join(source, directory);
    if (fs.existsSync(from)) copyDirectory(from, path.join(destination, directory));
  }
}

function execute(command, args, cwd, env) {
  return execFileSync(command, args, { cwd, env, encoding: 'utf8', stdio: 'pipe' });
}

function executeBuild(workspace, metadata) {
  const env = { ...sanitizedEnvironment(), NEURONS_SOURCE_REVISION: metadata.commitSha, NEURONS_SOURCE_BRANCH: metadata.branch };
  execute('npm', ['ci', '--offline', '--ignore-scripts', '--no-audit', '--no-fund'], workspace, env);
  execute('npx', ['--no-install', 'hardhat', 'clean'], workspace, env);
  execute('npx', ['--no-install', 'hardhat', 'compile'], workspace, env);
  const testOutput = execute('npx', ['--no-install', 'hardhat', 'test'], workspace, env);
  const match = testOutput.match(/(\d+)\s+passing/);
  if (!match) throw new Error('Could not determine the test count from the Hardhat result');
  const passed = Number(match[1]);
  const generated = runBuildAndGenerateManifest({ repoDir: workspace, commitSha: metadata.commitSha, branch: metadata.branch, worktreeClean: true, isIsolated: true, testsExecuted: passed, testsPassed: passed, reproductionStatus: 'SECOND_INDEPENDENT_BUILD_PENDING' });
  const verification = verifyBuildManifest(generated.manifestPath, { repoDir: workspace, expectedCommitSha: metadata.commitSha });
  return { workspace, manifest: generated.manifest, manifestPath: generated.manifestPath, verification, testsPassed: passed };
}

function compareEntries(left, right, field) {
  if (left.length !== right.length) return false;
  const rightByName = new Map(right.map(entry => [entry.fully_qualified_name, entry]));
  return left.every(entry => rightByName.has(entry.fully_qualified_name) && rightByName.get(entry.fully_qualified_name)[field] === entry[field]);
}

function runIndependentReproduction(options = {}) {
  const repoDir = options.repoDir || path.resolve(__dirname, '../..');
  const baseDir = options.tmpDir || fs.mkdtempSync(path.join(os.tmpdir(), 'axodus-neurons-independent-build-'));
  const metadata = { commitSha: options.commitSha || gitHead(repoDir), branch: options.branch || gitBranch(repoDir) };
  const workspaceA = path.join(baseDir, 'workspace-a');
  const workspaceB = path.join(baseDir, 'workspace-b');
  createSnapshot(repoDir, workspaceA);
  createSnapshot(repoDir, workspaceB);
  const buildA = executeBuild(workspaceA, metadata);
  const buildB = executeBuild(workspaceB, metadata);
  const result = {
    workspace_a: workspaceA,
    workspace_b: workspaceB,
    installation_policy: 'npm ci --offline --ignore-scripts --no-audit --no-fund',
    source_match: buildA.manifest.source.source_tree_fingerprint === buildB.manifest.source.source_tree_fingerprint,
    dependency_match: buildA.manifest.dependencies.package_lock_sha256 === buildB.manifest.dependencies.package_lock_sha256 && buildA.manifest.dependencies.dependency_inventory_sha256 === buildB.manifest.dependencies.dependency_inventory_sha256,
    compiler_match: JSON.stringify(buildA.manifest.compiler) === JSON.stringify(buildB.manifest.compiler),
    artifacts_root_match: buildA.manifest.artifacts.artifacts_root_fingerprint === buildB.manifest.artifacts.artifacts_root_fingerprint,
    abi_match: compareEntries(buildA.manifest.artifacts.manifest_entries, buildB.manifest.artifacts.manifest_entries, 'abi_sha256'),
    creation_bytecode_match: compareEntries(buildA.manifest.artifacts.manifest_entries, buildB.manifest.artifacts.manifest_entries, 'creation_bytecode_sha256'),
    runtime_bytecode_match: compareEntries(buildA.manifest.artifacts.manifest_entries, buildB.manifest.artifacts.manifest_entries, 'runtime_bytecode_sha256'),
    tests_passed_a: buildA.testsPassed,
    tests_passed_b: buildB.testsPassed
  };
  result.overall_reproducibility = Object.entries(result).filter(([key]) => key.endsWith('_match')).every(([, value]) => value === true) ? 'REPRODUCIBLE' : 'ARTIFACT_MISMATCH';
  return result;
}

if (require.main === module) {
  try { console.log(JSON.stringify(runIndependentReproduction(), null, 2)); }
  catch (error) { console.error(JSON.stringify({ status: 'FAILED', error: error.message }, null, 2)); process.exit(1); }
}

module.exports = { runIndependentReproduction, sanitizedEnvironment };
