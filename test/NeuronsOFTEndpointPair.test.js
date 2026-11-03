const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('NeuronsOFT local endpoint-pair conformance', function () {
  const EID_A = 10001
  const EID_B = 10002
  const asBytes32 = (address) => ethers.utils.hexZeroPad(address, 32)

  let owner
  let sender
  let recipient
  let executor
  let endpointA
  let endpointB
  let tokenA
  let tokenB

  const sendParam = (amountLD) => ({
    dstEid: EID_B,
    to: asBytes32(recipient.address),
    amountLD,
    minAmountLD: amountLD,
    extraOptions: '0x',
    composeMsg: '0x',
    oftCmd: '0x'
  })

  async function queuedGuid(receipt) {
    const event = receipt.events.find(
      (entry) => entry.address === endpointA.address && entry.topics[0] === endpointA.interface.getEventTopic('MessageQueued')
    )
    return endpointA.interface.parseLog(event).args.guid
  }

  beforeEach(async function () {
    ;[owner, sender, recipient, executor] = await ethers.getSigners()

    const Endpoint = await ethers.getContractFactory('LocalEndpointPairV2')
    endpointA = await Endpoint.deploy(EID_A)
    endpointB = await Endpoint.deploy(EID_B)
    await endpointA.deployed()
    await endpointB.deployed()
    await endpointA.setRemoteEndpoint(EID_B, endpointB.address)
    await endpointB.setRemoteEndpoint(EID_A, endpointA.address)

    const Fixture = await ethers.getContractFactory('NeuronsOFTFixture')
    tokenA = await Fixture.deploy(endpointA.address, owner.address, sender.address, ethers.utils.parseUnits('1000', 18))
    tokenB = await Fixture.deploy(endpointB.address, owner.address, ethers.constants.AddressZero, 0)
    await tokenA.deployed()
    await tokenB.deployed()
    await tokenA.setPeer(EID_B, asBytes32(tokenB.address))
    await tokenB.setPeer(EID_A, asBytes32(tokenA.address))
  })

  it('reconciles source supply, explicit in-flight value, and destination supply', async function () {
    const amount = ethers.utils.parseUnits('125', 18)
    const initialGlobalSupply = await tokenA.totalSupply()
    const fee = await tokenA.quoteSend(sendParam(amount), false)
    const receipt = await (await tokenA.connect(sender).send(sendParam(amount), fee, sender.address, { value: fee.nativeFee })).wait()
    const guid = await queuedGuid(receipt)

    const pending = await endpointA.messageState(guid)
    expect(pending.exists).to.equal(true)
    expect(pending.delivered).to.equal(false)
    expect((await tokenA.totalSupply()).add(await tokenB.totalSupply()).add(amount).toString()).to.equal(initialGlobalSupply.toString())

    await endpointA.deliver(guid, executor.address)
    expect((await tokenB.balanceOf(recipient.address)).toString()).to.equal(amount.toString())
    expect((await tokenA.totalSupply()).add(await tokenB.totalSupply()).toString()).to.equal(initialGlobalSupply.toString())
  })

  it("rejects duplicate delivery attempts at harness boundaries", async function () {
    const amount = ethers.utils.parseUnits("10", 18)
    const fee = await tokenA.quoteSend(sendParam(amount), false)
    const receipt = await (await tokenA.connect(sender).send(sendParam(amount), fee, sender.address, { value: fee.nativeFee })).wait()
    const guid = await queuedGuid(receipt)
    await endpointA.deliver(guid, executor.address)

    let reverted = false
    try {
      await endpointA.deliver(guid, executor.address)
    } catch (error) {
      reverted = true
      expect(error.message).to.include("AlreadyDelivered")
    }
    expect(reverted).to.equal(true)
  })

  it('uses real OApp peer validation while keeping failed delivery unreconciled', async function () {
    const amount = ethers.utils.parseUnits('20', 18)
    const initialGlobalSupply = await tokenA.totalSupply()
    await tokenB.setPeer(EID_A, asBytes32(owner.address))

    const fee = await tokenA.quoteSend(sendParam(amount), false)
    const receipt = await (await tokenA.connect(sender).send(sendParam(amount), fee, sender.address, { value: fee.nativeFee })).wait()
    const guid = await queuedGuid(receipt)

    let reverted = false
    try {
      await endpointA.deliver(guid, executor.address)
    } catch (error) {
      reverted = true
      expect(error.message).to.include('OnlyPeer')
    }
    expect(reverted).to.equal(true)
    expect((await tokenB.totalSupply()).toString()).to.equal('0')
    expect((await tokenA.totalSupply()).add(amount).toString()).to.equal(initialGlobalSupply.toString())

    await tokenB.setPeer(EID_A, asBytes32(tokenA.address))
    await endpointA.deliver(guid, executor.address)
    expect((await tokenA.totalSupply()).add(await tokenB.totalSupply()).toString()).to.equal(initialGlobalSupply.toString())
  })
})
