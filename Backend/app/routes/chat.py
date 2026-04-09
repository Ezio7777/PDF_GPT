from fastapi import APIRouter, Body, Depends, HTTPException, status
from datetime import datetime
from bson import ObjectId
from bson.errors import InvalidId
import logging

from app.db.database import chats, messages
from app.core.security import verify_token
from app.services.ai_service import ask_ai

router = APIRouter()

@router.get("/list")
def get_chats(user_id: str = Depends(verify_token)):
    try:
        if chats is None:
            raise HTTPException(status_code=500, detail="Database connection not available")

        cursor = chats.find({"userId": user_id})
        result = []
        for c in cursor:
            result.append({
                "chatId": str(c["_id"]),
                "title": c.get("title", "New Chat"),
                "createdAt": c.get("createdAt")
            })
        return result
    except HTTPException as e:
        raise e
    except Exception as e:
        logging.error(f"Error listing chats: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching chats")

@router.get("/{chatId}")
def get_messages(chatId: str, user_id: str = Depends(verify_token)):
    try:
        if chats is None or messages is None:
            raise HTTPException(status_code=500, detail="Database connection not available")

        chat = chats.find_one({
            "_id": ObjectId(chatId),
            "userId": user_id
        })

        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")

        msgs = messages.find({"chatId": chatId}).sort("timestamp", 1)
        result = []
        for m in msgs:
            result.append({
                "role": m["role"],
                "content": m["content"],
                "timestamp": m["timestamp"]
            })
        return result

    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid Chat ID format")
    except HTTPException as e:
        raise e
    except Exception as e:
        logging.error(f"Error fetching messages: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error while fetching messages")

@router.post("/ask")
def ask(
    question: str = Body(...),
    chatId: str = Body(...),
    user_id: str = Depends(verify_token)
):
    try:
        if chats is None or messages is None:
            raise HTTPException(status_code=500, detail="Database connection not available")

        chat = chats.find_one({
            "_id": ObjectId(chatId),
            "userId": user_id
        })

        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")

        messages.insert_one({
            "chatId": chatId,
            "role": "user",
            "content": question,
            "timestamp": datetime.utcnow()
        })

        try:
            answer = ask_ai(question, chatId)
        except Exception as ai_err:
            logging.error(f"AI Service Error: {str(ai_err)}")
            raise HTTPException(status_code=503, detail="AI service error")

        messages.insert_one({
            "chatId": chatId,
            "role": "ai",
            "content": answer,
            "timestamp": datetime.utcnow()
        })

        if len(question) < 50:
            chats.update_one(
                {"_id": ObjectId(chatId)},
                {"$set": {"title": question}}
            )

        return {"answer": answer}

    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid Chat ID format")
    except HTTPException as e:
        raise e
    except Exception as e:
        logging.error(f"Error in ask route: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during AI processing")

@router.delete("/{chatId}")
def delete_chat(chatId: str, user_id: str = Depends(verify_token)):
    try:
        if chats is None or messages is None:
            raise HTTPException(status_code=500, detail="Database connection not available")

        chat = chats.find_one({
            "_id": ObjectId(chatId),
            "userId": user_id
        })

        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")

        chats.delete_one({"_id": ObjectId(chatId)})
        messages.delete_many({"chatId": chatId})

        return {"msg": "Chat deleted successfully"}

    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid Chat ID format")
    except HTTPException as e:
        raise e
    except Exception as e:
        logging.error(f"Error deleting chat: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during deletion")