// SPDX-License-Identifier: Apache 2
pragma solidity ^0.8.0;

import "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

contract CoinFlip is IEntropyConsumer {
    event RandomRequest(uint64 sequenceNumber, address user);
    event RandomResult(address user, bytes32 randomNumber, bool isHeads);

    IEntropyV2 private entropy;
    address private entropyProvider;

    struct UserResult {
        bytes32 randomNumber;
        bool isHeads;
        uint256 timestamp;
        bool exists;
    }
    
    mapping(uint64 => address) public requestToUser;
    mapping(address => UserResult) public userLatestResult;
    
    error InsufficientFee();

    constructor(address _entropy, address _entropyProvider) {
        entropy = IEntropyV2(_entropy);
        entropyProvider = _entropyProvider;
    }

    /**
     * @dev Request a random number for the calling user
     * @return sequenceNumber The unique identifier for this request
     */
    function requestRandom() external payable returns (uint64) {
        uint256 fee = entropy.getFeeV2();
        if (msg.value < fee) {
            revert InsufficientFee();
        }

        uint64 sequenceNumber = entropy.requestV2{value: fee}();
        
        requestToUser[sequenceNumber] = msg.sender;
        
        emit RandomRequest(sequenceNumber, msg.sender);
        return sequenceNumber;
    }

    /**
     * @dev Callback function called by Entropy contract with the random result
     * @param sequenceNumber Unique identifier for the request
     * @param randomNumber The 32-byte cryptographically secure random hash
     */
    function entropyCallback(
        uint64 sequenceNumber,
        address, 
        bytes32 randomNumber
    ) internal override {
        address user = requestToUser[sequenceNumber];
        require(user != address(0), "Invalid request");
        

        bool isHeads = uint256(randomNumber) % 2 == 0;
        

        userLatestResult[user] = UserResult({
            randomNumber: randomNumber,
            isHeads: isHeads,
            timestamp: block.timestamp,
            exists: true
        });
        

        delete requestToUser[sequenceNumber];
        
        emit RandomResult(user, randomNumber, isHeads);
    }

    /**
     * @dev Get the latest result for a user
     * @param user The address to query
     * @return randomNumber The 32-byte random hash
     * @return isHeads The heads/tails result (true = heads, false = tails)
     * @return timestamp When the result was generated
     * @return exists Whether the user has any result
     */
    function getUserResult(address user) 
        external 
        view 
        returns (bytes32 randomNumber, bool isHeads, uint256 timestamp, bool exists) 
    {
        UserResult storage result = userLatestResult[user];
        return (result.randomNumber, result.isHeads, result.timestamp, result.exists);
    }

    /**
     * @dev Check if a user has a random result
     * @param user The address to query
     * @return exists Whether the user has a result
     */
    function hasUserResult(address user) external view returns (bool) {
        return userLatestResult[user].exists;
    }

    /**
     * @dev Get the required fee for a random number request
     * @return fee The required fee in wei
     */
    function getRequestFee() public view returns (uint256) {
        return entropy.getFeeV2();
    }

    /**
     * @dev Required by IEntropyConsumer interface
     * @return address of the entropy contract
     */
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    // Allow the contract to receive funds
    receive() external payable {}
}