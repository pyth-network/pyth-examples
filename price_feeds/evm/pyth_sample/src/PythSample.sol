// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;


import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";


contract PythSample {

    IPyth pyth;

    // @param pyth: The contract address of the Pyth contract. Instantiate it with the Pyth contract address from https://docs.pyth.network/price-feeds/contract-addresses/evm
    constructor(address _pyth) {
        pyth = IPyth(_pyth);
    }

    // @param priceId: Each price feed (e.g., ETH/USD) is identified by a price feed ID. The complete list of feed IDs is available at https://pyth.network/developers/price-feed-ids
    // @return price: The current price of the price feed
    function getPrice(bytes32 priceId) public view returns (uint256) {
        
        PythStructs.Price memory price = pyth.getPriceNoOlderThan(priceId, 180);
        return uint256(int256(price.price));
    }

    // @param priceId: Each price feed (e.g., ETH/USD) is identified by a price feed ID. The complete list of feed IDs is available at https://pyth.network/developers/price-feed-ids
    // @param priceUpdate: The encoded data to update the contract with the latest pricecontract-addresses/evm
    function getLatestPrice(bytes32 priceId, bytes[] calldata priceUpdate) public payable returns (PythStructs.Price memory) {

        uint updateFee = pyth.getUpdateFee(priceUpdate);
        pyth.updatePriceFeeds{ value: updateFee }(priceUpdate);

        return pyth.getPriceNoOlderThan(priceId, 60);
    }

    // @dev: This function is an example method to update multiple price feeds at once.
    // @param priceIds: The price ids of the price feeds.
    // @param priceUpdates: The encoded data to update the contract with the latest price
    function getLatestPrices(bytes32[] calldata priceIds, bytes[] calldata priceUpdates) public payable returns (PythStructs.Price[] memory) {

        // Calculate the update fee for the price feeds
        // One can update multiple price feeds by calling the updatePriceFeeds function once.
        uint updateFee = pyth.getUpdateFee(priceUpdates);
        pyth.updatePriceFeeds{ value: updateFee }(priceUpdates);

        // Get the latest prices for the price feeds
        PythStructs.Price[] memory prices = new PythStructs.Price[](priceIds.length);
        for (uint i = 0; i < priceIds.length; i++) {
            prices[i] = pyth.getPriceNoOlderThan(priceIds[i], 60);
        }
        return prices;
    }

}
