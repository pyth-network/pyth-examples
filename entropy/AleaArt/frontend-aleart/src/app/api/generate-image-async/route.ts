import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import UserAleart from '@/models/UserAleart';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { parameters, tokenId } = await request.json();

    if (!parameters || !tokenId) {
      return NextResponse.json(
        { error: 'Missing parameters or tokenId' },
        { status: 400 }
      );
    }

    await connectDB();
    
    const user = await UserAleart.findById(session.user.id);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if image already exists for this token
    const existingImage = user.generatedImages.find((img: { tokenId: number; status: string }) => img.tokenId === tokenId);
    if (existingImage && existingImage.status === 'completed') {
      return NextResponse.json({
        success: true,
        message: 'Image already exists',
        imageData: existingImage.imageData,
        tokenId: tokenId
      });
    }

    // Map our art parameters to Stable Diffusion parameters
    const artParams = {
      tokenId: tokenId,
      promptIndex: parameters.promptIndex,
      styleIndex: parameters.styleIndex,
      samplerIndex: parameters.samplerIndex,
      aspectIndex: parameters.aspectIndex,
      steps: parameters.steps,
      cfg: parameters.cfg / 10, // Convert from our scale (70-180) to SD scale (7.0-18.0)
      latentSeed: parameters.latentSeed,
      paletteId: parameters.paletteId,
    };

    // Define prompt templates based on promptIndex
    const promptTemplates = [
      "retrofuturism bodywear, primitive, vintage, intricate detail, digital art, digital painting, concept art, poster, award winning",
      "cyberpunk cityscape, neon lights, futuristic architecture, digital art, concept art, detailed",
      "fantasy landscape, magical forest, ethereal lighting, digital painting, concept art, detailed",
      "steampunk machinery, brass and copper, Victorian era, intricate detail, digital art",
      "space exploration, cosmic landscapes, nebula, digital art, concept art, detailed",
      "underwater world, marine life, bioluminescent, digital painting, concept art",
      "medieval fantasy, castle, dragons, magical atmosphere, digital art, detailed",
      "post-apocalyptic wasteland, ruins, desolate landscape, digital art, concept art",
      "alien planet, exotic flora and fauna, otherworldly, digital painting, detailed",
      "ancient civilization, pyramids, desert, mystical atmosphere, digital art",
      "arctic wilderness, aurora borealis, ice formations, digital painting, concept art",
      "tropical paradise, lush vegetation, crystal clear water, digital art, detailed"
    ];

    // Define style modifiers based on styleIndex
    const styleModifiers = [
      "max detail, 8k, ultra realistic",
      "artistic, painterly, brush strokes",
      "minimalist, clean, simple",
      "baroque, ornate, decorative",
      "impressionist, soft, dreamy",
      "expressionist, bold, dramatic",
      "surreal, abstract, dreamlike",
      "photorealistic, detailed, sharp",
      "watercolor, soft, flowing",
      "oil painting, rich, textured"
    ];

    // Define aspect ratios based on aspectIndex
    const aspectRatios = [
      "square, 1:1",
      "landscape, 16:9",
      "portrait, 9:16", 
      "wide, 21:9",
      "tall, 3:4"
    ];

    // Define samplers based on samplerIndex
    const samplers = [
      "DPM++ 2M Karras",
      "DPM++ SDE Karras", 
      "Euler a",
      "DPM++ 2M",
      "DPM++ SDE",
      "LMS"
    ];

    // Build the final prompt
    const basePrompt = promptTemplates[artParams.promptIndex] || promptTemplates[0];
    const styleModifier = styleModifiers[artParams.styleIndex] || styleModifiers[0];
    const aspectRatio = aspectRatios[artParams.aspectIndex] || aspectRatios[0];
    
    const finalPrompt = `${basePrompt}, ${styleModifier}, ${aspectRatio} | max detail | 8k`;

    // Prepare the request for Python backend
    const pythonRequest = {
      prompt: finalPrompt,
      steps: artParams.steps,
      cfg_scale: artParams.cfg,
      seed: artParams.latentSeed,
      sampler: samplers[artParams.samplerIndex] || samplers[0],
      width: artParams.aspectIndex === 1 ? 1024 : artParams.aspectIndex === 2 ? 768 : 512,
      height: artParams.aspectIndex === 2 ? 1024 : artParams.aspectIndex === 1 ? 576 : 512,
      tokenId: artParams.tokenId,
      userId: session.user.id  // Add user ID
    };

    // Create a placeholder image entry with 'generating' status
    const imageEntry = {
      tokenId: artParams.tokenId,
      // imageData will be added when generation completes
      prompt: finalPrompt,
      parameters: {
        steps: artParams.steps,
        cfg_scale: artParams.cfg,
        seed: artParams.latentSeed,
        width: pythonRequest.width,
        height: pythonRequest.height,
      },
      status: 'generating' as const,
      createdAt: new Date(),
    };

    // Add to user's generated images
    user.generatedImages.push(imageEntry);
    await user.save();

    // Start async image generation (don't await)
    generateImageAsync(session.user.id, tokenId, pythonRequest);

    return NextResponse.json({
      success: true,
      message: 'Image generation started. Your art will be ready in a few minutes!',
      tokenId: artParams.tokenId,
      status: 'generating'
    });

  } catch (error: unknown) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to start image generation' },
      { status: 500 }
    );
  }
}

async function generateImageAsync(userId: string, tokenId: number, pythonRequest: {
  prompt: string;
  steps: number;
  cfg_scale: number;
  seed: number;
  sampler: string;
  width: number;
  height: number;
  tokenId: number;
  userId: string;
}) {
  try {
    console.log(`Starting async image generation for token ${tokenId}`);
    
    // Call Python backend with longer timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20 * 60 * 1000); // 20 minutes timeout
    
    const pythonResponse = await fetch('http://localhost:8000/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pythonRequest),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!pythonResponse.ok) {
      throw new Error(`Python backend failed with status ${pythonResponse.status}`);
    }

    const result = await pythonResponse.json();
    console.log(`Python backend response for token ${tokenId}:`, result.success ? 'Success' : 'Failed');

    if (result.success) {
      // Update the image entry in MongoDB with IPFS data
      await connectDB();
      const user = await UserAleart.findById(userId);
      
      if (user) {
        const imageEntry = user.generatedImages.find((img: { tokenId: number; status: string }) => img.tokenId === tokenId);
        if (imageEntry) {
          // Update with IPFS data instead of base64
          imageEntry.ipfsHash = result.ipfsHash;
          imageEntry.ipfsUrl = result.ipfsUrl;
          imageEntry.imageData = result.imageBase64; // Keep base64 as fallback
          imageEntry.status = 'completed';
          await user.save();
          console.log(`✅ Image generation completed and saved for token ${tokenId}`);
          console.log(`🌐 IPFS URL: ${result.ipfsUrl}`);
        } else {
          console.log(`❌ Image entry not found for token ${tokenId}`);
        }
      } else {
        console.log(`❌ User not found for ID ${userId}`);
      }
    } else {
      throw new Error(result.error || 'Image generation failed');
    }
  } catch (error) {
    console.error(`❌ Async image generation failed for token ${tokenId}:`, error);
    
    // Update status to failed
    try {
      await connectDB();
      const user = await UserAleart.findById(userId);
      
      if (user) {
        const imageEntry = user.generatedImages.find((img: { tokenId: number; status: string }) => img.tokenId === tokenId);
        if (imageEntry) {
          imageEntry.status = 'failed';
          await user.save();
          console.log(`📝 Updated status to failed for token ${tokenId}`);
        }
      }
    } catch (dbError) {
      console.error('❌ Failed to update image status:', dbError);
    }
  }
}
