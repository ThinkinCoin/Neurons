// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Neurons} from "../tokens/Neurons.sol";
import {IVerifier} from "../interfaces/IVerifier.sol";
import {Errors} from "../libs/Errors.sol";

/// @title PoK Minter
/// @notice Mints Neurons upon successful Proof-of-Knowledge / AI workload verification.
contract PoKMinter is Ownable, Pausable, ReentrancyGuard {
    Neurons public token;
    IVerifier public verifier;

    // Prevent proof replay; scope by nonce
    mapping(bytes32 => bool) public nonceUsed;
    
    // Rate limiting per user
    mapping(address => uint256) public lastMintTime;
    mapping(address => uint256) public dailyMintAmount;
    mapping(address => uint256) public lastMintDay;
    
    // Limits
    uint256 public minCooldown = 1 hours; // Minimum time between mints
    uint256 public maxDailyMint = 1000 ether; // Max tokens per day per user
    uint256 public maxSingleMint = 100 ether; // Max tokens per single mint

    // Analytics
    uint256 public totalMintsProcessed;
    uint256 public totalTokensMinted;

    event TokenSet(address indexed token);
    event VerifierSet(address indexed verifier);
    event MintedWithProof(address indexed to, uint256 amount, bytes32 indexed nonce);
    event LimitsUpdated(uint256 minCooldown, uint256 maxDailyMint, uint256 maxSingleMint);

    constructor(address owner_) Ownable(owner_) {
        if (owner_ == address(0)) revert Errors.ZeroAddress();
    }

    // -------- Admin --------
    function setToken(address token_) external onlyOwner {
        if (token_ == address(0)) revert Errors.ZeroAddress();
        token = Neurons(token_);
        emit TokenSet(token_);
    }

    function setVerifier(address verifier_) external onlyOwner {
        if (verifier_ == address(0)) revert Errors.ZeroAddress();
        verifier = IVerifier(verifier_);
        emit VerifierSet(verifier_);
    }

    function setLimits(
        uint256 minCooldown_,
        uint256 maxDailyMint_,
        uint256 maxSingleMint_
    ) external onlyOwner {
        minCooldown = minCooldown_;
        maxDailyMint = maxDailyMint_;
        maxSingleMint = maxSingleMint_;
        emit LimitsUpdated(minCooldown_, maxDailyMint_, maxSingleMint_);
    }

    function pause() external onlyOwner { 
        _pause(); 
    }
    
    function unpause() external onlyOwner { 
        _unpause(); 
    }

    // -------- Emergency Functions --------
    function emergencySetNonceUsed(bytes32 nonce, bool used) external onlyOwner {
        nonceUsed[nonce] = used;
    }

    // -------- Mint Flow --------
    /// @dev Caller is expected to be a backend/orchestrator or public entry
    function mintWithProof(
        address to,
        uint256 amount,
        bytes calldata proof,
        bytes32 nonce
    ) external whenNotPaused nonReentrant {
        if (address(token) == address(0)) revert Errors.ZeroAddress();
        if (address(verifier) == address(0)) revert Errors.VerifierNotSet();
        if (to == address(0)) revert Errors.ZeroAddress();
        if (amount == 0) revert Errors.InvalidAmount();
        if (amount > maxSingleMint) revert Errors.SingleMintLimitExceeded();
        if (nonceUsed[nonce]) revert Errors.AlreadyUsed();

        // Rate limiting checks
        if (block.timestamp < lastMintTime[to] + minCooldown) {
            revert Errors.CooldownNotMet();
        }

        // Daily limit check
        uint256 currentDay = block.timestamp / 1 days;
        if (lastMintDay[to] != currentDay) {
            // Reset daily counter
            dailyMintAmount[to] = 0;
            lastMintDay[to] = currentDay;
        }
        
        if (dailyMintAmount[to] + amount > maxDailyMint) {
            revert Errors.DailyLimitExceeded();
        }

        // 1) Validate proof (MUST REVERT on invalid)
        bool ok = verifier.verify(to, amount, proof, nonce);
        if (!ok) revert Errors.InvalidProof();

        // 2) Mark nonce (anti-replay)
        nonceUsed[nonce] = true;

        // 3) Update rate limiting
        lastMintTime[to] = block.timestamp;
        dailyMintAmount[to] += amount;

        // 4) Mint via role-gated token (PoKMinter MUST have MINTER_ROLE)
        token.mint(to, amount);

        // 5) Update analytics
        totalMintsProcessed++;
        totalTokensMinted += amount;

        emit MintedWithProof(to, amount, nonce);
    }

    /// @dev Batch mint with multiple proofs (for efficiency)
    function batchMintWithProofs(
        address[] calldata recipients,
        uint256[] calldata amounts,
        bytes[] calldata proofs,
        bytes32[] calldata nonces
    ) external whenNotPaused nonReentrant {
        if (recipients.length != amounts.length || 
            amounts.length != proofs.length || 
            proofs.length != nonces.length) {
            revert Errors.ArrayLengthMismatch();
        }

        if (address(token) == address(0)) revert Errors.ZeroAddress();
        if (address(verifier) == address(0)) revert Errors.VerifierNotSet();

        uint256 currentDay = block.timestamp / 1 days;

        for (uint256 i = 0; i < recipients.length; i++) {
            address to = recipients[i];
            uint256 amount = amounts[i];
            bytes calldata proof = proofs[i];
            bytes32 nonce = nonces[i];

            if (to == address(0)) continue; // Skip invalid addresses
            if (amount == 0 || amount > maxSingleMint) continue; // Skip invalid amounts
            if (nonceUsed[nonce]) continue; // Skip used nonces

            // Rate limiting
            if (block.timestamp < lastMintTime[to] + minCooldown) continue; // Skip if too soon

            // Daily limit check
            if (lastMintDay[to] != currentDay) {
                dailyMintAmount[to] = 0;
                lastMintDay[to] = currentDay;
            }
            
            if (dailyMintAmount[to] + amount > maxDailyMint) continue; // Skip if exceeds daily limit

            // Verify proof
            try verifier.verify(to, amount, proof, nonce) returns (bool ok) {
                if (!ok) continue; // Skip invalid proofs
            } catch {
                continue; // Skip if verification fails
            }

            // Mark nonce and update limits
            nonceUsed[nonce] = true;
            lastMintTime[to] = block.timestamp;
            dailyMintAmount[to] += amount;

            // Mint
            token.mint(to, amount);

            // Update analytics
            totalMintsProcessed++;
            totalTokensMinted += amount;

            emit MintedWithProof(to, amount, nonce);
        }
    }

    // -------- View Functions --------
    function canMint(address user, uint256 amount) external view returns (bool) {
        if (paused()) return false;
        if (amount == 0 || amount > maxSingleMint) return false;
        if (block.timestamp < lastMintTime[user] + minCooldown) return false;

        uint256 currentDay = block.timestamp / 1 days;
        uint256 dailyAmount = lastMintDay[user] == currentDay ? dailyMintAmount[user] : 0;
        
        return dailyAmount + amount <= maxDailyMint;
    }

    function getRemainingDailyLimit(address user) external view returns (uint256) {
        uint256 currentDay = block.timestamp / 1 days;
        uint256 dailyAmount = lastMintDay[user] == currentDay ? dailyMintAmount[user] : 0;
        
        return dailyAmount >= maxDailyMint ? 0 : maxDailyMint - dailyAmount;
    }

    function getNextMintTime(address user) external view returns (uint256) {
        return lastMintTime[user] + minCooldown;
    }

    function getMintingStats() external view returns (
        uint256 totalMints,
        uint256 totalMinted,
        uint256 averageMintSize
    ) {
        totalMints = totalMintsProcessed;
        totalMinted = totalTokensMinted;
        averageMintSize = totalMints > 0 ? totalMinted / totalMints : 0;
    }
}