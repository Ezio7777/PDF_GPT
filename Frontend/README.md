# PDF GPT Creator — Frontend

> **By Sunit Pal** — A production-level React + TypeScript frontend for chatting with PDF documents using AI.

---

## Tech Stack

| Layer         | Technology                          |
|---------------|-------------------------------------|
| Framework     | React 18 + TypeScript (Vite)        |
| State         | Redux Toolkit + React-Redux         |
| Styling       | SCSS Modules + CSS Custom Properties |
| HTTP Client   | Axios (with JWT interceptor)        |
| Routing       | React Router DOM v6                 |
| Build Tool    | Vite 5                              |

---

## Project Structure

```
frontend/
├── public/
│   └── pdf-icon.svg
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx / .module.scss
│   │   │   ├── Input.tsx  / .module.scss
│   │   │   ├── Loader.tsx / .module.scss
│   │   │   └── Modal.tsx  / .module.scss
│   │   ├── layout/
│   │   │   ├── Header.tsx  / .module.scss
│   │   │   ├── Sidebar.tsx / .module.scss
│   │   │   └── Layout.tsx  / .module.scss
│   │   ├── chat/
│   │   │   ├── ChatBox.tsx        / .module.scss
│   │   │   ├── MessageBubble.tsx  / .module.scss
│   │   │   └── ChatInput.tsx      / .module.scss
│   │   └── pdf/
│   │       └── UploadBox.tsx / .module.scss
│   ├── pages/
│   │   ├── Home.tsx      / .module.scss
│   │   ├── AuthModal.tsx / .module.scss
│   │   ├── Login.tsx
│   │   ├── Signup.tsx
│   │   └── AuthPage.module.scss
│   ├── services/
│   │   ├── api.ts           ← Axios instance + JWT interceptor
│   │   ├── authService.ts
│   │   ├── chatService.ts
│   │   └── pdfService.ts
│   ├── store/
│   │   ├── store.ts
│   │   ├── hooks.ts
│   │   └── slices/
│   │       ├── authSlice.ts
│   │       ├── chatSlice.ts
│   │       └── uiSlice.ts
│   ├── styles/
│   │   ├── global.scss
│   │   └── variables.scss
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit VITE_API_BASE_URL if your backend runs on a different port
```

### 3. Start the dev server

```bash
npm run dev
```

App runs at **http://localhost:5173**

### 4. Build for production

```bash
npm run build
npm run preview
```

---

## API Contract

The frontend talks to a backend at `http://localhost:8000`.

| Method | Endpoint         | Auth     | Description              |
|--------|------------------|----------|--------------------------|
| POST   | `/auth/signup`   | No       | Register a new user      |
| POST   | `/auth/login`    | No       | Get JWT token            |
| POST   | `/pdf/upload`    | Bearer   | Upload PDF (max 2 MB)    |
| GET    | `/chat/list`     | Bearer   | List all user chats      |
| GET    | `/chat/:chatId`  | Bearer   | Get messages in a chat   |
| POST   | `/chat/ask`      | Bearer   | Ask a question           |
| DELETE | `/chat/:chatId`  | Bearer   | Delete a chat            |

---

## Features

### Auth System
- Login / Signup with JWT stored in `localStorage`
- Auth modal on first visit with Login, Signup, and Guest tabs
- Token automatically attached to every API request via Axios interceptor
- 401 responses automatically log the user out and redirect to home

### Chat System
- Full chat list in sidebar with relative timestamps
- Select chat → fetch and display messages
- Animated typing indicator while AI responds
- Copy any message to clipboard with one click
- Auto-scroll to latest message on new response
- Delete chats with a trash button (appears on hover)
- Auto-resize textarea input (grows up to 180px)

### PDF Upload
- Drag & drop or click-to-browse
- Client-side 2 MB validation before uploading
- SVG circular progress indicator during upload
- Automatically redirects to the new chat after upload

### UI / UX
- Dark mode toggle (persisted in `localStorage`)
- Collapsible sidebar
- Full SCSS module isolation — no style leakage
- CSS Custom Properties for instant theme switching
- Smooth animations: fade-in messages, bounce-in modal, slide-in sidebar
- Keyboard accessible (Enter to send, Escape to close modal)

---

## Redux State Shape

```ts
{
  auth: {
    token:   string | null,
    user:    { email: string } | null,
    isGuest: boolean,
  },
  chat: {
    chats:         Chat[],
    currentChatId: string | null,
    messages:      Message[],
    loading:       boolean,
  },
  ui: {
    darkMode:      boolean,
    showAuthModal: boolean,
    sidebarOpen:   boolean,
  }
}
```

---

## Key Design Decisions

- **No prop drilling** — all state via `useAppSelector` / `useAppDispatch`
- **SCSS Modules** — every component has its own `.module.scss`; no global class collisions
- **CSS Custom Properties** — theme switching is instant, no re-render needed
- **Axios interceptor** — JWT header attachment and 401 handling in one place
- **Guest mode** — users can browse the app without logging in, but PDF upload and asking questions require auth
- **Auto-login after signup** — smooth onboarding: sign up and land directly in the app

---

## Available Scripts

| Script            | Description                    |
|-------------------|--------------------------------|
| `npm run dev`     | Start development server       |
| `npm run build`   | TypeScript check + Vite build  |
| `npm run preview` | Preview production build       |
| `npm run lint`    | ESLint check                   |

---

*PDF GPT Creator — Frontend by Sunit Pal*