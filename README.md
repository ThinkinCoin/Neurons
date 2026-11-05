# NEURONS canonical source

This orphan branch contains the greenfield NEURONS foundation. The repository's `dev` branch is historical reference material and is not a dependency of this source tree.

The current scope provides an abstract Native LayerZero OFT core with ERC-20 Permit, ERC20Votes, EIP-6372 timestamp checkpoints, and strict representability checks before OFT debit. It deliberately excludes deployment configuration, production supply, peer selection, election logic, escrow, census, pausing, proxy upgradeability, and generic mint/burn administration.

`contracts/test/` contains synthetic fixtures only. It is not production token source.

## Decimal precision baseline

The CTO-approved technical baseline is 18 local ERC-20 decimals and 6 LayerZero shared decimals. A native OFT transfer must reject an amount that is not exactly representable in shared units; it must not silently round or remove dust. The six-decimal shared precision is a technical baseline only. Genesis supply and all economic issuance parameters remain pending approval, and must be confirmed compatible with the `uint64` shared-unit representation before deployment. The test fixture's six shared decimals are synthetic validation configuration, not a genesis or deployment configuration.

## Reproducible local build

Use Node.js `24.20.0` and npm `12.0.2` (the package manager is declared in `package.json`). `.npmrc` disables dependency lifecycle scripts, enforces the Node engine range declared by the project, and omits peer packages from the on-disk install. The current contract build imports the pinned Native OFT/OApp/protocol and OpenZeppelin contracts directly; it does not compile the other LayerZero peer integrations or use LayerZero deployment tooling. If a future task adds those integrations or tools, it must declare/install the required peers explicitly and repeat compatibility and security validation. Install from the committed lockfile and run only local compilation and tests:

```bash
nvm use
npm ci --no-audit --no-fund
npm run clean
npm run build
npm test
```

The package lock records exact package versions and registry integrity hashes. These controls reduce unnecessary peer-package installation and improve build reproducibility; they do not eliminate all vulnerable build-time dependencies or certify a release. Review both `npm audit --omit=dev --omit=peer` (installed non-development scope) and the complete dependency audit before any release or deployment work.
