import os
from pymongo import MongoClient
from dotenv import load_dotenv
import certifi

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

try:
    client = MongoClient(
        MONGO_URI,
        tls=True,
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=5000
    )

    client.admin.command("ping")

    db = client["pdf_gpt"]
    users = db["users"]
    chats = db["chats"]
    messages = db["messages"]
    vector_col = db["embeddings"]

except Exception as e:
    print(f"MongoDB connection error: {e}")
    db = None
    users = None
    chats = None
    messages = None
    vector_col = None