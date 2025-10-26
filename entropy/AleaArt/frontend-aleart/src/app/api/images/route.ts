import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { MongoClient } from 'mongodb';
import UserAleart from '@/models/UserAleart';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get('tokenId');

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Missing tokenId parameter' },
        { status: 400 }
      );
    }

    await connectDB();
    
    // Connect to MongoDB directly to access the generatedImages collection
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db('aleart');
    
    const imageEntry = await db.collection('generatedImages')
      .findOne({ 
        userId: session.user.id,
        tokenId: parseInt(tokenId)
      });
    
    await client.close();
    
    if (!imageEntry) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      tokenId: imageEntry.tokenId,
      status: imageEntry.status,
      ipfsHash: imageEntry.ipfsHash || null,
      ipfsUrl: imageEntry.ipfsUrl || null,
      imageData: imageEntry.status === 'completed' && imageEntry.imageData ? imageEntry.imageData : null,
      prompt: imageEntry.prompt,
      parameters: imageEntry.parameters,
      createdAt: imageEntry.createdAt
    });

  } catch (error: unknown) {
    console.error('Image status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check image status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tokenId } = await request.json();

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Missing tokenId' },
        { status: 400 }
      );
    }

    await connectDB();
    
    const user = await UserAleart.findById(session.user.id);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get all generated images for the user
    const generatedImages = user.generatedImages.map((img: { tokenId: number; status: string; imageData?: string; prompt: string; parameters: unknown; createdAt: Date }) => ({
      tokenId: img.tokenId,
      status: img.status,
      imageData: img.status === 'completed' && img.imageData ? img.imageData : null,
      prompt: img.prompt,
      parameters: img.parameters,
      createdAt: img.createdAt
    }));

    return NextResponse.json({
      success: true,
      images: generatedImages
    });

  } catch (error: unknown) {
    console.error('Get images error:', error);
    return NextResponse.json(
      { error: 'Failed to get images' },
      { status: 500 }
    );
  }
}
