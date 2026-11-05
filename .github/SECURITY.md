# Security Policy

## Overview

NEURONS is the governance token infrastructure of the Axodus ecosystem, designed around ERC-20, ERC20Permit, ERC20Votes, and LayerZero V2 Native OFT interoperability.

Security is a fundamental requirement of the project, particularly regarding token supply integrity, cross-chain messaging, access control, historical voting checkpoints, and smart contract execution.

We welcome responsible security research and coordinated vulnerability disclosure.

## Supported Versions

NEURONS is currently under active development. No production-ready release has been officially published.

| Version / Branch | Security Support |
| --- | --- |
| `canonical/dev` (unreleased) | Active development and security review; not production-supported |
| `dev` (historical implementation) | Unsupported |
| Historical Harmony contracts | Unsupported |
| Official production releases | None published |

The canonical implementation remains subject to further security validation, dependency hardening, and deployment authorization.

Experimental contracts, historical deployments, and development branches must not be considered production-ready.

## Reporting a Vulnerability

**Please do not disclose security vulnerabilities through public GitHub Issues, Discussions, or pull requests.**

To report a vulnerability privately, use GitHub's Private Vulnerability Reporting feature, when enabled:

https://github.com/ThinkinCoin/Neurons/security/advisories/new

Navigate to **Security → Advisories → Report a vulnerability**.

If private reporting is unavailable, contact the repository maintainers through an established private communication channel before sharing sensitive technical details.

### What to Include

Please provide, whenever possible:

- A clear description of the vulnerability.
- Affected contracts, dependencies, or components.
- Relevant branch, commit SHA, or package version.
- Potential security and economic impact.
- Reproduction steps or a minimal proof of concept.
- Expected versus observed behavior.
- Suggested mitigations, if available.

Do not include private keys, seed phrases, production credentials, or other sensitive information.

## Response and Disclosure Process

We aim to follow this process:

| Stage | Target |
| --- | --- |
| Initial acknowledgment | Within 5 business days |
| Preliminary triage | As soon as reasonably possible |
| Status updates | Approximately every 14 days while investigation is active |
| Remediation | Based on severity, impact, and technical complexity |
| Public disclosure | Coordinated after appropriate mitigation or an agreed disclosure timeline |

These are response targets, not guaranteed remediation deadlines.

Accepted reports will be evaluated, prioritized, and assigned for remediation or further investigation.

If a report is declined, we will aim to explain the reasoning where appropriate.

We request that researchers coordinate public disclosure with maintainers to reduce the risk of exploitation before a fix or mitigation is available.

## Security Scope

Relevant security concerns include:

### Smart Contracts

- Unauthorized minting or burning.
- Token supply inflation or accounting inconsistencies.
- Access-control and ownership vulnerabilities.
- Incorrect ERC-20 or ERC20Permit behavior.
- Unexpected interactions between token extensions.
- Arithmetic, precision, and decimal conversion errors.
- Reentrancy and unsafe external interactions.

### LayerZero and Omnichain Interoperability

- Incorrect OFT debit/credit accounting.
- Supply conservation failures.
- Unauthorized message acceptance.
- Incorrect peer or endpoint validation.
- Message-processing inconsistencies.
- Unsafe transport configuration.
- Cross-chain token accounting discrepancies.

### Governance-Related Token Interfaces

- Incorrect historical checkpoint behavior.
- Delegation accounting inconsistencies.
- Timestamp clock incompatibilities.
- Incorrect exposure of token voting-power interfaces.

Global electoral eligibility, constitutional locking, and institutional voting logic belong to separate Governance components and are not automatically covered by the token contract's security guarantees.

### Dependencies and Build Infrastructure

- Vulnerable direct or transitive dependencies.
- Compromised dependency packages.
- Build artifact integrity issues.
- Unsafe installation or build scripts.
- Toolchain supply-chain vulnerabilities.
- Exposure of secrets or signing credentials.

## Responsible Research Guidelines

We ask security researchers to:

- Act in good faith.
- Use local environments or explicitly authorized testing infrastructure.
- Avoid disrupting services or interacting with third-party assets without authorization.
- Avoid accessing, modifying, or disclosing other users' information.
- Avoid transferring or putting real assets at risk.
- Provide sufficient information for maintainers to reproduce and assess findings.
- Allow a reasonable opportunity for coordinated remediation.

Production-network attacks, unauthorized transactions, denial-of-service testing against live infrastructure, and attempts to access private credentials are not authorized by this policy.

## Security Updates

When supported releases become available, security fixes and relevant advisories may be communicated through:

- GitHub Security Advisories.
- Repository releases.
- Official Axodus project communications.

Significant vulnerabilities may require additional technical validation before a patched version is released.

## Bug Bounty

This policy does not establish a paid bug bounty program or guarantee financial compensation for vulnerability reports.

Any future reward program will be announced separately through official project channels.

## Disclaimer

NEURONS is under active development.

The existence of this Security Policy does not constitute a security audit, certification, warranty, or authorization for production deployment.

The project does not guarantee that its smart contracts, dependencies, or cross-chain integrations are free from vulnerabilities.

**Security Contact:** GitHub Private Vulnerability Reporting, when enabled.

**Project:** NEURONS — Axodus Ecosystem  
**Repository:** https://github.com/ThinkinCoin/Neurons