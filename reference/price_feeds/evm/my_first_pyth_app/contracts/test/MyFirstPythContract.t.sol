// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
 
import { Test, console2 } from "forge-std/Test.sol";
import { MyFirstPythContract } from "../src/MyFirstPythContract.sol";
import { MockPyth } from "@pythnetwork/pyth-sdk-solidity/MockPyth.sol";
 
contract MyFirstPythContractTest is Test {
  MockPyth public pyth;
  bytes32 ETH_PRICE_FEED_ID = bytes32(uint256(0x1));
  MyFirstPythContract public app;
 
  uint256 ETH_TO_WEI = 10 ** 18;
 
  function setUp() public {
    pyth = new MockPyth(60, 1);
    app = new MyFirstPythContract(address(pyth), ETH_PRICE_FEED_ID);
  }
 
  function createEthUpdate(
    int64 ethPrice
  ) private view returns (bytes[] memory) {
    bytes[] memory updateData = new bytes[](1);
    updateData[0] = pyth.createPriceFeedUpdateData(
      ETH_PRICE_FEED_ID,
      ethPrice * 100000, // price
      10 * 100000, // confidence
      -5, // exponent
      ethPrice * 100000, // emaPrice
      10 * 100000, // emaConfidence
      uint64(block.timestamp), // publishTime
      uint64(block.timestamp) // prevPublishTime
    );
 
    return updateData;
  }
 
  function setEthPrice(int64 ethPrice) private {
    bytes[] memory updateData = createEthUpdate(ethPrice);
    uint value = pyth.getUpdateFee(updateData);
    vm.deal(address(this), value);
    pyth.updatePriceFeeds{ value: value }(updateData);
  }
 
  function testMint() public {
    setEthPrice(100);
 
    vm.deal(address(this), ETH_TO_WEI);
    app.mint{ value: ETH_TO_WEI / 100 }();
  }
 
  function testMintRevert() public {
    setEthPrice(99);
 
    vm.deal(address(this), ETH_TO_WEI);
    vm.expectRevert();
    app.mint{ value: ETH_TO_WEI / 100 }();
  }

    function testMintStalePrice() public {
    setEthPrice(100);
 
    skip(120);
 
    vm.deal(address(this), ETH_TO_WEI);
    vm.expectRevert();
    app.mint{ value: ETH_TO_WEI / 100 }();
  }

  function testUpdateAndMint() public {
    bytes[] memory updateData = createEthUpdate(100);
 
    vm.deal(address(this), ETH_TO_WEI);
    app.updateAndMint{ value: ETH_TO_WEI / 100 }(updateData);
  }
}
 