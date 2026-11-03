// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import {
    MessagingParams,
    MessagingReceipt,
    MessagingFee,
    Origin
} from '@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol';
import { ILayerZeroReceiver } from '@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroReceiver.sol';

/// @dev Test-only local delivery harness. It is not LayerZero EndpointV2, a DVN, or an Executor.
contract LocalEndpointPairV2 {
    error UnknownRemoteEndpoint(uint32 eid);
    error UnknownMessage(bytes32 guid);
    error AlreadyDelivered(bytes32 guid);
    error AlreadyProcessed(bytes32 guid);
    error UnauthorizedRemote(address caller, uint32 srcEid);

    struct PendingMessage {
        bool exists;
        bool delivered;
        uint32 dstEid;
        address sender;
        bytes32 receiver;
        uint64 nonce;
        bytes message;
    }

    uint32 public immutable eid;
    uint64 public outboundNonce;
    address public delegate;

    mapping(uint32 => address) public remoteEndpoints;
    mapping(bytes32 => PendingMessage) private pendingMessages;
    mapping(bytes32 => bool) public processedMessages;

    event MessageQueued(
        bytes32 indexed guid,
        uint32 indexed srcEid,
        uint32 indexed dstEid,
        address sender,
        bytes32 receiver,
        uint64 nonce,
        bytes message
    );

    constructor(uint32 eid_) {
        eid = eid_;
    }

    function setDelegate(address delegate_) external {
        delegate = delegate_;
    }

    function setRemoteEndpoint(uint32 remoteEid, address endpoint_) external {
        remoteEndpoints[remoteEid] = endpoint_;
    }

    function quote(MessagingParams calldata, address) external pure returns (MessagingFee memory) {
        return MessagingFee(1_000, 0);
    }

    function send(MessagingParams calldata params, address) external payable returns (MessagingReceipt memory) {
        if (remoteEndpoints[params.dstEid] == address(0)) revert UnknownRemoteEndpoint(params.dstEid);

        uint64 nonce = ++outboundNonce;
        bytes32 guid = keccak256(abi.encode(eid, params.dstEid, msg.sender, params.receiver, nonce, params.message));
        pendingMessages[guid] = PendingMessage({
            exists: true,
            delivered: false,
            dstEid: params.dstEid,
            sender: msg.sender,
            receiver: params.receiver,
            nonce: nonce,
            message: params.message
        });

        emit MessageQueued(guid, eid, params.dstEid, msg.sender, params.receiver, nonce, params.message);

        return MessagingReceipt(guid, nonce, MessagingFee(msg.value, 0));
    }

    function deliver(bytes32 guid, address executor) external {
        PendingMessage storage pending = pendingMessages[guid];
        if (!pending.exists) revert UnknownMessage(guid);
        if (pending.delivered) revert AlreadyDelivered(guid);

        pending.delivered = true;
        LocalEndpointPairV2(remoteEndpoints[pending.dstEid]).receivePayload(
            eid,
            bytes32(uint256(uint160(pending.sender))),
            pending.nonce,
            guid,
            pending.receiver,
            pending.message,
            executor
        );
    }

    function receivePayload(
        uint32 srcEid,
        bytes32 sender,
        uint64 nonce,
        bytes32 guid,
        bytes32 receiver,
        bytes calldata message,
        address executor
    ) external {
        if (msg.sender != remoteEndpoints[srcEid]) revert UnauthorizedRemote(msg.sender, srcEid);
        if (processedMessages[guid]) revert AlreadyProcessed(guid);

        processedMessages[guid] = true;
        ILayerZeroReceiver(address(uint160(uint256(receiver)))).lzReceive(
            Origin(srcEid, sender, nonce),
            guid,
            message,
            executor,
            bytes('')
        );
    }

    function messageState(bytes32 guid) external view returns (bool exists, bool delivered, uint32 dstEid) {
        PendingMessage storage pending = pendingMessages[guid];
        return (pending.exists, pending.delivered, pending.dstEid);
    }
}
