# Learn‑to‑Win (L2W) — Architecture and Flow

Version: 1.0.0  
Solidity: ^0.8.20

## Goal
L2W incentivizes user learning/participation with Neurons rewards, using PoK as the proof foundation.

## Components
- L2W App/Platform (off‑chain)
  - Learning experiences, challenges, quizzes, AI tasks
  - Orchestrator that computes the reward and prepares the `proof` (EIP‑712) for PoK
- `PoKMinter` + `ECDSAVerifier` (on‑chain)
  - Proof validation and token issuance
- `Neurons` token
  - Receives mints from PoK, controls cap/pause/roles
- (Optional) `NeuronsOFTAdapter` bridge for multi‑chain

## User flow
1. User completes activities on the platform
2. Backend computes reward and generates EIP‑712 message with `(recipient, amount, nonce, expiry)`
3. Backend signs with `trustedSigner` and sends the `proof` to the contract via frontend/API
4. `PoKMinter.mintWithProof(...)` validates limits and calls `token.mint`
5. User receives Neurons as a reward

## Reward model (examples)
- Based on difficulty and time (more complex tasks are worth more)
- Level progression (higher rewards for streak/consistency)
- Event and curation bonuses (e.g., vetted content)

## Controls and limits
- `minCooldown`: reduces continuous farming per account
- `maxDailyMint`: caps daily issuance per user
- `maxSingleMint`: prevents anomalous per-proof values
- KYC/anti‑spam policies can complement (off‑chain)

## Wallet/signature integration
- `ECDSAVerifier` uses domain `NeuronsPoK` v1 and EIP‑712
- `buildMessageHash(...)` facilitates SDK reuse

## Metrics and telemetry
- On‑chain: `totalMintsProcessed`, `totalTokensMinted`
- Off‑chain: course completion, quiz accuracy, task weights
- Dashboards: daily issuance, unique users, proof approval rate

## Security
- Rotate `trustedSigner` and protect the private key
- Monitor `nonce` to avoid replay; expire proofs
- Observability on success/failure rates by source
- Use `pause()` when needed

## Multi‑chain (optional)
- `NeuronsOFTAdapter` (LayerZero) enables moving balances across chains:
  - Burn/mint mode (preferred): burn on source, mint on destination
  - Lock/unlock mode: lock on source, release on destination
- Controlled by `trustedRemote` and `remoteChainAllowed` whitelist

## Roadmap
- Support for alternative verifiers (zk, oracles)
- User reputation and trust levels
- Collaborative missions and reward pools
