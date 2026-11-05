# Build and Signing Boundary Specification

This document defines the required separation between NEURONS source development, credential-free artifact verification, and any future deployment/signing process. It does not authorize a release, deployment, network connection, or use of credentials.

## Environment A: local development

- Purpose: source changes, unit tests, and local simulations.
- Credentials: no production private keys, mnemonics, or RPC credentials.
- Outputs: disposable local artifacts only.

## Environment B: build and artifact verification

- Purpose: clean locked-dependency installation, Solidity compilation, tests, manifest generation, and artifact comparison.
- Inputs: a source revision, `package-lock.json`, the pinned Solidity compiler, and test-only local configuration.
- Outputs: a build manifest, SBOM/inventories, ABI hashes, bytecode hashes, and test evidence.
- Credential boundary: this environment must remain credential-free. It does not use wallet signing, public-chain RPC endpoints, deployment parameters, or production administrative identities.
- Current implementation limit: the local proof uses disposable directories and a sanitized child-process environment. It does **not** itself provide an operating-system sandbox or enforced outbound-network restriction. A future release runner must add those controls.

## Environment C: future deployment and signing

- Purpose: execute a separately authorized deployment or configuration transaction.
- Required preconditions: independently verified manifest, approved deployment parameter record, explicit release/deployment authorization, and approved authority holders.
- Boundary: broad Node.js and Hardhat build tooling must not share a runner, process environment, or credential store with signing operations. Environment C must verify the received ABI and bytecode against the non-executable manifest before a transaction is signed.

## Non-executable handoff

The handoff between environments is informational and must contain only source and artifact provenance:

```yaml
NEURONS_ARTIFACT_HANDOFF_V1:
  manifest_reference:
    schema_version: neurons.build-manifest/v1
    manifest_sha256: <sha256>
    artifacts_root_fingerprint: <sha256>
  source_provenance:
    repository: https://github.com/ThinkinCoin/Neurons.git
    branch: dev
    commit_sha: <commit>
  compiler_provenance:
    solc_version: 0.8.22+commit.4fc1097e
    solc_binary_sha256: <sha256>
    evm_target: paris
    optimizer_runs: 200
  authorization:
    release: NOT_AUTHORIZED
    deployment: NOT_AUTHORIZED
```

The handoff must never include private keys, seed phrases, RPC credentials, deployment transactions, or executable deployment instructions.
