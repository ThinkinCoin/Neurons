// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {Neurons} from "../src/tokens/Neurons.sol";
import {Errors} from "../src/libs/Errors.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract NeuronsTest is Test {
    Neurons internal token;

    address internal owner;
    address internal alice;
    address internal bob;
    address internal minter;
    address internal burner;

    uint256 internal constant MAX_SUPPLY = 10_000_000 ether;

    // Keys for permit signing
    uint256 internal alicePk = 0xA11CE;
    address internal aliceFromPk;

    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)")
    bytes32 internal constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;

    function setUp() public {
        owner = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");
        minter = makeAddr("minter");
        burner = makeAddr("burner");

        aliceFromPk = vm.addr(alicePk);

        token = new Neurons(owner);

        // sanity
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), owner));
    }

    // ============ Basics ============
    function test_initialState() public {
        assertEq(token.name(), "Neurons");
        assertEq(token.symbol(), "Neurons");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 0);
        assertEq(token.cap(), MAX_SUPPLY);
        assertEq(token.remainingSupply(), MAX_SUPPLY);
        assertTrue(token.hasRole(token.DEFAULT_ADMIN_ROLE(), owner));
    }

    function test_supportsInterface() public {
        // AccessControl/IERC165 should be supported
        assertTrue(token.supportsInterface(type(IAccessControl).interfaceId));
        // Random interface should be false
        assertFalse(token.supportsInterface(bytes4(0xFFFFFFFF)));
    }

    // ============ Roles (owner-only) ============
    function test_setMinterAndRevoke() public {
        // grant
        vm.expectEmit(true, true, true, true);
        emit MinterUpdated(minter, true);
        token.setMinter(minter, true);
        assertTrue(token.isMinter(minter));

        // revoke
        vm.expectEmit(true, true, true, true);
        emit MinterUpdated(minter, false);
        token.setMinter(minter, false);
        assertFalse(token.isMinter(minter));
    }

    function test_setBurnerAndRevoke() public {
        vm.expectEmit(true, true, true, true);
        emit BurnerUpdated(burner, true);
        token.setBurner(burner, true);
        assertTrue(token.isBurner(burner));

        vm.expectEmit(true, true, true, true);
        emit BurnerUpdated(burner, false);
        token.setBurner(burner, false);
        assertFalse(token.isBurner(burner));
    }

    function test_onlyOwnerCanSetRoles() public {
        address attacker = makeAddr("attacker");
        vm.prank(attacker);
        vm.expectRevert(); // Ownable Unauthorized
        token.setMinter(minter, true);
    }

    // ============ Mint ============
    function test_mint_byMinter() public {
        token.setMinter(minter, true);
        vm.prank(minter);
        vm.expectEmit(true, true, true, true);
        emit TokensMinted(alice, 1_000 ether, minter);
        token.mint(alice, 1_000 ether);
        assertEq(token.balanceOf(alice), 1_000 ether);
        assertEq(token.totalSupply(), 1_000 ether);
        assertEq(token.remainingSupply(), MAX_SUPPLY - 1_000 ether);
    }

    function test_mint_revertsForNonMinter() public {
        vm.prank(alice);
        vm.expectRevert();
        token.mint(bob, 1 ether);
    }

    function test_mint_revertsOnZeroAddress() public {
        token.setMinter(minter, true);
        vm.prank(minter);
        vm.expectRevert(Errors.ZeroAddress.selector);
        token.mint(address(0), 1 ether);
    }

    function test_mint_revertsOnZeroAmount() public {
        token.setMinter(minter, true);
        vm.prank(minter);
        vm.expectRevert(Errors.InvalidAmount.selector);
        token.mint(alice, 0);
    }

    function test_mint_capExceeded() public {
        token.setMinter(minter, true);
        vm.prank(minter);
        token.mint(alice, MAX_SUPPLY);
        assertEq(token.totalSupply(), MAX_SUPPLY);
        // Next mint must revert due to cap (OZ ERC20Capped revert)
        vm.prank(minter);
        vm.expectRevert();
        token.mint(alice, 1);
    }

    // ============ Batch Mint ============
    function test_batchMint_happyPath() public {
        token.setMinter(minter, true);

        address[] memory recipients = new address[](3);
        uint256[] memory amounts = new uint256[](3);
        recipients[0] = alice;
        recipients[1] = bob;
        recipients[2] = owner;
        amounts[0] = 100 ether;
        amounts[1] = 200 ether;
        amounts[2] = 300 ether;

        vm.prank(minter);
        token.batchMint(recipients, amounts);
        assertEq(token.balanceOf(alice), 100 ether);
        assertEq(token.balanceOf(bob), 200 ether);
        assertEq(token.balanceOf(owner), 300 ether);
        assertEq(token.totalSupply(), 600 ether);
    }

    function test_batchMint_revertsOnLengthMismatch() public {
        token.setMinter(minter, true);
        address[] memory recipients = new address[](1);
        uint256[] memory amounts = new uint256[](2);
        recipients[0] = alice;
        amounts[0] = 1; amounts[1] = 2;
        vm.prank(minter);
        vm.expectRevert(Errors.ArrayLengthMismatch.selector);
        token.batchMint(recipients, amounts);
    }

    function test_batchMint_revertsOnZeroAddressOrAmount() public {
        token.setMinter(minter, true);
        address[] memory recipients = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        recipients[0] = address(0);
        recipients[1] = alice;
        amounts[0] = 10;
        amounts[1] = 0;
        vm.prank(minter);
        vm.expectRevert(Errors.ZeroAddress.selector);
        token.batchMint(recipients, amounts);
    }

    function test_batchMint_revertsWhenExceedsCap() public {
        token.setMinter(minter, true);
        address[] memory recipients = new address[](2);
        uint256[] memory amounts = new uint256[](2);
        recipients[0] = alice;
        recipients[1] = bob;
        amounts[0] = MAX_SUPPLY;
        amounts[1] = 1;
        vm.prank(minter);
        vm.expectRevert(Errors.CapExceeded.selector);
        token.batchMint(recipients, amounts);
    }

    // ============ Burn ============
    function test_burn_byHolder() public {
        token.setMinter(minter, true);
        vm.prank(minter);
        token.mint(alice, 1_000 ether);

        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit TokensBurned(alice, 400 ether, alice);
        token.burn(400 ether);
        assertEq(token.balanceOf(alice), 600 ether);
        assertEq(token.totalSupply(), 600 ether);
    }

    function test_burnFrom_byBurner() public {
        token.setMinter(minter, true);
        token.setBurner(burner, true);
        vm.prank(minter);
        token.mint(alice, 1_000 ether);

        vm.prank(burner);
        vm.expectEmit(true, true, true, true);
        emit TokensBurned(alice, 250 ether, burner);
        token.burnFrom(alice, 250 ether);
        assertEq(token.balanceOf(alice), 750 ether);
        assertEq(token.totalSupply(), 750 ether);
    }

    function test_burn_revertsOnZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(Errors.InvalidAmount.selector);
        token.burn(0);
    }

    function test_burnFrom_requiresBurnerRole() public {
        token.setMinter(minter, true);
        vm.prank(minter);
        token.mint(alice, 100 ether);
        vm.prank(bob);
        vm.expectRevert();
        token.burnFrom(alice, 1 ether);
    }

    // ============ Pausable ============
    function test_pause_blocksTransfersAndMintsAndBurns() public {
        token.setMinter(minter, true);
        vm.prank(minter);
        token.mint(alice, 10 ether);

        token.pause();
        assertTrue(token.paused());

        // transfer
        vm.prank(alice);
        vm.expectRevert();
        token.transfer(bob, 1 ether);

        // mint
        vm.prank(minter);
        vm.expectRevert();
        token.mint(alice, 1 ether);

        // burn
        vm.prank(alice);
        vm.expectRevert();
        token.burn(1 ether);

        token.unpause();
        assertFalse(token.paused());
        vm.prank(alice);
        token.transfer(bob, 1 ether);
        assertEq(token.balanceOf(bob), 1 ether);
    }

    // ============ Permit (EIP-2612) ============
    function test_permit_approvesSpender() public {
        // owner of funds is aliceFromPk (controlled by alicePk)
        token.setMinter(minter, true);
        vm.prank(minter);
        token.mint(aliceFromPk, 1_000 ether);

        address spender = bob;
        uint256 value = 500 ether;
        uint256 nonce = token.nonces(aliceFromPk);
        uint256 deadline = block.timestamp + 1 days;

        bytes32 domainSeparator = token.DOMAIN_SEPARATOR();
        bytes32 structHash = keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                aliceFromPk,
                spender,
                value,
                nonce,
                deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(alicePk, digest);

        token.permit(aliceFromPk, spender, value, deadline, v, r, s);
        assertEq(token.allowance(aliceFromPk, spender), value);
        assertEq(token.nonces(aliceFromPk), nonce + 1);
    }

    // ============ Events ============
    event MinterUpdated(address indexed minter, bool allowed);
    event BurnerUpdated(address indexed burner, bool allowed);
    event TokensMinted(address indexed to, uint256 amount, address indexed minter);
    event TokensBurned(address indexed from, uint256 amount, address indexed burner);
}