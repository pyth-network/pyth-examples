#!/usr/bin/env python3
"""
Check if generated images are saved in MongoDB
"""

import pymongo
from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_generated_images():
    """Check generated images in the database"""
    try:
        # Connect to MongoDB
        mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/aleart')
        client = MongoClient(mongo_uri)
        db = client.get_default_database()
        
        # Get the users collection
        users_collection = db.useralearts
        
        # Find all users with generated images
        users_with_images = list(users_collection.find(
            {"generatedImages": {"$exists": True, "$ne": []}},
            {"email": 1, "generatedImages": 1}
        ))
        
        print(f"📊 Found {len(users_with_images)} users with generated images")
        
        for user in users_with_images:
            print(f"\n👤 User: {user.get('email', 'Unknown')}")
            images = user.get('generatedImages', [])
            print(f"   📸 Generated Images: {len(images)}")
            
            for i, img in enumerate(images):
                print(f"   🖼️  Image {i+1}:")
                print(f"      Token ID: {img.get('tokenId')}")
                print(f"      Status: {img.get('status')}")
                print(f"      Has Image Data: {'Yes' if img.get('imageData') else 'No'}")
                print(f"      Prompt: {img.get('prompt', 'N/A')[:50]}...")
                print(f"      Created: {img.get('createdAt')}")
        
        # Close connection
        client.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Error checking database: {e}")
        return False

if __name__ == "__main__":
    print("🔍 Checking generated images in database...")
    success = check_generated_images()
    if success:
        print("\n✅ Database check completed!")
    else:
        print("\n💥 Database check failed.")

