// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title IDailyLottery
 * @notice Interface for communication between CryptoRoulette and DailyLottery contracts
 */
interface IDailyLottery {
    /**
     * @notice Adds a player to the whitelist for a specific day
     * @param player Address of the player who won the roulette
     * @param day The day number for which to add the player
     */
    function addToWhitelist(address player, uint256 day) external;

    /**
     * @notice Adds funds to the daily pool
     * @param day The day number for which to add to the pool
     */
    function addToPool(uint256 day) external payable;
}

