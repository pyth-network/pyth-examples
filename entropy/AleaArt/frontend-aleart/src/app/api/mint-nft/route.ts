import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const NFT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '0x806019F8a33A01a4A3fea93320601cC77B6Dcb79';

// NFT Contract ABI - only the functions we need
const NFT_CONTRACT_ABI = [
  "function mintNFT(address to, string memory ipfsHash, string memory prompt, uint256 price) public returns (uint256)",
  "function owner() public view returns (address)",
  "function nftData(uint256 tokenId) public view returns (tuple(uint256 tokenId, address owner, string ipfsHash, string prompt, uint256 price, bool isForSale, address creator, uint256 createdAt))",
  "function getAllNFTs() public view returns (tuple(uint256 tokenId, address owner, string ipfsHash, string prompt, uint256 price, bool isForSale, address creator, uint256 createdAt)[])",
  "function getNFTsForSale() public view returns (tuple(uint256 tokenId, address owner, string ipfsHash, string prompt, uint256 price, bool isForSale, address creator, uint256 createdAt)[])"
];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tokenId, ipfsHash, prompt, price, userAddress } = await request.json();

    if (!tokenId || !ipfsHash || !prompt || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Return the transaction data for the frontend to sign and send
    return NextResponse.json({
      success: true,
      contractAddress: NFT_CONTRACT_ADDRESS,
      contractABI: NFT_CONTRACT_ABI,
      functionName: 'mintNFT',
      functionArgs: [userAddress, ipfsHash, prompt, price],
      message: 'Transaction data prepared for user wallet signing'
    });

  } catch (error: unknown) {
    console.error('NFT minting error:', error);
    return NextResponse.json(
      { error: 'Failed to prepare mint transaction: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
