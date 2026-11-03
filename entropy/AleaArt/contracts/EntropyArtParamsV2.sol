// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EntropyArtParamsV2
 * @notice Fully compliant Pyth Entropy v2 Consumer for Arbitrum Sepolia
 * - Uses official @pythnetwork/entropy-sdk-solidity
 * - Requests randomness via provider callback
 * - Generates deterministic art parameters from randomness
 * 
 * Network: Arbitrum Sepolia
 * Entropy Contract: 0x549Ebba8036Ab746611B4fFA1423eb0A4Df61440
 * Default Provider: 0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6344
 */

import { IEntropyV2 } from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";
import { IEntropyConsumer } from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";

contract EntropyArtParamsV2 is IEntropyConsumer {
    // 🔹 Entropy contract on Arbitrum Sepolia
    IEntropyV2 public constant ENTROPY =
        IEntropyV2(0x549Ebba8036Ab746611B4fFA1423eb0A4Df61440);

    // 🔹 Default provider (Arbitrum Sepolia)
    address public constant DEFAULT_PROVIDER =
        0x6CC14824Ea2918f5De5C2f75A9Da968ad4BD6344;

    // 🔹 Gas limit for the callback
    uint32 public constant CALLBACK_GAS_LIMIT = 200_000;

    // 🔹 Domain separator for uniqueness
    bytes32 public immutable COLLECTION_SALT;

    uint256 public nextTokenId = 1;

    // Mapping: requestId → tokenId
    mapping(uint64 => uint256) public requestToTokenId;
    // Mapping: tokenId → final randomness seed
    mapping(uint256 => bytes32) public tokenSeed;

    struct RenderParams {
        uint8  promptIndex;
        uint8  styleIndex;
        uint8  samplerIndex;
        uint8  aspectIndex;
        uint16 steps;
        uint16 cfg;
        uint32 latentSeed;
        uint16 paletteId;
    }

    mapping(uint256 => RenderParams) internal _params;

    event EntropyRequested(uint256 indexed tokenId, uint64 indexed requestId, uint256 feePaid);
    event EntropyFulfilled(uint256 indexed tokenId, bytes32 seed);

    constructor(bytes32 collectionSalt) {
        COLLECTION_SALT = collectionSalt;
    }

    // 🔹 Required by IEntropyConsumer
    function getEntropy() internal pure override returns (address) {
        return address(ENTROPY);
    }

    // 🔹 View fee (dynamically determined by provider gas limit)
    function quoteEntropyFee() public view returns (uint256) {
        return ENTROPY.getFeeV2(DEFAULT_PROVIDER, CALLBACK_GAS_LIMIT);
    }

    // 🔹 Request random number for next art token
    function requestArtParams()
        external
        payable
        returns (uint256 tokenId, uint64 requestId)
    {
        uint256 fee = ENTROPY.getFeeV2(DEFAULT_PROVIDER, CALLBACK_GAS_LIMIT);
        require(msg.value >= fee, "fee too low");

        tokenId = nextTokenId++;

        // Request randomness with provider and callback gas limit
        requestId = ENTROPY.requestV2{ value: fee }(
            DEFAULT_PROVIDER,
            CALLBACK_GAS_LIMIT
        );

        requestToTokenId[requestId] = tokenId;

        // Refund extra ETH if sent
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }

        emit EntropyRequested(tokenId, requestId, fee);
    }

    // 🔹 Callback from Pyth Entropy
    function entropyCallback(
        uint64 sequenceNumber,
        address /* provider */,
        bytes32 randomNumber
    ) internal override {
        // Only callable by the Entropy contract
        require(msg.sender == address(ENTROPY), "unauthorized");

        uint256 tokenId = requestToTokenId[sequenceNumber];
        require(tokenId != 0, "unknown request");
        require(tokenSeed[tokenId] == bytes32(0), "already fulfilled");

        // Combine randomness with salt for uniqueness
        bytes32 seed = keccak256(abi.encodePacked(randomNumber, tokenId, COLLECTION_SALT));
        tokenSeed[tokenId] = seed;

        // Derive render parameters
        _params[tokenId] = _deriveParams(seed);

        emit EntropyFulfilled(tokenId, seed);
    }

    // 🔹 Derive visual parameters from randomness
    function _deriveParams(bytes32 seed)
        internal
        pure
        returns (RenderParams memory p)
    {
        uint256 s0 = uint256(seed);
        uint256 s1 = uint256(keccak256(abi.encodePacked(seed, uint256(1))));
        uint256 s2 = uint256(keccak256(abi.encodePacked(seed, uint256(2))));
        uint256 s3 = uint256(keccak256(abi.encodePacked(seed, uint256(3))));

        p.promptIndex  = uint8(s0 % 12);
        p.styleIndex   = uint8((s0 >> 40) % 10);
        p.samplerIndex = uint8((s1 >> 96) % 6);
        p.aspectIndex  = uint8((s1 >> 160) % 5);
        p.paletteId    = uint16((s2 >> 200) % 24);
        p.steps        = uint16(18 + (s2 % 47));      // 18–64
        p.cfg          = uint16(70 + (s3 % 111));     // 7.0–18.0 (×10)
        p.latentSeed   = uint32(s3);
    }

    // 🔹 Public view of generated art parameters
    function viewRenderParams(uint256 tokenId)
        external
        view
        returns (RenderParams memory)
    {
        require(tokenSeed[tokenId] != bytes32(0), "not ready");
        return _params[tokenId];
    }

    receive() external payable {}
    fallback() external payable {}
}
