// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {console} from "forge-std/console.sol";
import {PythLazer} from "pyth-lazer/PythLazer.sol";
import {PythLazerLib} from "pyth-lazer/PythLazerLib.sol";

contract ExampleReceiver {
    PythLazer pythLazer;
    uint256 verification_fee;
    uint64 public price;
    uint64 public timestamp;

    constructor(address pythLazerAddress) {
        pythLazer = PythLazer(pythLazerAddress);
        verification_fee = pythLazer.verification_fee();
    }

    function updatePrice(bytes calldata update) payable public {
        require(msg.value >= verification_fee, "Insufficient fee provided");
        (bytes memory payload,) = pythLazer.verifyUpdate{value: verification_fee}(update);
        if (msg.value > verification_fee) {
            payable(msg.sender).transfer(msg.value - verification_fee);
    function updatePrice(bytes calldata update) public payable {
        }

        (uint64 _timestamp, PythLazerLib.Channel channel, uint8 feedsLen, uint16 pos) =
            PythLazerLib.parsePayloadHeader(payload);
        console.log("timestamp %d", _timestamp);
        console.log("channel %d", uint8(channel));
        if (channel != PythLazerLib.Channel.RealTime) {
            revert("expected update from RealTime channel");
        }
        console.log("feedsLen %d", feedsLen);
        for (uint8 i = 0; i < feedsLen; i++) {
            uint32 feedId;
            uint8 num_properties;
            (feedId, num_properties, pos) = PythLazerLib.parseFeedHeader(payload, pos);
            console.log("feedId %d", feedId);
            console.log("num_properties %d", num_properties);
            for (uint8 j = 0; j < num_properties; j++) {
                PythLazerLib.PriceFeedProperty property;
                (property, pos) = PythLazerLib.parseFeedProperty(payload, pos);
                if (property == PythLazerLib.PriceFeedProperty.Price) {
                    uint64 _price;
                    (_price, pos) = PythLazerLib.parseFeedValueUint64(payload, pos);
                    console.log("price %d", _price);
                    if (feedId == 2 && _timestamp > timestamp) {
                        price = _price;
                        timestamp = _timestamp;
                    }
                } else if (property == PythLazerLib.PriceFeedProperty.BestBidPrice) {
                    uint64 _price;
                    (_price, pos) = PythLazerLib.parseFeedValueUint64(payload, pos);
                    console.log("best bid price %d", _price);
                } else if (property == PythLazerLib.PriceFeedProperty.BestAskPrice) {
                    uint64 _price;
                    (_price, pos) = PythLazerLib.parseFeedValueUint64(payload, pos);
                    console.log("best ask price %d", _price);
                } else {
                    revert("unknown property");
                }
            }
        }
    }
}
