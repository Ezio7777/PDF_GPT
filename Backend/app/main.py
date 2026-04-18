# main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, chat, pdf


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Runs AFTER the port is bound — safe from Render's timeout
    print("Warming up embedding model...")
    from app.services.ai_service import get_embeddings
    get_embeddings()
    print("Embedding model ready.")
    yield


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(pdf.router, prefix="/pdf", tags=["PDF"])