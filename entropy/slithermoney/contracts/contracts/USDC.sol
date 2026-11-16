// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract USDC {
    string public name = "USDC";
    string public symbol = "USDC";
    uint8 public decimals = 6; // USDC uses 6 decimals
    
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    /**
     * @notice Mint tokens to any address
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint (in token units, not wei)
     */
    function mint(address to, uint256 amount) external {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
    
    /**
     * @notice Transfer tokens
     * @param to Address to transfer to
     * @param amount Amount of tokens to transfer
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }
    
    /**
     * @notice Transfer tokens from one address to another (requires approval)
     * @param from Address to transfer from
     * @param to Address to transfer to
     * @param amount Amount of tokens to transfer
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        
        emit Transfer(from, to, amount);
        return true;
    }
    
    /**
     * @notice Approve spender to transfer tokens on behalf of owner
     * @param spender Address to approve
     * @param amount Amount of tokens to approve
     */
    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }
}

