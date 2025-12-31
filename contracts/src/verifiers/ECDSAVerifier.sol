// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";
import {Errors} from "../libs/Errors.sol";

/// @title ECDSA Verifier for PoK
/// @notice Verifies ECDSA signatures for Proof-of-Knowledge mint authorization
contract ECDSAVerifier is IVerifier, Ownable, EIP712 {
    using ECDSA for bytes32;

    address public trustedSigner;
    
    // Typehash for EIP-712
    bytes32 public constant MINT_TYPEHASH = keccak256(
        "MintProof(address recipient,uint256 amount,bytes32 nonce,uint256 expiry)"
    );

    event TrustedSignerUpdated(address indexed oldSigner, address indexed newSigner);

    constructor(address owner_, address trustedSigner_) 
        EIP712("NeuronsPoK", "1")
    {
        if (owner_ == address(0) || trustedSigner_ == address(0)) {
            revert Errors.ZeroAddress();
        }

        _transferOwnership(owner_);
        
        trustedSigner = trustedSigner_;
    }

    /// @dev Updates the trusted signer (admin only)
    function setTrustedSigner(address newSigner) external override onlyOwner {
        if (newSigner == address(0)) revert Errors.ZeroAddress();
        
        address oldSigner = trustedSigner;
        trustedSigner = newSigner;
        
        emit TrustedSignerUpdated(oldSigner, newSigner);
    }

    /// @dev Returns domain separator for EIP-712
    function domainSeparator() external view override returns (bytes32) {
        return _domainSeparatorV4();
    }

    /// @dev Verifies ECDSA signature for mint authorization
    /// @param recipient beneficiary of mint
    /// @param amount tokens to mint (18 decimals)
    /// @param proof abi-encoded (signature, expiry)
    /// @param nonce unique nonce to avoid replay
    /// @return ok true if valid
    function verify(
        address recipient,
        uint256 amount,
        bytes calldata proof,
        bytes32 nonce
    ) external view override returns (bool ok) {
        // Decode proof
        (bytes memory signature, uint256 expiry) = abi.decode(proof, (bytes, uint256));
        
        // Check expiry
        if (block.timestamp > expiry) revert Errors.ProofExpired();
        
        // Build message hash
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_TYPEHASH,
                recipient,
                amount,
                nonce,
                expiry
            )
        );
        
        bytes32 messageHash = _hashTypedDataV4(structHash);
        
        // Recover signer
        address signer = messageHash.recover(signature);
        
        // Verify signer
        if (signer != trustedSigner) revert Errors.InvalidSignature();
        
        return true;
    }

    /// @dev Helper to build message hash for off-chain signing
    function buildMessageHash(
        address recipient,
        uint256 amount,
        bytes32 nonce,
        uint256 expiry
    ) external view override returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                MINT_TYPEHASH,
                recipient,
                amount,
                nonce,
                expiry
            )
        );
        
        return _hashTypedDataV4(structHash);
    }
}