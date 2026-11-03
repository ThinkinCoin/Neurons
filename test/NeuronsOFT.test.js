const { expect } = require('chai')
const { ethers } = require('hardhat')

describe('NeuronsOFT canonical foundation', function () {
  const DST_EID = 10002
  let owner
  let holder
  let recipient
  let delegate
  let endpoint
  let token

  const asBytes32 = (address) => ethers.utils.hexZeroPad(address, 32)

  const sendParam = (amountLD) => ({
    dstEid: DST_EID,
    to: asBytes32(recipient.address),
    amountLD,
    minAmountLD: amountLD,
    extraOptions: '0x',
    composeMsg: '0x',
    oftCmd: '0x'
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

    const Endpoint = await ethers.getContractFactory('MockEndpointV2')
    endpoint = await Endpoint.deploy(10001)
    await endpoint.deployed()

    const Fixture = await ethers.getContractFactory('NeuronsOFTFixture')
    token = await Fixture.deploy(
      endpoint.address,
      delegate.address,
      holder.address,
      ethers.utils.parseUnits('1000', 18)
    )
    await token.deployed()
    await token.setPeer(DST_EID, asBytes32(recipient.address))
  })

  it('exposes the canonical ERC-20 metadata and synthetic genesis fixture only', async function () {
    expect(await token.name()).to.equal('NEURONS')
    expect(await token.symbol()).to.equal('NEURONS')
    expect(await token.decimals()).to.equal(18)
    expect((await token.balanceOf(holder.address)).toString()).to.equal(ethers.utils.parseUnits('1000', 18).toString())
    expect(token.interface.functions['mint(address,uint256)']).to.equal(undefined)
    expect(token.interface.functions['burn(uint256)']).to.equal(undefined)
  })

  it('uses explicit acceptance before a successor receives Native OFT configuration authority', async function () {
    expect(await token.owner()).to.equal(owner.address)
    expect(await endpoint.delegate()).to.equal(delegate.address)
    await expectRevert(
      () => token.connect(holder).setPeer(DST_EID, asBytes32(holder.address)),
      'Ownable: caller is not the owner'
    )

    await token.transferOwnership(holder.address)
    expect(await token.owner()).to.equal(owner.address)
    expect(await token.pendingOwner()).to.equal(holder.address)
    await expectRevert(
      () => token.connect(holder).setPeer(DST_EID, asBytes32(holder.address)),
      'Ownable: caller is not the owner'
    )

    await token.connect(holder).acceptOwnership()
    expect(await token.owner()).to.equal(holder.address)
    await token.connect(holder).setPeer(DST_EID, asBytes32(holder.address))
  })

  it('uses explicit delegation and timestamp checkpoints for local voting evidence', async function () {
    const initial = await token.balanceOf(holder.address)
    expect((await token.getVotes(holder.address)).toString()).to.equal('0')

    await token.connect(holder).delegate(holder.address)
    expect((await token.getVotes(holder.address)).toString()).to.equal(initial.toString())
    expect(await token.CLOCK_MODE()).to.equal('mode=timestamp')

    const checkpoint = (await ethers.provider.getBlock('latest')).timestamp
    await ethers.provider.send('evm_increaseTime', [10])
    await ethers.provider.send('evm_mine')
    await token.connect(holder).transfer(recipient.address, ethers.utils.parseUnits('200', 18))
    await ethers.provider.send('evm_increaseTime', [10])
    await ethers.provider.send('evm_mine')

    expect((await token.getPastVotes(holder.address, checkpoint)).toString()).to.equal(initial.toString())
    expect((await token.getVotes(holder.address)).toString()).to.equal(ethers.utils.parseUnits('800', 18).toString())
  })

  it('uses the test fixture shared-decimal policy and quotes exact amounts without adjustment', async function () {
    const amount = ethers.utils.parseUnits('2', 18)
    const conversionRate = await token.decimalConversionRate()
    const quote = await token.quoteOFT(sendParam(amount))

    expect(await token.sharedDecimals()).to.equal(6)
    expect(conversionRate.toString()).to.equal(ethers.BigNumber.from(10).pow(12).toString())
    expect(quote.oftReceipt.amountSentLD.toString()).to.equal(amount.toString())
    expect(quote.oftReceipt.amountReceivedLD.toString()).to.equal(amount.toString())
  })

  it('rejects non-representable amounts before quote, debit, and endpoint enqueueing', async function () {
    const exactAmount = ethers.utils.parseUnits('2', 18)
    const invalidAmount = exactAmount.add(1)
    const beforeBalance = await token.balanceOf(holder.address)
    const beforeSupply = await token.totalSupply()

    await expectRevert(() => token.quoteOFT(sendParam(invalidAmount)), 'UnrepresentableAmount')
    await expectRevert(() => token.quoteSend(sendParam(invalidAmount), false), 'UnrepresentableAmount')

    const fee = { nativeFee: 1000, lzTokenFee: 0 }
    await expectRevert(
      () => token.connect(holder).send(sendParam(invalidAmount), fee, holder.address, { value: fee.nativeFee }),
      'UnrepresentableAmount'
    )

    expect((await token.balanceOf(holder.address)).toString()).to.equal(beforeBalance.toString())
    expect((await token.totalSupply()).toString()).to.equal(beforeSupply.toString())
  })

  it('uses the official Native OFT send path for exactly representable amounts', async function () {
    const amount = ethers.utils.parseUnits('125', 18)
    const beforeBalance = await token.balanceOf(holder.address)
    const beforeSupply = await token.totalSupply()
    const fee = await token.quoteSend(sendParam(amount), false)

    await token.connect(holder).send(sendParam(amount), fee, holder.address, { value: fee.nativeFee })

    expect((await token.balanceOf(holder.address)).toString()).to.equal(beforeBalance.sub(amount).toString())
    expect((await token.totalSupply()).toString()).to.equal(beforeSupply.sub(amount).toString())
  })
})
