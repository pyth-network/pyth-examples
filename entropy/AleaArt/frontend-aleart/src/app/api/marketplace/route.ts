import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ethers } from 'ethers';

const NFT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '0x806019F8a33A01a4A3fea93320601cC77B6Dcb79';
const ARBITRUM_SEPOLIA_RPC = 'https://arbitrum-sepolia-rpc.publicnode.com';

// NFT Contract ABI
const NFT_CONTRACT_ABI = [
  "function getAllNFTs() public view returns (tuple(uint256 tokenId, address owner, string ipfsHash, string prompt, uint256 price, bool isForSale, address creator, uint256 createdAt)[])",
  "function getNFTsForSale() public view returns (tuple(uint256 tokenId, address owner, string ipfsHash, string prompt, uint256 price, bool isForSale, address creator, uint256 createdAt)[])"
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to Arbitrum Sepolia
    const provider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC);
    const contract = new ethers.Contract(NFT_CONTRACT_ADDRESS, NFT_CONTRACT_ABI, provider);
    
    // Fetch all NFTs from the contract
    const allNFTs = await contract.getAllNFTs();
    
    // Convert the contract data to a more usable format
    const nfts = allNFTs.map((nft: any) => ({
      tokenId: Number(nft.tokenId),
      owner: nft.owner,
      ipfsHash: nft.ipfsHash,
      prompt: nft.prompt,
      price: nft.price.toString(),
      isForSale: nft.isForSale,
      creator: nft.creator,
      createdAt: Number(nft.createdAt)
    }));

    return NextResponse.json({
      success: true,
      nfts: nfts
    });

  } catch (error: unknown) {
    console.error('Marketplace fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFTs: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
