import os
from fastapi import APIRouter, Body, HTTPException, status
from datetime import datetime
import logging

from fastapi import Depends
from bson import ObjectId

from app.core.security import verify_token
from app.db.database import users
from app.core.security import hash_password, verify_password, create_token
from app.db.database import chats, messages, vector_col
from pydantic import BaseModel

router = APIRouter()

@router.post("/signup")
def signup(
    name: str = Body(...),
    email: str = Body(...),
    password: str = Body(...)
):
    try:
        # 1. Check if database connection is available
        if users is None:
            raise HTTPException(status_code=500, detail="Database connection not available")

        # 2. Check if user already exists
        if users.find_one({"email": email}):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="User with this email already exists"
            )

        # 3. Attempt to hash and insert
        hashed_pwd = hash_password(password)
        users.insert_one({
            "name": name,
            "email": email,
            "password": hashed_pwd,
            "createdAt": datetime.utcnow()
        })

        return {"msg": "Signup success"}

    except HTTPException as e:
        raise e  # Re-raise our specific errors
    except Exception as e:
        logging.error(f"Signup Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during signup")


@router.post("/login")
def login(email: str = Body(...), password: str = Body(...)):
    try:
        if users is None:
            raise HTTPException(status_code=500, detail="Database connection not available")

        # 1. Find the user
        user = users.find_one({"email": email})

        # 2. Verify credentials
        if not user or not verify_password(password, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Invalid email or password"
            )

        # 3. Create Token
        token = create_token(str(user["_id"]))

        return {
            "token": token,
            "user": {
                "email": user["email"],
                "name": user.get("name", "")
            }
        }

    except HTTPException as e:
        raise e
    except Exception as e:
        logging.error(f"Login Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during login")
    

@router.put("/update-name")
def update_name(
    name: str = Body(..., embed=True),
    user_id: str = Depends(verify_token)
):
    try:
        if users is None:
            raise HTTPException(status_code=500, detail="Database connection not available")

        users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"name": name}}
        )

        return {"msg": "Name updated successfully"}

    except Exception as e:
        logging.error(f"Update Name Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update name")
    
class ResetPasswordSchema(BaseModel):
    oldPassword: str
    newPassword: str


@router.put("/reset-password")
def reset_password(
    data: ResetPasswordSchema,
    user_id: str = Depends(verify_token)
):
    try:
        user = users.find_one({"_id": ObjectId(user_id)})

        if not user or not verify_password(data.oldPassword, user["password"]):
            raise HTTPException(status_code=401, detail="Old password is incorrect")

        new_hashed = hash_password(data.newPassword)

        users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password": new_hashed}}
        )

        return {"msg": "Password updated successfully"}

    except Exception as e:
        logging.error(str(e))
        raise HTTPException(status_code=500, detail="Failed to reset password")
    

@router.delete("/delete-account")
def delete_account(user_id: str = Depends(verify_token)):
    try:
        user_obj_id = ObjectId(user_id)

        # 1. Get all user chats
        user_chats = list(chats.find({"userId": user_id}))

        chat_ids = [str(chat["_id"]) for chat in user_chats]

        # 2. Delete messages
        messages.delete_many({"chatId": {"$in": chat_ids}})

        # 3. Delete embeddings (vector DB)
        vector_col.delete_many({"chatId": {"$in": chat_ids}})

        # 4. Delete uploaded PDF files
        for chat in user_chats:
            file_path = chat.get("filePath")
            if file_path and os.path.exists(file_path):
                os.remove(file_path)

        # 5. Delete chats
        chats.delete_many({"userId": user_id})

        # 6. Delete user
        users.delete_one({"_id": user_obj_id})

        return {"msg": "Account and all data deleted successfully"}

    except Exception as e:
        logging.error(f"Delete Account Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete account")