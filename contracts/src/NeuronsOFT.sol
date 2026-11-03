// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import { OFT } from '@layerzerolabs/oft-evm/contracts/OFT.sol';
import { ERC20 } from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import { ERC20Permit } from '@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol';
import { ERC20Votes } from '@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol';
import { Ownable } from '@openzeppelin/contracts/access/Ownable.sol';
import { Ownable2Step } from '@openzeppelin/contracts/access/Ownable2Step.sol';
import { SafeCast } from '@openzeppelin/contracts/utils/math/SafeCast.sol';

/// @title NeuronsOFT
/// @notice Greenfield Native OFT foundation for NEURONS.
/// @dev This abstract core deliberately excludes issuance, escrow, census, election,
///      pause, proxy, and role-management features. A deployable implementation must
///      freeze its shared decimal policy before construction.
abstract contract NeuronsOFT is OFT, ERC20Permit, ERC20Votes, Ownable2Step {
    /// @notice Raised before quoting or debiting an amount that cannot be represented in shared units.
    error UnrepresentableAmount(uint256 amountLD, uint256 decimalConversionRate);

    constructor(
        string memory name_,
        string memory symbol_,
        address endpoint_,
        address delegate_
    ) OFT(name_, symbol_, endpoint_, delegate_) ERC20Permit(name_) {}

    /// @notice Returns the timestamp-based EIP-6372 clock for per-chain historical voting evidence.
    function clock() public view virtual override returns (uint48) {
        return SafeCast.toUint48(block.timestamp);
    }

    /// @notice Describes the timestamp clock exposed by `clock`.
    function CLOCK_MODE() public view virtual override returns (string memory) {
        return 'mode=timestamp';
    }

    /// @notice Begins a two-step transfer of the transport configuration authority.
    /// @dev The nominated successor must call `acceptOwnership` before it can alter peers or delegates.
    function transferOwnership(address newOwner) public virtual override(Ownable, Ownable2Step) onlyOwner {
        super.transferOwnership(newOwner);
    }

    /// @dev Clears a pending owner when an ownership transfer is accepted.
    function _transferOwnership(address newOwner) internal virtual override(Ownable, Ownable2Step) {
        super._transferOwnership(newOwner);
    }

    /// @dev Resolves the ERC20/OFT and ERC20Votes transfer hook conflict.
    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    /// @dev Resolves the ERC20/OFT and ERC20Votes mint hook conflict.
    function _mint(address to, uint256 amount) internal virtual override(ERC20, ERC20Votes) {
        super._mint(to, amount);
    }

    /// @dev Resolves the ERC20/OFT and ERC20Votes burn hook conflict.
    function _burn(address account, uint256 amount) internal virtual override(ERC20, ERC20Votes) {
        super._burn(account, amount);
    }

    /// @dev Enforces ADR-05 strict precision before the official OFT dust-removal path.
    ///      OFT quote and send paths share this view, so invalid requests cannot be quoted,
    ///      debited, or enqueued as rounded transport messages.
    function _debitView(
        uint256 amountLD,
        uint256 minAmountLD,
        uint32 dstEid
    ) internal view virtual override returns (uint256 amountSentLD, uint256 amountReceivedLD) {
        if (amountLD % decimalConversionRate != 0) {
            revert UnrepresentableAmount(amountLD, decimalConversionRate);
        }

        return super._debitView(amountLD, minAmountLD, dstEid);
    }
}
