// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AleaArtNFT is ERC721, Ownable, ReentrancyGuard {
    uint256 private _tokenIdCounter = 0;
    
    struct NFTData {
        uint256 tokenId;
        address owner;
        string ipfsHash;
        string prompt;
        uint256 price;
        bool isForSale;
        address creator;
        uint256 createdAt;
    }
    
    mapping(uint256 => NFTData) public nftData;
    mapping(address => uint256[]) public userNFTs;
    mapping(string => bool) public ipfsHashExists;
    
    event NFTMinted(
        uint256 indexed tokenId,
        address indexed owner,
        string ipfsHash,
        string prompt,
        uint256 price
    );
    
    event NFTSold(
        uint256 indexed tokenId,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );
    
    event PriceUpdated(
        uint256 indexed tokenId,
        uint256 oldPrice,
        uint256 newPrice
    );
    
    event SaleStatusChanged(
        uint256 indexed tokenId,
        bool isForSale
    );
    
    constructor() ERC721("AleaArt NFT", "ALEART") Ownable(msg.sender) {}
    
    function mintNFT(
        address to,
        string memory ipfsHash,
        string memory prompt,
        uint256 price
    ) public returns (uint256) {
        require(!ipfsHashExists[ipfsHash], "IPFS hash already exists");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        
        nftData[tokenId] = NFTData({
            tokenId: tokenId,
            owner: to,
            ipfsHash: ipfsHash,
            prompt: prompt,
            price: price,
            isForSale: price > 0,
            creator: to,
            createdAt: block.timestamp
        });
        
        userNFTs[to].push(tokenId);
        ipfsHashExists[ipfsHash] = true;
        
        emit NFTMinted(tokenId, to, ipfsHash, prompt, price);
        
        return tokenId;
    }
    
    function buyNFT(uint256 tokenId) public payable nonReentrant {
        NFTData storage nft = nftData[tokenId];
        require(nft.isForSale, "NFT is not for sale");
        require(msg.value >= nft.price, "Insufficient payment");
        require(msg.sender != nft.owner, "Cannot buy your own NFT");
        
        address seller = nft.owner;
        uint256 salePrice = nft.price;
        
        // Transfer NFT
        _transfer(seller, msg.sender, tokenId);
        
        // Update NFT data
        nft.owner = msg.sender;
        nft.isForSale = false;
        nft.price = 0;
        
        // Update user NFT lists
        _removeFromUserNFTs(seller, tokenId);
        userNFTs[msg.sender].push(tokenId);
        
        // Transfer payment to seller
        payable(seller).transfer(salePrice);
        
        emit NFTSold(tokenId, seller, msg.sender, salePrice);
    }
    
    function setPrice(uint256 tokenId, uint256 newPrice) public {
        require(ownerOf(tokenId) != address(0), "NFT does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        
        uint256 oldPrice = nftData[tokenId].price;
        nftData[tokenId].price = newPrice;
        nftData[tokenId].isForSale = newPrice > 0;
        
        emit PriceUpdated(tokenId, oldPrice, newPrice);
        emit SaleStatusChanged(tokenId, newPrice > 0);
    }
    
    function setSaleStatus(uint256 tokenId, bool isForSale) public {
        require(ownerOf(tokenId) != address(0), "NFT does not exist");
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        
        nftData[tokenId].isForSale = isForSale;
        
        emit SaleStatusChanged(tokenId, isForSale);
    }
    
    function getUserNFTs(address user) public view returns (uint256[] memory) {
        return userNFTs[user];
    }
    
    function getAllNFTs() public view returns (NFTData[] memory) {
        uint256 totalNFTs = _tokenIdCounter;
        NFTData[] memory allNFTs = new NFTData[](totalNFTs);
        
        for (uint256 i = 0; i < totalNFTs; i++) {
            allNFTs[i] = nftData[i];
        }
        
        return allNFTs;
    }
    
    function getNFTsForSale() public view returns (NFTData[] memory) {
        uint256 totalNFTs = _tokenIdCounter;
        uint256 saleCount = 0;
        
        // Count NFTs for sale
        for (uint256 i = 0; i < totalNFTs; i++) {
            if (nftData[i].isForSale) {
                saleCount++;
            }
        }
        
        NFTData[] memory saleNFTs = new NFTData[](saleCount);
        uint256 index = 0;
        
        // Populate NFTs for sale
        for (uint256 i = 0; i < totalNFTs; i++) {
            if (nftData[i].isForSale) {
                saleNFTs[index] = nftData[i];
                index++;
            }
        }
        
        return saleNFTs;
    }
    
    function _removeFromUserNFTs(address user, uint256 tokenId) internal {
        uint256[] storage userTokens = userNFTs[user];
        for (uint256 i = 0; i < userTokens.length; i++) {
            if (userTokens[i] == tokenId) {
                userTokens[i] = userTokens[userTokens.length - 1];
                userTokens.pop();
                break;
            }
        }
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "NFT does not exist");
        
        NFTData memory nft = nftData[tokenId];
        return string(abi.encodePacked("https://gateway.pinata.cloud/ipfs/", nft.ipfsHash));
    }
}