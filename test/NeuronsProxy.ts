import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

describe("NeuronsProxy (remote chain representation)", function () {
  let proxy: Contract;
  let owner: any;
  let bridge: any;
  let alice: any;
  let bob: any;

  beforeEach(async () => {
    [owner, bridge, alice, bob] = await ethers.getSigners();

    const Proxy = await ethers.getContractFactory("NeuronsProxy", owner);
    proxy = await Proxy.deploy(owner.address, bridge.address);
    await proxy.waitForDeployment();
  });

  it("uses global name/symbol", async () => {
    expect(await proxy.name()).to.equal("Neurons");
    expect(await proxy.symbol()).to.equal("Neurons");
  });

  it("only bridge can mint/burn", async () => {
    await expect(proxy.bridgeMint(alice.address, 1)).to.be.reverted;
    await expect(proxy.bridgeBurn(alice.address, 1)).to.be.reverted;

    await proxy.connect(bridge).bridgeMint(alice.address, 10);
    expect(await proxy.balanceOf(alice.address)).to.equal(10n);

    await proxy.connect(bridge).bridgeBurn(alice.address, 4);
    expect(await proxy.balanceOf(alice.address)).to.equal(6n);
  });

  it("auto self-delegates on receive; allows delegation to third parties", async () => {
    await proxy.connect(bridge).bridgeMint(alice.address, 100);

    expect(await proxy.delegates(alice.address)).to.equal(alice.address);
    expect(await proxy.getVotes(alice.address)).to.equal(100n);

    await proxy.connect(alice).delegate(bob.address);
    expect(await proxy.getVotes(alice.address)).to.equal(0n);
    expect(await proxy.getVotes(bob.address)).to.equal(100n);
  });

  it("supports past votes by block", async () => {
    await proxy.connect(bridge).bridgeMint(alice.address, 50);
    const mintBlock = await ethers.provider.getBlockNumber();
    await ethers.provider.send("evm_mine", []);

    expect(await proxy.getPastVotes(alice.address, mintBlock)).to.equal(50n);
    expect(await proxy.getPastTotalSupply(mintBlock)).to.equal(50n);
  });
});
