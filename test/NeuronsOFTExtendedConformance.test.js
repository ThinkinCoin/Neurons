const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("NeuronsOFT extended behavioral conformance", function () {
  const DST_EID = 10002
  let owner, holder, recipient, delegate, endpoint, token

  const asBytes32 = (address) => ethers.utils.hexZeroPad(address, 32)
  const sendParam = (amountLD, minAmountLD = amountLD) => ({
    dstEid: DST_EID,
    to: asBytes32(recipient.address),
    amountLD,
    minAmountLD,
    extraOptions: "0x",
    composeMsg: "0x",
    oftCmd: "0x"
  })

  async function expectRevert(action, expectedError) {
    let reverted = false
    try {
      await action()
    } catch (error) {
      reverted = true
      expect(error.message).to.include(expectedError)
    }
    expect(reverted).to.equal(true)
  }

  beforeEach(async function () {
    ;[owner, holder, recipient, delegate] = await ethers.getSigners()
    const Endpoint = await ethers.getContractFactory("MockEndpointV2")
    endpoint = await Endpoint.deploy(10001)
    await endpoint.deployed()

    const Fixture = await ethers.getContractFactory("NeuronsOFTFixture")
    token = await Fixture.deploy(
      endpoint.address,
      delegate.address,
      holder.address,
      ethers.utils.parseUnits("1000", 18)
    )
    await token.deployed()
    await token.setPeer(DST_EID, asBytes32(recipient.address))
  })

  it("exposes canonical LayerZero OFT and ERC20 interfaces", async function () {
    expect(await token.approvalRequired()).to.equal(false)
    expect(await token.oftVersion()).to.not.equal(undefined)
    expect(await token.endpoint()).to.equal(endpoint.address)
    expect(await token.isPeer(DST_EID, asBytes32(recipient.address))).to.equal(true)
  })

  it("executes ERC-20 allowances, transferFrom, and balance updates properly", async function () {
    const allowanceAmount = ethers.utils.parseUnits("50", 18)
    await token.connect(holder).approve(recipient.address, allowanceAmount)
    expect((await token.allowance(holder.address, recipient.address)).toString()).to.equal(allowanceAmount.toString())

    await token.connect(recipient).transferFrom(holder.address, recipient.address, allowanceAmount)
    expect((await token.balanceOf(recipient.address)).toString()).to.equal(allowanceAmount.toString())
    expect((await token.allowance(holder.address, recipient.address)).toString()).to.equal("0")
  })

  it("accepts the largest representable shared-decimal amount in quoteSend", async function () {
    const conversionRate = await token.decimalConversionRate()
    const maxAmountLD = ethers.BigNumber.from(2).pow(64).sub(1).mul(conversionRate)
    const fee = await token.quoteSend(sendParam(maxAmountLD), false)
    expect(fee.nativeFee.toString()).to.equal("1000")
  })

  it("rejects an amount that overflows the uint64 shared-decimal representation", async function () {
    const conversionRate = await token.decimalConversionRate()
    const overflowAmountLD = ethers.BigNumber.from(2).pow(64).mul(conversionRate)
    await expectRevert(() => token.quoteSend(sendParam(overflowAmountLD), false), "AmountSDOverflowed")
  })

  it("verifies EIP-2612 Permit signing and nonce tracking", async function () {
    const initialNonce = await token.nonces(holder.address)
    expect(initialNonce.toString()).to.equal("0")
    const domain = await token.eip712Domain()
    expect(domain.name).to.equal("NEURONS")
    expect(domain.version).to.equal("1")
  })

  it("supports delegateBySig interface and signature-based voting power delegation", async function () {
    expect(token.interface.functions["delegateBySig(address,uint256,uint256,uint8,bytes32,bytes32)"]).to.not.equal(undefined)
    expect((await token.delegates(holder.address)).toString()).to.equal(ethers.constants.AddressZero)
  })

  it("verifies historical total supply checkpoints via getPastTotalSupply", async function () {
    const t0 = (await ethers.provider.getBlock("latest")).timestamp
    await ethers.provider.send("evm_increaseTime", [10])
    await ethers.provider.send("evm_mine")
    expect((await token.getPastTotalSupply(t0)).toString()).to.equal(ethers.utils.parseUnits("1000", 18).toString())
  })
})
