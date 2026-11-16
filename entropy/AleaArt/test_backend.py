#!/usr/bin/env python3
"""
Test script for AleaArt Python Backend
"""

import requests
import json
import time

def test_backend():
    """Test the Python backend"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing AleaArt Python Backend...")
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health", timeout=10)
        if response.status_code == 200:
            print("✅ Health check passed")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False
    
    # Test image generation
    test_data = {
        "prompt": "a beautiful landscape, digital art, detailed",
        "steps": 10,  # Reduced for faster testing
        "cfg_scale": 7.5,
        "seed": 12345,
        "width": 512,
        "height": 512,
        "tokenId": "test"
    }
    
    print("🎨 Testing image generation...")
    try:
        response = requests.post(
            f"{base_url}/generate-image",
            json=test_data,
            timeout=60  # Longer timeout for image generation
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("✅ Image generation successful!")
                print(f"   Token ID: {result.get('tokenId')}")
                print(f"   Image URL: {result.get('imageUrl')}")
                return True
            else:
                print(f"❌ Image generation failed: {result.get('error')}")
                return False
        else:
            print(f"❌ Image generation request failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Image generation error: {e}")
        return False

if __name__ == "__main__":
    print("Waiting for server to start...")
    time.sleep(10)  # Wait for server to start
    
    success = test_backend()
    if success:
        print("\n🎉 All tests passed! Backend is working correctly.")
    else:
        print("\n💥 Tests failed. Check the server logs for errors.")

