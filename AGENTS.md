# Repository Guidelines

## Project Structure & Module Organization

This repository contains the Neurons ERC-20 contracts, Proof-of-Knowledge minting flow, and deployment tooling. Solidity sources live in `contracts/src/`; Hardhat tests live in `test/` and follow the contract name (for example, `test/PoKMinter.ts`). Deployment and verification scripts are in `scripts/`, while network deployment records are in `deployments/`. `artifacts/`, `cache/`, `coverage/`, and `typechain-types/` are generated outputs—do not hand-edit them.

`landing-page/` is a separate Next.js application with its own dependencies and contributor instructions. Read `landing-page/AGENTS.md` before changing that app. Project documentation is in `README.md` and `docs/`.

## Build, Test, and Development Commands

Install root dependencies with `pnpm install` (the repository pins pnpm) or the project's existing package-manager workflow. Use:

```bash
pnpm build          # compile Solidity contracts with Hardhat
pnpm test           # run the Hardhat TypeScript test suite
pnpm test:gas       # run tests with gas reporting
pnpm test:coverage  # generate Solidity coverage reports
pnpm lint           # run Solhint over contracts
pnpm format         # format Solidity files (writes changes)
pnpm dev            # start the landing page from landing-page/
```

Run `pnpm build`, `pnpm test`, and `pnpm lint` for contract changes. For the website, use `npm run build` from `landing-page/` as described in its local guide.

## Coding Style & Naming Conventions

Use Solidity `0.8.33` patterns already established in `contracts/src/`: four-space indentation, PascalCase contract names, and camelCase functions, variables, and parameters. Keep one primary contract per file and match its filename. Prefer OpenZeppelin access control and security primitives over custom alternatives. TypeScript uses the existing project conventions; keep deployment scripts explicit about network and signer inputs.

## Testing Guidelines

Add or update a focused `test/<Contract>.ts` test for every contract behavior, including authorization, pause paths, limits, and expected reverts. Use descriptive `describe` and `it` statements that state the behavior. Do not rely only on coverage: test failure modes and security-sensitive boundary conditions.

## Commit, Pull Request, and Security Guidance

Recent commits generally use short, conventional prefixes such as `feat:`, `fix:`, and `refactor:`; use `type: imperative summary`. PRs should explain the contract or UI impact, list validation commands and results, link relevant issues, and include screenshots for landing-page changes.

Never commit `.env`, private keys, RPC credentials, or explorer API keys. Deployment and verification commands can target live networks; run them only with intentional network selection and approved credentials.
