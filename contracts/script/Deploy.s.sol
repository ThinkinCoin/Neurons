// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {Neurons} from "../src/tokens/Neurons.sol";
import {PoKMinter} from "../src/minters/PoKMinter.sol";
import {ECDSAVerifier} from "../src/verifiers/ECDSAVerifier.sol";
import {NeuronsOFTAdapter} from "../src/bridge/NeuronsOFTAdapter.sol";

/// @title Deploy Neurons System
/// @notice Deploys the complete Neurons token ecosystem
contract DeployNeurons is Script {
    // Configuration
    struct DeployConfig {
        address owner;
        address verifierSigner;
        address daoTreasury;
        uint256 cooldownPeriod;
        uint256 dailyLimit;
        uint256 maxSingleMint;
        bool deployBridge;
    }
    
    // Deployed contracts
    struct DeployedContracts {
        Neurons token;
        ECDSAVerifier verifier;
        PoKMinter minter;
        NeuronsOFTAdapter bridge;
    }
    
    function run() external returns (DeployedContracts memory) {
        // Load configuration from environment
        DeployConfig memory config = _loadConfig();
        
        vm.startBroadcast();
        
        console.log("Deploying Neurons system...");
        console.log("Owner:", config.owner);
        console.log("Verifier Signer:", config.verifierSigner);
        console.log("DAO Treasury:", config.daoTreasury);
        
        // Deploy core contracts
        DeployedContracts memory contracts = _deployContracts(config);
        
        // Configure contracts
        _configureContracts(contracts, config);
        
        // Deploy bridge if requested
        if (config.deployBridge) {
            contracts.bridge = _deployBridge(contracts.token, config.owner);
        }
        
        vm.stopBroadcast();
        
        // Log deployment info
        _logDeployment(contracts, config);
        
        return contracts;
    }
    
    function _loadConfig() internal view returns (DeployConfig memory config) {
        config.owner = vm.envOr("NEURONS_OWNER", address(msg.sender));
        config.verifierSigner = vm.envAddress("NEURONS_VERIFIER_SIGNER");
        config.daoTreasury = vm.envOr(
            "NEURONS_DAO_TREASURY",
            address(0x76B83B6148ccA891D768cE3129585F25d0104783)
        );
        config.cooldownPeriod = vm.envOr("NEURONS_COOLDOWN_PERIOD", uint256(1 hours));
        config.dailyLimit = vm.envOr("NEURONS_DAILY_LIMIT", uint256(1000 * 1e18));
        config.maxSingleMint = vm.envOr("NEURONS_MAX_SINGLE_MINT", uint256(100 * 1e18));
        config.deployBridge = vm.envOr("NEURONS_DEPLOY_BRIDGE", false);
        
        require(config.verifierSigner != address(0), "NEURONS_VERIFIER_SIGNER required");
        require(config.daoTreasury != address(0), "NEURONS_DAO_TREASURY required");
    }
    
    function _deployContracts(DeployConfig memory config) internal returns (DeployedContracts memory contracts) {
        console.log("1. Deploying Neurons token...");
        contracts.token = new Neurons(config.owner);
        console.log("   Neurons token deployed at:", address(contracts.token));
        
        console.log("2. Deploying ECDSA verifier...");
        contracts.verifier = new ECDSAVerifier(
            config.owner,
            config.verifierSigner
        );
        console.log("   ECDSA verifier deployed at:", address(contracts.verifier));
        
        console.log("3. Deploying PoK minter...");
        contracts.minter = new PoKMinter(
            config.owner,
            address(contracts.token),
            address(contracts.verifier),
            config.daoTreasury
        );
        console.log("   PoK minter deployed at:", address(contracts.minter));
    }
    
    function _configureContracts(DeployedContracts memory contracts, DeployConfig memory config) internal {
        console.log("4. Configuring contracts...");
        
        // Grant minter role to PoK minter
        contracts.token.grantRole(contracts.token.MINTER_ROLE(), address(contracts.minter));
        console.log("   Granted MINTER_ROLE to PoK minter");
        
        // Configure minter parameters if different from defaults
        if (
            config.cooldownPeriod != 1 hours ||
            config.dailyLimit != 1000 * 1e18 ||
            config.maxSingleMint != 100 * 1e18
        ) {
            contracts.minter.setLimits(config.cooldownPeriod, config.dailyLimit, config.maxSingleMint);
            console.log("   Updated minter limits");
        }
    }
    
    function _deployBridge(Neurons token, address owner) internal returns (NeuronsOFTAdapter bridge) {
        console.log("5. Deploying bridge adapter...");
        bridge = new NeuronsOFTAdapter(owner, address(token));
        console.log("   Bridge adapter deployed at:", address(bridge));
        
        // Grant bridge necessary roles
        token.grantRole(token.MINTER_ROLE(), address(bridge));
        token.grantRole(token.BURNER_ROLE(), address(bridge));
        console.log("   Granted bridge roles to adapter");
    }
    
    function _logDeployment(DeployedContracts memory contracts, DeployConfig memory config) internal view {
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Network:", block.chainid);
        console.log("Deployer:", msg.sender);
        console.log("Owner:", config.owner);
        console.log("Verifier Signer:", config.verifierSigner);
        console.log("DAO Treasury:", config.daoTreasury);
        console.log("");
        console.log("Contract Addresses:");
        console.log("  Neurons Token:", address(contracts.token));
        console.log("  ECDSA Verifier:", address(contracts.verifier));
        console.log("  PoK Minter:", address(contracts.minter));
        if (address(contracts.bridge) != address(0)) {
            console.log("  Bridge Adapter:", address(contracts.bridge));
        }
        console.log("");
        console.log("Configuration:");
        console.log("  Token Name: Neurons");
        console.log("  Token Symbol: Neurons");
        console.log("  Max Supply: 10,000,000 NEURONS");
        console.log("  Cooldown Period:", config.cooldownPeriod, "seconds");
        console.log("  Daily Limit:", config.dailyLimit / 1e18, "NEURONS");
        console.log("  Max Single Mint:", config.maxSingleMint / 1e18, "NEURONS");
        console.log("");
        console.log("Next Steps:");
        console.log("1. Verify contracts on block explorer");
        console.log("2. Configure bridge endpoints (if deployed)");
        console.log("3. Set up monitoring and alerts");
        console.log("4. Test minting functionality");
        console.log("5. Configure cross-chain settings");
        console.log("===============================");
    }
}

/// @title Deploy Testnet
/// @notice Quick deployment script for testnet environments
contract DeployTestnet is Script {
    function run() external {
        // Use a deterministic test signer for testnets
        uint256 testPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address testSigner = vm.addr(testPrivateKey);
        
        vm.setEnv("NEURONS_VERIFIER_SIGNER", vm.toString(testSigner));
        vm.setEnv("NEURONS_DEPLOY_BRIDGE", "true");
        
        // Lower limits for testing
        vm.setEnv("NEURONS_COOLDOWN_PERIOD", vm.toString(5 minutes));
        vm.setEnv("NEURONS_DAILY_LIMIT", vm.toString(10000 * 1e18));
        vm.setEnv("NEURONS_MAX_SINGLE_MINT", vm.toString(1000 * 1e18));
        
        // Run main deployment
        DeployNeurons deployer = new DeployNeurons();
        deployer.run();
        
        console.log("\n🧪 TESTNET DEPLOYMENT COMPLETE");
        console.log("Test Signer Private Key:", vm.toString(testPrivateKey));
        console.log("Test Signer Address:", testSigner);
        console.log("Use this private key to sign PoK messages for testing");
    }
}

/// @title Upgrade Scripts
/// @notice Helper scripts for contract upgrades and configuration changes
contract ConfigureNeurons is Script {
    function setBridgeEndpoint(address bridge, address endpoint) external {
        vm.startBroadcast();
        NeuronsOFTAdapter(bridge).setEndpoint(endpoint);
        vm.stopBroadcast();
        console.log("Set bridge endpoint to:", endpoint);
    }
    
    function allowBridgeChain(address bridge, uint16 chainId, bool allowed) external {
        vm.startBroadcast();
        NeuronsOFTAdapter(bridge).allowRemote(chainId, allowed);
        vm.stopBroadcast();
        console.log("Set chain", chainId, "allowed:", allowed);
    }
    
    function setTrustedRemote(address bridge, uint16 chainId, bytes calldata trustedRemote) external {
        vm.startBroadcast();
        NeuronsOFTAdapter(bridge).setTrustedRemote(chainId, trustedRemote);
        vm.stopBroadcast();
        console.log("Set trusted remote for chain", chainId);
    }
    
    function grantMinterRole(address token, address minter) external {
        vm.startBroadcast();
        Neurons(token).grantRole(Neurons(token).MINTER_ROLE(), minter);
        vm.stopBroadcast();
        console.log("Granted MINTER_ROLE to:", minter);
    }
    
    function updateMinterConfig(
        address minter,
        uint256 cooldownPeriod,
        uint256 dailyLimit,
        uint256 maxSingleMint
    ) external {
        vm.startBroadcast();
        PoKMinter pokMinter = PoKMinter(minter);
        pokMinter.setLimits(cooldownPeriod, dailyLimit, maxSingleMint);
        vm.stopBroadcast();
        console.log("Updated minter configuration");
    }
}