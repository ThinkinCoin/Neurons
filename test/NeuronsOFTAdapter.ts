import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, ZeroAddress } from "ethers";

describe("NeuronsOFTAdapter (stub)", function () {
  let token: Contract;
  let adapter: Contract;
  let owner: any;
  let alice: any;
  let bob: any;

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Neurons", owner);
    token = await Token.deploy(owner.address);
    await token.waitForDeployment();

    // allow owner to mint for test setup
    await token.setMinter(owner.address, true);

    const Adapter = await ethers.getContractFactory("NeuronsOFTAdapterHarness", owner);
    adapter = await Adapter.deploy(owner.address, await token.getAddress());
    await adapter.waitForDeployment();
  });

  it("constructor rejects zero addresses", async () => {
    const Adapter = await ethers.getContractFactory("NeuronsOFTAdapterHarness", owner);
    await expect(Adapter.deploy(ZeroAddress, await token.getAddress())).to.be.reverted;
    await expect(Adapter.deploy(owner.address, ZeroAddress)).to.be.reverted;
  });

  it("admin can configure endpoint/remotes/mode/pause", async () => {
    await expect(adapter.connect(alice).setEndpoint(owner.address)).to.be.reverted;
    await expect(adapter.setEndpoint(ZeroAddress)).to.be.reverted;

    await adapter.setEndpoint(owner.address);
    expect(await adapter.endpoint()).to.equal(owner.address);

    await adapter.allowRemote(101, true);
    expect(await adapter.remoteChainAllowed(101)).to.equal(true);

    await adapter.setTrustedRemote(101, "0x1234");
    expect(await adapter.getTrustedRemote(101)).to.equal("0x1234");

    await adapter.setBridgeMode(false);
    expect(await adapter.isBurnMintMode()).to.equal(false);

    await adapter.pause();
    expect(await adapter.paused()).to.equal(true);

    await adapter.unpause();
    expect(await adapter.paused()).to.equal(false);
  });

  it("sendTokens validates inputs", async () => {
    await expect(adapter.connect(alice).sendTokens(101, bob.address, 1, "0x")).to.be.reverted;

    await adapter.allowRemote(101, true);
    await expect(adapter.connect(alice).sendTokens(101, ZeroAddress, 1, "0x")).to.be.reverted;
    await expect(adapter.connect(alice).sendTokens(101, bob.address, 0, "0x")).to.be.reverted;

    // endpoint not set
    await expect(adapter.connect(alice).sendTokens(101, bob.address, 1, "0x")).to.be.reverted;

    await adapter.setEndpoint(owner.address);
    await expect(adapter.connect(alice).sendTokens(101, bob.address, 1, "0x")).to.be.reverted;
  });

  it("estimateSendFee returns placeholder fees", async () => {
    const [nativeFee, zroFee] = await adapter.estimateSendFee(101, bob.address, 123, false, "0x");
    expect(nativeFee).to.equal(ethers.parseEther("0.001"));
    expect(zroFee).to.equal(0n);
  });

  it("sendTokens burn/mint mode burns from sender and updates stats", async () => {
    const dst = 101;
    await adapter.allowRemote(dst, true);
    await adapter.setEndpoint(owner.address);
    await adapter.setBridgeMode(true);

    // give alice tokens
    await token.mint(alice.address, ethers.parseEther("10"));

    // adapter must be burner to burnFrom
    await token.setBurner(await adapter.getAddress(), true);

    await adapter.connect(alice).sendTokens(dst, bob.address, ethers.parseEther("3"), "0x");

    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("7"));
    expect(await adapter.totalSent()).to.equal(ethers.parseEther("3"));
    expect(await adapter.sentToChain(dst)).to.equal(ethers.parseEther("3"));
  });

  it("sendTokens lock/unlock mode locks via transferFrom", async () => {
    const dst = 102;
    await adapter.allowRemote(dst, true);
    await adapter.setEndpoint(owner.address);
    await adapter.setBridgeMode(false);

    await token.mint(alice.address, ethers.parseEther("5"));
    await token.connect(alice).approve(await adapter.getAddress(), ethers.parseEther("2"));

    await adapter.connect(alice).sendTokens(dst, bob.address, ethers.parseEther("2"), "0x");

    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("3"));
    expect(await token.balanceOf(await adapter.getAddress())).to.equal(ethers.parseEther("2"));
  });

  it("pause blocks sendTokens", async () => {
    const dst = 103;
    await adapter.allowRemote(dst, true);
    await adapter.setEndpoint(owner.address);

    await token.mint(alice.address, ethers.parseEther("1"));
    await token.connect(alice).approve(await adapter.getAddress(), ethers.parseEther("1"));

    await adapter.pause();
    await expect(adapter.connect(alice).sendTokens(dst, bob.address, ethers.parseEther("1"), "0x")).to.be.reverted;
  });

  it("receiveTokens burn/mint mode mints to recipient and updates stats", async () => {
    const src = 201;
    await adapter.allowRemote(src, true);
    await adapter.setBridgeMode(true);

    // adapter must be minter to mint
    await token.setMinter(await adapter.getAddress(), true);

    await adapter.receiveTokens(src, bob.address, ethers.parseEther("4"));

    expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("4"));
    expect(await adapter.totalReceived()).to.equal(ethers.parseEther("4"));
    expect(await adapter.receivedFromChain(src)).to.equal(ethers.parseEther("4"));
  });

  it("receiveTokens lock/unlock mode unlocks from adapter balance", async () => {
    const src = 202;
    await adapter.allowRemote(src, true);
    await adapter.setBridgeMode(false);

    // preload adapter with tokens
    await token.mint(await adapter.getAddress(), ethers.parseEther("6"));

    await adapter.receiveTokens(src, bob.address, ethers.parseEther("1"));

    expect(await token.balanceOf(bob.address)).to.equal(ethers.parseEther("1"));
    expect(await token.balanceOf(await adapter.getAddress())).to.equal(ethers.parseEther("5"));
  });

  it("emergencyWithdraw only works in lock mode", async () => {
    // preload adapter
    await token.mint(await adapter.getAddress(), ethers.parseEther("2"));

    // burn/mint mode => should do nothing
    await adapter.setBridgeMode(true);
    await adapter.emergencyWithdraw(owner.address, ethers.parseEther("1"));
    expect(await token.balanceOf(owner.address)).to.equal(0n);

    // lock mode => should transfer
    await adapter.setBridgeMode(false);
    await adapter.emergencyWithdraw(owner.address, ethers.parseEther("1"));
    expect(await token.balanceOf(owner.address)).to.equal(ethers.parseEther("1"));
  });

  it("view helpers return expected values", async () => {
    await adapter.allowRemote(1, true);
    await adapter.allowRemote(2, true);

    const stats = await adapter.getBridgeStats();
    expect(stats.activeChains).to.equal(2n);

    const chainStats = await adapter.getChainStats(2);
    expect(chainStats.sent).to.equal(0n);
    expect(chainStats.received).to.equal(0n);

    expect(await adapter.isChainAllowed(2)).to.equal(true);
  });
});
