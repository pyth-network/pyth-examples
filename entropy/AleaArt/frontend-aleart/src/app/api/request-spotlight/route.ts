import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ethers } from 'ethers';

const SPOTLIGHT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SPOTLIGHT_CONTRACT_ADDRESS || '0xd596C7C17331013C85c791092247e33267d9291e';
const RPC_URL = 'https://arbitrum-sepolia-rpc.publicnode.com';

const SPOTLIGHT_CONTRACT_ABI = [
  "function requestSpotlight() external payable",
  "function spotlightFee() external view returns (uint256)",
  "function getBalance() external view returns (uint256)"
];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (SPOTLIGHT_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
      return NextResponse.json({
        success: false,
        error: 'Spotlight contract not deployed'
      });
    }

    const { userAddress } = await request.json();

    if (!userAddress) {
      return NextResponse.json(
        { error: 'Missing user address' },
        { status: 400 }
      );
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(SPOTLIGHT_CONTRACT_ADDRESS, SPOTLIGHT_CONTRACT_ABI, provider);

    // Get the spotlight fee
    const fee = await contract.spotlightFee();
    const feeInEth = ethers.formatEther(fee);

    return NextResponse.json({
      success: true,
      contractAddress: SPOTLIGHT_CONTRACT_ADDRESS,
      contractABI: SPOTLIGHT_CONTRACT_ABI,
      functionName: 'requestSpotlight',
      functionArgs: [],
      value: fee.toString(),
      feeInEth: feeInEth,
      message: 'Transaction data prepared for user wallet signing'
    });

  } catch (error: unknown) {
    console.error('Spotlight request error:', error);
    return NextResponse.json(
      { error: 'Failed to prepare spotlight request: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
