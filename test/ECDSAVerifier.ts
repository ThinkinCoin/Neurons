import { expect } from "chai";
import { ethers } from "hardhat";
import { AbiCoder, Contract, ZeroHash } from "ethers";

describe("ECDSAVerifier", function () {
  let verifier: Contract;
  let owner: any;
  let trustedSigner: any;
  let otherSigner: any;

  beforeEach(async () => {
    [owner, trustedSigner, otherSigner] = await ethers.getSigners();

    const Verifier = await ethers.getContractFactory("ECDSAVerifier", owner);
    verifier = await Verifier.deploy(owner.address, trustedSigner.address);
    await verifier.waitForDeployment();
  });

  it("constructor rejects zero addresses", async () => {
    const Verifier = await ethers.getContractFactory("ECDSAVerifier", owner);
    await expect(Verifier.deploy(ZeroAddress, trustedSigner.address)).to.be.reverted;
    await expect(Verifier.deploy(owner.address, ZeroAddress)).to.be.reverted;
  });

  it("initializes with trusted signer", async () => {
    expect(await verifier.trustedSigner()).to.equal(trustedSigner.address);
  });

  it("only owner can update trusted signer", async () => {
    await expect(verifier.connect(otherSigner).setTrustedSigner(otherSigner.address)).to.be.reverted;

    await verifier.connect(owner).setTrustedSigner(otherSigner.address);
    expect(await verifier.trustedSigner()).to.equal(otherSigner.address);
  });

  it("setTrustedSigner rejects zero address", async () => {
    await expect(verifier.connect(owner).setTrustedSigner(ZeroAddress)).to.be.reverted;
  });

  it("exposes a domain separator", async () => {
    const ds = await verifier.domainSeparator();
    expect(ds).to.not.equal(ZeroHash);
  });

  it("buildMessageHash matches ethers TypedDataEncoder", async () => {
    const chainId = (await ethers.provider.getNetwork()).chainId;

    const domain = {
      name: "NeuronsPoK",
      version: "1",
      chainId,
      verifyingContract: await verifier.getAddress(),
    } as const;

    const types = {
      MintProof: [
        { name: "recipient", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "bytes32" },
        { name: "expiry", type: "uint256" },
      ],
    } as const;

    const recipient = otherSigner.address;
    const amount = ethers.parseEther("1");
    const nonce = ZeroHash;
    const expiry = (await ethers.provider.getBlock("latest")).timestamp + 3600;

    const value = { recipient, amount, nonce, expiry } as const;

    const expected = ethers.TypedDataEncoder.hash(domain, types, value);
    const onchain = await verifier.buildMessageHash(recipient, amount, nonce, expiry);
    expect(onchain).to.equal(expected);
  });

  it("verifies a valid signature", async () => {
    const chainId = (await ethers.provider.getNetwork()).chainId;

    const domain = {
      name: "NeuronsPoK",
      version: "1",
      chainId,
      verifyingContract: await verifier.getAddress(),
    } as const;

    const types = {
      MintProof: [
        { name: "recipient", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "bytes32" },
        { name: "expiry", type: "uint256" },
      ],
    } as const;

    const recipient = otherSigner.address;
    const amount = ethers.parseEther("5");
    const nonce = ethers.keccak256(ethers.toUtf8Bytes("n1"));
    const expiry = (await ethers.provider.getBlock("latest")).timestamp + 3600;

    const sig = await trustedSigner.signTypedData(domain, types, { recipient, amount, nonce, expiry });
    const proof = AbiCoder.defaultAbiCoder().encode(["bytes", "uint256"], [sig, expiry]);

    expect(await verifier.verify(recipient, amount, proof, nonce)).to.equal(true);
  });

  it("reverts on expired proof", async () => {
    const chainId = (await ethers.provider.getNetwork()).chainId;

    const domain = {
      name: "NeuronsPoK",
      version: "1",
      chainId,
      verifyingContract: await verifier.getAddress(),
    } as const;

    const types = {
      MintProof: [
        { name: "recipient", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "bytes32" },
        { name: "expiry", type: "uint256" },
      ],
    } as const;

    const recipient = otherSigner.address;
    const amount = ethers.parseEther("1");
    const nonce = ethers.keccak256(ethers.toUtf8Bytes("n2"));
    const expiry = (await ethers.provider.getBlock("latest")).timestamp - 1;

    const sig = await trustedSigner.signTypedData(domain, types, { recipient, amount, nonce, expiry });
    const proof = AbiCoder.defaultAbiCoder().encode(["bytes", "uint256"], [sig, expiry]);

    await expect(verifier.verify(recipient, amount, proof, nonce)).to.be.reverted;
  });

  it("reverts on invalid signer", async () => {
    const chainId = (await ethers.provider.getNetwork()).chainId;

    const domain = {
      name: "NeuronsPoK",
      version: "1",
      chainId,
      verifyingContract: await verifier.getAddress(),
    } as const;

    const types = {
      MintProof: [
        { name: "recipient", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "bytes32" },
        { name: "expiry", type: "uint256" },
      ],
    } as const;

    const recipient = otherSigner.address;
    const amount = ethers.parseEther("1");
    const nonce = ethers.keccak256(ethers.toUtf8Bytes("n3"));
    const expiry = (await ethers.provider.getBlock("latest")).timestamp + 3600;

    const sig = await otherSigner.signTypedData(domain, types, { recipient, amount, nonce, expiry });
    const proof = AbiCoder.defaultAbiCoder().encode(["bytes", "uint256"], [sig, expiry]);

    await expect(verifier.verify(recipient, amount, proof, nonce)).to.be.reverted;
  });
});
