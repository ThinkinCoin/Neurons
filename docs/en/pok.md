# Proof‑of‑Knowledge (PoK) — Technical Specification

Version: 1.0.0  
Solidity: ^0.8.20

## Overview
PoK rewards users for proving the execution/result of tasks (e.g., learning/AI). Token issuance is orchestrated by `PoKMinter`, which validates a `proof` using a verifier (`IVerifier`).

Core contracts:
- `PoKMinter` — contracts/src/minters/PoKMinter.sol
- `IVerifier` — contracts/src/interfaces/IVerifier.sol
- `ECDSAVerifier` — contracts/src/verifiers/ECDSAVerifier.sol

## IVerifier
Generic interface for PoK/AI verifiers.

```solidity
function verify(address recipient, uint256 amount, bytes calldata proof, bytes32 nonce) external view returns (bool ok);
function trustedSigner() external view returns (address); // specific to ECDSA
function setTrustedSigner(address newSigner) external;     // admin only
function domainSeparator() external view returns (bytes32); // EIP-712 when applicable
function buildMessageHash(address recipient, uint256 amount, bytes32 nonce, uint256 expiry) external view returns (bytes32);
```

- `verify` SHOULD revert on invalid proofs. The `bool` return value is auxiliary.
- `nonce` prevents replay. `expiry` is part of the payload (see ECDSA below).

## ECDSAVerifier
Implementation based on EIP‑712 + ECDSA.

- Domain: `EIP712("NeuronsPoK", "1")`
- Typehash: `MintProof(address recipient,uint256 amount,bytes32 nonce,uint256 expiry)`
- `verify(...)`:
  1. Decode `proof` as `(bytes signature, uint256 expiry)`
  2. Check `expiry > block.timestamp`
  3. Build `structHash` with the fields
  4. Compute `messageHash = _hashTypedDataV4(structHash)`
  5. `recover(signature)` and compare to `trustedSigner`

Admin:
- `setTrustedSigner(address)` (Ownable)

## PoKMinter
Orchestrates validation and calls `token.mint(to, amount)`.

State/limits:
- `nonceUsed[bytes32]` — prevents replay
- Per-user rate limiting:
  - `minCooldown` (default: 1 hour)
  - `maxDailyMint` (default: 1000e18)
  - `maxSingleMint` (default: 100e18)
- Stats: `totalMintsProcessed`, `totalTokensMinted`

Events:
- `TokenSet(address token)`
- `VerifierSet(address verifier)`
- `MintedWithProof(address to, uint256 amount, bytes32 nonce)`
- `LimitsUpdated(uint256 minCooldown, uint256 maxDailyMint, uint256 maxSingleMint)`

Flow `mintWithProof(to, amount, proof, nonce)`:
1. Pre-checks: token/verifier set, `to != 0`, `amount > 0`, within limits
2. Check cooldown and daily window
3. `verifier.verify(...)` must return `true` (or revert)
4. Mark `nonceUsed[nonce] = true`
5. Update rate/daily trackers
6. `token.mint(to, amount)` (requires `MINTER_ROLE` on token)
7. Update stats and emit event

`batchMintWithProofs(...)`:
- Processes a list; skips invalid entries without reverting the batch

Admin:
- `setToken(address)`, `setVerifier(address)`
- `setLimits(minCooldown, maxDailyMint, maxSingleMint)`
- `pause()` / `unpause()`

Errors (via `Errors.sol`):
- `ZeroAddress()`, `InvalidAmount()`, `ArrayLengthMismatch()`
- `InvalidProof()`, `ProofExpired()`, `InvalidSignature()`
- `CooldownNotMet()`, `DailyLimitExceeded()`, `SingleMintLimitExceeded()`

## End-to-end integration
- Backend/Orchestrator:
  1. Build EIP‑712 payload and sign with `trustedSigner`
  2. Send `mintWithProof(to, amount, abi.encode(signature, expiry), nonce)`
- On-chain:
  - `ECDSAVerifier` validates signature and expiration
  - `PoKMinter` enforces limits and calls `token.mint`

## Security and compliance
- `PoKMinter` must hold `MINTER_ROLE` on the token.
- Rotate `trustedSigner` per policy.
- Anti-replay protections via `nonce` and `expiry`.
- Monitor on-chain issuance metrics.
