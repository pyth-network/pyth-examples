// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/LendingPool.sol";
import "@pythnetwork/pyth-sdk-solidity/MockPyth.sol";
import "openzeppelin-contracts/contracts/mocks/ERC20Mock.sol";

contract LendingPoolTest is Test {
    MockPyth public mockPyth;

    bytes32 constant BASE_PRICE_ID =
        0x000000000000000000000000000000000000000000000000000000000000abcd;
    bytes32 constant QUOTE_PRICE_ID =
        0x0000000000000000000000000000000000000000000000000000000000001234;

    ERC20Mock baseToken;
    address payable constant BASE_TOKEN_MINT =
        payable(0x0000000000000000000000000000000000000011);
    ERC20Mock quoteToken;
    address payable constant QUOTE_TOKEN_MINT =
        payable(0x0000000000000000000000000000000000000022);

    LendingPool public pool;

    uint256 MAX_INT = 2 ** 256 - 1;

    function setUp() public {
        mockPyth = new MockPyth(60, 1);

        baseToken = new ERC20Mock(
            "Foo token",
            "FOO",
            BASE_TOKEN_MINT,
            1000 * 10 ** 18
        );
        quoteToken = new ERC20Mock(
            "Bar token",
            "BAR",
            QUOTE_TOKEN_MINT,
            1000 * 10 ** 18
        );

        pool = new LendingPool(
            address(mockPyth),
            BASE_PRICE_ID,
            QUOTE_PRICE_ID,
            address(baseToken),
            address(quoteToken),
            5000
        );
    }

    function testPool() public {
        baseToken.mint(address(this), 20e18);
        quoteToken.mint(address(this), 20e18);

        baseToken.mint(address(pool), 20e18);
        quoteToken.mint(address(pool), 20e18);

        assertEq(quoteToken.balanceOf(address(this)), 20e18);
        assertEq(baseToken.balanceOf(address(this)), 20e18);

        int64 basePrice = 100;
        int64 quotePrice = 1;

        bytes[] memory updateData = new bytes[](2);
        updateData[0] = mockPyth.createPriceFeedUpdateData(
            BASE_PRICE_ID,
            basePrice * 100000,
            10 * 100000,
            -5,
            basePrice * 100000,
            10 * 100000,
            uint64(block.timestamp),
            uint64(block.timestamp)
        );
        updateData[1] = mockPyth.createPriceFeedUpdateData(
            QUOTE_PRICE_ID,
            quotePrice * 100000,
            10 * 100000,
            -5,
            quotePrice * 100000,
            10 * 100000,
            uint64(block.timestamp),
            uint64(block.timestamp)
        );

        baseToken.approve(address(pool), MAX_INT);
        quoteToken.approve(address(pool), MAX_INT);

        uint value = mockPyth.getUpdateFee(updateData);
        vm.deal(address(this), value);
        uint positionId = pool.borrow{value: value}(100, updateData);

        assertEq(quoteToken.balanceOf(address(this)), 20e18 - 20000 );
        assertEq(baseToken.balanceOf(address(this)), 20e18 + 100);

        pool.repay(positionId);

        assertEq(quoteToken.balanceOf(address(this)), 20e18);
        assertEq(baseToken.balanceOf(address(this)), 20e18);
    }

    receive() external payable {}
}