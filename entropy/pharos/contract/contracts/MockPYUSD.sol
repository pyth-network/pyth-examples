// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockPYUSD is ERC20, Ownable {
    constructor() ERC20("Mock PYUSD", "mPYUSD") Ownable(msg.sender) {
        // Mint 1,000,000 tokens to the deployer
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    // Function to mint tokens for testing
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // Function to get some free tokens for testing (anyone can call)
    function getFreeTokens() external {
        _mint(msg.sender, 1000 * 10**decimals()); // 1000 tokens
    }
}
