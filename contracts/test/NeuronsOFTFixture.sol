// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import { NeuronsOFT } from '../src/NeuronsOFT.sol';

/// @dev Test-only deployable implementation with a fixed, synthetic six-decimal shared unit.
///      It exists solely to test the abstract foundation before a production precision decision.
contract NeuronsOFTFixture is NeuronsOFT {
    uint8 private constant TEST_SHARED_DECIMALS = 6;

    error ZeroGenesisRecipient();

    constructor(
        address endpoint_,
        address delegate_,
        address genesisRecipient_,
        uint256 genesisSupply_
    ) NeuronsOFT('NEURONS', 'NEURONS', endpoint_, delegate_) {
        if (genesisSupply_ != 0 && genesisRecipient_ == address(0)) {
            revert ZeroGenesisRecipient();
        }

        if (genesisSupply_ != 0) {
            _mint(genesisRecipient_, genesisSupply_);
        }
    }

    function sharedDecimals() public pure override returns (uint8) {
        return TEST_SHARED_DECIMALS;
    }
}
