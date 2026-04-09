from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import auth, chat, pdf

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(pdf.router, prefix="/pdf", tags=["PDF"])