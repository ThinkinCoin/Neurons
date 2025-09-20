# Proof‑of‑Knowledge (PoK) — Especificação Técnica

Versão: 1.0.0  
Solidity: ^0.8.20

## Visão geral
O PoK recompensa usuários por comprovarem execução/resultado de tarefas (ex.: aprendizado/IA). A emissão do token é feita via `PoKMinter`, que valida um `proof` usando um verificador (`IVerifier`).

Contratos principais:
- `PoKMinter` — contratos/src/minters/PoKMinter.sol
- `IVerifier` — contratos/src/interfaces/IVerifier.sol
- `ECDSAVerifier` — contratos/src/verifiers/ECDSAVerifier.sol

## IVerifier
Interface genérica para validadores PoK/AI.

```solidity
function verify(address recipient, uint256 amount, bytes calldata proof, bytes32 nonce) external view returns (bool ok);
function trustedSigner() external view returns (address); // específico p/ ECDSA
function setTrustedSigner(address newSigner) external;     // admin only
function domainSeparator() external view returns (bytes32); // EIP-712 quando aplicável
function buildMessageHash(address recipient, uint256 amount, bytes32 nonce, uint256 expiry) external view returns (bytes32);
```

- `verify` deve reverter em provas inválidas. O retorno `bool` é auxiliar.
- `nonce` previne replay. `expiry` é parte do payload (ver ECDSA abaixo).

## ECDSAVerifier
Implementação baseada em EIP‑712 + ECDSA.

- Domínio: `EIP712("NeuronsPoK", "1")`
- Typehash: `MintProof(address recipient,uint256 amount,bytes32 nonce,uint256 expiry)`
- `verify(...)`:
  1. Decodifica `proof` como `(bytes signature, uint256 expiry)`
  2. Verifica `expiry > block.timestamp`
  3. Monta `structHash` com os campos
  4. Calcula `messageHash = _hashTypedDataV4(structHash)`
  5. `recover(signature)` e compara com `trustedSigner`

Admin:
- `setTrustedSigner(address)` (Ownable)

## PoKMinter
Orquestrador que valida prova e chama `token.mint(to, amount)`.

Estados/limites:
- `nonceUsed[bytes32]` — previne replay
- Rate limit por usuário:
  - `minCooldown` (default: 1 hora)
  - `maxDailyMint` (default: 1000e18)
  - `maxSingleMint` (default: 100e18)
- Estatísticas: `totalMintsProcessed`, `totalTokensMinted`

Eventos:
- `TokenSet(address token)`
- `VerifierSet(address verifier)`
- `MintedWithProof(address to, uint256 amount, bytes32 nonce)`
- `LimitsUpdated(uint256 minCooldown, uint256 maxDailyMint, uint256 maxSingleMint)`

Fluxo `mintWithProof(to, amount, proof, nonce)`:
1. Pré‑checks: token/verifier set, `to != 0`, `amount > 0`, dentro de limites
2. Checa cooldown e janela diária
3. `verifier.verify(...)` deve ser `true` (ou reverter)
4. Marca `nonceUsed[nonce] = true`
5. Atualiza controles de taxa/dia
6. `token.mint(to, amount)` (requer `MINTER_ROLE` no token)
7. Atualiza estatísticas e emite evento

`batchMintWithProofs(...)`:
- Processa lista; ignora entradas inválidas sem reverter o lote

Admin:
- `setToken(address)`, `setVerifier(address)`
- `setLimits(minCooldown, maxDailyMint, maxSingleMint)`
- `pause()` / `unpause()`

Erros (via `Errors.sol`):
- `ZeroAddress()`, `InvalidAmount()`, `ArrayLengthMismatch()`
- `InvalidProof()`, `ProofExpired()`, `InvalidSignature()`
- `CooldownNotMet()`, `DailyLimitExceeded()`, `SingleMintLimitExceeded()`

## Integração ponta‑a‑ponta
- Backend/Orquestrador:
  1. Monta payload EIP‑712 e assina com `trustedSigner`
  2. Envia `mintWithProof(to, amount, abi.encode(signature, expiry), nonce)`
- On‑chain:
  - `ECDSAVerifier` valida assinatura e expiração
  - `PoKMinter` controla limites e chama `token.mint`

## Segurança e conformidade
- `PoKMinter` deve ter `MINTER_ROLE` no token.
- Rotacione `trustedSigner` conforme política.
- Proteções contra replay via `nonce` e `expiry`.
- Monitore métricas on‑chain de emissão.
