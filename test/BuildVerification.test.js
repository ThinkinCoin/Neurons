const { expect } = require('chai');
const fs = require('fs');
const path = require('path');
const { collectArtifacts, runBuildAndGenerateManifest } = require('../scripts/build/build-runner');
const { readCompilerIdentity, sha256Hex } = require('../scripts/build/integrity-utils');
const { generateSbomInventories } = require('../scripts/build/sbom-generator');
const { verifyBuildManifest } = require('../scripts/verify/verify-runner');

describe('NEURONS Build & Artifact Verification Infrastructure', function () {
  const repoDir = path.resolve(__dirname, '..');
  let manifest;

  before(function () {
    manifest = runBuildAndGenerateManifest({ repoDir }).manifest;
  });

  it('BUILD-01 & BUILD-02: creates a v1 manifest with local provenance', function () {
    expect(manifest.schema_version).to.equal('neurons.build-manifest/v1');
    expect(manifest.source.commit_sha).to.match(/^[0-9a-f]{40}$/);
    expect(manifest.source.source_tree_fingerprint).to.match(/^[0-9a-f]{64}$/);
    expect(manifest.dependencies.package_lock_sha256).to.match(/^[0-9a-f]{64}$/);
  });

  it('BUILD-03 & BUILD-04: captures the locally used compiler and settings', function () {
    const compiler = readCompilerIdentity(repoDir);
    expect(manifest.compiler).to.deep.equal(compiler);
    expect(manifest.compiler.solc_version).to.include('0.8.22');
    expect(manifest.compiler.optimizer_enabled).to.equal(true);
    expect(manifest.compiler.optimizer_runs).to.equal(200);
    expect(manifest.compiler.evm_target).to.equal('paris');
  });

  it('BUILD-06 & BUILD-07: inventories every generated Hardhat artifact deterministically', function () {
    const expected = collectArtifacts(repoDir, manifest.compiler.solc_version);
    expect(manifest.artifacts.manifest_entries).to.deep.equal(expected);
    expect(manifest.artifacts.manifest_entries.length).to.be.greaterThan(50);
    expect(manifest.artifacts.artifacts_root_fingerprint).to.match(/^[0-9a-f]{64}$/);
  });

  it('BUILD-15 & BUILD-16: keeps production abstract artifacts separate from test fixtures', function () {
    const core = manifest.artifacts.manifest_entries.find(entry => entry.fully_qualified_name === 'contracts/src/NeuronsOFT.sol:NeuronsOFT');
    expect(core.classification).to.equal('PRODUCTION_ABSTRACT');
    expect(core.creation_bytecode_sha256).to.equal('EMPTY');
    expect(core.runtime_bytecode_sha256).to.equal('EMPTY');
    const fixture = manifest.artifacts.manifest_entries.find(entry => entry.fully_qualified_name === 'contracts/test/NeuronsOFTFixture.sol:NeuronsOFTFixture');
    expect(fixture.classification).to.equal('TEST_ONLY_DEPLOYABLE');
    expect(fixture.creation_bytecode_sha256).to.match(/^[0-9a-f]{64}$/);
  });

  it('BUILD-17 & BUILD-18: creates deterministic resolved, installed, and Solidity inventories', function () {
    const result = generateSbomInventories(repoDir, path.join(repoDir, 'artifacts/build-manifest'));
    expect(result.installedPackageCount).to.be.greaterThan(200);
    expect(result.resolvedPackageCount).to.be.greaterThan(300);
    expect(result.omittedPeersCount).to.be.greaterThan(0);
    expect(result.importGraphCount).to.equal(58);
    expect(fs.existsSync(result['sbom.cyclonedx.json'].path)).to.equal(true);
    expect(fs.existsSync(result['installed-inventory.json'].path)).to.equal(true);
  });

  it('BUILD-19 & BUILD-20: records no release or deployment authorization', function () {
    expect(manifest.classification.release_status).to.equal('NOT_AUTHORIZED');
    expect(manifest.classification.deployment_status).to.equal('NOT_AUTHORIZED');
  });

  describe('negative verification tests', function () {
    const tmpDir = path.join(repoDir, 'artifacts/build-manifest/test-tamper');
    const write = (name, value) => {
      const output = path.join(tmpDir, name);
      fs.writeFileSync(output, JSON.stringify(value));
      return output;
    };

    beforeEach(function () { fs.mkdirSync(tmpDir, { recursive: true }); });
    afterEach(function () { fs.rmSync(tmpDir, { recursive: true, force: true }); });

    it('BUILD-12: rejects an unsupported schema and missing root field', function () {
      const unsupported = structuredClone(manifest);
      unsupported.schema_version = 'neurons.build-manifest/v2';
      expect(() => verifyBuildManifest(write('unsupported.json', unsupported), { repoDir })).to.throw(/Unsupported schema version/);
      const missing = structuredClone(manifest);
      delete missing.artifacts;
      expect(() => verifyBuildManifest(write('missing.json', missing), { repoDir })).to.throw(/Missing required root field: artifacts/);
    });

    it('BUILD-13: rejects tampered ABI and bytecode fingerprints', function () {
      const badAbi = structuredClone(manifest);
      badAbi.artifacts.manifest_entries[0].abi_sha256 = '0'.repeat(64);
      expect(() => verifyBuildManifest(write('bad-abi.json', badAbi), { repoDir })).to.throw(/ABI SHA-256 mismatch/);
      const badBytecode = structuredClone(manifest);
      const fixture = badBytecode.artifacts.manifest_entries.find(entry => entry.classification === 'TEST_ONLY_DEPLOYABLE');
      fixture.runtime_bytecode_sha256 = '1'.repeat(64);
      expect(() => verifyBuildManifest(write('bad-bytecode.json', badBytecode), { repoDir })).to.throw(/Runtime bytecode mismatch/);
    });

    it('BUILD-14: rejects a missing artifact and duplicate identity', function () {
      const missing = structuredClone(manifest);
      missing.artifacts.manifest_entries.push({ ...missing.artifacts.manifest_entries[0], fully_qualified_name: 'contracts/src/Missing.sol:Missing', source_path: 'contracts/src/Missing.sol', contract_name: 'Missing' });
      expect(() => verifyBuildManifest(write('missing-artifact.json', missing), { repoDir })).to.throw(/Artifact file missing on disk/);
      const duplicate = structuredClone(manifest);
      duplicate.artifacts.manifest_entries.push(structuredClone(duplicate.artifacts.manifest_entries[0]));
      expect(() => verifyBuildManifest(write('duplicate.json', duplicate), { repoDir })).to.throw(/Duplicate fully qualified artifact name/);
    });

    it('rejects a false production-abstract classification', function () {
      const invalid = structuredClone(manifest);
      const core = invalid.artifacts.manifest_entries.find(entry => entry.fully_qualified_name === 'contracts/src/NeuronsOFT.sol:NeuronsOFT');
      core.creation_bytecode_sha256 = sha256Hex('fake');
      core.runtime_bytecode_sha256 = sha256Hex('fake');
      expect(() => verifyBuildManifest(write('invalid-abstract.json', invalid), { repoDir })).to.throw(/Creation bytecode mismatch|must have EMPTY/);
    });

    it('rejects an incorrect source revision and source fingerprint', function () {
      const revision = structuredClone(manifest);
      revision.source.commit_sha = 'f'.repeat(40);
      expect(() => verifyBuildManifest(write('bad-revision.json', revision), { repoDir })).to.throw(/Source revision mismatch/);
      const fingerprint = structuredClone(manifest);
      fingerprint.source.source_tree_fingerprint = 'a'.repeat(64);
      expect(() => verifyBuildManifest(write('bad-source.json', fingerprint), { repoDir })).to.throw(/Source tree fingerprint mismatch/);
    });

    it('rejects a package lock hash mismatch', function () {
      const invalid = structuredClone(manifest);
      invalid.dependencies.package_lock_sha256 = 'b'.repeat(64);
      expect(() => verifyBuildManifest(write('bad-lock.json', invalid), { repoDir })).to.throw(/Package lockfile hash mismatch/);
    });
  });
});
