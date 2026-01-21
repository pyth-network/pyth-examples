#!/usr/bin/env python3
"""
AleaArt Python Backend for Image Generation (Simplified Version)
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
import pymongo
from datetime import datetime
import requests
import json

app = Flask(__name__)
CORS(app)

# Global variables for the model
pipe = None
model_id = "runwayml/stable-diffusion-v1-5"

# MongoDB connection (for metadata only)
mongo_client = None
db = None

# Pinata IPFS configuration
PINATA_API_KEY = os.getenv('PINATA_API_KEY')
PINATA_API_SECRET = os.getenv('PINATA_API_SECRET')
PINATA_JWT = os.getenv('PINATA_JWT')

def connect_mongodb():
    """Connect to MongoDB"""
    global mongo_client, db
    try:
        # MongoDB connection string from environment variable
        mongodb_uri = os.getenv('MONGODB_URI')
        if not mongodb_uri:
            print("❌ MONGODB_URI environment variable not set")
            return False
            
        mongo_client = pymongo.MongoClient(mongodb_uri)
        db = mongo_client['aleart']
        print("✅ Connected to MongoDB")
        return True
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        return False

def upload_to_pinata(image_data, filename, metadata=None):
    """Upload image to Pinata IPFS"""
    try:
        if not PINATA_JWT:
            print("❌ Pinata JWT not configured")
            return None
        
        # Prepare the file data
        files = {
            'file': (filename, image_data, 'image/png')
        }
        
        # Prepare metadata
        pinata_metadata = {
            'name': filename,
            'keyvalues': metadata or {}
        }
        
        headers = {
            'Authorization': f'Bearer {PINATA_JWT}'
        }
        
        data = {
            'pinataMetadata': json.dumps(pinata_metadata),
            'pinataOptions': json.dumps({
                'cidVersion': 1
            })
        }
        
        # Upload to Pinata
        response = requests.post(
            'https://api.pinata.cloud/pinning/pinFileToIPFS',
            files=files,
            data=data,
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            ipfs_hash = result['IpfsHash']
            print(f"✅ Image uploaded to IPFS: {ipfs_hash}")
            return ipfs_hash
        else:
            print(f"❌ Failed to upload to Pinata: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Error uploading to Pinata: {e}")
        return None

def load_model():
    """Load the Stable Diffusion model"""
    global pipe
    if pipe is None:
        print("Loading Stable Diffusion model...")
        
        # Use a simpler loading approach
        pipe = StableDiffusionPipeline.from_pretrained(
            model_id, 
            torch_dtype=torch.float32,
            safety_checker=None,
            requires_safety_checker=False,
            use_safetensors=True
        )
        
        # Move to CPU first, then to GPU if available
        pipe = pipe.to("cpu")
        print("Model loaded on CPU")
        
        # Try to move to GPU if available
        if torch.cuda.is_available():
            try:
                pipe = pipe.to("cuda")
                print("Model moved to GPU")
            except Exception as e:
                print(f"Could not move to GPU: {e}")
                print("Staying on CPU")
        
        # Enable memory efficient attention
        try:
            pipe.enable_attention_slicing()
            print("Memory efficient attention enabled")
        except Exception as e:
            print(f"Could not enable attention slicing: {e}")
        
        print("Model loaded successfully!")

def save_image_metadata_to_mongodb(user_id, token_id, ipfs_hash, prompt, parameters):
    """Save image metadata to MongoDB (IPFS hash instead of base64 data)"""
    global db
    try:
        if db is None:
            print("❌ MongoDB not connected")
            return False
        
        # Create the image document with IPFS hash
        image_doc = {
            'userId': user_id,
            'tokenId': token_id,
            'ipfsHash': ipfs_hash,
            'ipfsUrl': f'https://gateway.pinata.cloud/ipfs/{ipfs_hash}',
            'prompt': prompt,
            'parameters': parameters,
            'status': 'completed',
            'createdAt': datetime.utcnow()
        }
        
        # Insert into generatedImages collection
        result = db.generatedImages.insert_one(image_doc)
        print(f"✅ Image metadata saved to MongoDB with ID: {result.inserted_id}")
        return True
        
    except Exception as e:
        print(f"❌ Failed to save image metadata to MongoDB: {e}")
        return False

@app.route('/generate-image', methods=['POST'])
def generate_image():
    """Generate image using Stable Diffusion with art parameters"""
    try:
        data = request.json
        
        # Extract parameters
        prompt = data.get('prompt', '')
        steps = 4
        cfg_scale = data.get('cfg_scale', 7.5)
        seed = data.get('seed', None)
        width = data.get('width', 512)
        height = data.get('height', 512)
        token_id = data.get('tokenId', 'unknown')
        user_id = data.get('userId', None)  # Add user ID
        
        print(f"Generating image for token {token_id}")
        print(f"Prompt: {prompt}")
        print(f"Steps: {steps}, CFG: {cfg_scale}, Seed: {seed}")
        print(f"Size: {width}x{height}")
        
        # Check if model is loaded
        if pipe is None:
            print("Model not loaded, loading now...")
            load_model()
        
        # Generate image
        result = pipe(
            prompt=prompt,
            num_inference_steps=steps,
            guidance_scale=cfg_scale,
            width=width,
            height=height,
            generator=torch.Generator().manual_seed(seed) if seed else None
        )
        
        image = result.images[0]
        
        # Prepare image data for IPFS upload
        image_filename = f"art_token_{token_id}_{uuid.uuid4().hex[:8]}.png"
        
        # Convert image to bytes for IPFS upload
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        image_bytes = buffer.getvalue()
        
        print(f"✅ Image generated successfully for token {token_id}")
        print(f"📏 Image size: {len(image_bytes)} bytes")
        
        # Upload to IPFS via Pinata
        ipfs_hash = None
        ipfs_url = None
        
        if PINATA_JWT:
            metadata = {
                'tokenId': str(token_id),
                'userId': str(user_id) if user_id else 'anonymous',
                'prompt': prompt[:50] + '...' if len(prompt) > 50 else prompt
            }
            
            ipfs_hash = upload_to_pinata(image_bytes, image_filename, metadata)
            if ipfs_hash:
                ipfs_url = f'https://gateway.pinata.cloud/ipfs/{ipfs_hash}'
                print(f"🌐 IPFS URL: {ipfs_url}")
        else:
            print("⚠️ Pinata JWT not configured, skipping IPFS upload")
        
        # Save metadata to MongoDB if user_id is provided
        parameters = {
            'steps': steps,
            'cfg_scale': cfg_scale,
            'seed': seed,
            'width': width,
            'height': height
        }
        
        if user_id and ipfs_hash:
            save_image_metadata_to_mongodb(user_id, token_id, ipfs_hash, prompt, parameters)
        
        return jsonify({
            'success': True,
            'ipfsHash': ipfs_hash,
            'ipfsUrl': ipfs_url,
            'imageBase64': f'data:image/png;base64,{base64.b64encode(image_bytes).decode()}',
            'tokenId': token_id,
            'prompt': prompt,
            'parameters': parameters
        })
        
    except Exception as e:
        print(f"❌ Error generating image: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/generated_images/<filename>')
def serve_image(filename):
    """Serve generated images (legacy endpoint - images now stored on IPFS)"""
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
        'message': 'AleaArt Python Backend (Simplified)',
        'endpoints': [
            '/generate-image',
            '/health',
            '/generated_images/<filename>'
        ]
    })

if __name__ == '__main__':
    print("Starting AleaArt Python Backend (Simplified)...")
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
        'pillow',
        'pymongo',
        'requests'
    ]
    
    for package in packages:
        try:
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', package])
        except subprocess.CalledProcessError:
            print(f"Warning: Could not install {package}")
    
    # Connect to MongoDB
    print("Connecting to MongoDB...")
    connect_mongodb()
    
    # Load the model at startup
    print("Loading Stable Diffusion model at startup...")
    load_model()
    
    print("Starting Flask server...")
    app.run(host='0.0.0.0', port=8000, debug=True)
