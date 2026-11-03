# Canonical NEURONS branch guidance

`canonical/dev` is an orphan greenfield branch. The repository's `dev` branch preserves historical Harmony-era reference material and is not a source dependency of this branch.

Production candidates live in `contracts/src/`. Test-only fixtures and endpoint harnesses live in `contracts/test/`; they must not be deployed or imported by production contracts. Tests live in `test/`.

Use the pinned lockfile and run `npm ci --ignore-scripts`, `npx hardhat compile`, and `npx hardhat test`. Do not install a different dependency graph, configure public endpoints, or run deployment scripts without a separate mandate.

The core deliberately leaves deployment-specific shared decimals, genesis supply, recipient, endpoint, peer topology, and authority holder to later approved configuration and deployment work. Do not add generic mint, arbitrary burn, pause, proxy upgrade, election, escrow, census, or Treasury features without a separately approved contract decision.
