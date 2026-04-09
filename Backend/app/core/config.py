import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

MAX_FILE_SIZE = 2 * 1024 * 1024
UPLOAD_DIR = "uploads"