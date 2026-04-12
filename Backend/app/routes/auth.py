from fastapi import APIRouter, Body, HTTPException, status
from datetime import datetime
import logging

from fastapi import Depends
from bson import ObjectId

from app.core.security import verify_token
from app.db.database import users
from app.core.security import hash_password, verify_password, create_token

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

        return {"token": token}

    except HTTPException as e:
        raise e
    except Exception as e:
        logging.error(f"Login Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during login")
    

@router.put("/update-name")
def update_name(
    name: str = Body(...),
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
    

@router.put("/reset-password")
def reset_password(
    old_password: str = Body(...),
    new_password: str = Body(...),
    user_id: str = Depends(verify_token)
):
    try:
        if users is None:
            raise HTTPException(status_code=500, detail="Database connection not available")

        user = users.find_one({"_id": ObjectId(user_id)})

        if not user or not verify_password(old_password, user["password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Old password is incorrect"
            )

        new_hashed = hash_password(new_password)

        users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password": new_hashed}}
        )

        return {"msg": "Password updated successfully"}

    except HTTPException as e:
        raise e
    except Exception as e:
        logging.error(f"Reset Password Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to reset password")
    

@router.delete("/delete-account")
def delete_account(user_id: str = Depends(verify_token)):
    try:
        if users is None:
            raise HTTPException(status_code=500, detail="Database connection not available")

        users.delete_one({"_id": ObjectId(user_id)})

        return {"msg": "Account deleted successfully"}

    except Exception as e:
        logging.error(f"Delete Account Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete account")