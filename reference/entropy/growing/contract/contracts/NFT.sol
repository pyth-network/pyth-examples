// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "erc721a/contracts/ERC721A.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NFT is ERC721A, Ownable, ReentrancyGuard {
    constructor() ERC721A("Nft", "NFT") Ownable(msg.sender) {}

    function tokensOfOwner(
        address owner
    ) public view returns (uint256[] memory) {
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

    function withdraw(address to) public onlyOwner nonReentrant {
        require(to != address(0), "INVALID_ADDRESS");
        uint256 contractBalance = address(this).balance;
        (bool success, ) = payable(to).call{value: contractBalance}("");
        require(success, "WITHDRAWAL_FAILED");
    }
}
