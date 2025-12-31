// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IVerifier} from "../interfaces/IVerifier.sol";

contract MockVerifier is IVerifier {
    enum Mode {
        ReturnTrue,
        ReturnFalse,
        Revert
    }

    Mode public mode;
    address public override trustedSigner;

    error MockReverted();

    constructor(Mode mode_, address trustedSigner_) {
        mode = mode_;
        trustedSigner = trustedSigner_;
    }

    function setMode(Mode mode_) external {
        mode = mode_;
    }

    function verify(
        address,
        uint256,
        bytes calldata,
        bytes32
    ) external view override returns (bool ok) {
        if (mode == Mode.Revert) revert MockReverted();
        if (mode == Mode.ReturnFalse) return false;
        return true;
    }

    function setTrustedSigner(address newSigner) external override {
        trustedSigner = newSigner;
    }

    function domainSeparator() external pure override returns (bytes32) {
        return bytes32(0);
    }

    function buildMessageHash(
        address,
        uint256,
        bytes32,
        uint256
    ) external pure override returns (bytes32) {
        return bytes32(0);
    }
}
