// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {IEntropyConsumer} from "@pythnetwork/entropy-sdk-solidity/IEntropyConsumer.sol";
import {IEntropy} from "@pythnetwork/entropy-sdk-solidity/IEntropy.sol";

contract PlaylistReputationNFT is ERC721A, Ownable, IEntropyConsumer {
    struct PlaylistInfo {
        string name;
        string playlistId;
        uint256 reputation; 
        uint256 createdAt;
        bool isActive;
    }

    IEntropy entropy;
    address entropyProvider;
    
    mapping(uint256 => PlaylistInfo) public playlists;
    mapping(uint64 => uint256) public pendingDecayRequests; 
    mapping(address => mapping(uint256 => bool)) public hasVoted; 
    

    uint256 public constant MAX_REPUTATION = 100;
    uint256 public constant GROWTH_PER_VOTE = 5;
    uint256 public constant DECAY_CHANCE = 30; 
    
    event PlaylistMinted(uint256 indexed tokenId, string name, string playlistId);
    event ReputationGrown(uint256 indexed tokenId, uint256 newReputation, address voter);
    event DecayTriggered(uint256 indexed tokenId, uint64 sequenceNumber);
    event ReputationDecayed(uint256 indexed tokenId, uint256 newReputation);

    constructor(address _entropy, address _provider) ERC721A("PlaylistRep", "PLREP") Ownable(msg.sender) {
        entropy = IEntropy(_entropy);
        entropyProvider = _provider;
    }
    
    function mintPlaylist(address to, string calldata name, string calldata playlistId) external returns (uint256) {
        uint256 tokenId = _nextTokenId();
        _mint(to, 1);
        
        playlists[tokenId] = PlaylistInfo({
            name: name,
            playlistId: playlistId,
            reputation: 50, // Start at 50% reputation
            createdAt: block.timestamp,
            isActive: true
        });
        
        emit PlaylistMinted(tokenId, name, playlistId);
        return tokenId;
    }

    function voteForPlaylist(uint256 tokenId) external {
        require(_exists(tokenId), "Playlist does not exist");
        require(!hasVoted[msg.sender][tokenId], "Already voted for this playlist");
        require(playlists[tokenId].isActive, "Playlist is inactive");
        
        PlaylistInfo storage playlist = playlists[tokenId];
        
        // Grow reputation deterministically
        if (playlist.reputation + GROWTH_PER_VOTE <= MAX_REPUTATION) {
            playlist.reputation += GROWTH_PER_VOTE;
        } else {
            playlist.reputation = MAX_REPUTATION;
        }
        
        hasVoted[msg.sender][tokenId] = true;
        emit ReputationGrown(tokenId, playlist.reputation, msg.sender);
    }
    
    function triggerDecay(uint256 tokenId) external payable {
        require(_exists(tokenId), "Playlist does not exist");
        require(playlists[tokenId].isActive, "Playlist is inactive");
        require(playlists[tokenId].reputation > 0, "Reputation already at minimum");
        
        uint128 requestFee = entropy.getFee(entropyProvider);
        require(msg.value >= requestFee, "Not enough fees");

        uint64 sequenceNumber = entropy.requestWithCallback{value: requestFee}(
            entropyProvider,
            bytes32(0) // No user random number needed
        );

        pendingDecayRequests[sequenceNumber] = tokenId;
        emit DecayTriggered(tokenId, sequenceNumber);
    }

    function entropyCallback(uint64 sequenceNumber, address provider, bytes32 randomNumber) internal override {
        uint256 tokenId = pendingDecayRequests[sequenceNumber];
        require(tokenId != 0, "Request not found");

        PlaylistInfo storage playlist = playlists[tokenId];
        
        // 30% chance of decay
        uint256 randomValue = uint256(randomNumber) % 100;
        if (randomValue < DECAY_CHANCE) {
            // Decay by 10% of current reputation
            uint256 decayAmount = playlist.reputation / 10;
            if (playlist.reputation > decayAmount) {
                playlist.reputation -= decayAmount;
            } else {
                playlist.reputation = 0;
                playlist.isActive = false;
            }
            emit ReputationDecayed(tokenId, playlist.reputation);
        }
        
        delete pendingDecayRequests[sequenceNumber];
    }

    function getEntropy() internal view override returns (address) {
        return address(entropy);
    }
    
    function getPlaylistInfo(uint256 tokenId) external view returns (PlaylistInfo memory) {
        require(_exists(tokenId), "Playlist does not exist");
        return playlists[tokenId];
    }

    function tokensOfOwner(address owner) public view returns (uint256[] memory) {
        unchecked {
            uint256 tokenIdsIdx;
            address currOwnershipAddr;
            uint256 tokenIdsLength = balanceOf(owner);
            uint256[] memory tokenIds = new uint256[](tokenIdsLength);
            TokenOwnership memory ownership;
            for (
                uint256 i = _startTokenId();
                tokenIdsIdx != tokenIdsLength;
                ++i
            ) {
                ownership = _ownershipAt(i);
                if (ownership.burned) continue;
                if (ownership.addr != address(0))
                    currOwnershipAddr = ownership.addr;
                if (currOwnershipAddr == owner) tokenIds[tokenIdsIdx++] = i;
            }
            return tokenIds;
        }
    }
}