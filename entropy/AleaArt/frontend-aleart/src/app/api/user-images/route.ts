import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import { MongoClient } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    // Connect to MongoDB directly to access the generatedImages collection
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db('aleart');
    
    // Get all completed images for the user from the generatedImages collection
    const completedImages = await db.collection('generatedImages')
      .find({ 
        userId: session.user.id,
        status: 'completed' 
      })
      .sort({ createdAt: -1 }) // Sort by newest first
      .toArray();
    
    await client.close();
    
    return NextResponse.json({
      success: true,
      images: completedImages
    });

  } catch (error: unknown) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}
