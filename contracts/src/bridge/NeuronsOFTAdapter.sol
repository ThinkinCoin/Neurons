// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// NOTE: This is a stub. Wire with LayerZero OFT (v2) in integration step.
// Import the chosen OFT base and endpoint interfaces from the pinned LayerZero package.
// Example (adjust to your package layout):
// import {OFTV2} from "@layerzerolabs/solidity-examples/contracts/token/oft/v2/OFTV2.sol";

// Minimal compile-safe stub to document integration points.
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Errors} from "../libs/Errors.sol";
import {Neurons} from "../tokens/Neurons.sol";

/// @title Neurons OFT Adapter (LayerZero)
/// @notice Bridges Neurons across supported chains via LayerZero messaging.
/// @dev Two common patterns: lock-and-mint OR burn-and-mint.
contract NeuronsOFTAdapter is Ownable, Pausable, ReentrancyGuard {
    Neurons public token;
    address public endpoint; // LayerZero endpoint or OFT core, depending on chosen pattern
    
    // Chain configuration
    mapping(uint16 => bool) public remoteChainAllowed; // lzChainId => allowed
    mapping(uint16 => bytes) public trustedRemoteLookup; // lzChainId => trustedRemote
    
    // Bridge mode configuration
    bool public isBurnMintMode; // true = burn/mint, false = lock/unlock
    
    // Statistics
    uint256 public totalSent;
    uint256 public totalReceived;
    mapping(uint16 => uint256) public sentToChain;
    mapping(uint16 => uint256) public receivedFromChain;

    event EndpointSet(address endpoint);
    event RemoteChainAllowed(uint16 indexed lzChainId, bool allowed);
    event TrustedRemoteSet(uint16 indexed lzChainId, bytes trustedRemote);
    event BridgeModeSet(bool isBurnMintMode);
    event TokensSent(address indexed from, uint16 indexed dstChainId, address indexed to, uint256 amount);
    event TokensReceived(address indexed to, uint16 indexed srcChainId, uint256 amount);

    constructor(address owner_, address token_) Ownable(owner_) {
        if (owner_ == address(0) || token_ == address(0)) revert Errors.ZeroAddress();
        token = Neurons(token_);
        isBurnMintMode = true; // Default to burn/mint for simplicity
    }

    // -------- Admin Functions --------
    function setEndpoint(address endpoint_) external onlyOwner {
        if (endpoint_ == address(0)) revert Errors.ZeroAddress();
        endpoint = endpoint_;
        emit EndpointSet(endpoint_);
    }

    function allowRemote(uint16 lzChainId, bool allowed) external onlyOwner {
        remoteChainAllowed[lzChainId] = allowed;
        emit RemoteChainAllowed(lzChainId, allowed);
    }

    function setTrustedRemote(uint16 lzChainId, bytes calldata trustedRemote) external onlyOwner {
        trustedRemoteLookup[lzChainId] = trustedRemote;
        emit TrustedRemoteSet(lzChainId, trustedRemote);
    }

    function setBridgeMode(bool _isBurnMintMode) external onlyOwner {
        isBurnMintMode = _isBurnMintMode;
        emit BridgeModeSet(_isBurnMintMode);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // -------- Bridge Functions (Stubs) --------
    
    /// @dev Sends tokens to another chain
    /// TODO: Integrate with LayerZero OFT
    function sendTokens(
        uint16 dstChainId,
        address to,
        uint256 amount,
        bytes calldata adapterParams
    ) external payable whenNotPaused nonReentrant {
        if (!remoteChainAllowed[dstChainId]) revert Errors.BridgeNotAllowed();
        if (to == address(0)) revert Errors.ZeroAddress();
        if (amount == 0) revert Errors.InvalidAmount();
        if (endpoint == address(0)) revert Errors.EndpointNotSet();

        // Check balance
        if (token.balanceOf(msg.sender) < amount) revert Errors.InsufficientBalance();

        if (isBurnMintMode) {
            // Burn tokens on source chain
            token.burnFrom(msg.sender, amount);
        } else {
            // Lock tokens in adapter
            token.transferFrom(msg.sender, address(this), amount);
        }

        // Update statistics
        totalSent += amount;
        sentToChain[dstChainId] += amount;

        emit TokensSent(msg.sender, dstChainId, to, amount);

        // TODO: Implement LayerZero send logic
        // _lzSend(dstChainId, payload, payable(msg.sender), address(0), adapterParams, msg.value);
    }

    /// @dev Estimates bridge fee
    /// TODO: Integrate with LayerZero fee estimation
    function estimateSendFee(
        uint16 dstChainId,
        address to,
        uint256 amount,
        bool useZro,
        bytes calldata adapterParams
    ) external view returns (uint256 nativeFee, uint256 zroFee) {
        // TODO: Implement LayerZero fee estimation
        // return lzEndpoint.estimateFees(dstChainId, address(this), payload, useZro, adapterParams);
        
        // Placeholder
        nativeFee = 0.001 ether; // Placeholder fee
        zroFee = 0;
        
        // Suppress unused variable warnings
        dstChainId;
        to;
        amount;
        useZro;
        adapterParams;
    }

    /// @dev Receives tokens from another chain
    /// TODO: Implement LayerZero receive logic
    function _receiveTokens(
        uint16 srcChainId,
        address to,
        uint256 amount
    ) internal {
        if (!remoteChainAllowed[srcChainId]) revert Errors.BridgeNotAllowed();
        if (to == address(0)) revert Errors.ZeroAddress();
        if (amount == 0) revert Errors.InvalidAmount();

        if (isBurnMintMode) {
            // Mint tokens on destination chain
            token.mint(to, amount);
        } else {
            // Unlock tokens from adapter
            token.transfer(to, amount);
        }

        // Update statistics
        totalReceived += amount;
        receivedFromChain[srcChainId] += amount;

        emit TokensReceived(to, srcChainId, amount);
    }

    // TODO: integrate send/receive logic:
    // - lzReceive(...) / _nonblockingLzReceive(...) to mint/unlock on arrival
    // - choose lock-mint vs burn-mint:
    //   * lock-mint: hold tokens in adapter, mint wrapped on dst
    //   * burn-mint: burn here, mint there (requires mint authority on dst)
    // - ensure token.mint() authority is strictly controlled per chain

    // Security TODOs:
    // - Reentrancy guards ✅ (implemented)
    // - Trusted remote validation (implement with setTrustedRemote)
    // - Fee estimation and slippage guards for OFT

    // -------- Emergency Functions --------
    
    /// @dev Emergency withdrawal for locked tokens (lock/unlock mode only)
    function emergencyWithdraw(address to, uint256 amount) external onlyOwner {
        if (!isBurnMintMode) {
            token.transfer(to, amount);
        }
    }

    // -------- View Functions --------
    
    function getChainStats(uint16 chainId) external view returns (uint256 sent, uint256 received) {
        sent = sentToChain[chainId];
        received = receivedFromChain[chainId];
    }

    function isChainAllowed(uint16 chainId) external view returns (bool) {
        return remoteChainAllowed[chainId];
    }

    function getTrustedRemote(uint16 chainId) external view returns (bytes memory) {
        return trustedRemoteLookup[chainId];
    }

    function getBridgeStats() external view returns (
        uint256 totalTokensSent,
        uint256 totalTokensReceived,
        bool bridgeMode,
        uint256 activeChains
    ) {
        totalTokensSent = totalSent;
        totalTokensReceived = totalReceived;
        bridgeMode = isBurnMintMode;
        
        // Count active chains
        activeChains = 0;
        for (uint16 i = 1; i <= 200; i++) { // Common LayerZero chain ID range
            if (remoteChainAllowed[i]) {
                activeChains++;
            }
        }
    }
}