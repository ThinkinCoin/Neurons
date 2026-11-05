const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { bytecodeHash, computeArtifactsRootFingerprint, computeSourceTreeFingerprint, readCompilerIdentity, scanInstalledPackages, sha256File, sha256Hex } = require('../build/integrity-utils');

const HASH = /^[0-9a-f]{64}$/;
const ARTIFACT_CLASSES = new Set(['PRODUCTION_ABSTRACT', 'PRODUCTION_DEPLOYABLE_CANDIDATE', 'TEST_ONLY_DEPLOYABLE', 'INTERFACE_ONLY', 'SUPPORT_LIBRARY']);

function requireField(object, field, context) {
  if (!object || typeof object !== 'object' || Array.isArray(object)) throw new Error(`${context} must be an object`);
  if (!(field in object)) throw new Error(`Missing required field: ${context}.${field}`);
}

function requireHash(value, context, allowEmpty = false) {
  if ((allowEmpty && value === 'EMPTY') || HASH.test(value || '')) return;
  throw new Error(`${context} must be a SHA-256 hash${allowEmpty ? ' or EMPTY' : ''}`);
}

function validateManifestShape(manifest) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('Manifest must be a JSON object');
  if (manifest.schema_version !== 'neurons.build-manifest/v1') throw new Error(`Unsupported schema version: ${manifest.schema_version}`);
  for (const field of ['source', 'environment', 'dependencies', 'compiler', 'artifacts', 'tests', 'verification', 'classification']) {
    if (!(field in manifest)) throw new Error(`Missing required root field: ${field}`);
  }
  for (const field of ['repository', 'branch', 'commit_sha', 'worktree_clean', 'source_tree_fingerprint']) requireField(manifest.source, field, 'source');
  for (const field of ['node_version', 'npm_version', 'os', 'architecture', 'isolation_profile']) requireField(manifest.environment, field, 'environment');
  for (const field of ['package_manifest_sha256', 'package_lock_sha256', 'installed_profile', 'dependency_inventory_sha256']) requireField(manifest.dependencies, field, 'dependencies');
  for (const field of ['solc_version', 'solc_binary_sha256', 'optimizer_enabled', 'optimizer_runs', 'evm_target', 'settings_sha256']) requireField(manifest.compiler, field, 'compiler');
  for (const field of ['artifacts_root_fingerprint', 'manifest_entries']) requireField(manifest.artifacts, field, 'artifacts');
  if (!Array.isArray(manifest.artifacts.manifest_entries) || manifest.artifacts.manifest_entries.length === 0) throw new Error('artifacts.manifest_entries must be a non-empty array');
  requireHash(manifest.source.source_tree_fingerprint, 'source.source_tree_fingerprint');
  ['package_manifest_sha256', 'package_lock_sha256', 'dependency_inventory_sha256'].forEach(field => requireHash(manifest.dependencies[field], `dependencies.${field}`));
  ['solc_binary_sha256', 'settings_sha256'].forEach(field => requireHash(manifest.compiler[field], `compiler.${field}`));
  requireHash(manifest.artifacts.artifacts_root_fingerprint, 'artifacts.artifacts_root_fingerprint');
  for (const field of ['executed', 'passed', 'failed', 'skipped']) {
    requireField(manifest.tests, field, 'tests');
    if (!Number.isInteger(manifest.tests[field]) || manifest.tests[field] < 0) throw new Error(`tests.${field} must be a non-negative integer`);
  }
  for (const field of ['schema_validation', 'independent_reproduction', 'result']) requireField(manifest.verification, field, 'verification');
  for (const field of ['build_status', 'artifact_status', 'release_status', 'deployment_status']) requireField(manifest.classification, field, 'classification');
  if (manifest.classification.release_status !== 'NOT_AUTHORIZED' || manifest.classification.deployment_status !== 'NOT_AUTHORIZED') throw new Error('Manifest must retain release_status and deployment_status as NOT_AUTHORIZED');
}

function expectedGitHead(repoDir) {
  try { return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (_) { return process.env.NEURONS_SOURCE_REVISION || null; }
}

function dependencyInventoryHash(repoDir) { return sha256Hex(JSON.stringify(scanInstalledPackages(repoDir))); }

function safeArtifactPath(repoDir, entry) {
  if (!entry.source_path || entry.source_path.includes('..') || path.isAbsolute(entry.source_path)) throw new Error(`Unsafe artifact source path: ${entry.source_path}`);
  const artifactPath = path.resolve(repoDir, 'artifacts', entry.source_path, `${entry.contract_name}.json`);
  const root = path.resolve(repoDir, 'artifacts') + path.sep;
  if (!artifactPath.startsWith(root)) throw new Error(`Artifact path escapes artifacts root: ${entry.source_path}`);
  return artifactPath;
}

function verifyBuildManifest(manifestPath, options = {}) {
  const repoDir = options.repoDir || path.resolve(__dirname, '../..');
  if (!fs.existsSync(manifestPath)) throw new Error(`Manifest file not found: ${manifestPath}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  validateManifestShape(manifest);
  const currentHead = options.expectedCommitSha || expectedGitHead(repoDir);
  if (currentHead && manifest.source.commit_sha !== currentHead) throw new Error(`Source revision mismatch: manifest=${manifest.source.commit_sha}, current=${currentHead}`);
  const currentFingerprint = computeSourceTreeFingerprint(repoDir);
  if (manifest.source.source_tree_fingerprint !== currentFingerprint) throw new Error(`Source tree fingerprint mismatch: manifest=${manifest.source.source_tree_fingerprint}, current=${currentFingerprint}`);
  if (manifest.dependencies.package_manifest_sha256 !== sha256File(path.join(repoDir, 'package.json'))) throw new Error('Package manifest hash mismatch');
  if (manifest.dependencies.package_lock_sha256 !== sha256File(path.join(repoDir, 'package-lock.json'))) throw new Error('Package lockfile hash mismatch');
  if (manifest.dependencies.dependency_inventory_sha256 !== dependencyInventoryHash(repoDir)) throw new Error('Installed dependency inventory hash mismatch');
  const compiler = readCompilerIdentity(repoDir);
  for (const field of ['solc_version', 'solc_binary_sha256', 'optimizer_enabled', 'optimizer_runs', 'evm_target', 'settings_sha256']) {
    if (manifest.compiler[field] !== compiler[field]) throw new Error(`Compiler ${field} mismatch`);
  }
  const seen = new Set();
  const entriesForFingerprint = [];
  for (const entry of manifest.artifacts.manifest_entries) {
    for (const field of ['contract_name', 'source_path', 'fully_qualified_name', 'compiler_version', 'abi_sha256', 'creation_bytecode_sha256', 'runtime_bytecode_sha256', 'classification']) {
      if (!(field in entry)) throw new Error(`Artifact entry is missing ${field}`);
    }
    if (!ARTIFACT_CLASSES.has(entry.classification)) throw new Error(`Unsupported artifact classification: ${entry.classification}`);
    requireHash(entry.abi_sha256, `${entry.fully_qualified_name}.abi_sha256`);
    requireHash(entry.creation_bytecode_sha256, `${entry.fully_qualified_name}.creation_bytecode_sha256`, true);
    requireHash(entry.runtime_bytecode_sha256, `${entry.fully_qualified_name}.runtime_bytecode_sha256`, true);
    if (seen.has(entry.fully_qualified_name)) throw new Error(`Duplicate fully qualified artifact name: ${entry.fully_qualified_name}`);
    seen.add(entry.fully_qualified_name);
    const artifactPath = safeArtifactPath(repoDir, entry);
    if (!fs.existsSync(artifactPath)) throw new Error(`Artifact file missing on disk: ${artifactPath}`);
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    if (`${artifact.sourceName}:${artifact.contractName}` !== entry.fully_qualified_name) throw new Error(`Artifact identity mismatch for ${entry.fully_qualified_name}`);
    if (sha256Hex(JSON.stringify(artifact.abi)) !== entry.abi_sha256) throw new Error(`ABI SHA-256 mismatch for ${entry.fully_qualified_name}`);
    if (bytecodeHash(artifact.bytecode) !== entry.creation_bytecode_sha256) throw new Error(`Creation bytecode mismatch for ${entry.fully_qualified_name}`);
    if (bytecodeHash(artifact.deployedBytecode) !== entry.runtime_bytecode_sha256) throw new Error(`Runtime bytecode mismatch for ${entry.fully_qualified_name}`);
    if (entry.classification === 'PRODUCTION_ABSTRACT' && (entry.creation_bytecode_sha256 !== 'EMPTY' || entry.runtime_bytecode_sha256 !== 'EMPTY')) throw new Error(`Abstract production contract ${entry.fully_qualified_name} must have EMPTY bytecode hashes`);
    if (entry.classification === 'TEST_ONLY_DEPLOYABLE' && (entry.creation_bytecode_sha256 === 'EMPTY' || entry.runtime_bytecode_sha256 === 'EMPTY')) throw new Error(`Deployable test fixture ${entry.fully_qualified_name} must have non-empty bytecode hashes`);
    entriesForFingerprint.push(entry);
  }
  const artifactFingerprint = computeArtifactsRootFingerprint(entriesForFingerprint);
  if (artifactFingerprint !== manifest.artifacts.artifacts_root_fingerprint) throw new Error(`Artifacts root fingerprint mismatch: manifest=${manifest.artifacts.artifacts_root_fingerprint}, current=${artifactFingerprint}`);
  return { status: 'VERIFIED', contractCount: manifest.artifacts.manifest_entries.length, artifactsRootFingerprint: artifactFingerprint };
}

if (require.main === module) {
  const manifestPath = process.argv[2] || path.resolve(__dirname, '../../artifacts/build-manifest/build-manifest.v1.json');
  try { console.log(JSON.stringify({ status: 'SUCCESS', details: verifyBuildManifest(manifestPath) }, null, 2)); }
  catch (error) { console.error(JSON.stringify({ status: 'FAILED', error: error.message }, null, 2)); process.exit(1); }
}

module.exports = { validateManifestShape, verifyBuildManifest };
