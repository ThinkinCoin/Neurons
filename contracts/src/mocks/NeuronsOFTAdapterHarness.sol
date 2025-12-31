// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {NeuronsOFTAdapter} from "../bridge/NeuronsOFTAdapter.sol";

/// @dev Test harness to expose internal receive hook.
contract NeuronsOFTAdapterHarness is NeuronsOFTAdapter {
    constructor(address owner_, address token_) NeuronsOFTAdapter(owner_, token_) {}

    function receiveTokens(uint16 srcChainId, address to, uint256 amount) external {
        _receiveTokens(srcChainId, to, amount);
    }
}
