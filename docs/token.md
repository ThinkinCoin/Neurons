# Token Neurons — Especificação Técnica

Versão: 1.0.0  
Solidity: ^0.8.20 (OpenZeppelin v5)

## Visão geral
O Neurons é um token ERC‑20 com:
- Cap (fornecimento máximo fixo) de 10.000.000 NEURONS
- Mint gated por papéis (MINTER_ROLE)
- Burn (self-burn) e burnFrom (permitido a BURNER_ROLE)
- Pausabilidade (ERC20Pausable) para travar transferências/mints/burns em incidentes
- Suporte a Permit (EIP‑2612) via ERC20Permit
- Integração com sistemas externos: PoK e ponte (LayerZero OFT Adapter)

Contrato: `contracts/src/tokens/Neurons.sol`

## Interfaces e herança
- OpenZeppelin v5:
  - `ERC20`
  - `ERC20Capped`
  - `ERC20Permit`
  - `ERC20Pausable`
  - `Ownable`
  - `AccessControl`
- Biblioteca interna: `Errors.sol`

## Constantes e papéis
- `MAX_SUPPLY = 10_000_000 ether`
- `MINTER_ROLE = keccak256("MINTER_ROLE")`
- `BURNER_ROLE = keccak256("BURNER_ROLE")`

## Eventos
- `MinterUpdated(address minter, bool allowed)`
- `BurnerUpdated(address burner, bool allowed)`
- `TokensMinted(address to, uint256 amount, address minter)`
- `TokensBurned(address from, uint256 amount, address burner)`

## Erros relevantes (Errors.sol)
- `ZeroAddress()`
- `InvalidAmount()`
- `CapExceeded()` (em batch mint quando soma excede o cap)
- `ArrayLengthMismatch()`

## Funções — contrato Neurons

Administração (owner):
- `setMinter(address minter, bool allowed)`
- `setBurner(address burner, bool allowed)`
- `pause()` / `unpause()`

Mint/Burn:
- `mint(address to, uint256 amount)` — requer `MINTER_ROLE`
- `batchMint(address[] recipients, uint256[] amounts)` — requer `MINTER_ROLE`
- `burn(uint256 amount)` — queima do `msg.sender`
- `burnFrom(address account, uint256 amount)` — requer `BURNER_ROLE`

Consulta:
- `remainingSupply() -> uint256`
- `isMinter(address) -> bool`
- `isBurner(address) -> bool`

Permit (EIP‑2612):
- Herdado de `ERC20Permit` (nome: "Neurons")
- `permit(owner, spender, value, deadline, v, r, s)`
- `nonces(owner)` e `DOMAIN_SEPARATOR()`

Overrides internos:
- `_update` (OZ v5): `override(ERC20, ERC20Pausable, ERC20Capped)` — mantém lógica de cap/pausa centralizada em `_update`.

## Fluxos de uso
- Mint controlado por orquestradores (e.g., `PoKMinter`) com `MINTER_ROLE`.
- Burn para reduzir saldo do usuário ou operacional por `BURNER_ROLE` (e.g., adaptador de ponte em modo burn/mint).
- Pause para respostas a incidentes; pausas bloqueiam transfer/mint/burn.
- Permit para aprovações por assinatura fora da cadeia.

## Considerações de segurança
- Somente o `owner` gerencia papéis de minter/burner.
- Evitar conceder `MINTER_ROLE` a múltiplas entidades desnecessariamente.
- Auditoria de eventos `TokensMinted/TokensBurned` para trilha de auditoria.
- Pause como mecanismo de emergência.

## Integrações
- `PoKMinter` consome `mint()`; deve possuir `MINTER_ROLE`.
- `NeuronsOFTAdapter` pode consumir `burnFrom()` e `mint()` no destino; garantir `BURNER_ROLE`/`MINTER_ROLE` conforme o modo da ponte.
