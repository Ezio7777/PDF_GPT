# PDF GPT — Backend

> **FastAPI + MongoDB Atlas + LangChain + Gemini AI — production-grade backend for AI-powered PDF chat.**

A clean, modular Python backend that handles user authentication, PDF ingestion with vector embeddings, AI-powered question answering, and full chat session management. Built by **Sunit Pal**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Features](#2-features)
3. [Tech Stack](#3-tech-stack)
4. [Architecture Overview](#4-architecture-overview)
5. [Folder Structure](#5-folder-structure)
6. [Key Components](#6-key-components)
7. [Setup Instructions](#7-setup-instructions)
8. [Environment Variables](#8-environment-variables)
9. [API Reference](#9-api-reference)
10. [AI & Vector Search Flow](#10-ai--vector-search-flow)
11. [Future Improvements](#11-future-improvements)
12. [Conclusion](#12-conclusion)

---

## 1. Project Overview

The PDF GPT backend is a FastAPI application that provides:

- **JWT authentication** — signup, login, name update, password reset, account deletion
- **PDF processing pipeline** — upload → parse → chunk → embed → store in MongoDB Atlas Vector Search
- **AI question answering** — semantic search over the user's PDF chunks, answered by Google Gemini
- **Chat session management** — create, list, fetch messages, delete chats
- **Per-user, per-chat data isolation** — every vector search is filtered by `chatId` so users only ever see their own PDF's content

The backend is consumed by a React + TypeScript frontend running at `http://localhost:5173`.

---

## 2. Features

### Authentication
- Signup with name, email, and bcrypt-hashed password stored in MongoDB
- Login returns a JWT token + the user's name and email (used by the frontend immediately)
- JWT token is valid for 2 hours, signed with HS256
- All protected routes verify the token via a FastAPI `Depends` dependency
- Full account deletion — cascades to messages, embeddings, uploaded files, and chats

### PDF Processing
- PDF upload validated for size (max 2 MB) before processing
- `ObjectId` generated before processing so the chat ID is embedded in the filename, embeddings metadata, and database record — all consistent
- PDF text extracted using `PyPDFLoader`, split into 1000-character chunks with 100-character overlap
- Each chunk tagged with `chatId` in metadata before embedding
- Embeddings generated with `all-MiniLM-L6-v2` (HuggingFace) and stored in MongoDB Atlas Vector Search
- Uploaded PDF file deleted from disk after successful embedding (no raw files kept long-term)

### AI Chat
- Semantic search retrieves the top 4 most relevant chunks filtered strictly by `chatId`
- Retrieved context is passed to Google Gemini (`gemini-2.5-flash-lite`) with the user's question
- Every question and answer is persisted to MongoDB as a message document
- If the question is under 50 characters, it becomes the chat's title automatically

### Chat Management
- List all chats for the authenticated user
- Fetch all messages for a specific chat (sorted by timestamp)
- Delete a chat and all its associated messages

---

## 3. Tech Stack

| Category | Technology | Purpose |
|---|---|---|
| Framework | FastAPI | HTTP routing, dependency injection, auto docs |
| Language | Python 3.11+ | Core runtime |
| Database | MongoDB Atlas | Users, chats, messages, vector embeddings |
| ODM / Client | PyMongo | Synchronous MongoDB operations |
| Authentication | python-jose (JWT) + passlib (bcrypt) | Token creation and password hashing |
| PDF Parsing | LangChain + PyPDFLoader | Load and split PDF documents |
| Embeddings | HuggingFace `all-MiniLM-L6-v2` | Convert text chunks to vector representations |
| Vector Store | MongoDB Atlas Vector Search | Semantic similarity search |
| AI / LLM | Google Gemini `gemini-2.5-flash-lite` via LangChain | Generate answers from context |
| Config | python-dotenv | Environment variable management |
| TLS | certifi | Secure MongoDB Atlas connection |
| CORS | FastAPI CORSMiddleware | Cross-origin requests from the frontend |

---

## 4. Architecture Overview

```
HTTP Request
     │
     ▼
FastAPI App (main.py)
     │
     ├── /auth  → routes/auth.py  → core/security.py → db/database.py
     ├── /chat  → routes/chat.py  → services/ai_service.py → db/database.py
     └── /pdf   → routes/pdf.py   → services/pdf_service.py → db/database.py
                                              │
                                              ▼
                                   MongoDB Atlas
                                   ├── users       (collection)
                                   ├── chats       (collection)
                                   ├── messages    (collection)
                                   └── embeddings  (vector collection)
```

**Request lifecycle:**

```
Client
  → FastAPI route handler
  → verify_token (Depends) validates JWT, extracts user_id
  → Route calls service function (ai_service / pdf_service)
  → Service queries / writes to MongoDB Atlas
  → Response returned to client
```

**Data isolation principle:** Every query against `chats`, `messages`, and `embeddings` includes `userId` or `chatId` as a filter. No user can access another user's data even if they guess a valid ObjectId.

---

## 5. Folder Structure

```
Backend/
│
├── app/
│   ├── core/
│   │   ├── config.py          # Env vars: MONGO_URI, SECRET_KEY, ALGORITHM, upload limits
│   │   └── security.py        # hash_password, verify_password, create_token, verify_token
│   │
│   ├── db/
│   │   └── database.py        # MongoClient connection, collection handles (users/chats/messages/embeddings)
│   │
│   ├── models/
│   │   ├── user.py            # user_schema helper (email, password, name, createdAt)
│   │   └── chat.py            # chat_schema helper (userId, filePath, title, createdAt)
│   │
│   ├── routes/
│   │   ├── auth.py            # POST /signup, POST /login, PUT /update-name,
│   │   │                      # PUT /reset-password, DELETE /delete-account
│   │   ├── chat.py            # GET /list, GET /{chatId}, POST /ask, DELETE /{chatId}
│   │   └── pdf.py             # POST /upload
│   │
│   ├── services/
│   │   ├── ai_service.py      # ask_ai() — vector search + Gemini LLM call
│   │   └── pdf_service.py     # process_pdf() — load, chunk, embed, store
│   │
│   └── main.py                # FastAPI app, CORS middleware, router registration
│
├── uploads/                   # Temporary PDF storage (files deleted post-processing)
├── .env                       # Environment variables (never commit this)
├── requirements.txt           # Python dependencies
└── README.md
```

---

## 6. Key Components

### `main.py`
Application entry point. Creates the FastAPI instance, adds CORS middleware (allowing all origins for development), and registers all three routers with their prefixes (`/auth`, `/chat`, `/pdf`).

### `core/security.py`
The security backbone of the application.
- `hash_password` — bcrypt-hashes a plaintext password using `passlib`
- `verify_password` — safely compares plaintext against a bcrypt hash
- `create_token` — creates a JWT with `user_id` and a 2-hour expiry, signed with the `SECRET_KEY`
- `verify_token` — a FastAPI `Depends` dependency used on every protected route. Extracts the Bearer token from the `Authorization` header, decodes it, and returns the `user_id`. Raises HTTP 401 on expired or invalid tokens.

### `core/config.py`
Loads all configuration from `.env` using `python-dotenv`. Exposes `MONGO_URI`, `SECRET_KEY`, `ALGORITHM`, `MAX_FILE_SIZE` (2 MB), and `UPLOAD_DIR` as module-level constants imported by routes and services.

### `db/database.py`
Establishes a single `MongoClient` connection to MongoDB Atlas with TLS (`certifi` CA bundle) and a 5-second timeout. Exposes four collection handles: `users`, `chats`, `messages`, `vector_col`. If the connection fails, all handles are set to `None` and routes check for this before every operation.

### `routes/auth.py`
Five endpoints covering the full user lifecycle. Uses `Body(...)` parameters for request data and `Depends(verify_token)` on protected routes. The `delete_account` endpoint performs a full cascade: messages → embeddings → PDF files on disk → chats → user document, in that dependency order.

### `routes/chat.py`
Four CRUD endpoints for chat sessions and messages. The `ask` route validates chat ownership (user can only ask questions about their own chats), stores both sides of the conversation, calls `ask_ai`, and optionally updates the chat title.

### `routes/pdf.py`
Handles file upload with a carefully sequenced flow: generate `ObjectId` first → save file → process and embed → insert chat record to MongoDB. This sequence ensures the `chatId` is consistent everywhere before the database record is written.

### `services/pdf_service.py`
The PDF ingestion pipeline. Loads the PDF with `PyPDFLoader`, splits it into chunks with `RecursiveCharacterTextSplitter` (1000 chars, 100 overlap), tags every chunk with `chatId` in metadata, generates embeddings with HuggingFace `all-MiniLM-L6-v2`, and stores them in MongoDB Atlas Vector Search.

### `services/ai_service.py`
The AI question-answering service. Connects to the existing vector store in Atlas, runs a similarity search filtered by `chatId` (top 4 chunks), joins the chunk texts as context, and calls Google Gemini with a prompt combining the context and user question.

---

## 7. Setup Instructions

### Prerequisites
- Python 3.11 or higher
- A MongoDB Atlas account with a cluster and Vector Search index named `"default"`
- A Google AI Studio API key (for Gemini)
- HuggingFace model `all-MiniLM-L6-v2` (downloaded automatically on first run)

### Step 1 — Clone and enter the project

```bash
git clone https://github.com/sunitpal/pdf-gpt-creator-backend.git
cd Backend
```

### Step 2 — Create a virtual environment

```bash
python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### Step 3 — Install dependencies

```bash
pip install -r requirements.txt
```

### Step 4 — Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values (see [Environment Variables](#8-environment-variables)).

### Step 5 — Set up MongoDB Atlas Vector Search index

In the MongoDB Atlas UI:
1. Go to your cluster → Browse Collections → `pdf_gpt` → `embeddings`
2. Create a Search Index → JSON Editor → name it `"default"`
3. Use this index definition:

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 384,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "chatId"
    }
  ]
}
```

The `"filter"` field on `chatId` enables the `pre_filter` in `ask_ai()` to work correctly.

### Step 6 — Run the development server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API is now available at **http://localhost:8000**  
Interactive docs: **http://localhost:8000/docs**

---

## 8. Environment Variables

| Variable | Required | Example | Description |
|---|---|---|---|
| `MONGO_URI` | Yes | `mongodb+srv://user:pass@cluster.mongodb.net/` | MongoDB Atlas connection string |
| `SECRET_KEY` | Yes | `a-very-long-random-string` | JWT signing secret — keep this private |
| `ALGORITHM` | Yes | `HS256` | JWT signing algorithm |
| `GOOGLE_API_KEY` | Yes | `AIzaSy...` | Google AI Studio API key for Gemini |

> **Security:** Never commit `.env` to version control. Add it to `.gitignore`.

---

## 9. API Reference

### Auth — `/auth`

| Method | Endpoint | Auth | Request Body | Response |
|---|---|---|---|---|
| POST | `/auth/signup` | No | `{ name, email, password }` | `{ msg }` |
| POST | `/auth/login` | No | `{ email, password }` | `{ token, user: { email, name } }` |
| PUT | `/auth/update-name` | Bearer | `{ name }` | `{ msg }` |
| PUT | `/auth/reset-password` | Bearer | `{ oldPassword, newPassword }` | `{ msg }` |
| DELETE | `/auth/delete-account` | Bearer | — | `{ msg }` |

### PDF — `/pdf`

| Method | Endpoint | Auth | Request | Response |
|---|---|---|---|---|
| POST | `/pdf/upload` | Bearer | `multipart/form-data: file` | `{ chatId }` |

### Chat — `/chat`

| Method | Endpoint | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/chat/list` | Bearer | — | `Chat[]` |
| GET | `/chat/{chatId}` | Bearer | — | `Message[]` |
| POST | `/chat/ask` | Bearer | `{ question, chatId }` | `{ answer }` |
| DELETE | `/chat/{chatId}` | Bearer | — | `{ msg }` |

### Response Shapes

```python
# Chat object
{ "chatId": str, "title": str, "createdAt": datetime }

# Message object
{ "role": "user" | "ai", "content": str, "timestamp": datetime }
```

---

## 10. AI & Vector Search Flow

```
1. User uploads PDF
   └── PyPDFLoader loads pages
   └── RecursiveCharacterTextSplitter → chunks (1000 chars, 100 overlap)
   └── Each chunk: chunk.metadata["chatId"] = chat_id
   └── HuggingFaceEmbeddings("all-MiniLM-L6-v2") → 384-dim vectors
   └── MongoDBAtlasVectorSearch.from_documents() → stored in "embeddings" collection

2. User asks a question
   └── similarity_search(question, k=4, pre_filter={"chatId": chat_id})
   └── Returns top 4 most relevant chunks for THIS chat only
   └── context = " ".join([doc.page_content for doc in docs])
   └── Gemini prompt: "Answer using context: {context} Question: {question}"
   └── Gemini response → saved to messages collection → returned to frontend
```

**Why `pre_filter` on `chatId` matters:**
Without it, semantic search would return relevant chunks from *any* user's PDF. The filter ensures strict per-chat, per-user data isolation at the vector search level — not just in the application layer.

---

## 11. Future Improvements

| Priority | Improvement |
|---|---|
| High | Async MongoDB with `motor` — non-blocking DB operations |
| High | Background tasks for PDF processing (FastAPI `BackgroundTasks` or Celery) |
| High | Rate limiting on `/pdf/upload` and `/chat/ask` |
| Medium | Streaming Gemini responses via Server-Sent Events |
| Medium | Redis caching for repeated questions on the same document |
| Medium | Refresh token endpoint for extending sessions beyond 2 hours |
| Medium | Google OAuth backend integration |
| Low | Pydantic v2 request/response models for all routes |
| Low | Unit tests with `pytest` + `httpx` |
| Low | Docker + Docker Compose for one-command setup |
| Low | Structured logging (JSON format) with request IDs |

---

## 12. Conclusion

This backend demonstrates a production-aware approach to building an AI application: strict data isolation per user and per chat, a clean separation between routing and business logic, predictable error handling at every layer, and a PDF-to-vector pipeline that correctly sequences file, embedding, and database operations to maintain consistency.

The service layer abstractions (`ai_service`, `pdf_service`) mean the AI provider (Gemini) and the embedding model (HuggingFace) can be swapped without touching the route handlers.

---

*Built by **Sunit Pal** · MIT License*