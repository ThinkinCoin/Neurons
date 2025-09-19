import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signature, ZeroAddress } from "ethers";

// Matches Neurons.sol: name "Neurons", ERC20Permit("Neurons")
const TOKEN_NAME = "Neurons";

describe("Neurons (ERC20)", function () {
  let token: Contract;
  let owner: any;
  let alice: any;
  let bob: any;
  let minter: any;
  let burner: any;

  const MAX_SUPPLY = ethers.parseEther("10000000"); // 10M

  beforeEach(async () => {
    [owner, alice, bob, minter, burner] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Neurons", owner);
    token = await Token.deploy(owner.address);
    await token.waitForDeployment();
  });

  describe("initialization", () => {
    it("has expected initial state", async () => {
      expect(await token.name()).to.equal("Neurons");
      expect(await token.symbol()).to.equal("Neurons");
      expect(await token.decimals()).to.equal(18);
      expect(await token.totalSupply()).to.equal(0n);
      expect(await token.cap()).to.equal(MAX_SUPPLY);
      expect(await token.remainingSupply()).to.equal(MAX_SUPPLY);
      // owner is DEFAULT_ADMIN_ROLE
      const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.equal(true);
    });
  });

  describe("roles", () => {
    it("owner can set and revoke MINTER role", async () => {
      await expect(token.setMinter(minter.address, true))
        .to.emit(token, "MinterUpdated")
        .withArgs(minter.address, true);
      expect(await token.isMinter(minter.address)).to.equal(true);

      await expect(token.setMinter(minter.address, false))
        .to.emit(token, "MinterUpdated")
        .withArgs(minter.address, false);
      expect(await token.isMinter(minter.address)).to.equal(false);
    });

    it("owner can set and revoke BURNER role", async () => {
      await expect(token.setBurner(burner.address, true))
        .to.emit(token, "BurnerUpdated")
        .withArgs(burner.address, true);
      expect(await token.isBurner(burner.address)).to.equal(true);

      await expect(token.setBurner(burner.address, false))
        .to.emit(token, "BurnerUpdated")
        .withArgs(burner.address, false);
      expect(await token.isBurner(burner.address)).to.equal(false);
    });

    it("non-owner cannot set roles", async () => {
      await expect(token.connect(alice).setMinter(minter.address, true)).to.be.reverted;
      await expect(token.connect(alice).setBurner(burner.address, true)).to.be.reverted;
    });
  });

  describe("mint", () => {
    beforeEach(async () => {
      await token.setMinter(minter.address, true);
    });

    it("minter can mint", async () => {
      const amount = ethers.parseEther("1000");
      await expect(token.connect(minter).mint(alice.address, amount))
        .to.emit(token, "TokensMinted")
        .withArgs(alice.address, amount, minter.address);
      expect(await token.balanceOf(alice.address)).to.equal(amount);
      expect(await token.totalSupply()).to.equal(amount);
      expect(await token.remainingSupply()).to.equal(MAX_SUPPLY - amount);
    });

    it("reverts for non-minter", async () => {
      await expect(token.connect(alice).mint(bob.address, 1)).to.be.reverted;
    });

    it("reverts on zero address or zero amount", async () => {
      await expect(token.connect(minter).mint(ZeroAddress, 1)).to.be.reverted;
      await expect(token.connect(minter).mint(alice.address, 0)).to.be.reverted;
    });

    it("cap is enforced", async () => {
      await token.connect(minter).mint(alice.address, MAX_SUPPLY);
      await expect(token.connect(minter).mint(alice.address, 1)).to.be.reverted;
    });
  });

  describe("batchMint", () => {
    beforeEach(async () => {
      await token.setMinter(minter.address, true);
    });

    it("mints to many recipients", async () => {
      const recipients = [alice.address, bob.address, owner.address];
      const amounts = [100n, 200n, 300n].map((x) => x * 10n ** 18n);
      await token.connect(minter).batchMint(recipients, amounts);
      expect(await token.balanceOf(alice.address)).to.equal(amounts[0]);
      expect(await token.balanceOf(bob.address)).to.equal(amounts[1]);
      expect(await token.balanceOf(owner.address)).to.equal(amounts[2]);
      expect(await token.totalSupply()).to.equal(amounts.reduce((a, b) => a + b));
    });

    it("reverts on length mismatch", async () => {
      const recipients = [alice.address];
      const amounts = [1n, 2n];
      await expect(token.connect(minter).batchMint(recipients, amounts)).to.be.reverted;
    });

    it("reverts when exceeding cap", async () => {
      const recipients = [alice.address, bob.address];
      const amounts = [MAX_SUPPLY, 1n];
      await expect(token.connect(minter).batchMint(recipients, amounts)).to.be.reverted;
    });
  });

  describe("burn", () => {
    beforeEach(async () => {
      await token.setMinter(minter.address, true);
      await token.connect(minter).mint(alice.address, ethers.parseEther("1000"));
    });

    it("holder can burn own tokens", async () => {
      const burnAmount = ethers.parseEther("400");
      await expect(token.connect(alice).burn(burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(alice.address, burnAmount, alice.address);
      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("600"));
      expect(await token.totalSupply()).to.equal(ethers.parseEther("600"));
    });

    it("burner can burnFrom others", async () => {
      await token.setBurner(burner.address, true);
      const burnAmount = ethers.parseEther("250");
      await expect(token.connect(burner).burnFrom(alice.address, burnAmount))
        .to.emit(token, "TokensBurned")
        .withArgs(alice.address, burnAmount, burner.address);
      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("750"));
    });

    it("reverts on zero burn amount", async () => {
      await expect(token.connect(alice).burn(0)).to.be.reverted;
    });

    it("reverts burnFrom without burner role", async () => {
      await expect(token.connect(bob).burnFrom(alice.address, 1)).to.be.reverted;
    });
  });

  describe("pausable", () => {
    beforeEach(async () => {
      await token.setMinter(minter.address, true);
      await token.connect(minter).mint(alice.address, ethers.parseEther("10"));
    });

    it("pause blocks transfer, mint and burn; unpause restores", async () => {
      await token.pause();
      expect(await token.paused()).to.equal(true);

      await expect(token.connect(alice).transfer(bob.address, 1)).to.be.reverted;
      await expect(token.connect(minter).mint(alice.address, 1)).to.be.reverted;
      await expect(token.connect(alice).burn(1)).to.be.reverted;

      await token.unpause();
      expect(await token.paused()).to.equal(false);
      await token.connect(alice).transfer(bob.address, 1);
      expect(await token.balanceOf(bob.address)).to.equal(1n);
    });
  });

  describe("permit (EIP-2612)", () => {
    it("sets allowance via permit signature", async () => {
      await token.setMinter(minter.address, true);
      await token.connect(minter).mint(owner.address, ethers.parseEther("1000"));

      const spender = bob;
      const value = ethers.parseEther("500");
      const nonce = await token.nonces(owner.address);
      const deadline = (await ethers.provider.getBlock("latest")).timestamp + 86400;

      const chainId = (await ethers.provider.getNetwork()).chainId;
      const domain = {
        name: TOKEN_NAME,
        version: "1",
        chainId,
        verifyingContract: await token.getAddress(),
      } as const;

      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      } as const;

      const message = {
        owner: owner.address,
        spender: spender.address,
        value,
        nonce,
        deadline,
      } as const;

      const sig = await owner.signTypedData(domain, types, message);
      const { v, r, s } = Signature.from(sig);

      await token.permit(owner.address, spender.address, value, deadline, v, r, s);
      expect(await token.allowance(owner.address, spender.address)).to.equal(value);
      expect(await token.nonces(owner.address)).to.equal(nonce + 1n);
    });
  });
});
