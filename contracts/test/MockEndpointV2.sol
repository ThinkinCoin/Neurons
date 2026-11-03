// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {
    MessagingParams,
    MessagingReceipt,
    MessagingFee
} from '@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol';

/// @dev Test-only endpoint stub. It is not LayerZero EndpointV2 or a production transport service.
contract MockEndpointV2 {
    uint32 public immutable eid;
    address public delegate;

    constructor(uint32 eid_) {
        eid = eid_;
    }

    function setDelegate(address delegate_) external {
        delegate = delegate_;
    }

    function quote(MessagingParams calldata, address) external pure returns (MessagingFee memory) {
        return MessagingFee(1_000, 0);
    }

    function send(MessagingParams calldata, address) external payable returns (MessagingReceipt memory) {
        return MessagingReceipt(bytes32(uint256(1)), 1, MessagingFee(msg.value, 0));
    }
}
