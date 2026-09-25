#!/usr/bin/env python3
"""
Test the async image generation API directly
"""

import requests
import json

def test_async_api():
    """Test the async image generation API"""
    print("🧪 Testing Async Image Generation API...")
    
    # Test data
    test_data = {
        "parameters": {
            "promptIndex": 1,
            "styleIndex": 0,
            "samplerIndex": 3,
            "aspectIndex": 2,
            "steps": 20,
            "cfg": 75,
            "latentSeed": 12345,
            "paletteId": 5
        },
        "tokenId": 999
    }
    
    try:
        print("📤 Sending request to async API...")
        response = requests.post(
            "http://localhost:3000/api/generate-image-async",
            json=test_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"📥 Response status: {response.status_code}")
        print(f"📥 Response body: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print("✅ Async image generation started successfully!")
                print(f"   Message: {result.get('message')}")
                print(f"   Token ID: {result.get('tokenId')}")
                print(f"   Status: {result.get('status')}")
                return True
            else:
                print(f"❌ API returned error: {result.get('error')}")
                return False
        else:
            print(f"❌ HTTP error: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Request failed: {e}")
        return False

if __name__ == "__main__":
    success = test_async_api()
    if success:
        print("\n🎉 Async API test passed!")
    else:
        print("\n💥 Test failed.")

