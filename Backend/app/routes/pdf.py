import os
import shutil
import logging
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from datetime import datetime
from bson import ObjectId

from app.core.config import MAX_FILE_SIZE, UPLOAD_DIR
from app.core.security import verify_token
from app.db.database import chats
from app.services.pdf_service import process_pdf

router = APIRouter()

@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...), user_id: str = Depends(verify_token)):
    try:
        if chats is None:
            raise HTTPException(status_code=503, detail="Database connection not available")

        if file.size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large")

        # --- STEP 1: Generate the ID manually first ---
        chat_id_obj = ObjectId()
        chat_id_str = str(chat_id_obj)

        # 2. File System Operations
        try:
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            # Use the chat_id in the filename to keep it unique
            file_path = os.path.join(UPLOAD_DIR, f"{chat_id_str}_{file.filename}")
            
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
        except Exception as fs_err:
            logging.error(f"File System Error: {str(fs_err)}")
            raise HTTPException(status_code=500, detail="Could not save file")

        # --- STEP 2: Pass the generated ID to process_pdf ---
        try:
            process_pdf(file_path, chat_id_str)
        except Exception as proc_err:
            logging.error(f"PDF Processing Error: {str(proc_err)}")
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(status_code=422, detail="Error processing PDF content")

        # --- STEP 3: Save to DB using the PRE-GENERATED ID ---
        try:
            chat = {
                "_id": chat_id_obj, # Manually setting the ID in Mongo
                "userId": user_id,
                "title": file.filename,
                "filePath": file_path,
                "createdAt": datetime.utcnow()
            }
            chats.insert_one(chat)
            return {"chatId": chat_id_str}
        except Exception as db_err:
            logging.error(f"Database Insert Error: {str(db_err)}")
            raise HTTPException(status_code=500, detail="Failed to save chat record")

    except HTTPException as e:
        raise e
    except Exception as e:
        logging.error(f"Unexpected Upload Error: {str(e)}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred")