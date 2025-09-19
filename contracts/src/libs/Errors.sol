// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

library Errors {
    // Generic
    error ZeroAddress();
    error NotAuthorized();
    error InvalidAmount();
    error CapExceeded();
    error AlreadyUsed();
    error InvalidProof();

    // Roles
    error OnlyMinter();
    error OnlyOwner();

    // Bridge / OFT
    error EndpointNotSet();
    error BridgeNotAllowed();

    // PoK
    error VerifierNotSet();
    
    // Additional errors for robustness
    error InvalidSignature();
    error ProofExpired();
    error ChainIdMismatch();
    error InsufficientBalance();
    error ContractPaused();
    error ArrayLengthMismatch();
    error CooldownNotMet();
    error DailyLimitExceeded();
    error SingleMintLimitExceeded();
}