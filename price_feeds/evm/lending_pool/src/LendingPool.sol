// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "@pythnetwork/pyth-sdk-solidity/PythUtils.sol";
import "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

// IMPORTANT: This contract is not for production use. It is for demonstration purposes only.
// It lacks proper security measures, error handling, and has not been audited.
// Do not use this code in a live environment without thorough review and testing.

contract LendingPool {
    IPyth pyth;

    bytes32 baseTokenPriceId;
    bytes32 quoteTokenPriceId;

    ERC20 public baseToken;
    ERC20 public quoteToken;

    uint256 loanToValueBps;

    struct Position {
        address taker;
        uint amount;
        uint collateral;
    }

    uint numPositions;
    mapping (uint => Position) positions;

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
        uint amount,
        bytes[] calldata pythUpdateData
    ) external payable returns (uint positionId) {
        uint fee = pyth.getUpdateFee(pythUpdateData);
        pyth.updatePriceFeeds{value: fee}(pythUpdateData);
        PythStructs.Price memory currentBasePrice = pyth.getPriceNoOlderThan(
            baseTokenPriceId,
            60
        );
        PythStructs.Price memory currentQuotePrice = pyth.getPriceNoOlderThan(
            quoteTokenPriceId,
            60
        );

        uint256 basePrice = PythUtils.convertToUint(currentBasePrice.price,currentBasePrice.expo, 18);
        uint256 quotePrice = PythUtils.convertToUint(currentQuotePrice.price,currentQuotePrice.expo, 18);

        uint256 collateral = (amount * basePrice * 10000) / (quotePrice * loanToValueBps);

        positionId = numPositions;
        numPositions++;

        Position storage position = positions[positionId];
        position.taker = msg.sender;
        position.amount = amount;
        position.collateral = collateral;

        quoteToken.transferFrom(msg.sender, address(this), collateral);
        baseToken.transfer(msg.sender, amount);

        
    }

    function repay(
        uint positionId
    ) external payable {
        Position storage position = positions[positionId];
        require(msg.sender == position.taker, "Only the taker can repay");
        baseToken.transferFrom(msg.sender, address(this), position.amount);
        quoteToken.transfer(msg.sender, position.collateral);
    }

    receive() external payable {}
}