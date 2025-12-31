// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";
import {Errors} from "../libs/Errors.sol";

/// @title Neurons Proxy Token (remote chains)
/// @notice Mint/burn representation of the canonical Neurons (minted on Harmony).
/// @dev Supply is controlled by a trusted bridge adapter (LayerZero bridge v2 integration).
///      Global cap is enforced by the canonical token on Harmony + lock accounting.
contract NeuronsProxy is ERC20, ERC20Permit, ERC20Votes, Ownable {
    address public bridge;

    event BridgeUpdated(address indexed oldBridge, address indexed newBridge);

    modifier onlyBridge() {
        if (msg.sender != bridge) revert Errors.NotAuthorized();
        _;
    }

    constructor(address owner_, address bridge_)
        ERC20("Neurons", "Neurons")
        ERC20Permit("Neurons")
        Ownable(owner_)
    {
        if (owner_ == address(0) || bridge_ == address(0)) revert Errors.ZeroAddress();
        bridge = bridge_;
        emit BridgeUpdated(address(0), bridge_);
    }

    function setBridge(address bridge_) external onlyOwner {
        if (bridge_ == address(0)) revert Errors.ZeroAddress();
        address oldBridge = bridge;
        bridge = bridge_;
        emit BridgeUpdated(oldBridge, bridge_);
    }

    /// @notice Mint proxy tokens on destination chain.
    /// @dev Callable only by the configured bridge.
    function bridgeMint(address to, uint256 amount) external onlyBridge {
        if (to == address(0)) revert Errors.ZeroAddress();
        if (amount == 0) revert Errors.InvalidAmount();
        _mint(to, amount);
    }

    /// @notice Burn proxy tokens on source chain.
    /// @dev Callable only by the configured bridge.
    function bridgeBurn(address from, uint256 amount) external onlyBridge {
        if (from == address(0)) revert Errors.ZeroAddress();
        if (amount == 0) revert Errors.InvalidAmount();
        _burn(from, amount);
    }

    // -------- Internal Overrides (OZ5 Votes) --------
    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Votes)
    {
        super._update(from, to, value);

        // Same UX as canonical: default to 1 token = 1 vote,
        // while allowing explicit delegation to third parties.
        if (to != address(0) && delegates(to) == address(0)) {
            _delegate(to, to);
        }
    }

    function nonces(address owner)
        public
        view
        override(ERC20Permit, Nonces)
        returns (uint256)
    {
        return super.nonces(owner);
    }
}
