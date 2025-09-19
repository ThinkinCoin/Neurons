// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Test, console} from "forge-std/Test.sol";
import {Neurons} from "../src/tokens/Neurons.sol";
import {PoKMinter} from "../src/minters/PoKMinter.sol";
import {ECDSAVerifier} from "../src/verifiers/ECDSAVerifier.sol";
import {Errors} from "../src/libs/Errors.sol";

contract NeuronsTest is Test {
    Neurons public token;
    PoKMinter public minter;
    ECDSAVerifier public verifier;
    
    address public owner;
    address public user1;
    address public user2;
    address public minterRole;
    address public verifierRole;
    
    uint256 constant INITIAL_SUPPLY = 0;
    uint256 constant MAX_SUPPLY = 10_000_000 * 1e18; // 10M tokens
    
    // Test signing keys
    uint256 internal verifierPrivateKey = 0xA11CE;
    address internal verifierAddress;
    
    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        minterRole = makeAddr("minter");
        verifierRole = makeAddr("verifier");
        
        // Setup verifier address from private key
        verifierAddress = vm.addr(verifierPrivateKey);
        
        // Deploy contracts
        token = new Neurons(owner, "Neurons", "NEURONS");
        verifier = new ECDSAVerifier(owner, verifierAddress);
        minter = new PoKMinter(owner, address(token), address(verifier));
        
        // Grant roles
        token.grantRole(token.MINTER_ROLE(), address(minter));
        token.grantRole(token.MINTER_ROLE(), minterRole);
        
        // Fund test accounts
        vm.deal(user1, 100 ether);
        vm.deal(user2, 100 ether);
    }
    
    // ============ Token Tests ============
    
    function testInitialState() public {
        assertEq(token.name(), "Neurons");
        assertEq(token.symbol(), "NEURONS");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), INITIAL_SUPPLY);
        assertEq(token.cap(), MAX_SUPPLY);
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), owner));
        assertTrue(token.hasRole(token.MINTER_ROLE(), address(minter)));
        assertTrue(token.hasRole(token.MINTER_ROLE(), minterRole));
    }
    
    function testMinting() public {
        uint256 amount = 1000 * 1e18;
        
        vm.prank(minterRole);
        token.mint(user1, amount);
        
        assertEq(token.balanceOf(user1), amount);
        assertEq(token.totalSupply(), amount);
    }
    
    function testMintingCap() public {
        vm.prank(minterRole);
        vm.expectRevert();
        token.mint(user1, MAX_SUPPLY + 1);
    }
    
    function testUnauthorizedMinting() public {
        vm.prank(user1);
        vm.expectRevert();
        token.mint(user2, 1000 * 1e18);
    }
    
    function testBurning() public {
        uint256 amount = 1000 * 1e18;
        
        // Mint first
        vm.prank(minterRole);
        token.mint(user1, amount);
        
        // Burn
        vm.prank(user1);
        token.burn(amount / 2);
        
        assertEq(token.balanceOf(user1), amount / 2);
        assertEq(token.totalSupply(), amount / 2);
    }
    
    function testBatchMinting() public {
        address[] memory recipients = new address[](3);
        uint256[] memory amounts = new uint256[](3);
        
        recipients[0] = user1;
        recipients[1] = user2;
        recipients[2] = owner;
        
        amounts[0] = 100 * 1e18;
        amounts[1] = 200 * 1e18;
        amounts[2] = 300 * 1e18;
        
        vm.prank(minterRole);
        token.batchMint(recipients, amounts);
        
        assertEq(token.balanceOf(user1), amounts[0]);
        assertEq(token.balanceOf(user2), amounts[1]);
        assertEq(token.balanceOf(owner), amounts[2]);
        assertEq(token.totalSupply(), 600 * 1e18);
    }
    
    function testPauseUnpause() public {
        uint256 amount = 1000 * 1e18;
        vm.prank(minterRole);
        token.mint(user1, amount);
        
        // Pause
        token.pause();
        assertTrue(token.paused());
        
        // Should revert on transfer when paused
        vm.prank(user1);
        vm.expectRevert();
        token.transfer(user2, 100 * 1e18);
        
        // Unpause
        token.unpause();
        assertFalse(token.paused());
        
        // Should work after unpause
        vm.prank(user1);
        token.transfer(user2, 100 * 1e18);
        assertEq(token.balanceOf(user2), 100 * 1e18);
    }
    
    // ============ Verifier Tests ============
    
    function testVerifierInitialState() public {
        assertEq(verifier.authorizedSigner(), verifierAddress);
        assertTrue(verifier.hasRole(verifier.DEFAULT_ADMIN_ROLE(), owner));
    }
    
    function testValidSignature() public {
        address recipient = user1;
        uint256 amount = 500 * 1e18;
        uint256 nonce = 1;
        uint256 timestamp = block.timestamp;
        
        bytes memory proof = _createValidProof(recipient, amount, nonce, timestamp);
        
        bool isValid = verifier.verify(recipient, amount, nonce, timestamp, proof);
        assertTrue(isValid);
    }
    
    function testInvalidSignature() public {
        address recipient = user1;
        uint256 amount = 500 * 1e18;
        uint256 nonce = 1;
        uint256 timestamp = block.timestamp;
        
        // Create invalid proof with wrong private key
        uint256 wrongKey = 0xBAD;
        bytes memory invalidProof = _createProofWithKey(recipient, amount, nonce, timestamp, wrongKey);
        
        bool isValid = verifier.verify(recipient, amount, nonce, timestamp, invalidProof);
        assertFalse(isValid);
    }
    
    function testSignerUpdate() public {
        address newSigner = makeAddr("newSigner");
        
        verifier.setAuthorizedSigner(newSigner);
        assertEq(verifier.authorizedSigner(), newSigner);
    }
    
    // ============ PoK Minter Tests ============
    
    function testMinterInitialState() public {
        assertEq(address(minter.token()), address(token));
        assertEq(address(minter.verifier()), address(verifier));
        assertEq(minter.cooldownPeriod(), 1 hours);
        assertEq(minter.dailyLimit(), 1000 * 1e18);
        assertEq(minter.maxSingleMint(), 100 * 1e18);
        assertTrue(minter.hasRole(minter.DEFAULT_ADMIN_ROLE(), owner));
    }
    
    function testSuccessfulPoKMint() public {
        address recipient = user1;
        uint256 amount = 50 * 1e18;
        uint256 nonce = 1;
        uint256 timestamp = block.timestamp;
        
        bytes memory proof = _createValidProof(recipient, amount, nonce, timestamp);
        
        vm.prank(recipient);
        minter.mintWithProof(amount, nonce, timestamp, proof);
        
        assertEq(token.balanceOf(recipient), amount);
        assertEq(minter.nextNonce(recipient), nonce + 1);
        assertEq(minter.lastMintTime(recipient), block.timestamp);
        assertEq(minter.dailyMinted(recipient, _getCurrentDay()), amount);
    }
    
    function testInvalidProofMint() public {
        address recipient = user1;
        uint256 amount = 50 * 1e18;
        uint256 nonce = 1;
        uint256 timestamp = block.timestamp;
        
        bytes memory invalidProof = "invalid";
        
        vm.prank(recipient);
        vm.expectRevert(Errors.InvalidProof.selector);
        minter.mintWithProof(amount, nonce, timestamp, invalidProof);
    }
    
    function testCooldownPeriod() public {
        address recipient = user1;
        uint256 amount = 50 * 1e18;
        uint256 nonce = 1;
        uint256 timestamp = block.timestamp;
        
        bytes memory proof1 = _createValidProof(recipient, amount, nonce, timestamp);
        bytes memory proof2 = _createValidProof(recipient, amount, nonce + 1, timestamp);
        
        // First mint should succeed
        vm.prank(recipient);
        minter.mintWithProof(amount, nonce, timestamp, proof1);
        
        // Second mint should fail due to cooldown
        vm.prank(recipient);
        vm.expectRevert(Errors.CooldownNotExpired.selector);
        minter.mintWithProof(amount, nonce + 1, timestamp, proof2);
        
        // Skip time and try again
        vm.warp(block.timestamp + 1 hours + 1);
        timestamp = block.timestamp;
        proof2 = _createValidProof(recipient, amount, nonce + 1, timestamp);
        
        vm.prank(recipient);
        minter.mintWithProof(amount, nonce + 1, timestamp, proof2);
        
        assertEq(token.balanceOf(recipient), amount * 2);
    }
    
    function testDailyLimit() public {
        address recipient = user1;
        uint256 amount = 600 * 1e18; // Above daily limit
        uint256 nonce = 1;
        uint256 timestamp = block.timestamp;
        
        bytes memory proof = _createValidProof(recipient, amount, nonce, timestamp);
        
        vm.prank(recipient);
        vm.expectRevert(Errors.DailyLimitExceeded.selector);
        minter.mintWithProof(amount, nonce, timestamp, proof);
    }
    
    function testMaxSingleMint() public {
        address recipient = user1;
        uint256 amount = 150 * 1e18; // Above single mint limit
        uint256 nonce = 1;
        uint256 timestamp = block.timestamp;
        
        bytes memory proof = _createValidProof(recipient, amount, nonce, timestamp);
        
        vm.prank(recipient);
        vm.expectRevert(Errors.ExceedsMaxSingleMint.selector);
        minter.mintWithProof(amount, nonce, timestamp, proof);
    }
    
    function testBatchMintWithProofs() public {
        address[] memory recipients = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        uint256[] memory nonces = new uint256[](2);
        uint256[] memory timestamps = new uint256[](2);
        bytes[] memory proofs = new bytes[](2);
        
        recipients[0] = user1;
        recipients[1] = user2;
        amounts[0] = 50 * 1e18;
        amounts[1] = 75 * 1e18;
        nonces[0] = 1;
        nonces[1] = 1;
        timestamps[0] = block.timestamp;
        timestamps[1] = block.timestamp;
        
        proofs[0] = _createValidProof(recipients[0], amounts[0], nonces[0], timestamps[0]);
        proofs[1] = _createValidProof(recipients[1], amounts[1], nonces[1], timestamps[1]);
        
        minter.batchMintWithProofs(recipients, amounts, nonces, timestamps, proofs);
        
        assertEq(token.balanceOf(user1), amounts[0]);
        assertEq(token.balanceOf(user2), amounts[1]);
    }
    
    function testNonceReuse() public {
        address recipient = user1;
        uint256 amount = 50 * 1e18;
        uint256 nonce = 1;
        uint256 timestamp = block.timestamp;
        
        bytes memory proof = _createValidProof(recipient, amount, nonce, timestamp);
        
        // First mint should succeed
        vm.prank(recipient);
        minter.mintWithProof(amount, nonce, timestamp, proof);
        
        // Skip cooldown
        vm.warp(block.timestamp + 1 hours + 1);
        timestamp = block.timestamp;
        proof = _createValidProof(recipient, amount, nonce, timestamp); // Same nonce
        
        // Second mint with same nonce should fail
        vm.prank(recipient);
        vm.expectRevert(Errors.InvalidNonce.selector);
        minter.mintWithProof(amount, nonce, timestamp, proof);
    }
    
    function testConfigurationUpdates() public {
        // Test cooldown update
        minter.setCooldownPeriod(2 hours);
        assertEq(minter.cooldownPeriod(), 2 hours);
        
        // Test daily limit update
        minter.setDailyLimit(2000 * 1e18);
        assertEq(minter.dailyLimit(), 2000 * 1e18);
        
        // Test max single mint update
        minter.setMaxSingleMint(200 * 1e18);
        assertEq(minter.maxSingleMint(), 200 * 1e18);
    }
    
    function testUnauthorizedConfigurationUpdates() public {
        vm.prank(user1);
        vm.expectRevert();
        minter.setCooldownPeriod(2 hours);
        
        vm.prank(user1);
        vm.expectRevert();
        minter.setDailyLimit(2000 * 1e18);
        
        vm.prank(user1);
        vm.expectRevert();
        minter.setMaxSingleMint(200 * 1e18);
    }
    
    function testPauseMinter() public {
        address recipient = user1;
        uint256 amount = 50 * 1e18;
        uint256 nonce = 1;
        uint256 timestamp = block.timestamp;
        
        bytes memory proof = _createValidProof(recipient, amount, nonce, timestamp);
        
        // Pause minter
        minter.pause();
        
        vm.prank(recipient);
        vm.expectRevert();
        minter.mintWithProof(amount, nonce, timestamp, proof);
        
        // Unpause and try again
        minter.unpause();
        
        vm.prank(recipient);
        minter.mintWithProof(amount, nonce, timestamp, proof);
        
        assertEq(token.balanceOf(recipient), amount);
    }
    
    // ============ Helper Functions ============
    
    function _createValidProof(
        address recipient,
        uint256 amount,
        uint256 nonce,
        uint256 timestamp
    ) internal view returns (bytes memory) {
        return _createProofWithKey(recipient, amount, nonce, timestamp, verifierPrivateKey);
    }
    
    function _createProofWithKey(
        address recipient,
        uint256 amount,
        uint256 nonce,
        uint256 timestamp,
        uint256 privateKey
    ) internal view returns (bytes memory) {
        bytes32 messageHash = verifier.buildMessageHash(recipient, amount, nonce, timestamp);
        bytes32 ethSignedMessageHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
        
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, ethSignedMessageHash);
        return abi.encodePacked(r, s, v);
    }
    
    function _getCurrentDay() internal view returns (uint256) {
        return block.timestamp / 1 days;
    }
}