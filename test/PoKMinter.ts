import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ZeroAddress } from "ethers";

describe("PoKMinter", function () {
  let token: Contract;
  let minter: Contract;
  let verifier: Contract;
  let owner: any;
  let alice: any;
  let bob: any;
  let treasury: any;

  beforeEach(async () => {
    [owner, alice, bob, treasury] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Neurons", owner);
    token = await Token.deploy(owner.address);
    await token.waitForDeployment();

    const MockVerifier = await ethers.getContractFactory("MockVerifier", owner);
    verifier = await MockVerifier.deploy(0, owner.address); // ReturnTrue
    await verifier.waitForDeployment();

    const PoKMinter = await ethers.getContractFactory("PoKMinter", owner);
    minter = await PoKMinter.deploy(owner.address, await token.getAddress(), await verifier.getAddress(), treasury.address);
    await minter.waitForDeployment();

    // PoKMinter must have MINTER_ROLE on token
    await token.connect(owner).setMinter(await minter.getAddress(), true);
  });

  it("constructor requires non-zero owner and daoTreasury", async () => {
    const PoKMinter = await ethers.getContractFactory("PoKMinter", owner);
    await expect(PoKMinter.deploy(ZeroAddress, await token.getAddress(), await verifier.getAddress(), treasury.address)).to.be
      .reverted;
    await expect(PoKMinter.deploy(owner.address, await token.getAddress(), await verifier.getAddress(), ZeroAddress)).to.be
      .reverted;
  });

  it("mints to daoTreasury and updates accounting", async () => {
    const amount = ethers.parseEther("10");
    const nonce = ethers.keccak256(ethers.toUtf8Bytes("nonce1"));

    await expect(minter.mintWithProof(alice.address, amount, "0x", nonce))
      .to.emit(minter, "MintedWithProof")
      .withArgs(alice.address, treasury.address, amount, nonce);

    expect(await token.balanceOf(treasury.address)).to.equal(amount);
    expect(await minter.nonceUsed(nonce)).to.equal(true);
    expect(await minter.totalMintsProcessed()).to.equal(1n);
    expect(await minter.totalTokensMinted()).to.equal(amount);
  });

  it("reverts when verifier returns false (invalid proof)", async () => {
    await verifier.setMode(1); // ReturnFalse

    const amount = ethers.parseEther("1");
    const nonce = ethers.keccak256(ethers.toUtf8Bytes("nonce2"));

    await expect(minter.mintWithProof(alice.address, amount, "0x", nonce)).to.be.reverted;
  });

  it("enforces cooldown", async () => {
    await minter.setLimits(3600, ethers.parseEther("1000"), ethers.parseEther("100"));

    const amount = ethers.parseEther("1");
    const nonce1 = ethers.keccak256(ethers.toUtf8Bytes("nonce3"));
    const nonce2 = ethers.keccak256(ethers.toUtf8Bytes("nonce4"));

    await minter.mintWithProof(alice.address, amount, "0x", nonce1);
    await expect(minter.mintWithProof(alice.address, amount, "0x", nonce2)).to.be.reverted;
  });

  it("enforces single mint limit", async () => {
    await minter.setLimits(0, ethers.parseEther("1000"), ethers.parseEther("1"));

    const amountTooBig = ethers.parseEther("2");
    const nonce = ethers.keccak256(ethers.toUtf8Bytes("nonce5"));

    await expect(minter.mintWithProof(alice.address, amountTooBig, "0x", nonce)).to.be.reverted;
  });

  it("enforces daily limit", async () => {
    await minter.setLimits(0, ethers.parseEther("3"), ethers.parseEther("10"));

    const nonce1 = ethers.keccak256(ethers.toUtf8Bytes("nonce6"));
    const nonce2 = ethers.keccak256(ethers.toUtf8Bytes("nonce7"));

    await minter.mintWithProof(alice.address, ethers.parseEther("2"), "0x", nonce1);
    await expect(minter.mintWithProof(alice.address, ethers.parseEther("2"), "0x", nonce2)).to.be.reverted;
  });

  it("batchMintWithProofs skips invalid entries instead of reverting", async () => {
    await minter.setLimits(0, ethers.parseEther("1000"), ethers.parseEther("10"));

    const recipients = [alice.address, ZeroAddress, bob.address, bob.address];
    const amounts = [ethers.parseEther("1"), ethers.parseEther("1"), 0n, ethers.parseEther("2")];
    const proofs = ["0x", "0x", "0x", "0x"]; // ignored by MockVerifier
    const nonces = [
      ethers.keccak256(ethers.toUtf8Bytes("bn1")),
      ethers.keccak256(ethers.toUtf8Bytes("bn2")),
      ethers.keccak256(ethers.toUtf8Bytes("bn3")),
      ethers.keccak256(ethers.toUtf8Bytes("bn4")),
    ];

    await minter.batchMintWithProofs(recipients, amounts, proofs, nonces);

    // Only alice (amount=1) and bob (amount=2) should be minted (zero address + zero amount skipped)
    expect(await token.balanceOf(treasury.address)).to.equal(ethers.parseEther("3"));
    expect(await minter.totalMintsProcessed()).to.equal(2n);
  });

  it("batchMintWithProofs covers verifier false + verifier revert paths", async () => {
    await minter.setLimits(0, ethers.parseEther("1000"), ethers.parseEther("10"));

    const recipients = [alice.address, bob.address, owner.address];
    const amounts = [ethers.parseEther("1"), ethers.parseEther("1"), ethers.parseEther("1")];
    const proofs = ["0x", "0x", "0x"];
    const nonces = [
      ethers.keccak256(ethers.toUtf8Bytes("bn5")),
      ethers.keccak256(ethers.toUtf8Bytes("bn6")),
      ethers.keccak256(ethers.toUtf8Bytes("bn7")),
    ];

    // 1) valid
    await verifier.setMode(0); // ReturnTrue
    await minter.batchMintWithProofs([recipients[0]], [amounts[0]], [proofs[0]], [nonces[0]]);

    // 2) returns false => skipped
    await verifier.setMode(1); // ReturnFalse
    await minter.batchMintWithProofs([recipients[1]], [amounts[1]], [proofs[1]], [nonces[1]]);

    // 3) reverts => skipped
    await verifier.setMode(2); // Revert
    await minter.batchMintWithProofs([recipients[2]], [amounts[2]], [proofs[2]], [nonces[2]]);

    expect(await token.balanceOf(treasury.address)).to.equal(ethers.parseEther("1"));
    expect(await minter.totalMintsProcessed()).to.equal(1n);
  });

  it("admin setters work", async () => {
    await expect(minter.connect(alice).setDaoTreasury(alice.address)).to.be.reverted;

    await minter.setDaoTreasury(alice.address);
    expect(await minter.daoTreasury()).to.equal(alice.address);

    await expect(minter.connect(alice).pause()).to.be.reverted;
    await minter.pause();
    expect(await minter.paused()).to.equal(true);

    await minter.unpause();
    expect(await minter.paused()).to.equal(false);
  });

  it("view helpers behave", async () => {
    await minter.setLimits(0, ethers.parseEther("5"), ethers.parseEther("2"));

    expect(await minter.canMint(alice.address, ethers.parseEther("0"))).to.equal(false);
    expect(await minter.canMint(alice.address, ethers.parseEther("10"))).to.equal(false);
    expect(await minter.canMint(alice.address, ethers.parseEther("2"))).to.equal(true);

    const nonce = ethers.keccak256(ethers.toUtf8Bytes("nonce-view"));
    await minter.mintWithProof(alice.address, ethers.parseEther("2"), "0x", nonce);

    expect(await minter.getRemainingDailyLimit(alice.address)).to.equal(ethers.parseEther("3"));
    const next = await minter.getNextMintTime(alice.address);
    expect(next).to.be.greaterThan(0n);

    const stats = await minter.getMintingStats();
    expect(stats.totalMints).to.equal(1n);
    expect(stats.totalMinted).to.equal(ethers.parseEther("2"));
    expect(stats.averageMintSize).to.equal(ethers.parseEther("2"));
  });
});
