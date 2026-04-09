from fastapi import APIRouter, Body, HTTPException, status
from datetime import datetime
import logging

from app.db.database import users
from app.core.security import hash_password, verify_password, create_token

router = APIRouter()

@router.post("/signup")
def signup(email: str = Body(...), password: str = Body(...)):
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