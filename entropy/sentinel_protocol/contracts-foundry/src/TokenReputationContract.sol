// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@pythnetwork/pyth-sdk-solidity/IPyth.sol";
import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropy.sol";
import "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

contract TokenReputationContract is IEntropyConsumer {
    // === Core Contracts ===
    IPyth public pyth;
    IEntropy private entropy;
    address private entropyProvider;

    // === Owner ===
    address public owner;

    // === Structs ===
    struct Scores {
        uint256 marketStability;
        uint256 fundamentalStrength;
        uint256 risk;
        uint256 reputationScore;
    }

    struct PriceData {
        int64 price;
        uint64 conf;
        int32 expo;
        uint256 publishTime;
    }

    // === State Mappings ===
    mapping(string => Scores) private tokenScores;
    mapping(string => bytes32) public tokenPriceFeedIds;
    mapping(string => bool) private tokenExists;
    mapping(uint64 => string) private entropyRequests;

    // === Token List ===
    string[] private tokenList;

    // === Constants ===
    uint256 public constant PRICE_STALENESS_THRESHOLD = 60;

    // === Events ===
    event ScoresUpdated(string token, uint256 market, uint256 fundamental, uint256 risk, uint256 reputation);
    event PriceFeedIdSet(string token, bytes32 priceFeedId);
    event PriceUpdated(string token, int64 price, uint64 confidence, uint256 publishTime);
    event EntropyRequested(uint64 sequenceNumber, string token);
    event EntropyReceived(uint64 sequenceNumber, bytes32 randomNumber, string token);

    // === Constructor ===
    constructor(
        address _pythContract,
        address _entropyContract,
        address _entropyProvider
    ) {
        owner = msg.sender;
        pyth = IPyth(_pythContract);
        entropy = IEntropy(_entropyContract);
        entropyProvider = _entropyProvider;
    }

    // === Modifiers ===
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    // === Required by IEntropyConsumer ===
    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    // === Price Feed Management ===
    function setPriceFeedId(string calldata token, bytes32 priceFeedId) external onlyOwner {
        tokenPriceFeedIds[token] = priceFeedId;
        emit PriceFeedIdSet(token, priceFeedId);
    }

    function batchSetPriceFeedIds(
        string[] calldata tokens,
        bytes32[] calldata priceFeedIds
    ) external onlyOwner {
        require(tokens.length == priceFeedIds.length, "Array length mismatch");
        for (uint256 i = 0; i < tokens.length; i++) {
            tokenPriceFeedIds[tokens[i]] = priceFeedIds[i];
            emit PriceFeedIdSet(tokens[i], priceFeedIds[i]);
        }
    }

    // === External Wrapper ===
    function getLatestPrice(
        string calldata token
    ) public view returns (int64 price, uint64 confidence, int32 expo, uint256 publishTime) {
        return _getLatestPrice(token);
    }

    // === Internal version (memory-based) ===
    function _getLatestPrice(
        string memory token
    ) internal view returns (int64 price, uint64 confidence, int32 expo, uint256 publishTime) {
        bytes32 priceFeedId = tokenPriceFeedIds[token];
        require(priceFeedId != bytes32(0), "Price feed not set for token");

        PythStructs.Price memory priceData = pyth.getPriceUnsafe(priceFeedId);
        return (priceData.price, priceData.conf, priceData.expo, priceData.publishTime);
    }

    function getPriceNoOlderThan(
        string calldata token,
        uint256 age
    ) public view returns (int64 price, uint64 confidence, int32 expo, uint256 publishTime) {
        bytes32 priceFeedId = tokenPriceFeedIds[token];
        require(priceFeedId != bytes32(0), "Price feed not set for token");

        PythStructs.Price memory priceData = pyth.getPriceNoOlderThan(priceFeedId, age);
        return (priceData.price, priceData.conf, priceData.expo, priceData.publishTime);
    }

    function updatePriceFeeds(bytes[] calldata priceUpdateData) public payable {
        uint256 fee = pyth.getUpdateFee(priceUpdateData);
        require(msg.value >= fee, "Insufficient fee");

        pyth.updatePriceFeeds{value: fee}(priceUpdateData);

        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
    }

    // === Entropy Integration ===
    function requestRandomEntropy(string calldata token) public payable onlyOwner {
        uint256 fee = entropy.getFee(entropyProvider);
        uint64 seqNum = entropy.requestWithCallback{value: fee}(entropyProvider, keccak256(abi.encodePacked(token, block.timestamp)));
        entropyRequests[seqNum] = token;
        emit EntropyRequested(seqNum, token);
    }

    function entropyCallback(
        uint64 sequenceNumber,
        address,
        bytes32 entropyRandomNumber
    ) internal override {
        string memory token = entropyRequests[sequenceNumber];
        require(bytes(token).length > 0, "Unknown sequence number");

        // Use entropy + price to dynamically recompute scores
        (int64 price, , , ) = _getLatestPrice(token);
        uint256 randomFactor = uint256(entropyRandomNumber) % 100;

        Scores memory s = tokenScores[token];

        // Update scores based on random + price movement
        s.marketStability = uint256(int256(s.marketStability) + (price % 3)) % 100;
        s.fundamentalStrength = (s.fundamentalStrength + randomFactor / 2) % 100;
        s.risk = (s.risk + randomFactor) % 100;
        s.reputationScore = (100 + s.marketStability + s.fundamentalStrength - s.risk) / 3;

        tokenScores[token] = s;

        emit EntropyReceived(sequenceNumber, entropyRandomNumber, token);
        emit ScoresUpdated(token, s.marketStability, s.fundamentalStrength, s.risk, s.reputationScore);
    }

    // === Score Management ===
    function setScores(
        string calldata token,
        uint256 marketStability,
        uint256 fundamentalStrength,
        uint256 risk,
        uint256 reputationScore
    ) public onlyOwner {
        if (!tokenExists[token]) {
            tokenList.push(token);
            tokenExists[token] = true;
        }

        tokenScores[token] = Scores({
            marketStability: marketStability,
            fundamentalStrength: fundamentalStrength,
            risk: risk,
            reputationScore: reputationScore
        });

        emit ScoresUpdated(token, marketStability, fundamentalStrength, risk, reputationScore);
    }

    function getScores(
        string calldata token
    ) external view returns (uint256 marketStability, uint256 fundamentalStrength, uint256 risk, uint256 reputationScore) {
        Scores memory s = tokenScores[token];
        return (s.marketStability, s.fundamentalStrength, s.risk, s.reputationScore);
    }

    function getTokenData(
        string calldata token
    ) external view returns (
        uint256 marketStability,
        uint256 fundamentalStrength,
        uint256 risk,
        uint256 reputationScore,
        int64 price,
        uint64 confidence,
        int32 expo,
        uint256 publishTime
    ) {
        Scores memory s = tokenScores[token];
        (int64 p, uint64 conf, int32 exp, uint256 pubTime) = _getLatestPrice(token);
        return (s.marketStability, s.fundamentalStrength, s.risk, s.reputationScore, p, conf, exp, pubTime);
    }

    function getAllTokens() external view returns (string[] memory) {
        return tokenList;
    }

    // === Owner Utilities ===
    function withdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    receive() external payable {}
}
