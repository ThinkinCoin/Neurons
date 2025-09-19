# Neurons Token System

Um sistema completo de token ERC20 com verificação Proof-of-Knowledge (PoK) e capacidades cross-chain.

## 📋 Visão Geral

O sistema Neurons consiste em:

- **Neurons.sol**: Token ERC20 com cap de 10M tokens, funcionalidades de mint/burn e controle de acesso
- **PoKMinter.sol**: Controlador de minting com verificação PoK, rate limiting e controles de segurança
- **ECDSAVerifier.sol**: Verificador de assinaturas ECDSA usando EIP-712 para autorização de PoK
- **NeuronsOFTAdapter.sol**: Adapter para bridge cross-chain via LayerZero (stub para integração)

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Neurons.sol   │    │ ECDSAVerifier   │    │  PoKMinter.sol  │
│   (ERC20 Core)  │◄───┤   (PoK Auth)    │◄───┤ (Mint Control)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         ▲                                              │
         │                                              │
         │              ┌─────────────────┐            │
         └──────────────┤NeuronsOFTAdapter│◄───────────┘
                        │ (Cross-Chain)   │
                        └─────────────────┘
```

## 🔧 Funcionalidades

### Token Core (Neurons.sol)
- ✅ ERC20 padrão com extensões OpenZeppelin v5.0.0
- ✅ Cap máximo de 10.000.000 tokens
- ✅ Sistema de roles (MINTER_ROLE, BURNER_ROLE, DEFAULT_ADMIN_ROLE)
- ✅ Pausable para emergências
- ✅ Permit para aprovações gasless
- ✅ Batch operations para eficiência
- ✅ Analytics e tracking de operações

### PoK Minting (PoKMinter.sol)
- ✅ Verificação de Proof-of-Knowledge via assinatura ECDSA
- ✅ Rate limiting: cooldown de 1 hora entre mints
- ✅ Limite diário: 1.000 tokens por usuário/dia
- ✅ Limite por transação: 100 tokens máximo
- ✅ Sistema de nonce para prevenir replay attacks
- ✅ Batch minting para múltiplos usuários
- ✅ Pausable e ReentrancyGuard para segurança
- ✅ Configuração flexível de parâmetros

### Verificação ECDSA (ECDSAVerifier.sol)
- ✅ Implementação EIP-712 para assinaturas estruturadas
- ✅ Domain separation para segurança
- ✅ Signer autorizado configurável
- ✅ Verificação de integridade de dados PoK

### Bridge Cross-Chain (NeuronsOFTAdapter.sol)
- 🔄 Stub para integração LayerZero OFT v2
- 🔄 Suporte a burn-and-mint ou lock-and-unlock
- 🔄 Configuração de chains permitidas
- 🔄 Trusted remotes para segurança
- 🔄 Fee estimation e controles de slippage

## 📊 Tokenomics

| Parâmetro | Valor |
|-----------|-------|
| **Supply Máximo** | 10.000.000 NEURONS |
| **Decimais** | 18 |
| **Cooldown Mint** | 1 hora |
| **Limite Diário** | 1.000 NEURONS/usuário |
| **Mint Máximo** | 100 NEURONS/transação |
| **Modelo de Bridge** | Burn-and-mint (padrão) |

## 🔐 Sistema de Segurança

### Rate Limiting
- **Cooldown**: 1 hora entre mints por usuário
- **Daily Limit**: 1.000 tokens por usuário/dia
- **Single Mint**: 100 tokens máximo por transação
- **Nonce System**: Previne replay attacks

### Controle de Acesso
- **MINTER_ROLE**: Pode mint tokens (apenas PoKMinter tem essa role)
- **BURNER_ROLE**: Pode burn tokens de outros usuários
- **DEFAULT_ADMIN_ROLE**: Controle total do sistema

### Verificação PoK
- **EIP-712**: Assinaturas estruturadas e seguras
- **Domain Separation**: Previne cross-contract attacks
- **Authorized Signer**: Apenas signer autorizado pode validar PoK
- **Timestamp Validation**: Previne ataques de replay

## 🚀 Deploy e Configuração

### Variáveis de Ambiente

```bash
# Requerido
NEURONS_VERIFIER_SIGNER=0x...    # Endereço do signer autorizado

# Opcional (valores padrão)
NEURONS_OWNER=0x...              # Owner dos contratos (msg.sender)
NEURONS_TOKEN_NAME="Neurons"     # Nome do token
NEURONS_TOKEN_SYMBOL="NEURONS"   # Símbolo do token
NEURONS_COOLDOWN_PERIOD=3600     # 1 hora em segundos
NEURONS_DAILY_LIMIT=1000000000000000000000  # 1000 * 1e18
NEURONS_MAX_SINGLE_MINT=100000000000000000000  # 100 * 1e18
NEURONS_DEPLOY_BRIDGE=false      # Deploy bridge adapter
```

### Scripts de Deploy

```bash
# Deploy completo em mainnet
forge script script/Deploy.s.sol:DeployNeurons --rpc-url $RPC_URL --broadcast --verify

# Deploy rápido em testnet
forge script script/Deploy.s.sol:DeployTestnet --rpc-url $TESTNET_RPC --broadcast

# Configurar bridge existente
forge script script/Deploy.s.sol:ConfigureNeurons --sig "setBridgeEndpoint(address,address)" $BRIDGE_ADDR $ENDPOINT --broadcast
```

### Exemplo de Uso Pós-Deploy

```solidity
// 1. Configurar verifier signer
verifier.setAuthorizedSigner(signerAddress);

// 2. Grant roles necessárias
token.grantRole(token.MINTER_ROLE(), address(minter));

// 3. Configurar bridge (se deployed)
bridge.setEndpoint(layerZeroEndpoint);
bridge.allowRemote(chainId, true);
bridge.setTrustedRemote(chainId, trustedRemoteBytes);

// 4. Ajustar parâmetros se necessário
minter.setCooldownPeriod(30 minutes);  // Para testes
minter.setDailyLimit(5000 * 1e18);     // Aumentar limite
```

## 🧪 Testes

### Executar Tests

```bash
# Todos os testes
forge test

# Testes específicos
forge test --match-contract NeuronsTest

# Testes com logs
forge test -vv

# Coverage
forge coverage
```

### Cobertura de Testes

- ✅ **Token Core**: Minting, burning, cap, roles, pausing
- ✅ **PoK Minting**: Verificação, rate limiting, nonce tracking
- ✅ **ECDSA Verification**: Assinaturas válidas/inválidas, signer updates
- ✅ **Batch Operations**: Multiple mints, recipients, amounts
- ✅ **Security**: Reentrancy, unauthorized access, replay attacks
- ✅ **Configuration**: Parameter updates, role management

## 🌉 Integração Cross-Chain

### LayerZero Integration (Próximos Passos)

1. **Instalar LayerZero Dependencies**
   ```bash
   pnpm add @layerzerolabs/solidity-examples
   ```

2. **Implementar OFTV2**
   ```solidity
   import {OFTV2} from "@layerzerolabs/solidity-examples/contracts/token/oft/v2/OFTV2.sol";
   
   // Extend NeuronsOFTAdapter from OFTV2
   contract NeuronsOFTAdapter is OFTV2 {
       // Implementation
   }
   ```

3. **Configurar Endpoints**
   ```javascript
   // Ethereum: 0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675
   // BSC: 0x3c2269811836af69497E5F486A85D7316753cf62
   // Polygon: 0x3c2269811836af69497E5F486A85D7316753cf62
   ```

## 📈 Analytics e Monitoring

### Eventos para Tracking

```solidity
// Token events
event TokensMinted(address indexed to, uint256 amount, address indexed minter);
event TokensBurned(address indexed from, uint256 amount);

// PoK events  
event PoKMintExecuted(address indexed recipient, uint256 amount, uint256 nonce);
event PoKMintBatch(uint256 totalAmount, uint256 recipientCount);

// Bridge events
event TokensSent(address indexed from, uint16 indexed dstChainId, address indexed to, uint256 amount);
event TokensReceived(address indexed to, uint16 indexed srcChainId, uint256 amount);
```

### Métricas Importantes

- **Total Supply**: `token.totalSupply()`
- **Daily Mints**: `minter.dailyMinted(user, day)`
- **User Stats**: `minter.getUserStats(user)`
- **Bridge Stats**: `bridge.getBridgeStats()`

## 🚨 Considerações de Segurança

### Controles Implementados

1. **Rate Limiting Robusto**: Múltiplas camadas de proteção
2. **Nonce System**: Previne replay attacks efetivamente
3. **EIP-712**: Assinaturas estruturadas e domain separation
4. **Role-based Access**: Controle granular de permissões
5. **Pausable**: Emergency stop em caso de exploits
6. **ReentrancyGuard**: Proteção contra ataques de reentrada

### Auditoria Recomendada

- [ ] Review de contratos por auditor externo
- [ ] Teste de penetração em testnet
- [ ] Verificação de random nonce generation
- [ ] Análise de gas optimization
- [ ] Revisão de LayerZero integration

## 📋 TODO / Roadmap

### Imediato
- [ ] Completar NeuronsOFTAdapter com LayerZero OFTV2
- [ ] Implementar testes para bridge functionality
- [ ] Deployment scripts para múltiplas networks
- [ ] Verificação automática de contratos

### Futuro
- [ ] Governance token integration
- [ ] Staking mechanisms
- [ ] DAO proposals para parameter changes
- [ ] Multi-sig integration para admin functions
- [ ] Oracle integration para dynamic rate limiting

## 🤝 Contribuindo

1. Fork o repositório
2. Crie feature branch: `git checkout -b feature/nova-funcionalidade`
3. Implemente testes para nova funcionalidade
4. Execute `forge test` para garantir que tudo funciona
5. Commit: `git commit -m 'Add nova funcionalidade'`
6. Push: `git push origin feature/nova-funcionalidade`
7. Abra Pull Request

## 📄 Licença

MIT License - veja LICENSE file para detalhes.

---

**⚠️ AVISO**: Este sistema está em desenvolvimento. Use apenas em testnets até que auditoria de segurança seja completada.