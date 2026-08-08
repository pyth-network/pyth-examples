import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import UserAleart from '@/models/UserAleart';
import fs from 'fs';
import path from 'path';

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

    // Find the generating image entry
    const imageEntry = user.generatedImages.find((img: { tokenId: number; status: string }) => img.tokenId === tokenId && img.status === 'generating');
    
    if (!imageEntry) {
      return NextResponse.json({ error: 'No generating image found for this token' }, { status: 404 });
    }

    // Check if there's a generated image file
    const generatedImagesDir = path.join(process.cwd(), '..', 'generated_images');
    
    if (!fs.existsSync(generatedImagesDir)) {
      return NextResponse.json({ error: 'Generated images directory not found' }, { status: 404 });
    }

    const imageFiles = fs.readdirSync(generatedImagesDir)
      .filter(file => file.startsWith(`art_token_${tokenId}_`))
      .map(file => ({
        name: file,
        path: path.join(generatedImagesDir, file),
        mtime: fs.statSync(path.join(generatedImagesDir, file)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (imageFiles.length === 0) {
      return NextResponse.json({ error: 'No generated image files found for this token' }, { status: 404 });
    }

    // Use the most recent image file
    const latestImage = imageFiles[0];
    
    try {
      // Read and encode the image
      const imageBuffer = fs.readFileSync(latestImage.path);
      const imageBase64 = imageBuffer.toString('base64');
      
      // Update the database
      imageEntry.imageData = imageBase64;
      imageEntry.status = 'completed';
      
      await user.save();
      
      return NextResponse.json({
        success: true,
        message: 'Image data updated successfully',
        tokenId: tokenId,
        imageFile: latestImage.name,
        imageSize: imageBase64.length
      });
      
    } catch (error) {
      console.error('Error reading image file:', error);
      return NextResponse.json({ error: 'Failed to read image file' }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('Manual update error:', error);
    return NextResponse.json(
      { error: 'Failed to update image data' },
      { status: 500 }
    );
  }
}

