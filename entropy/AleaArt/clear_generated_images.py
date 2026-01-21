#!/usr/bin/env python3
"""
Clear existing generated images to fix schema issues
"""

import pymongo
from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def clear_generated_images():
    """Clear all generated images from the database"""
    try:
        # Connect to MongoDB
        mongo_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/aleart')
        client = MongoClient(mongo_uri)
        db = client.get_default_database()
        
        # Get the users collection
        users_collection = db.useralearts
        
        # Update all users to remove generatedImages array
        result = users_collection.update_many(
            {},
            {"$unset": {"generatedImages": ""}}
        )
        
        print(f"✅ Cleared generated images from {result.modified_count} users")
        
        # Close connection
        client.close()
        
        return True
        
    except Exception as e:
        print(f"❌ Error clearing generated images: {e}")
        return False

if __name__ == "__main__":
    print("🧹 Clearing existing generated images...")
    success = clear_generated_images()
    if success:
        print("🎉 Database cleared successfully!")
        print("You can now try the image generation again.")
    else:
        print("💥 Failed to clear database.")

