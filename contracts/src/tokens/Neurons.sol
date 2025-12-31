// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ERC20Pausable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import {Errors} from "../libs/Errors.sol";

/// @title Neurons ERC20 (capped, permit, role-gated mint)
/// @notice Core token; mint is restricted to authorized minters (e.g., PoKMinter).
contract Neurons is ERC20, ERC20Capped, ERC20Permit, ERC20Votes, ERC20Pausable, Ownable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    uint256 public constant MAX_SUPPLY = 10_000_000 ether; // 10M with 18 decimals

    // Track total minted and burned for analytics
    uint256 public totalMinted;
    uint256 public totalBurned;

    event MinterUpdated(address indexed minter, bool allowed);
    event BurnerUpdated(address indexed burner, bool allowed);
    event TokensMinted(address indexed to, uint256 amount, address indexed minter);
    event TokensBurned(address indexed from, uint256 amount, address indexed burner);

    constructor(address owner_)
        ERC20("Neurons", "Neurons")
        ERC20Capped(MAX_SUPPLY)
        ERC20Permit("Neurons")
        Ownable(owner_)
    {
        if (owner_ == address(0)) revert Errors.ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, owner_);
    }

    // -------- Admin --------
    function setMinter(address minter, bool allowed) external onlyOwner {
        if (minter == address(0)) revert Errors.ZeroAddress();
        if (allowed) {
            _grantRole(MINTER_ROLE, minter);
        } else {
            _revokeRole(MINTER_ROLE, minter);
        }
        emit MinterUpdated(minter, allowed);
    }

    function setBurner(address burner, bool allowed) external onlyOwner {
        if (burner == address(0)) revert Errors.ZeroAddress();
        if (allowed) {
            _grantRole(BURNER_ROLE, burner);
        } else {
            _revokeRole(BURNER_ROLE, burner);
        }
        emit BurnerUpdated(burner, allowed);
    }

    function pause() external onlyOwner { 
        _pause(); 
    }
    
    function unpause() external onlyOwner { 
        _unpause(); 
    }

    // -------- Mint/Burn --------
    /// @dev only authorized minters can call (e.g., PoKMinter)
    function mint(address to, uint256 amount) external whenNotPaused onlyRole(MINTER_ROLE) {
        if (to == address(0)) revert Errors.ZeroAddress();
        if (amount == 0) revert Errors.InvalidAmount();
        
        totalMinted += amount;
        _mint(to, amount); // ERC20Capped enforces the cap via _mint override
        
        emit TokensMinted(to, amount, msg.sender);
    }

    /// @dev Batch mint for efficiency
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) 
        external 
        whenNotPaused 
        onlyRole(MINTER_ROLE) 
    {
        if (recipients.length != amounts.length) revert Errors.ArrayLengthMismatch();
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            if (recipients[i] == address(0)) revert Errors.ZeroAddress();
            if (amounts[i] == 0) revert Errors.InvalidAmount();
            totalAmount += amounts[i];
        }
        
        // Check cap once for efficiency
        if (totalSupply() + totalAmount > cap()) revert Errors.CapExceeded();
        
        totalMinted += totalAmount;
        
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
            emit TokensMinted(recipients[i], amounts[i], msg.sender);
        }
    }

    function burn(uint256 amount) external whenNotPaused {
        if (amount == 0) revert Errors.InvalidAmount();
        
        totalBurned += amount;
        _burn(msg.sender, amount);
        
        emit TokensBurned(msg.sender, amount, msg.sender);
    }

    function burnFrom(address account, uint256 amount) external whenNotPaused onlyRole(BURNER_ROLE) {
        if (account == address(0)) revert Errors.ZeroAddress();
        if (amount == 0) revert Errors.InvalidAmount();
        
        totalBurned += amount;
        _burn(account, amount);
        
        emit TokensBurned(account, amount, msg.sender);
    }

    // -------- View Functions --------
    function remainingSupply() external view returns (uint256) {
        return cap() - totalSupply();
    }

    function isMinter(address account) external view returns (bool) {
        return hasRole(MINTER_ROLE, account);
    }

    function isBurner(address account) external view returns (bool) {
        return hasRole(BURNER_ROLE, account);
    }

    // -------- Internal Overrides --------
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable, ERC20Capped, ERC20Votes)
    {
        super._update(from, to, value);

        // Auto self-delegation to make 1 token = 1 vote by default,
        // while still allowing explicit delegation to third parties.
        if (to != address(0) && delegates(to) == address(0)) {
            _delegate(to, to);
        }
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}