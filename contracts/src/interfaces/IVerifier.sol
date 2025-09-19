// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

/// @notice Generic PoK/AI workload verifier interface.
/// @dev Implementations may be ECDSA, zk, oracles, or multi-validators.
interface IVerifier {
    /// @dev MUST revert if proof is invalid. Should be pure/view where possible.
    /// @param recipient beneficiary of mint
    /// @param amount    tokens to mint (18 decimals)
    /// @param proof     opaque blob (abi-encoded per verifier)
    /// @param nonce     unique nonce to avoid replay
    /// @return ok       true if valid (optional, can just revert on failure)
    function verify(
        address recipient,
        uint256 amount,
        bytes calldata proof,
        bytes32 nonce
    ) external view returns (bool ok);
    
    /// @dev Returns the trusted signer address (for ECDSA implementations)
    function trustedSigner() external view returns (address);
    
    /// @dev Updates the trusted signer (admin only)
    function setTrustedSigner(address newSigner) external;
    
    /// @dev Returns domain separator for EIP-712 (if applicable)
    function domainSeparator() external view returns (bytes32);
    
    /// @dev Helper to build message hash for off-chain signing
    function buildMessageHash(
        address recipient,
        uint256 amount,
        bytes32 nonce,
        uint256 expiry
    ) external view returns (bytes32);
}