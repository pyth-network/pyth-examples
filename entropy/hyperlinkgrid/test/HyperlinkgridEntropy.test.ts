import { expect } from "chai";
import { ethers } from "hardhat";
import { HyperlinkgridEntropy, MockUSDC, EntropyMock } from "../typechain-types";

describe("HyperlinkgridEntropy", function () {
  let hyperlinkgrid: HyperlinkgridEntropy;
  let usdc: MockUSDC;
  let entropy: EntropyMock;
  let owner: any;
  let otherAccount: any;
  let users: any[];

  const TILE_PRICE = ethers.parseUnits("100", 6);
  const ENTROPY_FEE = ethers.parseEther("0.01");

  beforeEach(async function () {
    [owner, otherAccount, ...users] = await ethers.getSigners();

    // Deploy Mock USDC
    const MockUSDCFactory = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDCFactory.deploy();
    await usdc.waitForDeployment();

    // Deploy Entropy Mock
    const EntropyMockFactory = await ethers.getContractFactory("EntropyMock");
    entropy = await EntropyMockFactory.deploy();
    await entropy.waitForDeployment();
    
    // Set mock fee (as owner)
    await entropy.connect(owner).setProviderFee(ENTROPY_FEE);

    // Deploy HyperlinkgridEntropy
    const HyperlinkgridFactory = await ethers.getContractFactory("HyperlinkgridEntropy");
    hyperlinkgrid = await HyperlinkgridFactory.deploy(
      await usdc.getAddress(),
      await entropy.getAddress(),
      owner.address // Using owner as entropy provider for simplicity
    );
    await hyperlinkgrid.waitForDeployment();
  });

  it("Should complete the full flow: Buy tiles -> Trigger End Game -> Select Winners", async function () {
    const maxSupply = Number(await hyperlinkgrid.MAX_SUPPLY());
    
    // 1. Buy all tiles
    for (let i = 0; i < maxSupply; i++) {
      const user = users[i];
      // Mint USDC to user
      await usdc.mint(user.address, TILE_PRICE);
      // Approve contract
      await usdc.connect(user).approve(await hyperlinkgrid.getAddress(), TILE_PRICE);
      // Buy tile
      await hyperlinkgrid.connect(user).buyNextTile(0xFF0000, `https://example.com/${i}`);
    }

    expect(await usdc.balanceOf(await hyperlinkgrid.getAddress())).to.equal(TILE_PRICE * BigInt(maxSupply));

    // 2. Trigger End Game
    const userRandom = ethers.hexlify(ethers.randomBytes(32));
    await expect(hyperlinkgrid.triggerEndGame(userRandom, { value: ENTROPY_FEE }))
      .to.emit(hyperlinkgrid, "EndGameRequested");

    const seqNumber = await hyperlinkgrid.endGameSequenceNumber();

    // 3. Simulate Entropy Callback (Provider reveals)
    const providerRandom = ethers.hexlify(ethers.randomBytes(32));
    
    // In a real scenario, the provider would call revealWithCallback on the Entropy contract
    // We verify the EndGameCompleted event
    await expect(entropy.revealWithCallback(
      owner.address,
      seqNumber,
      userRandom,
      providerRandom
    )).to.emit(hyperlinkgrid, "EndGameCompleted");

    // 4. Verify Winners
    const beneficiaries = await hyperlinkgrid.getBeneficiaries();
    expect(beneficiaries.length).to.equal(2);
    
    // Verify Payout
    // Each winner should receive TotalPot / 2
    const totalPot = TILE_PRICE * BigInt(maxSupply);
    const payout = totalPot / 2n;

    // Check balance of one of the winners
    const winnerId = beneficiaries[0];
    const winnerOwner = await hyperlinkgrid.ownerOf(winnerId);
    
    // The winner should have their initial balance (0 after purchase) + payout
    // Wait, we minted exactly TILE_PRICE to them and they spent it. So balance should be payout.
    const winnerBalance = await usdc.balanceOf(winnerOwner);
    expect(winnerBalance).to.equal(payout);
  });
});
