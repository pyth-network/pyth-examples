#!/usr/bin/env python3
"""
AleaArt Python Backend for Image Generation
Generates images using Stable Diffusion with art parameters from blockchain
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import torch
from diffusers import StableDiffusionPipeline
import os
import uuid
from PIL import Image
import io
import base64

app = Flask(__name__)
CORS(app)

# Global variables for the model
pipe = None
model_id = "prompthero/midjourney-v4-diffusion"

def load_model():
    """Load the Stable Diffusion model"""
    global pipe
    if pipe is None:
        print("Loading Stable Diffusion model...")
        pipe = StableDiffusionPipeline.from_pretrained(
            model_id, 
            torch_dtype=torch.float16,
            safety_checker=None,
            requires_safety_checker=False
        )
        
        # Use GPU if available, otherwise CPU
        if torch.cuda.is_available():
            pipe = pipe.to("cuda")
            print("Model loaded on GPU")
        else:
            pipe = pipe.to("cpu")
            print("Model loaded on CPU")
        
        # Enable memory efficient attention (if available)
        try:
            pipe.enable_attention_slicing()
            print("Memory efficient attention enabled")
        except Exception as e:
            print(f"Could not enable attention slicing: {e}")
        
        print("Model loaded successfully!")

def get_sampler_by_name(sampler_name):
    """Get the appropriate scheduler based on sampler name"""
    from diffusers import (
        DPMSolverMultistepScheduler,
        DPMSolverSDEScheduler,
        EulerAncestralDiscreteScheduler,
        LMSDiscreteScheduler
    )
    
    samplers = {
        "DPM++ 2M Karras": DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True),
        "DPM++ SDE Karras": DPMSolverSDEScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True),
        "Euler a": EulerAncestralDiscreteScheduler.from_config(pipe.scheduler.config),
        "DPM++ 2M": DPMSolverMultistepScheduler.from_config(pipe.scheduler.config),
        "DPM++ SDE": DPMSolverSDEScheduler.from_config(pipe.scheduler.config),
        "LMS": LMSDiscreteScheduler.from_config(pipe.scheduler.config)
    }
    
    return samplers.get(sampler_name, samplers["DPM++ 2M Karras"])

@app.route('/generate-image', methods=['POST'])
def generate_image():
    """Generate image using Stable Diffusion with art parameters"""
    try:
        data = request.json
        
        # Extract parameters
        prompt = data.get('prompt', '')
        steps = data.get('steps', 20)
        cfg_scale = data.get('cfg_scale', 7.5)
        seed = data.get('seed', None)
        sampler = data.get('sampler', 'DPM++ 2M Karras')
        width = data.get('width', 512)
        height = data.get('height', 512)
        token_id = data.get('tokenId', 'unknown')
        
        print(f"Generating image for token {token_id}")
        print(f"Prompt: {prompt}")
        print(f"Steps: {steps}, CFG: {cfg_scale}, Seed: {seed}")
        print(f"Size: {width}x{height}, Sampler: {sampler}")
        
        # Load model if not already loaded
        load_model()
        
        # Set the scheduler
        pipe.scheduler = get_sampler_by_name(sampler)
        
        # Generate image
        with torch.autocast("cuda" if torch.cuda.is_available() else "cpu"):
            result = pipe(
                prompt=prompt,
                num_inference_steps=steps,
                guidance_scale=cfg_scale,
                width=width,
                height=height,
                generator=torch.Generator().manual_seed(seed) if seed else None
            )
        
        image = result.images[0]
        
        # Save image
        image_filename = f"art_token_{token_id}_{uuid.uuid4().hex[:8]}.png"
        image_path = os.path.join("generated_images", image_filename)
        
        # Create directory if it doesn't exist
        os.makedirs("generated_images", exist_ok=True)
        
        # Save image
        image.save(image_path)
        
        # Convert to base64 for response
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return jsonify({
            'success': True,
            'imageUrl': f'/generated_images/{image_filename}',
            'imageBase64': f'data:image/png;base64,{img_str}',
            'tokenId': token_id,
            'prompt': prompt,
            'parameters': {
                'steps': steps,
                'cfg_scale': cfg_scale,
                'seed': seed,
                'sampler': sampler,
                'width': width,
                'height': height
            }
        })
        
    except Exception as e:
        print(f"Error generating image: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/generated_images/<filename>')
def serve_image(filename):
    """Serve generated images"""
    try:
        return send_file(f'generated_images/{filename}')
    except FileNotFoundError:
        return jsonify({'error': 'Image not found'}), 404

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': pipe is not None,
        'cuda_available': torch.cuda.is_available()
    })

@app.route('/', methods=['GET'])
def index():
    """Root endpoint"""
    return jsonify({
        'message': 'AleaArt Python Backend',
        'endpoints': [
            '/generate-image',
            '/health',
            '/generated_images/<filename>'
        ]
    })

if __name__ == '__main__':
    print("Starting AleaArt Python Backend...")
    print("Installing required packages...")
    
    # Install required packages
    import subprocess
    import sys
    
    packages = [
        'torch',
        'diffusers',
        'transformers',
        'scipy',
        'flask',
        'flask-cors',
        'pillow'
    ]
    
    for package in packages:
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', package])
        except subprocess.CalledProcessError:
            print(f"Warning: Could not install {package}")
    
    print("Starting Flask server...")
    app.run(host='0.0.0.0', port=8000, debug=True)
