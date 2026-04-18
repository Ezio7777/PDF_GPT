import os
from pymongo import MongoClient
from dotenv import load_dotenv
import certifi

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

# Initialize client as None
client = None
db = None

def get_db():
    global client, db
    if client is None:
        try:
            client = MongoClient(
                MONGO_URI,
                tls=True,
                tlsCAFile=certifi.where(),
                serverSelectionTimeoutMS=5000
            )
            db = client["pdf_gpt"]
            # Optional: Remove the ping from top level to prevent blocking startup
        except Exception as e:
            print(f"MongoDB connection error: {e}")
    return db

# Create references that routes can use
# (Note: Calling get_db here once is fine, just don't let it crash the whole app)
database = get_db()
users = database["users"] if database is not None else None
chats = database["chats"] if database is not None else None
messages = database["messages"] if database is not None else None
vector_col = database["embeddings"] if database is not None else None