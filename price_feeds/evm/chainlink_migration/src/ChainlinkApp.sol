// SPDX-License-Identifier: Apache 2
pragma solidity ^0.8.0;

import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

// Mock app that depends on Chainlink price feeds via the AggregatorV3Interface.
contract ChainlinkApp {
  AggregatorV3Interface ethOracle;
  AggregatorV3Interface solOracle;

  constructor(
    address ethAggregator,
    address solAggregator
  ) {
    ethOracle = AggregatorV3Interface(ethAggregator);
    solOracle = AggregatorV3Interface(solAggregator);
  }

  function getEthSolPrice() external view returns (int256 price) {
    int256 ethAnswer;
    int256 solAnswer;
    (, ethAnswer, , , ) = ethOracle.latestRoundData();
    (, solAnswer, , ,) = solOracle.latestRoundData();

    return ethAnswer / solAnswer;
  }
}
