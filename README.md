# NEURONS canonical source

This orphan branch contains the greenfield NEURONS foundation. The repository's `dev` branch is historical reference material and is not a dependency of this source tree.

The current scope provides an abstract Native LayerZero OFT core with ERC-20 Permit, ERC20Votes, EIP-6372 timestamp checkpoints, and strict representability checks before OFT debit. It deliberately excludes deployment configuration, production supply, peer selection, election logic, escrow, census, pausing, proxy upgradeability, and generic mint/burn administration.

`contracts/test/` contains synthetic fixtures only. It is not production token source.

## Decimal precision baseline

The CTO-approved technical baseline is 18 local ERC-20 decimals and 6 LayerZero shared decimals. A native OFT transfer must reject an amount that is not exactly representable in shared units; it must not silently round or remove dust. The six-decimal shared precision is a technical baseline only. Genesis supply and all economic issuance parameters remain pending approval, and must be confirmed compatible with the `uint64` shared-unit representation before deployment. The test fixture's six shared decimals are synthetic validation configuration, not a genesis or deployment configuration.
