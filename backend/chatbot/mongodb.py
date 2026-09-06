from pymongo import MongoClient
import os
from dotenv import load_dotenv
from django.conf import settings
# Load environment variables
# load_dotenv()

# # Get MongoDB URI
# MONGO_URI = os.getenv("MONGO_URI")

# # Create MongoDB client
# client = MongoClient(settings.MONGO_URI)

# # Select database
# db = client["farmerdb"]

# # Collection for chat logs
# chat_logs = db["chat_logs"]

def get_chat_logs():
    if not settings.MONGO_URI:
        raise Exception("MONGO_URI not configured")
    
    client = MongoClient(settings.MONGO_URI)
    db= client["farmerdb"]
    return db["chat_logs"]
