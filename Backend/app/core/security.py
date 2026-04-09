import os
import logging
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

def hash_password(password: str):
    try:
        return pwd_context.hash(password)
    except Exception as e:
        logging.error(f"Password hashing failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal security error")

def verify_password(password: str, hashed: str):
    try:
        return pwd_context.verify(password, hashed)
    except Exception as e:
        logging.error(f"Password verification failed: {str(e)}")
        return False

def create_token(user_id: str):
    try:
        payload = {
            "user_id": user_id,
            "exp": datetime.utcnow() + timedelta(hours=2)
        }
        return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    except Exception as e:
        logging.error(f"Token creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not create access token")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Token invalid: No user ID found"
            )
        return user_id

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Token has expired"
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Invalid authentication token"
        )
    except Exception as e:
        logging.error(f"Unexpected Token Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            detail="Internal auth error"
        )