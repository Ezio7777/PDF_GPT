# Backend Deep Dive — PDF GPT

> A comprehensive technical walkthrough of the FastAPI + MongoDB Atlas + LangChain backend — written for interviews, architecture reviews, and onboarding.

**Author:** Sunit Pal  
**Stack:** FastAPI · Python 3.11 · MongoDB Atlas · LangChain · HuggingFace Embeddings · Google Gemini · PyJWT · bcrypt

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Request Lifecycle](#2-request-lifecycle)
3. [Authentication System](#3-authentication-system)
4. [Database Layer](#4-database-layer)
5. [PDF Processing Pipeline](#5-pdf-processing-pipeline)
6. [AI & Vector Search System](#6-ai--vector-search-system)
7. [Chat System Deep Dive](#7-chat-system-deep-dive)
8. [Error Handling Strategy](#8-error-handling-strategy)
9. [Security Design](#9-security-design)
10. [Interview Questions & Answers](#10-interview-questions--answers)
11. [Improvements & Scaling](#11-improvements--scaling)

---

## 1. High-Level Architecture

### System Overview

```
Frontend (React + TypeScript)
         │
         │  HTTP (JSON + multipart/form-data)
         │  Authorization: Bearer <JWT>
         ▼
FastAPI Application (main.py)
         │
         ├─── /auth  ──► routes/auth.py  ──► core/security.py
         │                                    db/database.py (users)
         │
         ├─── /chat  ──► routes/chat.py  ──► services/ai_service.py
         │                                    db/database.py (chats, messages, embeddings)
         │
         └─── /pdf   ──► routes/pdf.py   ──► services/pdf_service.py
                                              db/database.py (chats, embeddings)
                                              uploads/ (temporary files)
         │
         ▼
MongoDB Atlas
  ├── users        → user accounts
  ├── chats        → chat sessions (one per PDF upload)
  ├── messages     → question/answer pairs per chat
  └── embeddings   → vector chunks with chatId metadata
```

### Component Responsibilities

| Layer | Files | What it does |
|---|---|---|
| Routes | `auth.py`, `chat.py`, `pdf.py` | Accept requests, validate input, call services, return responses |
| Services | `ai_service.py`, `pdf_service.py` | Business logic, AI calls, PDF processing |
| Core | `security.py`, `config.py` | JWT, hashing, environment config |
| Database | `database.py` | MongoDB connection, collection handles |
| Models | `user.py`, `chat.py` | Schema helper functions |

**Design principle:** Routes are thin — they do not contain business logic. Services are the only layer that knows how AI or PDF processing works. This makes each layer independently testable and replaceable.

---

## 2. Request Lifecycle

### A complete `/chat/ask` request, step by step:

```
1. Frontend sends:
   POST /chat/ask
   Authorization: Bearer eyJhbGci...
   Body: { "question": "What is the main topic?", "chatId": "6637..." }

2. FastAPI routes the request to routes/chat.py → ask()

3. Depends(verify_token) runs FIRST (before the route handler):
   → Extracts token from Authorization header
   → Decodes JWT with SECRET_KEY
   → Extracts user_id from payload
   → Injects user_id into the route function

4. Route validates:
   → chats collection is not None (DB health check)
   → ObjectId(chatId) is valid format
   → Chat exists AND belongs to this user_id
       (prevents user A from accessing user B's chat)

5. User message saved to messages collection:
   { chatId, role: "user", content: question, timestamp: now }

6. Route calls ask_ai(question, chatId) in ai_service.py:
   → Loads HuggingFace embeddings model
   → Connects to MongoDB Atlas Vector Store
   → Runs similarity_search(question, k=4, pre_filter={"chatId": chatId})
   → Joins top 4 chunk texts as context
   → Calls Gemini: "Answer using context: {context} Question: {question}"
   → Returns response.content

7. AI message saved to messages collection:
   { chatId, role: "ai", content: answer, timestamp: now }

8. If question < 50 chars:
   → chats.update_one(..., { "$set": { "title": question } })

9. Response returned: { "answer": "The main topic is..." }
```

---

## 3. Authentication System

### `security.py` — Full Breakdown

#### Password Hashing

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str):
    return pwd_context.verify(password, hashed)
```

**Why bcrypt?** bcrypt is a slow hashing algorithm by design. Its cost factor makes brute-force attacks computationally expensive. Unlike `SHA256` or `MD5`, bcrypt automatically salts the hash — the same password produces a different hash every time, making rainbow table attacks impossible.

`passlib`'s `CryptContext` handles the bcrypt version negotiation automatically. The `deprecated="auto"` setting means if a better algorithm is added in the future, passlib will automatically upgrade hashes on next login.

#### JWT Token Creation

```python
def create_token(user_id: str):
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=2)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
```

**What goes in the payload:** Only `user_id` and `exp`. Sensitive data (email, name, roles) is never stored in the JWT. If the token is intercepted, the attacker gets an opaque MongoDB ObjectId string that expires in 2 hours.

**The `exp` claim** is automatically validated by `python-jose`'s `jwt.decode()` — if the token is past its expiry, it raises `ExpiredSignatureError` before any route code runs.

#### JWT Verification — The FastAPI Dependency

```python
security = HTTPBearer()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    user_id = payload.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token invalid: No user ID found")
    return user_id
```

**How FastAPI `Depends` works:** When a route declares `user_id: str = Depends(verify_token)`, FastAPI calls `verify_token()` before calling the route handler. If `verify_token` raises an `HTTPException`, FastAPI returns the error response immediately — the route handler never runs.

This is dependency injection: the route handler receives `user_id` as a clean string. It does not know or care how authentication works.

**Error cases handled:**
- `ExpiredSignatureError` → 401 "Token has expired"
- `JWTError` → 401 "Invalid authentication token"
- `user_id` missing from payload → 401 "Token invalid: No user ID found"
- Any unexpected error → 500 "Internal auth error"

### Signup Flow

```
POST /auth/signup { name, email, password }
     │
     ├── Check: users collection available?
     ├── Check: users.find_one({ email }) → already exists? → 400
     ├── hash_password(password) → bcrypt hash
     ├── users.insert_one({ name, email, password: hash, createdAt })
     └── Return: { "msg": "Signup success" }
```

### Login Flow

```
POST /auth/login { email, password }
     │
     ├── users.find_one({ email }) → not found? → 401
     ├── verify_password(password, user["password"]) → wrong? → 401
     ├── create_token(str(user["_id"])) → JWT with 2h expiry
     └── Return: { token, user: { email, name } }
```

**Why return `user.name` in login?** The frontend stores this in Redux immediately so the header shows the user's name without requiring a separate `/me` API call.

### Delete Account Cascade

```python
# routes/auth.py — delete_account()

# 1. Get all chats owned by this user
user_chats = list(chats.find({ "userId": user_id }))
chat_ids = [str(chat["_id"]) for chat in user_chats]

# 2. Delete all messages in those chats
messages.delete_many({ "chatId": { "$in": chat_ids } })

# 3. Delete all vector embeddings for those chats
vector_col.delete_many({ "chatId": { "$in": chat_ids } })

# 4. Delete any uploaded PDF files still on disk
for chat in user_chats:
    file_path = chat.get("filePath")
    if file_path and os.path.exists(file_path):
        os.remove(file_path)

# 5. Delete all chats
chats.delete_many({ "userId": user_id })

# 6. Delete the user document last
users.delete_one({ "_id": user_obj_id })
```

**Why this specific order?** Child records are deleted before parent records. If we deleted the user first and then failed on messages, orphaned message records would exist with no user to own them — a data integrity problem. By deleting in dependency order (messages → embeddings → files → chats → user), any failure leaves the database in a recoverable state.

---

## 4. Database Layer

### Connection Setup

```python
# db/database.py

client = MongoClient(
    MONGO_URI,
    tls=True,
    tlsCAFile=certifi.where(),   # Verify Atlas TLS certificate
    serverSelectionTimeoutMS=5000
)

client.admin.command("ping")   # Fail fast — don't serve if DB is unreachable
```

**Why `certifi.where()`?** MongoDB Atlas uses TLS for all connections. On some systems (especially macOS and Windows), the default certificate bundle does not include the CA certificates needed to verify Atlas's certificate. `certifi` provides an up-to-date CA bundle that works on all platforms.

**Why `serverSelectionTimeoutMS=5000`?** By default, PyMongo will wait up to 30 seconds trying to reach the server. The 5-second timeout fails fast at startup so the problem is obvious immediately rather than hanging.

### Graceful Degradation

```python
except Exception as e:
    print(f"MongoDB connection error: {e}")
    db = None
    users = None
    chats = None
    messages = None
    vector_col = None
```

If the connection fails at startup, all collection handles are `None`. Every route checks for this:

```python
if chats is None:
    raise HTTPException(status_code=503, detail="Database connection not available")
```

This pattern means the app starts even if the database is temporarily unreachable, and returns a clear `503 Service Unavailable` rather than crashing with an `AttributeError`.

### Collections Overview

| Collection | Documents | Key fields |
|---|---|---|
| `users` | One per user | `_id`, `name`, `email`, `password` (bcrypt), `createdAt` |
| `chats` | One per PDF upload | `_id`, `userId`, `title`, `filePath`, `createdAt` |
| `messages` | Many per chat | `chatId`, `role` (user/ai), `content`, `timestamp` |
| `embeddings` | Many per chat | `embedding` (384-dim vector), `text`, `chatId` (in metadata) |

---

## 5. PDF Processing Pipeline

### The Upload Route — Sequencing Is Everything

```python
# routes/pdf.py — upload_pdf()

# Step 1: Generate ObjectId FIRST
chat_id_obj = ObjectId()
chat_id_str = str(chat_id_obj)
```

**Why generate the ID manually before saving to MongoDB?**

The normal MongoDB pattern is to insert a document and get back an auto-generated `_id`. But here, the `chatId` needs to be:
- In the filename: `{chat_id_str}_{file.filename}`
- In every chunk's metadata: `chunk.metadata["chatId"] = chat_id`
- In the chat document: `{ "_id": chat_id_obj, ... }`

If we inserted the chat document first and then processed the PDF, we'd need to pass the generated ID back. By pre-generating the ID with `ObjectId()`, we can use it consistently across all three places before any MongoDB write happens.

### Complete Upload Sequence

```
POST /pdf/upload (multipart/form-data: file)
     │
     ├── 1. verify_token → get user_id
     │
     ├── 2. Validate file size (> 2MB → 400)
     │
     ├── 3. Generate ObjectId → chat_id_obj, chat_id_str
     │
     ├── 4. Save file to disk:
     │      os.makedirs("uploads/", exist_ok=True)
     │      file_path = f"uploads/{chat_id_str}_{file.filename}"
     │      shutil.copyfileobj(file.file, buffer)
     │
     ├── 5. process_pdf(file_path, chat_id_str):
     │      → PyPDFLoader → load pages
     │      → RecursiveCharacterTextSplitter → chunks
     │      → chunk.metadata["chatId"] = chat_id_str  ← critical
     │      → HuggingFaceEmbeddings → 384-dim vectors
     │      → MongoDBAtlasVectorSearch.from_documents() → stored in Atlas
     │
     ├── 6. Delete file from disk:
     │      os.remove(file_path)
     │      (raw PDF no longer needed — content is in embeddings)
     │
     ├── 7. Insert chat record to MongoDB:
     │      { "_id": chat_id_obj, "userId": user_id,
     │        "title": file.filename, "filePath": file_path,
     │        "createdAt": datetime.utcnow() }
     │
     └── Return: { "chatId": chat_id_str }
```

**Why delete the raw PDF after embedding?** The content is now in vector embeddings in Atlas. Keeping the raw file adds storage cost and security risk (raw PDF contains all original content). The `filePath` is kept in the chat document only because `delete_account` needs it to clean up any files that weren't deleted (edge cases).

### `pdf_service.py` — Chunking Strategy

```python
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=100
)
```

**Why 1000 characters per chunk?** This is a practical balance:
- Too small (e.g., 200 chars): chunks lack enough context for meaningful semantic search
- Too large (e.g., 5000 chars): fewer, coarser chunks → less precise retrieval + more tokens sent to Gemini

**Why 100-character overlap?** Sentences at chunk boundaries are not cut off. A key sentence that spans two chunks still appears in at least one complete chunk. Without overlap, sentences at boundaries might be split in ways that make them semantically incomplete.

```python
for chunk in chunks:
    chunk.metadata["chatId"] = chat_id
```

**Why tag every chunk with `chatId`?** This is the data isolation mechanism at the vector store level. Without it, semantic search would return the most relevant chunks from *anyone's* PDF. The `pre_filter` in `ask_ai()` uses this metadata to restrict results to the current chat only.

---

## 6. AI & Vector Search System

### `ai_service.py` — Full Breakdown

```python
def ask_ai(question, chat_id):
    # Step 1: Load embedding model (same as used during ingestion)
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    # Step 2: Connect to existing Atlas Vector Store
    vector_store = MongoDBAtlasVectorSearch(
        collection=vector_col,
        embedding=embeddings,
        index_name="default"
    )

    # Step 3: Semantic search — ONLY within this chat's chunks
    docs = vector_store.similarity_search(
        question,
        k=4,
        pre_filter={"chatId": {"$eq": chat_id}}
    )

    # Step 4: Join retrieved chunks into context
    context = " ".join([doc.page_content for doc in docs])

    # Step 5: Call Gemini
    llm = ChatGoogleGenerativeAI(model="models/gemini-2.5-flash-lite")
    response = llm.invoke(f"Answer using context: {context} Question: {question}")

    return response.content
```

### How Similarity Search Works

When a user asks "What is the revenue growth?":

1. The question is converted to a 384-dimensional vector using the same `all-MiniLM-L6-v2` model
2. Atlas Vector Search computes cosine similarity between this query vector and every stored chunk vector
3. The `pre_filter: { "chatId": { "$eq": chat_id } }` runs as a MongoDB aggregation filter — only chunks belonging to this specific chat are candidates
4. The top 4 highest-similarity chunks are returned as `Document` objects with `.page_content`
5. These chunks form the context sent to Gemini

**Why the same embedding model for ingestion and querying?** Cosine similarity only makes sense in the same vector space. If you embed chunks with `all-MiniLM-L6-v2` but query with a different model, the vector spaces are incompatible and similarity scores are meaningless.

### The Atlas Vector Search Index

The index definition in Atlas must include both a `vector` field and a `filter` field:

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

Without the `filter` field on `chatId`, the `pre_filter` in `similarity_search()` will either be silently ignored or cause an error. The filter field tells Atlas to build a secondary index on `chatId` that can be applied before the vector search executes.

### Why `gemini-2.5-flash-lite`?

- Fast response time (latency matters in chat)
- Cost-efficient for high-frequency inference
- Sufficient capability for document Q&A tasks
- Easily swapped to `gemini-1.5-pro` or other models by changing one line

### Context Injection Pattern

```python
response = llm.invoke(
    f"Answer using context: {context} Question: {question}"
)
```

This is a simple, effective RAG (Retrieval-Augmented Generation) prompt. The model is told to use the provided context — this grounds the response in the actual PDF content rather than the model's training data, preventing hallucination on document-specific facts.

---

## 7. Chat System Deep Dive

### Ownership Validation Pattern

Every chat route validates ownership before doing anything:

```python
chat = chats.find_one({
    "_id": ObjectId(chatId),
    "userId": user_id    # ← BOTH conditions must match
})

if not chat:
    raise HTTPException(status_code=404, detail="Chat not found")
```

**Why query both `_id` and `userId` together?** If we queried only by `_id` and then checked `chat["userId"] == user_id` separately, a timing attack could exploit the gap. More importantly, returning a 404 (not 403) when the chat exists but belongs to another user does not leak information about whether the chatId exists at all.

### Auto-Title Logic

```python
if len(question) < 50:
    chats.update_one(
        {"_id": ObjectId(chatId)},
        {"$set": {"title": question}}
    )
```

The first short question a user asks becomes the chat title. This is how the frontend sidebar shows meaningful chat names instead of generic "New Chat" labels. Questions over 50 characters are excluded because they're too long for a useful sidebar title.

### Message Storage

```python
# User message saved BEFORE calling AI
messages.insert_one({
    "chatId": chatId,
    "role": "user",
    "content": question,
    "timestamp": datetime.utcnow()
})

answer = ask_ai(question, chatId)

# AI message saved AFTER getting answer
messages.insert_one({
    "chatId": chatId,
    "role": "ai",
    "content": answer,
    "timestamp": datetime.utcnow()
})
```

**Why save user message first?** If the AI call fails (503 from `ask_ai`), the user message is still preserved. When they retry, the conversation history is accurate. If we saved both atomically after the AI call, a failed AI call would lose the user's question too.

### Message Retrieval (Sorted)

```python
msgs = messages.find({"chatId": chatId}).sort("timestamp", 1)
```

`.sort("timestamp", 1)` sorts ascending (oldest first) — this is the correct chronological order for a chat interface. Using `1` (ascending) rather than `-1` (descending) ensures the conversation reads top-to-bottom.

---

## 8. Error Handling Strategy

### Three-Layer Error Handling

Every route follows this pattern:

```python
@router.post("/ask")
def ask(...):
    try:
        # --- Normal flow ---
        chat = chats.find_one(...)
        if not chat:
            raise HTTPException(status_code=404, ...)  # ← Known, expected error

        try:
            answer = ask_ai(question, chatId)
        except Exception as ai_err:
            logging.error(f"AI Service Error: {str(ai_err)}")
            raise HTTPException(status_code=503, ...)  # ← AI-specific error

        return {"answer": answer}

    except InvalidId:
        raise HTTPException(status_code=400, ...)      # ← Invalid input format

    except HTTPException as e:
        raise e                                         # ← Re-raise known errors unchanged

    except Exception as e:
        logging.error(f"Error in ask route: {str(e)}")
        raise HTTPException(status_code=500, ...)       # ← Unknown, unexpected error
```

**Layer 1 — Known business errors:** `HTTPException` raised explicitly with specific status codes (400, 401, 404, 503).

**Layer 2 — Input validation errors:** `InvalidId` is a bson exception raised when an invalid string is passed to `ObjectId()`. Caught and converted to a 400.

**Layer 3 — Unknown errors:** The outer `except Exception` is a safety net. It logs the full error and returns a 500. The user sees a generic message — no stack trace, no internal details leak to the client.

**The `except HTTPException as e: raise e` pattern** is critical. Without it, an `HTTPException(404)` raised inside the `try` block would be caught by the outer `except Exception as e` and converted to a 500. Re-raising it preserves the original status code.

### HTTP Status Code Semantics

| Code | Meaning | When used |
|---|---|---|
| 400 | Bad Request | Invalid ObjectId format, file too large, email already exists |
| 401 | Unauthorized | Wrong password, expired token, invalid token |
| 404 | Not Found | Chat not found (or belongs to another user) |
| 422 | Unprocessable Entity | PDF content extraction failed |
| 500 | Internal Server Error | Unexpected database or application error |
| 503 | Service Unavailable | Database not connected, AI service error |

---

## 9. Security Design

### JWT Security

- Tokens expire in **2 hours** — short enough to limit damage if intercepted, long enough for a working session
- Only `user_id` (MongoDB ObjectId string) in payload — no PII
- Signed with `HS256` and a `SECRET_KEY` from environment variables — never hardcoded
- `HTTPBearer` extracts the token from `Authorization: Bearer <token>` — standard OAuth2 format

### Password Security

- bcrypt with automatic salt — rainbow tables are impossible
- `verify_password` returns `False` on any error rather than raising — prevents timing attacks from revealing whether an email exists
- Passwords are never logged anywhere in the codebase

### Data Isolation

- Every `chats` query includes `"userId": user_id` — users cannot see each other's chats
- Every `messages` query goes through a chat that was validated for ownership first
- Vector search uses `pre_filter: { "chatId": chat_id }` — users cannot retrieve chunks from other users' PDFs
- The `delete_account` endpoint uses `user_id` from the verified token — cannot delete another user's account

### File Handling

- Files are saved to `uploads/` temporarily, then deleted after embedding
- The filename includes the `chatId` to ensure uniqueness even with concurrent uploads of same-named files
- File path stored in the chat document only for cleanup purposes in `delete_account`

### CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Note:** `allow_origins=["*"]` is appropriate for development. In production, this should be changed to the specific frontend origin: `allow_origins=["https://yourdomain.com"]`.

---

## 10. Interview Questions & Answers

---

**Q1. Why FastAPI over Django or Flask?**

FastAPI is built for API-first applications and has three key advantages here:
1. **Async support** — FastAPI is ASGI-based and supports async route handlers natively. Even our sync routes benefit from async middleware.
2. **Dependency injection** — `Depends(verify_token)` is clean, composable, and testable. Flask has no equivalent built in.
3. **Auto-generated docs** — `/docs` and `/redoc` are generated from type hints with zero configuration. Very useful for frontend integration.

Django REST Framework is more powerful but significantly heavier. For an API-only backend, FastAPI is the right choice.

---

**Q2. How does your JWT authentication work end-to-end?**

On signup, we hash the password with bcrypt and store it in MongoDB. On login, we find the user by email, verify the password with `verify_password`, then call `create_token(str(user["_id"]))` which encodes a JWT with `{ user_id, exp }` signed with `SECRET_KEY`.

On every protected request, the `HTTPBearer` security scheme extracts the `Bearer` token from the `Authorization` header. `verify_token` decodes it, extracts `user_id`, and injects it into the route handler. If the token is expired or invalid, a 401 is raised before the route handler runs — the route never sees invalid requests.

---

**Q3. Why do you generate the MongoDB ObjectId before inserting the document in the PDF upload route?**

The `chatId` needs to appear in three places consistently: the filename on disk, the metadata of every vector chunk in Atlas, and the `_id` field of the chat document in MongoDB. If we inserted the document first and got back the auto-generated ID, we'd already have saved the file with the wrong name. By pre-generating with `ObjectId()`, we use one consistent ID across all three operations before committing anything to the database.

---

**Q4. Explain the RAG (Retrieval-Augmented Generation) pipeline.**

RAG has two phases:

**Ingestion (at upload time):**
PDF → `PyPDFLoader` → text chunks (1000 chars, 100 overlap) → HuggingFace `all-MiniLM-L6-v2` generates 384-dimensional vectors → stored in MongoDB Atlas with `chatId` metadata.

**Retrieval (at question time):**
User question → same HuggingFace model converts it to a vector → Atlas Vector Search finds top 4 most similar chunks filtered by `chatId` → chunks joined as context → Gemini answers `"Answer using context: {context} Question: {question}"`.

RAG grounds the AI's answer in the actual document rather than its training data, which prevents hallucination on document-specific facts.

---

**Q5. Why is the `pre_filter` on `chatId` important in vector search?**

Without `pre_filter`, the similarity search would look across all embeddings in the collection — including chunks from other users' PDFs. The top 4 results might be from a completely different document. By filtering `{ "chatId": { "$eq": chat_id } }` before computing similarity, we guarantee the model only reads content from the user's current PDF. This is data isolation at the ML layer, not just the application layer.

---

**Q6. How do you handle the case where the PDF upload succeeds but the database insert fails?**

The upload route is wrapped in nested try/catch blocks for each sub-operation. If `chats.insert_one` fails after embeddings are already stored, the `chatId` exists in the embeddings collection but not in the chats collection. This means the user won't see the chat in their list, but the orphaned embeddings remain.

To fix this properly in production, we'd use a transaction (MongoDB multi-document transactions are supported with a replica set) or a compensation pattern: if the DB insert fails, also delete the embeddings by `chatId`. This is a known improvement item.

---

**Q7. Why delete the uploaded PDF file from disk after processing?**

Once the PDF is chunked and embedded, the raw file serves no further purpose. Keeping it adds storage cost, creates security risk (raw files are accessible on the filesystem), and creates a GDPR compliance issue (unnecessary personal data retention). The content is now represented as vector embeddings in Atlas. The `filePath` is kept in the chat document only as a cleanup reference for `delete_account`.

---

**Q8. How does password reset work? Why require the old password?**

```python
user = users.find_one({"_id": ObjectId(user_id)})
if not user or not verify_password(data.oldPassword, user["password"]):
    raise HTTPException(status_code=401, detail="Old password is incorrect")
```

The user must provide their current password before setting a new one. This prevents an attack where someone steals a valid JWT token and uses it to change the password and lock out the real user. Even with a valid token, they would need to know the current password too. This is a deliberate second factor of verification.

---

**Q9. Why does `verify_password` return `False` on errors instead of raising?**

```python
def verify_password(password: str, hashed: str):
    try:
        return pwd_context.verify(password, hashed)
    except Exception:
        return False
```

If `verify_password` raised an exception on invalid hash strings, callers would need to handle both the case of "wrong password" (returns False) and "hash format invalid" (raises exception) differently. By returning `False` on all errors, the caller has one code path: `if not user or not verify_password(...)`. This also prevents timing differences from revealing information about why authentication failed.

---

**Q10. How is the chat message ordering guaranteed?**

```python
msgs = messages.find({"chatId": chatId}).sort("timestamp", 1)
```

Every message is inserted with `"timestamp": datetime.utcnow()`. Sorting by `timestamp` ascending gives chronological order. Note that this relies on the server clock — if messages are inserted very rapidly, two messages within the same millisecond could appear in insertion order rather than user-visible order. In practice, the user sends a message and waits for the AI response, so timestamps are always separated by at least hundreds of milliseconds.

---

**Q11. How do you prevent one user from accessing another user's chat?**

Three layers:
1. **Route level:** `chats.find_one({ "_id": ObjectId(chatId), "userId": user_id })` — both conditions must match.
2. **Messages level:** Messages are fetched through a validated chat, not directly by chatId, so ownership is verified before any message access.
3. **Vector search level:** `pre_filter: { "chatId": chat_id }` — semantic search only returns chunks from the validated chat.

---

**Q12. What happens if the AI service is unavailable?**

```python
try:
    answer = ask_ai(question, chatId)
except Exception as ai_err:
    logging.error(f"AI Service Error: {str(ai_err)}")
    raise HTTPException(status_code=503, detail="AI service error")
```

The AI call is wrapped in its own try/catch. If Gemini or the embedding model is unavailable, a 503 is returned. The user message is already saved to the database at this point, so their question is preserved. The frontend receives the 503, shows an error message, and the user can retry.

---

**Q13. Why is `allow_origins=["*"]` used and when should it be changed?**

During development, `*` allows the React dev server (`localhost:5173`) to call the backend without CORS errors, without needing to know the exact origin. In production, this should be `allow_origins=["https://yourdomain.com"]` — allowing only the known frontend origin. `*` in production would allow any website to make credentialed requests to your API using a logged-in user's session.

---

**Q14. How does the auto-title feature work?**

```python
if len(question) < 50:
    chats.update_one(
        {"_id": ObjectId(chatId)},
        {"$set": {"title": question}}
    )
```

After every successful AI response, if the user's question was shorter than 50 characters, it replaces the chat's title. The 50-character threshold keeps titles short enough for the sidebar. This runs after every message, so technically the title updates to the most recent short question — but in practice, users tend to type their most descriptive question first.

---

**Q15. What is the purpose of `RecursiveCharacterTextSplitter` over a simple character split?**

`RecursiveCharacterTextSplitter` tries to split on natural boundaries in this priority order: `\n\n` (paragraphs), `\n` (lines), `. ` (sentences), ` ` (words), then characters. This means it prefers splitting at paragraph boundaries, then sentence boundaries. A simple character split would cut mid-sentence, creating semantically incomplete chunks that perform poorly in similarity search. The recursive approach produces more coherent chunks with better semantic meaning.

---

**Q16. Why use `HuggingFace all-MiniLM-L6-v2` instead of OpenAI embeddings?**

Three practical reasons:
1. **No API cost** — runs locally, no per-token charge
2. **Offline capability** — model is downloaded once and cached; no external dependency at inference time
3. **Sufficient quality** — for document Q&A on typical PDFs, `all-MiniLM-L6-v2` (384 dimensions) performs comparably to larger models

The tradeoff is that it requires more compute on the server. For production at scale, OpenAI's `text-embedding-3-small` or a hosted HuggingFace Inference API would be better choices.

---

**Q17. How would you make the PDF processing non-blocking?**

Currently, `process_pdf` is called synchronously in the upload route handler. For a large PDF, this blocks the server thread for several seconds. The fix:

```python
from fastapi import BackgroundTasks

@router.post("/upload")
async def upload_pdf(
    file: UploadFile,
    user_id: str = Depends(verify_token),
    background_tasks: BackgroundTasks = None
):
    # Save file to disk synchronously
    # Insert chat record with status="processing"
    # Return chatId immediately
    background_tasks.add_task(process_pdf, file_path, chat_id_str)
    return { "chatId": chat_id_str }
```

The frontend receives the `chatId` immediately and can show a "processing" state. The PDF is processed in the background. A WebSocket or polling endpoint would notify the frontend when processing is complete.

---

**Q18. Why not use Pydantic models for request bodies in routes like `ask()`?**

The current implementation uses `question: str = Body(...)` and `chatId: str = Body(...)` directly. This works but is less structured than:

```python
class AskRequest(BaseModel):
    question: str
    chatId: str

@router.post("/ask")
def ask(data: AskRequest, user_id: str = Depends(verify_token)):
```

Pydantic models provide automatic validation, clearer OpenAPI schema generation, and easier testing. The current approach is functional but the Pydantic approach is cleaner at scale. This is a known improvement.

---

## 11. Improvements & Scaling

### Immediate Improvements

| Improvement | Current State | Target State |
|---|---|---|
| Async DB | PyMongo (sync) | `motor` (async PyMongo) — non-blocking DB calls |
| Background PDF processing | Blocking route | FastAPI `BackgroundTasks` or Celery + Redis |
| Request models | `Body(...)` parameters | Pydantic `BaseModel` for all route bodies |
| Upload cascade | Partial — no rollback on failure | MongoDB transactions or compensation pattern |
| Rate limiting | None | `slowapi` middleware on upload and ask routes |

### Scaling for Production

**Horizontal scaling:**
FastAPI runs on Uvicorn (ASGI). Multiple workers can be run behind a load balancer:
```bash
uvicorn app.main:app --workers 4 --host 0.0.0.0 --port 8000
```
Since JWT is stateless, any worker can handle any request.

**Database connections:**
PyMongo's `MongoClient` is thread-safe and connection-pooled. Multiple workers share the same pool automatically.

**PDF processing at scale:**
Move to Celery + Redis for distributed task processing. The upload route becomes a task publisher:
```python
process_pdf_task.delay(file_path, chat_id_str)
```
Workers process PDFs independently, enabling hundreds of concurrent uploads.

**Caching:**
Add Redis caching for frequent identical questions on the same document — the vector search and Gemini call are skipped if the question was asked recently:
```python
cache_key = f"answer:{chat_id}:{hash(question)}"
```

**Streaming responses:**
Replace the single `llm.invoke()` call with `llm.stream()` and return a FastAPI `StreamingResponse` with Server-Sent Events. The frontend receives tokens as they are generated rather than waiting for the full response.

**Structured logging:**
Replace `logging.error(str(e))` with structured JSON logs:
```python
logger.error("AI service error", extra={
    "chat_id": chatId,
    "question": question,
    "error": str(ai_err)
})
```
This enables log aggregation, alerting, and tracing in production monitoring tools.

**Testing:**
```bash
pip install pytest httpx

# Example test
def test_login_invalid_password():
    response = client.post("/auth/login", json={
        "email": "test@example.com",
        "password": "wrong"
    })
    assert response.status_code == 401
```

---

*This document is a living reference. Update it when the architecture changes. — Sunit Pal*