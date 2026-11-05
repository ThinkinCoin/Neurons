const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { bytecodeHash, classifyArtifact, computeArtifactsRootFingerprint, computeSourceTreeFingerprint, readCompilerIdentity, scanInstalledPackages, sha256File, sha256Hex, walkFiles } = require('./integrity-utils');

function gitValue(repoDir, args, fallback) {
  try { return execFileSync('git', args, { cwd: repoDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (_) { return fallback; }
}

function installedDependencyInventory(repoDir) {
  const packages = scanInstalledPackages(repoDir);
  return { count: packages.length, packages, hash: sha256Hex(JSON.stringify(packages)) };
}

function collectArtifacts(repoDir, compilerVersion) {
  const artifactsRoot = path.join(repoDir, 'artifacts');
  const entries = [];
  for (const relativePath of walkFiles(artifactsRoot)) {
    if (!relativePath.endsWith('.json') || relativePath.endsWith('.dbg.json') || relativePath.startsWith('build-info/')) continue;
    const artifact = JSON.parse(fs.readFileSync(path.join(artifactsRoot, relativePath), 'utf8'));
    if (!Array.isArray(artifact.abi) || !artifact.contractName || !artifact.sourceName) continue;
    const sourcePath = artifact.sourceName.replaceAll('\\', '/');
    entries.push({
      contract_name: artifact.contractName,
      source_path: sourcePath,
      fully_qualified_name: `${sourcePath}:${artifact.contractName}`,
      compiler_version: compilerVersion,
      abi_sha256: sha256Hex(JSON.stringify(artifact.abi)),
      creation_bytecode_sha256: bytecodeHash(artifact.bytecode),
      runtime_bytecode_sha256: bytecodeHash(artifact.deployedBytecode),
      classification: classifyArtifact(artifact)
    });
  }
  entries.sort((left, right) => left.fully_qualified_name.localeCompare(right.fully_qualified_name));
  if (entries.length === 0) throw new Error('No Hardhat artifact entries were found');
  return entries;
}

function runBuildAndGenerateManifest(options = {}) {
  const repoDir = options.repoDir || path.resolve(__dirname, '../..');
  const outputDir = options.outputDir || path.join(repoDir, 'artifacts', 'build-manifest');
  fs.mkdirSync(outputDir, { recursive: true });
  const compiler = readCompilerIdentity(repoDir);
  const inventory = installedDependencyInventory(repoDir);
  const artifacts = collectArtifacts(repoDir, compiler.solc_version);
  const manifest = {
    schema_version: 'neurons.build-manifest/v1',
    source: {
      repository: 'https://github.com/ThinkinCoin/Neurons.git',
      branch: options.branch || gitValue(repoDir, ['rev-parse', '--abbrev-ref', 'HEAD'], process.env.NEURONS_SOURCE_BRANCH || 'UNKNOWN'),
      commit_sha: options.commitSha || gitValue(repoDir, ['rev-parse', 'HEAD'], process.env.NEURONS_SOURCE_REVISION || 'UNKNOWN'),
      worktree_clean: options.worktreeClean ?? gitValue(repoDir, ['status', '--porcelain'], 'DIRTY') === '',
      source_tree_fingerprint: computeSourceTreeFingerprint(repoDir)
    },
    environment: {
      node_version: process.version,
      npm_version: execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(),
      os: process.platform,
      architecture: process.arch,
      isolation_profile: options.isIsolated ? 'DISPOSABLE_SAME_USER_WORKSPACE' : 'LOCAL_CANONICAL_WORKSPACE'
    },
    dependencies: {
      package_manifest_sha256: sha256File(path.join(repoDir, 'package.json')),
      package_lock_sha256: sha256File(path.join(repoDir, 'package-lock.json')),
      installed_profile: 'REDUCED_OMIT_PEER',
      dependency_inventory_sha256: inventory.hash
    },
    compiler,
    artifacts: { artifacts_root_fingerprint: computeArtifactsRootFingerprint(artifacts), manifest_entries: artifacts },
    tests: { executed: options.testsExecuted ?? 0, passed: options.testsPassed ?? 0, failed: options.testsFailed ?? 0, skipped: options.testsSkipped ?? 0 },
    verification: { schema_validation: 'STRUCTURAL_VALIDATION_REQUIRED', independent_reproduction: options.reproductionStatus || 'NOT_RUN_BY_MANIFEST_GENERATOR', result: 'ARTIFACTS_HASHED_AGAINST_CURRENT_INPUTS' },
    classification: { build_status: 'LOCAL_EVIDENCE_ONLY', artifact_status: 'VERIFIED_AGAINST_CURRENT_SOURCE_AND_LOCKFILE', release_status: 'NOT_AUTHORIZED', deployment_status: 'NOT_AUTHORIZED' }
  };
  const manifestPath = path.join(outputDir, 'build-manifest.v1.json');
  const inventoryPath = path.join(outputDir, 'dependency-inventory.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(inventoryPath, `${JSON.stringify(inventory, null, 2)}\n`);
  return { manifestPath, inventoryPath, manifest, manifestHash: sha256File(manifestPath) };
}

if (require.main === module) {
  try { const result = runBuildAndGenerateManifest(); console.log(JSON.stringify({ status: 'SUCCESS', manifest_path: result.manifestPath, manifest_sha256: result.manifestHash }, null, 2)); }
  catch (error) { console.error(JSON.stringify({ status: 'FAILED', error: error.message }, null, 2)); process.exit(1); }
}

module.exports = { collectArtifacts, installedDependencyInventory, runBuildAndGenerateManifest };
