// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {IPyth} from "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import {PythStructs} from "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import {PythUtils} from "@pythnetwork/pyth-sdk-solidity/PythUtils.sol";
import "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

contract LendingPool {
    IPyth pyth;

    bytes32 public baseTokenPriceId;
    bytes32 public quoteTokenPriceId;

    ERC20 public baseToken;
    ERC20 public quoteToken;

    uint256 public loanToValueBps;

    struct Position {
        address taker;
        uint amount;
        uint collateral;
    }

    uint public numPositions;
    mapping (uint => Position) public positions;

    constructor(
        address _pyth,
        bytes32 _baseTokenPriceId,
        bytes32 _quoteTokenPriceId,
        address _baseToken,
        address _quoteToken,
        uint256 _loanToValueBps
    ) {
        pyth = IPyth(_pyth);
        baseTokenPriceId = _baseTokenPriceId;
        quoteTokenPriceId = _quoteTokenPriceId;
        baseToken = ERC20(_baseToken);
        quoteToken = ERC20(_quoteToken);
        loanToValueBps = _loanToValueBps;
    }

    function borrow(
        uint amount
    ) external returns (uint positionId) {
        PythStructs.Price memory currentBasePrice = pyth.getPriceNoOlderThan(
            baseTokenPriceId,
            60
        );
        PythStructs.Price memory currentQuotePrice = pyth.getPriceNoOlderThan(
            quoteTokenPriceId,
            60
        );

        uint256 basePrice = PythUtils.convertToUint(currentBasePrice.price, currentBasePrice.expo, 18);
        uint256 quotePrice = PythUtils.convertToUint(currentQuotePrice.price, currentQuotePrice.expo, 18);

        // Calculate collateral based on current price ratio and loan-to-value ratio (in basis points)
        uint256 collateral = (amount * basePrice * 10000) / (quotePrice * loanToValueBps) + 1;

        quoteToken.transferFrom(msg.sender, address(this), collateral);
        baseToken.transfer(msg.sender, amount);

        positionId = numPositions;
        numPositions++;

        Position storage position = positions[positionId];
        position.taker = msg.sender;
        position.amount = amount;
        position.collateral = collateral;
    }

    function repay(
        uint positionId
    ) external payable {
        Position storage position = positions[positionId];
        baseToken.transferFrom(msg.sender, address(this), position.amount);
        quoteToken.transfer(msg.sender, position.collateral);
    }

    receive() external payable {}
}