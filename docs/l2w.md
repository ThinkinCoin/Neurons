# Learn‑to‑Win (L2W) — Arquitetura e Fluxo

Versão: 1.0.0  
Solidity: ^0.8.20

## Objetivo
O L2W incentiva aprendizado/participação do usuário com recompensas em Neurons, usando o PoK como base de comprovação.

## Componentes
- Aplicativo/Plataforma L2W (off‑chain)
  - Experiências de aprendizado, desafios, quizzes, tarefas de IA
  - Orquestrador que computa recompensa e prepara `proof` (EIP‑712) para PoK
- `PoKMinter` + `ECDSAVerifier` (on‑chain)
  - Validação de proofs e emissão de tokens
- Token `Neurons`
  - Recebe mints do PoK, controla cap/pausa/roles
- (Opcional) Ponte `NeuronsOFTAdapter` para multi‑chain

## Fluxo do usuário
1. Usuário completa atividades na plataforma
2. Backend calcula recompensa e gera mensagem EIP‑712 com `(recipient, amount, nonce, expiry)`
3. Backend assina com `trustedSigner` e envia `proof` para o contrato via frontend/API
4. `PoKMinter.mintWithProof(...)` valida limites e chama `token.mint`
5. Usuário recebe Neurons como recompensa

## Modelo de recompensa (exemplos)
- Baseado em dificuldade e tempo (tarefas mais complexas valem mais)
- Progressão de nível (maiores recompensas para streak/consistência)
- Bonificações por eventos e curadoria (ex.: conteúdo avaliado)

## Controles e limites
- `minCooldown`: reduz farming contínuo por conta
- `maxDailyMint`: limita emissão diária por usuário
- `maxSingleMint`: previne valores anômalos por prova
- Políticas de KYC/anti‑spam podem complementar (off‑chain)

## Integração com carteira/assinatura
- `ECDSAVerifier` usa domínio `NeuronsPoK` v1 e EIP‑712
- `buildMessageHash(...)` facilita reuso em SDKs

## Métricas e telemetria
- On‑chain: `totalMintsProcessed`, `totalTokensMinted`
- Off‑chain: conclusão de cursos, acertos em quizzes, pesos de tarefas
- Painéis: emissão diária, usuários únicos, taxa de aprovação de proofs

## Segurança
- Rotacionar `trustedSigner` e proteger a chave privada
- Monitorar `nonce` para evitar replay; expirar proofs
- Observabilidade sobre taxas de sucesso/falha por origem
- Usar `pause()` quando necessário

## Multi‑chain (opcional)
- `NeuronsOFTAdapter` (LayerZero) possibilita mover saldos entre chains:
  - Modo burn/mint (preferido): queima na origem, mint no destino
  - Modo lock/unlock: trava na origem, libera no destino
- Controle por `trustedRemote` e whitelist de `remoteChainAllowed`

## Roadmap
- Suporte a verificadores alternativos (zk, oráculos)
- Reputação do usuário e níveis de confiança
- Missões colaborativas e pools de recompensa
