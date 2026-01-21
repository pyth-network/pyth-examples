import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const SPOTLIGHT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SPOTLIGHT_CONTRACT_ADDRESS || '0xd596C7C17331013C85c791092247e33267d9291e';
const RPC_URL = 'https://arbitrum-sepolia-rpc.publicnode.com';

const SPOTLIGHT_CONTRACT_ABI = [
  "function getCurrentSpotlight() external view returns (tuple(uint256 tokenId, address owner, string ipfsHash, string prompt, uint256 price, bool isForSale, address creator, uint256 createdAt, uint256 spotlightStartTime, uint256 spotlightDuration, bool isActive))",
  "function isSpotlightActive(uint256 spotlightId) external view returns (bool)",
  "function getSpotlight(uint256 spotlightId) external view returns (tuple(uint256 tokenId, address owner, string ipfsHash, string prompt, uint256 price, bool isForSale, address creator, uint256 createdAt, uint256 spotlightStartTime, uint256 spotlightDuration, bool isActive))",
  "function currentSpotlightId() external view returns (uint256)",
  "function spotlightDuration() external view returns (uint256)",
  "function spotlightFee() external view returns (uint256)"
];

export async function GET(request: NextRequest) {
  try {
    if (SPOTLIGHT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({
        success: false,
        error: 'Spotlight contract not deployed'
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(SPOTLIGHT_CONTRACT_ADDRESS, SPOTLIGHT_CONTRACT_ABI, provider);

    // Check if user can request spotlight (only specific wallet address)
    const canRequestSpotlight = request.headers.get('x-wallet-address') === '0xBEdD38f260e3C936d0A743A57F211cde97f7401F';

    try {
      // First check if there are any spotlights at all
      const currentSpotlightId = await contract.currentSpotlightId();
      
      if (currentSpotlightId.toString() === '0') {
        return NextResponse.json({
          success: true,
          spotlight: null,
          canRequestSpotlight: canRequestSpotlight
        });
      }
      
      // Try to get current spotlight
      const spotlight = await contract.getCurrentSpotlight();
      
      // Format the spotlight data
      const spotlightData = {
        tokenId: Number(spotlight.tokenId),
        owner: spotlight.owner,
        ipfsHash: spotlight.ipfsHash,
        prompt: spotlight.prompt,
        price: spotlight.price.toString(),
        isForSale: spotlight.isForSale,
        creator: spotlight.creator,
        createdAt: Number(spotlight.createdAt),
        spotlightStartTime: Number(spotlight.spotlightStartTime),
        spotlightDuration: Number(spotlight.spotlightDuration),
        isActive: spotlight.isActive,
        spotlightEndTime: Number(spotlight.spotlightStartTime) + Number(spotlight.spotlightDuration),
        timeRemaining: Math.max(0, (Number(spotlight.spotlightStartTime) + Number(spotlight.spotlightDuration)) - Math.floor(Date.now() / 1000))
      };

      return NextResponse.json({
        success: true,
        spotlight: spotlightData,
        canRequestSpotlight: canRequestSpotlight
      });

    } catch (error) {
      console.log('Contract call error:', error);
      
      // If no active spotlight, return empty result
      if (error instanceof Error && (error.message.includes('No spotlight available') || 
                                     error.message.includes('No active spotlight') ||
                                     error.message.includes('Spotlight expired'))) {
        return NextResponse.json({
          success: true,
          spotlight: null,
          canRequestSpotlight: canRequestSpotlight
        });
      }
      
      throw error;
    }

  } catch (error: unknown) {
    console.error('Error fetching spotlight:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch spotlight: ' + (error as Error).message 
      },
      { status: 500 }
    );
  }
}
