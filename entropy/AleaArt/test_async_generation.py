#!/usr/bin/env python3
"""
Test script for async image generation
"""

import requests
import json
import time

def test_async_generation():
    """Test the async image generation"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Async Image Generation...")
    
    # Test data with art parameters
    test_data = {
        "prompt": "a beautiful landscape, digital art, detailed",
        "steps": 10,  # Reduced for faster testing
        "cfg_scale": 7.5,
        "seed": 12345,
        "width": 512,
        "height": 512,
        "tokenId": "test_async"
    }
    
    print("🎨 Starting async image generation...")
    try:
        response = requests.post(
            f"{base_url}/generate-image",
            json=test_data,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("✅ Async image generation started successfully!")
                print(f"   Token ID: {result.get('tokenId')}")
                print(f"   Image URL: {result.get('imageUrl')}")
                return True
            else:
                print(f"❌ Async generation failed: {result.get('error')}")
                return False
        else:
            print(f"❌ Request failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_async_generation()
    if success:
        print("\n🎉 Async image generation test passed!")
    else:
        print("\n💥 Test failed.")

