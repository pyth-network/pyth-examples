import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { parameters, tokenId } = await request.json();

    if (!parameters || !tokenId) {
      return NextResponse.json(
        { error: 'Missing parameters or tokenId' },
        { status: 400 }
      );
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
      tokenId: artParams.tokenId
    };

    // Call Python backend (you'll need to implement this endpoint)
    const pythonResponse = await fetch('http://localhost:8000/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pythonRequest),
    });

    if (!pythonResponse.ok) {
      throw new Error('Python backend failed to generate image');
    }

    const result = await pythonResponse.json();

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      tokenId: artParams.tokenId,
      prompt: finalPrompt,
      parameters: artParams
    });

  } catch (error: unknown) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}
