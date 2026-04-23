# PDF GPT

> Chat with your PDF documents using AI — built by **Sunit Pal**

PDF GPT is a full-stack AI chat application that lets users upload PDF documents and have intelligent conversations with their content. Powered by Google Gemini, MongoDB Atlas Vector Search, and a clean React frontend.

🔗 **Live Demo:** [pdf-gpt-amber.vercel.app](https://pdf-gpt-amber.vercel.app)

---

## 🏠 Home — Upload a PDF

Upload any PDF document (max 2 MB). A chat session is automatically created using the filename.

<img width="1280" height="711" alt="Screenshot 2026-04-23 at 3 05 18 PM" src="https://github.com/user-attachments/assets/0f9f1024-6144-4422-a441-b749220d8216" />

---

## 🔐 Auth

### Login Page
<img width="1280" height="711" alt="Screenshot 2026-04-23 at 3 08 12 PM" src="https://github.com/user-attachments/assets/0f350e98-a361-4c98-bbc9-719b44a07f44" />

### Sign Up Page
<img width="1280" height="712" alt="Screenshot 2026-04-23 at 3 08 37 PM" src="https://github.com/user-attachments/assets/39b9a2c8-d905-4965-b08b-5bd653da88bf" />

---

## 💬 Chat

Ask natural language questions about your PDF. AI responses are rendered in full Markdown — with headings, lists, code blocks, and tables.

### Asking a Question
<img width="1280" height="713" alt="Screenshot 2026-04-23 at 3 10 40 PM" src="https://github.com/user-attachments/assets/f428d3ba-9c8f-4ee5-91f7-dc0ea30df2ff" />

### AI Response with Markdown
<img width="1280" height="713" alt="Screenshot 2026-04-23 at 3 11 32 PM" src="https://github.com/user-attachments/assets/62f74a15-1ba6-423f-a0bc-5ca2a91a3627" />

---

## 👤 Profile Page
<img width="635" height="604" alt="Screenshot 2026-04-23 at 3 14 05 PM" src="https://github.com/user-attachments/assets/f2ccf975-1383-4d38-b522-2762e698411a" />

### View & Edit Profile
Inline name editing — click the pencil icon, type, press Enter to save.

<img width="672" height="204" alt="Screenshot 2026-04-23 at 3 15 16 PM" src="https://github.com/user-attachments/assets/11b65dba-6d77-49c2-a043-f9d4575cdb5b" />

### Reset Password
<img width="1280" height="712" alt="Screenshot 2026-04-23 at 3 15 46 PM" src="https://github.com/user-attachments/assets/48c96a85-f1a0-49fd-9614-5853185dff36" />

### Delete Account
<img width="1280" height="711" alt="Screenshot 2026-04-23 at 3 16 10 PM" src="https://github.com/user-attachments/assets/04839db7-4f30-48ce-91c6-8e1bf1d66207" />

---

## 💳 Subscription Plans

Three pricing tiers — Free, Prime ($20/mo), Prime Plus ($100/mo).

<img width="1280" height="712" alt="Screenshot 2026-04-23 at 3 17 07 PM" src="https://github.com/user-attachments/assets/e2f93f51-1d69-492e-a103-44fb13f4d7c9" />

---

## ☀️Light/🌙 Dark Mode

Full dark mode support — toggle in the header, persisted across sessions.

<img width="1280" height="713" alt="Screenshot 2026-04-23 at 3 17 44 PM" src="https://github.com/user-attachments/assets/cc4b3b78-e2b1-4fc2-8f1c-a86b46dedc25" />

<img width="1280" height="712" alt="Screenshot 2026-04-23 at 3 19 31 PM" src="https://github.com/user-attachments/assets/94420b0a-08fa-4bc3-ac48-7f81367acb7c" />


---

## 📱 Mobile View

Fully responsive — sidebar becomes an overlay drawer on mobile. Header stays fixed.

<img width="905" height="905" alt="PG-Design-1776938660353 2" src="https://github.com/user-attachments/assets/1d8f4f3a-dd7f-40e7-b5ca-d304a9cc41aa" />

---

## Tech Stack

**Frontend:** React · TypeScript · Redux Toolkit · SCSS Modules · Vite  
**Backend:** FastAPI · Python · MongoDB Atlas · LangChain · HuggingFace Embeddings  
**AI:** Google Gemini (`gemini-2.5-flash-lite`) · `all-MiniLM-L6-v2` embeddings  
**Auth:** JWT · bcrypt  
**Deploy:** Vercel (Frontend) · Render (Backend)

---

## ⚙️ Setup — Frontend

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO/Frontend
npm install
cp .env.example .env
# Set VITE_API_URL=https://your-backend.onrender.com
npm run dev
```

## ⚙️ Setup — Backend

```bash
cd Backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in MONGO_URI, SECRET_KEY, ALGORITHM, GOOGLE_API_KEY
uvicorn app.main:app --reload
```

---

## 📡 API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | No | Register with name, email, password |
| POST | `/auth/login` | No | Login → returns JWT + user |
| PUT | `/auth/update-name` | Bearer | Update display name |
| PUT | `/auth/reset-password` | Bearer | Change password |
| DELETE | `/auth/delete-account` | Bearer | Delete account + all data |
| POST | `/pdf/upload` | Bearer | Upload PDF → returns chatId |
| GET | `/chat/list` | Bearer | List all chats |
| GET | `/chat/{chatId}` | Bearer | Get messages for a chat |
| POST | `/chat/ask` | Bearer | Ask a question, get AI answer |
| DELETE | `/chat/{chatId}` | Bearer | Delete a chat |

---

## 🚀 Features

- ✅ JWT authentication with 7-day token expiry
- ✅ PDF upload → auto-chunked → vector embedded → AI searchable
- ✅ Per-chat, per-user data isolation at the vector search level
- ✅ Full Markdown rendering for AI responses
- ✅ Inline profile name editing with live Redux + localStorage sync
- ✅ Dark mode (zero flash on load)
- ✅ Responsive layout with iOS Safari viewport fix
- ✅ Automatic logout on token expiry
- ✅ Smooth sidebar collapse animation (300ms)

---

*Built by **Sunit Pal***
