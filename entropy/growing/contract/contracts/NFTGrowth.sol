// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IEntropyConsumer} from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import {IEntropyV2} from "@pythnetwork/entropy-sdk-solidity/IEntropyV2.sol";

import "./NFT.sol";

enum NFTStatus {
    ALIVE,
    DEAD
}

enum Result {
    SUCCESS,
    FAILURE,
    DEATH
}

enum LockStatus {
    UNLOCKED,
    LOCKED
}

struct NFTInfo {
    uint256 level;
    NFTStatus status;
}

struct RandomRequest {
    address sender;
    uint256 tokenId;
    uint256 timestamp;
}

struct UpgradeChances {
    uint upgradeChance;
    uint failChance;
    uint burnChance;
}

struct NFTLock {
    uint timestamp;
    LockStatus status;
}

event NFTResult(
    address indexed sender,
    uint256 indexed tokenId,
    uint64 sequenceNumber,
    NFTInfo nftInfo,
    Result result
);

event NftGrowthRequested(
    address indexed sender,
    uint256 indexed tokenId,
    uint64 sequenceNumber
);

contract NFTGrowth is NFT, IEntropyConsumer {
    IEntropy entropy;
    uint256 maxLevel = 5;
    uint256 successChance = 4000;
    uint256 failChance = 4000;
    uint256 deathChance = 2000;

    mapping(uint256 => NFTInfo) public nftInfo;

    mapping(uint64 => RandomRequest) public pendingRandomRequests;

    mapping(uint256 => NFTLock) public nftLock;

    constructor(address _entropy) {
        entropy = IEntropy(_entropy);
    }

    function requireLock(uint256 tokenId) private view {
        require(nftLock[tokenId].status == LockStatus.LOCKED, "Not locked");
        require(
            block.timestamp >= nftLock[tokenId].timestamp + 10 minutes,
            "Lock period not expired"
        );
    }

    function requireOwnership(uint256 tokenId) private view {
        require(ownerOf(tokenId) == msg.sender, "Permission denied");
    }

    function mint() public {
        uint256 tokenId = _nextTokenId();
        _safeMint(msg.sender, 1);
        nftInfo[tokenId] = NFTInfo({level: 1, status: NFTStatus.ALIVE});
    }

    function grow(uint256 tokenId, bytes32 userRandomNumber) external payable {
        requireOwnership(tokenId);
        require(
            nftLock[tokenId].status == LockStatus.UNLOCKED,
            "NFT is locked"
        );
        require(nftInfo[tokenId].status == NFTStatus.ALIVE, "NFT is dead");
        require(nftInfo[tokenId].level < maxLevel, "Already max level");

        uint128 requestFee = entropy.getFeeV2();
        require(msg.value >= requestFee, "Not enough fees");

        nftLock[tokenId].status = LockStatus.LOCKED;
        nftLock[tokenId].timestamp = block.timestamp;

        uint64 sequenceNumber = entropy.requestV2();

        pendingRandomRequests[sequenceNumber] = RandomRequest({
            sender: msg.sender,
            tokenId: tokenId,
            timestamp: block.timestamp
        });

        emit NftGrowthRequested(msg.sender, tokenId, sequenceNumber);
    }

    function entropyCallback(
        uint64 sequenceNumber,
        address provider,
        bytes32 randomNumber
    ) internal override {
        RandomRequest memory request = pendingRandomRequests[sequenceNumber];
        require(request.sender != address(0), "Request not found");

        NFTInfo storage info = nftInfo[request.tokenId];

        uint randomValue = uint(randomNumber) % 10000;

        uint sumChances = successChance + failChance + deathChance;

        Result result;
        if (randomValue < successChance) {
            info.level++;
            result = Result.SUCCESS;
        } else if (randomValue < successChance + failChance) {
            result = Result.FAILURE;
        } else if (randomValue < sumChances) {
            info.status = NFTStatus.DEAD;
            result = Result.DEATH;
        }

        nftLock[request.tokenId].status = LockStatus.UNLOCKED;

        delete pendingRandomRequests[sequenceNumber];

        emit NFTResult(
            request.sender,
            request.tokenId,
            sequenceNumber,
            info,
            result
        );
    }

    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }

    function getGrowFee() public view returns (uint256 fee) {
        fee = entropy.getFeeV2();
    }

    function unlock(uint256 tokenId) public {
        requireOwnership(tokenId);
        requireLock(tokenId);
        nftLock[tokenId].status = LockStatus.UNLOCKED;
    }

    function ownerUnlock(uint256 tokenId) public onlyOwner {
        requireLock(tokenId);
        nftLock[tokenId].status = LockStatus.UNLOCKED;
    }
}
