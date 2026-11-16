// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@pythnetwork/entropy-sdk-solidity/IEntropy.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

/**
 * @title RandomAgentSelector
 * @notice Uses Pyth Entropy for verifiable random agent selection
 * @dev Implements IEntropyConsumer to receive random numbers from Pyth Entropy
 * 
 * USE CASES:
 * 1. Random agent selection for bonus rewards
 * 2. Fair LP reward distribution
 * 3. Random rebalancing order to prevent MEV
 * 4. Lottery-style yield bonuses
 */
contract RandomAgentSelector is IEntropyConsumer {
    /// @notice Pyth Entropy contract
    IEntropy public entropy;

    /// @notice Provider for entropy (Pyth's default provider)
    address public entropyProvider;

    /// @notice Owner/admin address
    address public owner;

    /// @notice Mapping of agent addresses to their IDs
    mapping(address => uint256) public agentIds;

    /// @notice Array of all registered agents
    address[] public agents;

    /// @notice Mapping of request IDs to randomness results
    mapping(uint64 => uint256) public randomResults;

    /// @notice Mapping of request IDs to selected agents
    mapping(uint64 => address) public selectedAgents;

    /// @notice Counter for total selections
    uint256 public totalSelections;

    /// @notice Events
    event AgentRegistered(address indexed agent, uint256 agentId);
    event RandomnessRequested(uint64 indexed sequenceNumber, bytes32 userRandomNumber);
    event AgentSelected(uint64 indexed sequenceNumber, address indexed agent, uint256 randomNumber);
    event RewardDistributed(address indexed agent, uint256 amount);

    /// @notice Errors
    error OnlyOwner();
    error OnlyEntropy();
    error InvalidAgent();
    error InsufficientAgents();
    error InsufficientFee();

    /**
     * @notice Constructor
     * @param _entropy Address of Pyth Entropy contract
     * @param _entropyProvider Address of the entropy provider (Pyth's default)
     */
    constructor(address _entropy, address _entropyProvider) {
        entropy = IEntropy(_entropy);
        entropyProvider = _entropyProvider;
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    /**
     * @notice Register an agent for random selection
     * @param agent Address of the agent to register
     */
    function registerAgent(address agent) external onlyOwner {
        if (agent == address(0)) revert InvalidAgent();
        
        uint256 agentId = agents.length;
        agents.push(agent);
        agentIds[agent] = agentId;

        emit AgentRegistered(agent, agentId);
    }

    /**
     * @notice Request random agent selection
     * @param userRandomNumber User-provided random number for additional entropy
     * @return sequenceNumber The sequence number of the request
     */
    function requestRandomAgent(bytes32 userRandomNumber) external payable returns (uint64) {
        if (agents.length == 0) revert InsufficientAgents();

        // Get the required fee from Entropy
        uint128 requestFee = entropy.getFee(entropyProvider);
        if (msg.value < requestFee) revert InsufficientFee();

        // Request random number from Pyth Entropy
        uint64 sequenceNumber = entropy.requestWithCallback{value: requestFee}(
            entropyProvider,
            userRandomNumber
        );

        totalSelections++;

        emit RandomnessRequested(sequenceNumber, userRandomNumber);

        return sequenceNumber;
    }

    /**
     * @notice Callback function called by Pyth Entropy with random number
     * @param sequenceNumber The sequence number of the request
     * @param randomNumber The random number generated
     */
    function entropyCallback(
        uint64 sequenceNumber,
        address /* provider */,
        bytes32 randomNumber
    ) internal override {
        if (msg.sender != address(entropy)) revert OnlyEntropy();
        
        // Convert bytes32 to uint256
        uint256 random = uint256(randomNumber);
        
        // Store the random result
        randomResults[sequenceNumber] = random;

        // Select agent using modulo
        uint256 selectedIndex = random % agents.length;
        address selectedAgent = agents[selectedIndex];
        
        selectedAgents[sequenceNumber] = selectedAgent;

        emit AgentSelected(sequenceNumber, selectedAgent, random);
    }

    /**
     * @notice Get the selected agent for a specific request
     * @param sequenceNumber The sequence number of the request
     * @return The address of the selected agent
     */
    function getSelectedAgent(uint64 sequenceNumber) external view returns (address) {
        return selectedAgents[sequenceNumber];
    }

    /**
     * @notice Get all registered agents
     * @return Array of all agent addresses
     */
    function getAllAgents() external view returns (address[] memory) {
        return agents;
    }

    /**
     * @notice Get total number of registered agents
     * @return Total agent count
     */
    function getAgentCount() external view returns (uint256) {
        return agents.length;
    }

    /**
     * @notice Distribute rewards to randomly selected agent
     * @param sequenceNumber The sequence number that selected the agent
     */
    function distributeReward(uint64 sequenceNumber) external payable onlyOwner {
        address agent = selectedAgents[sequenceNumber];
        if (agent == address(0)) revert InvalidAgent();

        uint256 amount = msg.value;
        (bool success, ) = agent.call{value: amount}("");
        require(success, "Transfer failed");

        emit RewardDistributed(agent, amount);
    }

    /**
     * @notice Get Entropy address (required by IEntropyConsumer)
     * @return Address of the Entropy contract
     */
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    /**
     * @notice Receive function to accept ETH
     */
    receive() external payable {}
}

