import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";

describe("Battlefield", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [deployer] = await viem.getWalletClients();

  // Mock addresses for Pyth and Entropy contracts
  const mockPythAddress = "0x1234567890123456789012345678901234567890";
  const mockEntropyAddress = "0x9876543210987654321098765432109876543210";

  it("Should deploy Battlefield contract with correct constructor parameters", async function () {
    const battlefield = await viem.deployContract("Battlefield", [
      mockPythAddress,
      mockEntropyAddress,
    ]);

    // Verify the contract was deployed successfully
    assert.ok(battlefield.address);

    // Check if we can read the public state variables
    const pythAddress = await battlefield.read.pyth();
    const entropyAddress = await battlefield.read.entropy();

    assert.equal(pythAddress.toLowerCase(), mockPythAddress.toLowerCase());
    assert.equal(
      entropyAddress.toLowerCase(),
      mockEntropyAddress.toLowerCase()
    );
  });

  it("Should generate correct battle keys for different battle periods", async function () {
    const battlefield = await viem.deployContract("Battlefield", [
      mockPythAddress,
      mockEntropyAddress,
    ]);

    const battleStart1 = 1000n;
    const battleEnd1 = 2000n;
    const battleStart2 = 1000n;
    const battleEnd2 = 3000n;

    const battleKey1 = await battlefield.read.getBattleKey([
      battleStart1,
      battleEnd1,
    ]);
    const battleKey2 = await battlefield.read.getBattleKey([
      battleStart2,
      battleEnd2,
    ]);
    const battleKey1Duplicate = await battlefield.read.getBattleKey([
      battleStart1,
      battleEnd1,
    ]);

    // Same battle parameters should generate the same key
    assert.equal(battleKey1, battleKey1Duplicate);

    // Different battle parameters should generate different keys
    assert.notEqual(battleKey1, battleKey2);
  });

  it("Should emit PredictionCreated event when creating a prediction", async function () {
    const battlefield = await viem.deployContract("Battlefield", [
      mockPythAddress,
      mockEntropyAddress,
    ]);

    const battleStart = 1000n;
    const battleEnd = 2000n;
    const creatorFid = 12345n;
    const priceFeedId =
      "0x1111111111111111111111111111111111111111111111111111111111111111";

    // Just verify the event is emitted with the correct event name and basic parameters
    const hash = await battlefield.write.createPrediction([
      battleStart,
      battleEnd,
      creatorFid,
      priceFeedId,
    ]);
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    // Check that the PredictionCreated event was emitted
    const logs = await publicClient.getContractEvents({
      address: battlefield.address,
      abi: battlefield.abi,
      eventName: "PredictionCreated",
      fromBlock: receipt.blockNumber,
      toBlock: receipt.blockNumber,
    });

    assert.equal(logs.length, 1);
    const eventArgs = logs[0].args;
    assert.ok(eventArgs);
    assert.equal(eventArgs.battleStart, battleStart);
    assert.equal(eventArgs.creatorFid, creatorFid);
    assert.equal(eventArgs.priceFeedId, priceFeedId);
    assert.equal(
      eventArgs.creatorAddress?.toLowerCase(),
      deployer.account.address.toLowerCase()
    );
  });

  it("Should store predictions correctly when created", async function () {
    const battlefield = await viem.deployContract("Battlefield", [
      mockPythAddress,
      mockEntropyAddress,
    ]);

    const battleStart = 1000n;
    const battleEnd = 2000n;
    const creatorFid = 12345n;
    const priceFeedId =
      "0x1111111111111111111111111111111111111111111111111111111111111111";

    // Create a prediction
    await battlefield.write.createPrediction([
      battleStart,
      battleEnd,
      creatorFid,
      priceFeedId,
    ]);

    // Retrieve predictions for this battle
    const predictions = await battlefield.read.getBattlePredictions([
      battleStart,
      battleEnd,
    ]);

    assert.equal(predictions.length, 1);
    assert.equal(
      predictions[0].creatorAddress.toLowerCase(),
      deployer.account.address.toLowerCase()
    );
    assert.equal(predictions[0].creatorFid, creatorFid);
    assert.equal(predictions[0].priceFeedId, priceFeedId);
    assert.equal(predictions[0].priceStart, 0n);
    assert.equal(predictions[0].priceEnd, 0n);
    assert.equal(predictions[0].priceChange, 0n);
    assert.equal(predictions[0].topPriceChangeReward, 0n);
    assert.equal(predictions[0].randomReward, 0n);
  });

  it("Should allow multiple predictions for the same battle", async function () {
    const battlefield = await viem.deployContract("Battlefield", [
      mockPythAddress,
      mockEntropyAddress,
    ]);

    const battleStart = 1000n;
    const battleEnd = 2000n;
    const creatorFid1 = 12345n;
    const creatorFid2 = 67890n;
    const priceFeedId1 =
      "0x1111111111111111111111111111111111111111111111111111111111111111";
    const priceFeedId2 =
      "0x2222222222222222222222222222222222222222222222222222222222222222";

    // Create multiple predictions
    await battlefield.write.createPrediction([
      battleStart,
      battleEnd,
      creatorFid1,
      priceFeedId1,
    ]);
    await battlefield.write.createPrediction([
      battleStart,
      battleEnd,
      creatorFid2,
      priceFeedId2,
    ]);

    // Retrieve predictions for this battle
    const predictions = await battlefield.read.getBattlePredictions([
      battleStart,
      battleEnd,
    ]);

    assert.equal(predictions.length, 2);
    assert.equal(predictions[0].creatorFid, creatorFid1);
    assert.equal(predictions[0].priceFeedId, priceFeedId1);
    assert.equal(predictions[1].creatorFid, creatorFid2);
    assert.equal(predictions[1].priceFeedId, priceFeedId2);
  });

  it("Should return empty array for battles with no predictions", async function () {
    const battlefield = await viem.deployContract("Battlefield", [
      mockPythAddress,
      mockEntropyAddress,
    ]);

    const battleStart = 1000n;
    const battleEnd = 2000n;

    // Retrieve predictions for a battle that has no predictions
    const predictions = await battlefield.read.getBattlePredictions([
      battleStart,
      battleEnd,
    ]);

    assert.equal(predictions.length, 0);
  });

  it("Should have correct reward constants", async function () {
    const battlefield = await viem.deployContract("Battlefield", [
      mockPythAddress,
      mockEntropyAddress,
    ]);

    const topPriceChangeReward =
      await battlefield.read.TOP_PRICE_CHANGE_REWARD();
    const randomReward = await battlefield.read.RANDOM_REWARD();

    // 0.01 ETH in wei
    assert.equal(topPriceChangeReward, 10000000000000000n);

    // 0.005 ETH in wei
    assert.equal(randomReward, 5000000000000000n);
  });

  it("Should separate predictions for different battles", async function () {
    const battlefield = await viem.deployContract("Battlefield", [
      mockPythAddress,
      mockEntropyAddress,
    ]);

    const battleStart1 = 1000n;
    const battleEnd1 = 2000n;
    const battleStart2 = 3000n;
    const battleEnd2 = 4000n;
    const creatorFid = 12345n;
    const priceFeedId =
      "0x1111111111111111111111111111111111111111111111111111111111111111";

    // Create predictions for different battles
    await battlefield.write.createPrediction([
      battleStart1,
      battleEnd1,
      creatorFid,
      priceFeedId,
    ]);
    await battlefield.write.createPrediction([
      battleStart2,
      battleEnd2,
      creatorFid,
      priceFeedId,
    ]);

    // Retrieve predictions for each battle
    const predictions1 = await battlefield.read.getBattlePredictions([
      battleStart1,
      battleEnd1,
    ]);
    const predictions2 = await battlefield.read.getBattlePredictions([
      battleStart2,
      battleEnd2,
    ]);

    assert.equal(predictions1.length, 1);
    assert.equal(predictions2.length, 1);

    // Verify they are stored separately
    assert.notEqual(
      await battlefield.read.getBattleKey([battleStart1, battleEnd1]),
      await battlefield.read.getBattleKey([battleStart2, battleEnd2])
    );
  });
});
