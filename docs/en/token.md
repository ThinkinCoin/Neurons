# Neurons Token — Technical Specification

Version: 1.0.0  
Solidity: ^0.8.20 (OpenZeppelin v5)

## Overview
Neurons is an ERC‑20 token with:
- A fixed max supply cap of 10,000,000 NEURONS
- Minting gated by roles (MINTER_ROLE)
- Burn (self-burn) and burnFrom (allowed for BURNER_ROLE)
- Pausability (ERC20Pausable) to halt transfers/mints/burns during incidents
- Permit (EIP‑2612) support via ERC20Permit
- Integration with external systems: PoK and bridge (LayerZero OFT Adapter)

Contract: `contracts/src/tokens/Neurons.sol`

## Interfaces and inheritance
- OpenZeppelin v5:
  - `ERC20`
  - `ERC20Capped`
  - `ERC20Permit`
  - `ERC20Pausable`
  - `Ownable`
  - `AccessControl`
- Internal library: `Errors.sol`

## Constants and roles
- `MAX_SUPPLY = 10_000_000 ether`
- `MINTER_ROLE = keccak256("MINTER_ROLE")`
- `BURNER_ROLE = keccak256("BURNER_ROLE")`

## Events
- `MinterUpdated(address minter, bool allowed)`
- `BurnerUpdated(address burner, bool allowed)`
- `TokensMinted(address to, uint256 amount, address minter)`
- `TokensBurned(address from, uint256 amount, address burner)`

## Relevant errors (Errors.sol)
- `ZeroAddress()`
- `InvalidAmount()`
- `CapExceeded()` (in batch mint when the sum exceeds the cap)
- `ArrayLengthMismatch()`

## Functions — Neurons contract

Administration (owner):
- `setMinter(address minter, bool allowed)`
- `setBurner(address burner, bool allowed)`
- `pause()` / `unpause()`

Mint/Burn:
- `mint(address to, uint256 amount)` — requires `MINTER_ROLE`
- `batchMint(address[] recipients, uint256[] amounts)` — requires `MINTER_ROLE`
- `burn(uint256 amount)` — burns from `msg.sender`
- `burnFrom(address account, uint256 amount)` — requires `BURNER_ROLE`

View:
- `remainingSupply() -> uint256`
- `isMinter(address) -> bool`
- `isBurner(address) -> bool`

Permit (EIP‑2612):
- Inherited from `ERC20Permit` (name: "Neurons")
- `permit(owner, spender, value, deadline, v, r, s)`
- `nonces(owner)` and `DOMAIN_SEPARATOR()`

Internal overrides:
- `_update` (OZ v5): `override(ERC20, ERC20Pausable, ERC20Capped)` — keeps cap/pause logic centralized in `_update`.

## Usage flows
- Mint is controlled by orchestrators (e.g., `PoKMinter`) having `MINTER_ROLE`.
- Burn to reduce a user balance or operationally via `BURNER_ROLE` (e.g., bridge adapter in burn/mint mode).
- Pause for incident response; pauses block transfer/mint/burn.
- Permit for off-chain signed approvals.

## Security considerations
- Only the `owner` manages minter/burner roles.
- Avoid granting `MINTER_ROLE` to more entities than necessary.
- Audit `TokensMinted/TokensBurned` events for traceability.
- Pause as an emergency mechanism.

## Integrations
- `PoKMinter` calls `mint()`; it must hold `MINTER_ROLE`.
- `NeuronsOFTAdapter` may call `burnFrom()` and `mint()` on the destination; ensure `BURNER_ROLE`/`MINTER_ROLE` according to the bridge mode.
