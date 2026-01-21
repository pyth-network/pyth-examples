# 🎨 AleaArt Python Backend Integration

This document explains how to set up and use the Python backend for AI image generation using the art parameters from the blockchain.

## 🚀 Quick Start

### 1. Start the Python Backend

```bash
# From the main project directory
./start_python_backend.sh
```

This script will:
- Create a Python virtual environment
- Install all required dependencies
- Start the Flask server on `http://localhost:8000`

### 2. Start the Next.js Frontend

```bash
# From the frontend-aleart directory
cd frontend-aleart
npm run dev
```

## 🔧 How It Works

### Parameter Mapping

The art parameters from the blockchain are mapped to Stable Diffusion parameters as follows:

| Blockchain Parameter | Stable Diffusion Parameter | Description |
|---------------------|---------------------------|-------------|
| `promptIndex` (0-11) | `prompt` | Selects from 12 predefined prompt templates |
| `styleIndex` (0-9) | `style_modifier` | Selects from 10 style modifiers |
| `samplerIndex` (0-5) | `scheduler` | Selects from 6 different samplers |
| `aspectIndex` (0-4) | `width/height` | Selects from 5 aspect ratios |
| `steps` (18-64) | `num_inference_steps` | Number of denoising steps |
| `cfg` (70-180) | `guidance_scale` | How closely to follow the prompt (7.0-18.0) |
| `latentSeed` | `generator.seed` | Random seed for reproducible generation |
| `paletteId` (0-23) | `color_palette` | Future: Color palette selection |

### Prompt Templates

The system includes 12 diverse prompt templates:

1. **Retrofuturism** - "retrofuturism bodywear, primitive, vintage, intricate detail..."
2. **Cyberpunk** - "cyberpunk cityscape, neon lights, futuristic architecture..."
3. **Fantasy** - "fantasy landscape, magical forest, ethereal lighting..."
4. **Steampunk** - "steampunk machinery, brass and copper, Victorian era..."
5. **Space** - "space exploration, cosmic landscapes, nebula..."
6. **Underwater** - "underwater world, marine life, bioluminescent..."
7. **Medieval** - "medieval fantasy, castle, dragons, magical atmosphere..."
8. **Post-Apocalyptic** - "post-apocalyptic wasteland, ruins, desolate landscape..."
9. **Alien** - "alien planet, exotic flora and fauna, otherworldly..."
10. **Ancient** - "ancient civilization, pyramids, desert, mystical atmosphere..."
11. **Arctic** - "arctic wilderness, aurora borealis, ice formations..."
12. **Tropical** - "tropical paradise, lush vegetation, crystal clear water..."

### Style Modifiers

10 different artistic styles:

1. **Ultra Realistic** - "max detail, 8k, ultra realistic"
2. **Painterly** - "artistic, painterly, brush strokes"
3. **Minimalist** - "minimalist, clean, simple"
4. **Baroque** - "baroque, ornate, decorative"
5. **Impressionist** - "impressionist, soft, dreamy"
6. **Expressionist** - "expressionist, bold, dramatic"
7. **Surreal** - "surreal, abstract, dreamlike"
8. **Photorealistic** - "photorealistic, detailed, sharp"
9. **Watercolor** - "watercolor, soft, flowing"
10. **Oil Painting** - "oil painting, rich, textured"

### Aspect Ratios

5 different aspect ratios:

1. **Square** - 512x512 (1:1)
2. **Landscape** - 1024x576 (16:9)
3. **Portrait** - 768x1024 (9:16)
4. **Wide** - 1024x448 (21:9)
5. **Tall** - 512x683 (3:4)

### Samplers

6 different sampling methods:

1. **DPM++ 2M Karras** - Fast, high quality
2. **DPM++ SDE Karras** - Good balance
3. **Euler a** - Fast, good quality
4. **DPM++ 2M** - High quality
5. **DPM++ SDE** - Balanced
6. **LMS** - Stable, slower

## 🎯 API Endpoints

### POST /generate-image

Generates an image using art parameters from the blockchain.

**Request Body:**
```json
{
  "parameters": {
    "promptIndex": 0,
    "styleIndex": 0,
    "samplerIndex": 0,
    "aspectIndex": 0,
    "steps": 20,
    "cfg": 75,
    "latentSeed": 12345,
    "paletteId": 5
  },
  "tokenId": "1"
}
```

**Response:**
```json
{
  "success": true,
  "imageUrl": "/generated_images/art_token_1_abc123.png",
  "imageBase64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "tokenId": "1",
  "prompt": "retrofuturism bodywear, primitive, vintage, intricate detail, digital art, digital painting, concept art, poster, award winning, max detail, 8k, ultra realistic, square, 1:1 | max detail | 8k",
  "parameters": {
    "steps": 20,
    "cfg_scale": 7.5,
    "seed": 12345,
    "sampler": "DPM++ 2M Karras",
    "width": 512,
    "height": 512
  }
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "cuda_available": true
}
```

### GET /generated_images/<filename>

Serves generated images.

## 🖥️ System Requirements

### Hardware Requirements

**Minimum:**
- 8GB RAM
- 4GB VRAM (GPU) or 16GB RAM (CPU only)
- 10GB free disk space

**Recommended:**
- 16GB RAM
- 8GB+ VRAM (RTX 3070 or better)
- 20GB free disk space

### Software Requirements

- Python 3.8+
- CUDA 11.8+ (for GPU acceleration)
- pip3

## 🔧 Installation Details

The startup script automatically installs:

- **torch** - PyTorch for deep learning
- **diffusers** - Hugging Face Diffusers library
- **transformers** - Hugging Face Transformers
- **scipy** - Scientific computing
- **flask** - Web framework
- **flask-cors** - CORS support
- **pillow** - Image processing
- **accelerate** - Training acceleration
- **xformers** - Memory efficient attention

## 🎨 Usage in Frontend

### Dashboard Integration

1. **Load Parameters**: Click "Load Parameters" on any art token
2. **Generate Image**: Click "🎨 Generate Image" button
3. **View Result**: Generated image appears below the parameters

### Latest Parameters Integration

1. **Fetch Latest**: Click "Get Latest Art Parameters"
2. **Generate Image**: Click "🎨 Generate Image" button
3. **View Result**: Generated image appears below the parameters

## 🐛 Troubleshooting

### Common Issues

1. **"Python backend failed to generate image"**
   - Check if Python backend is running on port 8000
   - Verify GPU/CPU resources are available
   - Check Python backend logs

2. **"Model loading failed"**
   - Ensure sufficient disk space (10GB+)
   - Check internet connection for model download
   - Verify CUDA installation (if using GPU)

3. **"Out of memory"**
   - Reduce image resolution
   - Use CPU instead of GPU
   - Close other applications

### Performance Tips

1. **GPU Acceleration**: Ensure CUDA is properly installed
2. **Memory Management**: Enable attention slicing (automatic)
3. **Batch Processing**: Generate multiple images in sequence
4. **Model Caching**: Model stays loaded between requests

## 🔮 Future Enhancements

1. **Color Palette Integration**: Use `paletteId` for color schemes
2. **Batch Generation**: Generate multiple variations
3. **Image Upscaling**: Add upscaling options
4. **Style Transfer**: Apply additional style modifications
5. **Animation**: Generate video sequences
6. **Custom Models**: Support for user-uploaded models

## 📝 Example Workflow

1. User generates art parameters on blockchain
2. Parameters are fetched and displayed in frontend
3. User clicks "Generate Image"
4. Frontend sends parameters to Python backend
5. Python backend maps parameters to Stable Diffusion
6. Image is generated using the specified model
7. Image is returned as base64 and displayed
8. Image is also saved to disk for future access

This creates a complete pipeline from blockchain randomness to AI-generated art!
