# PDF GPT

> **Chat with your PDF documents using AI — built with React, TypeScript, Redux Toolkit, and SCSS.**

A production-grade AI chat application that lets users upload PDF documents and have intelligent conversations with their content. Built by **Sunit Pal** with a focus on clean architecture, smooth UX, and maintainable code.

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
9. [Screens & UI Description](#9-screens--ui-description)
10. [API Contract](#10-api-contract)
11. [Future Improvements](#11-future-improvements)
12. [Conclusion](#12-conclusion)

---

## 1. Project Overview

PDF GPT is a full-featured AI chat web application where users can:

- Upload PDF documents (up to 2 MB)
- Ask natural language questions about the document content
- Receive AI-generated responses rendered in full Markdown
- Manage their account — update name, reset password, delete account
- View and manage multiple chat sessions from a persistent sidebar

The application communicates with a Python/FastAPI backend running at `http://localhost:8000` and uses JWT authentication throughout.

---

## 2. Features

### Authentication
- Email/password sign up with full name field
- Login returns a JWT token — stored in `localStorage`, auto-attached to every API request
- Google Sign-In button (UI complete, backend integration pending)
- Automatic logout and redirect on `401 Unauthorized` responses
- Session persists across browser refreshes via `localStorage`

### Chat System
- Upload a PDF → automatically creates a new chat session
- PDF filename immediately used as the chat title in the sidebar
- Ask unlimited questions about the uploaded document
- AI responses rendered with full Markdown: headings, bold, lists, code blocks, tables, blockquotes
- Animated three-dot typing indicator while AI processes the response
- Copy any message to clipboard with a single click
- Auto-scroll to latest message on every response

### Sidebar
- Lists all previous chat sessions with relative timestamps ("Today", "Yesterday", "3d ago")
- Smooth animated collapse to a 60px icon-only rail on desktop (state persisted in `localStorage`)
- On mobile: transforms into a full-screen overlay drawer with blur backdrop
- Delete individual chats with a hover-revealed trash icon button
- Quick navigation links to Subscription and Settings at the footer

### Profile Management
- View account info: name, email, account type, member since
- **Inline name editing** — pencil icon on hover, `Enter` to save, `Escape` to cancel
- Calls `PUT /auth/update-name`, then syncs Redux state and `localStorage` in one dispatch
- **Reset password** — dedicated modal with current password, new password, and confirm fields
- **Delete account** — confirmation dialog with live loading state, clears all local data on success
- Connect section: Email, GitHub, LinkedIn
- One-click sign out clears all Redux state and redirects to `/login`

### Subscription Page
- Three pricing tiers: Free ($0), Prime ($20/month), Prime Plus ($100/month)
- Responsive 3-column card grid, collapses to 1 column on mobile
- Prime card highlighted as "Most Popular" with a badge and green border accent
- "Choose Plan" buttons with a coming-soon toast notification

### UI / UX Quality
- Dark mode toggle in the header, persisted, applied before React renders (zero flash)
- Fully mobile-responsive with `@media` breakpoints throughout all components
- Smooth sidebar animation at `300ms cubic-bezier(0.4, 0, 0.2, 1)`
- Global toast notification system (success / error / info) with 3.5s auto-dismiss
- Bounce-in animation on modals and dialogs
- Keyboard accessible — `Enter` to send messages, `Escape` to close modals

---

## 3. Tech Stack

| Category | Technology | Version |
|---|---|---|
| Framework | React | 18.3 |
| Language | TypeScript | 5.2 |
| Build Tool | Vite | 5.3 |
| State Management | Redux Toolkit + React-Redux | 2.2 / 9.1 |
| Routing | React Router DOM | 6.23 |
| HTTP Client | Axios | 1.7 |
| Markdown Rendering | react-markdown + remark-gfm | 9.0 / 4.0 |
| Styling | SCSS Modules + CSS Custom Properties | sass 1.77 |
| Linting | ESLint + TypeScript ESLint | 8.57 |

---

## 4. Architecture Overview

```
Browser
  └── React App (Vite)
        │
        ├── Redux Store (single source of truth)
        │     ├── authSlice   → token, user { email, name }
        │     ├── chatSlice   → chats[], currentChatId, messages[], loading
        │     └── uiSlice     → darkMode, sidebarOpen, sidebarCollapsed
        │
        ├── React Router v6
        │     ├── Public Routes    → /login, /signup
        │     └── Protected Routes → /, /profile, /subscription
        │
        ├── Services Layer (Axios)
        │     ├── api.ts          → Base instance + JWT interceptor + 401 auto-logout
        │     ├── authService.ts  → login, signup, updateName, resetPassword, deleteAccount
        │     ├── chatService.ts  → list, getMessages, askQuestion, deleteChat
        │     └── pdfService.ts   → validateFile, uploadPDF (with progress callback)
        │
        └── Component Tree
              ├── Layout (Header + Sidebar)   → Home page
              ├── ProfileLayout (Header only) → Profile, Subscription
              ├── Common UI → Button, Input, Loader, Modal
              └── Features → ChatBox, MessageBubble, UploadBox, Profile
```

**Data flow summary:** User action → component dispatches Redux action or calls a service → service calls `api.ts` (JWT automatically attached via interceptor) → response updates Redux store → subscribed components re-render via `useAppSelector`.

---

## 5. Folder Structure

```
pdf-gpt-creator/
├── public/
│   └── pdf-icon.svg               # Favicon — green rounded square + lightning bolt
│
├── src/
│   ├── components/
│   │   ├── common/                # Reusable, stateless UI primitives
│   │   │   ├── Button.tsx         # 4 variants, 3 sizes, loading state, icon slot
│   │   │   ├── Button.module.scss
│   │   │   ├── Input.tsx          # Label, error message, left/right icon slots
│   │   │   ├── Input.module.scss
│   │   │   ├── Loader.tsx         # CSS spinner, 3 sizes, 3 color modes
│   │   │   ├── Loader.module.scss
│   │   │   ├── Modal.tsx          # Backdrop, Escape key handler, scroll lock
│   │   │   └── Modal.module.scss
│   │   │
│   │   ├── layout/                # Application shell components
│   │   │   ├── Header.tsx         # Logo, dark mode toggle, avatar + dropdown
│   │   │   ├── Header.module.scss
│   │   │   ├── Sidebar.tsx        # Chat list, animated collapse, mobile overlay
│   │   │   ├── Sidebar.module.scss
│   │   │   ├── Layout.tsx         # Full layout: Header + Sidebar + <main>
│   │   │   ├── Layout.module.scss
│   │   │   ├── ProfileLayout.tsx  # Minimal layout: Header + <main> only
│   │   │   └── ProfileLayout.module.scss
│   │   │
│   │   ├── chat/                  # Chat feature components
│   │   │   ├── ChatBox.tsx        # Message list, typing indicator, scroll anchor
│   │   │   ├── ChatBox.module.scss
│   │   │   ├── MessageBubble.tsx  # User (plain text) + AI (Markdown) bubbles
│   │   │   ├── MessageBubble.module.scss
│   │   │   ├── ChatInput.tsx      # Auto-resize textarea, send button
│   │   │   └── ChatInput.module.scss
│   │   │
│   │   └── pdf/
│   │       ├── UploadBox.tsx      # Drag & drop, 2 MB validation, SVG progress ring
│   │       └── UploadBox.module.scss
│   │
│   ├── pages/
│   │   ├── Login.tsx              # Google button + email/password login form
│   │   ├── Signup.tsx             # Name + email + password + confirm form
│   │   ├── Home.tsx               # Auth guard → Upload UI or Chat UI
│   │   ├── Profile.tsx            # Full account management (inline sub-components)
│   │   ├── AuthPage.module.scss   # Shared styles for Login and Signup
│   │   ├── Profile.module.scss
│   │   └── Subscription/
│   │       ├── Subscription.tsx   # Pricing cards page
│   │       └── Subscription.module.scss
│   │
│   ├── services/
│   │   ├── api.ts                 # Axios base instance + JWT interceptors
│   │   ├── authService.ts         # All authentication API methods + TS interfaces
│   │   ├── chatService.ts         # Chat CRUD operations
│   │   └── pdfService.ts          # File validation + multipart upload
│   │
│   ├── store/
│   │   ├── store.ts               # configureStore — combines all three reducers
│   │   ├── hooks.ts               # Typed useAppDispatch and useAppSelector
│   │   └── slices/
│   │       ├── authSlice.ts       # token, user, loginSuccess, logout, updateUserName
│   │       ├── chatSlice.ts       # chats[], messages[], all chat mutations
│   │       └── uiSlice.ts         # darkMode, sidebarOpen, sidebarCollapsed
│   │
│   ├── styles/
│   │   ├── global.scss            # CSS vars, reset, animations, scrollbar, utilities
│   │   └── variables.scss         # SCSS design tokens (colors, spacing, radius, shadows)
│   │
│   ├── App.tsx                    # BrowserRouter, Routes, PublicRoute/ProtectedRoute guards
│   └── main.tsx                   # React root, Redux Provider, global stylesheet import
│
├── index.html                     # Vite entry, tab title, favicon link
├── vite.config.ts                 # @/ path alias, SCSS globalData injection
├── tsconfig.json                  # Strict TypeScript, path aliases
└── package.json                   # Dependencies and scripts
```

---

## 6. Key Components

| Component | Purpose |
|---|---|
| `Button` | Reusable button with `primary`, `secondary`, `ghost`, `danger` variants. Integrates `Loader` on `loading={true}`. Extends all native button attributes. |
| `Input` | Labelled input with validation error display, left/right icon slots. Used across all forms. |
| `Modal` | Controlled overlay with backdrop click to close, `Escape` key binding, and body scroll lock. |
| `Header` | App-wide header with dark mode toggle, avatar initials, logout dropdown. Reads from `authSlice`. |
| `Sidebar` | Animated collapsible chat list. Desktop: 260px ↔ 60px icon rail. Mobile: off-screen overlay. Uses `chatSlice` and `uiSlice`. |
| `Layout` | Wraps Header + Sidebar + main content area. Used on the Home page. |
| `ProfileLayout` | Header-only shell (no sidebar). Used on Profile and Subscription pages. |
| `ChatBox` | Renders message list, typing indicator, and chat input. Orchestrates `chatSlice` updates. |
| `MessageBubble` | Displays a single message. AI messages render through `react-markdown`. |
| `UploadBox` | PDF upload with drag-and-drop, file validation, circular SVG progress ring. |
| `Profile` | Full account page with inline name editing, reset password modal, delete confirm dialog, and toast system — all in one file. |

---

## 7. Setup Instructions

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Backend server running at `http://localhost:8000`

### Step 1 — Clone the repository

```bash
git clone https://github.com/sunitpal/pdf-gpt-creator.git
cd pdf-gpt-creator
```

### Step 2 — Install dependencies

```bash
npm install
```

### Step 3 — Configure environment

```bash
cp .env.example .env
```

Edit `.env` if your backend runs on a different host or port:

```env
VITE_API_BASE_URL=http://localhost:8000
```

### Step 4 — Start the development server

```bash
npm run dev
```

Open **http://localhost:5173** in your browser.

### Step 5 — Build for production

```bash
npm run build
```

Output goes to `dist/`. Serve it with any static host or run:

```bash
npm run preview
```

### Step 6 — Lint check

```bash
npm run lint
```

---

## 8. Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `VITE_API_BASE_URL` | No | `http://localhost:8000` | Backend base URL for all API calls |

All `VITE_*` variables are inlined at build time by Vite. Do not store private keys or secrets here.

---

## 9. Screens & UI Description

### `/login` — Login Page
A centred card on a muted background. Contains the PDF GPT lightning bolt logo, a "Continue with Google" button (shows a toast: "coming soon"), a horizontal divider, and an email/password form. Redirects to `/` after successful login. Shows an error banner on invalid credentials.

### `/signup` — Signup Page
Same card layout as login. Four sequential fields: Full Name, Email, Password, Confirm Password. All fields validated client-side. After a successful signup, auto-logs the user in and redirects to `/`.

### `/` — Home Page
The main app shell with a two-panel layout:
- **Left panel (Sidebar):** Scrollable list of all chats. Each item shows the chat title, a relative date, and a delete button on hover. Collapses to an icon-only rail on desktop.
- **Right panel (Main):** Displays the **Upload UI** when no chat is selected — a drag-and-drop zone with constraints (PDF only, max 2 MB) and a circular upload progress ring. Switches to the **Chat UI** after a chat is opened — scrollable message bubbles with a sticky input bar at the bottom.

### `/profile` — Profile Page
No sidebar. Full-width scrollable card with sections:
1. **Identity** — Avatar circle with initials, name (with inline edit pencil icon), email, "Active" badge
2. **Info grid** — 2×2 card grid showing full name, email, account type, member since
3. **Account** — "Change" button opens Reset Password modal; "Delete" button opens Confirm dialog
4. **Plan** — Links to Subscription page
5. **Connect** — Email, GitHub, LinkedIn links with hover arrow animation
6. **Sign out** — Ghost button at the bottom

### `/subscription` — Subscription Page
No sidebar. Hero section with PDF GPT icon and tagline. Three responsive pricing cards with features checklists and "Choose Plan" CTA buttons.

---

## 10. API Contract

| Method | Endpoint | Auth | Request Body | Response |
|---|---|---|---|---|
| POST | `/auth/signup` | No | `{ email, password, name }` | `{ msg }` |
| POST | `/auth/login` | No | `{ email, password }` | `{ token, user: { email, name } }` |
| PUT | `/auth/update-name` | Bearer | `{ name }` | `{ msg }` |
| PUT | `/auth/reset-password` | Bearer | `{ oldPassword, newPassword }` | `{ msg }` |
| DELETE | `/auth/delete-account` | Bearer | — | `{ msg }` |
| POST | `/pdf/upload` | Bearer | `FormData: file` | `{ chatId }` |
| GET | `/chat/list` | Bearer | — | `Chat[]` |
| GET | `/chat/:chatId` | Bearer | — | `Message[]` |
| POST | `/chat/ask` | Bearer | `{ question, chatId }` | `{ answer }` |
| DELETE | `/chat/:chatId` | Bearer | — | `{ msg }` |

---

## 11. Future Improvements

| Priority | Improvement |
|---|---|
| High | Google OAuth backend integration |
| High | Streaming AI responses (SSE / WebSocket) |
| Medium | Unit and integration tests (Vitest + React Testing Library) |
| Medium | Real Stripe payment integration on Subscription page |
| Medium | PDF preview panel alongside chat |
| Low | Message search across all chat history |
| Low | Chat export as PDF or Markdown |
| Low | Folder/tag organisation for chats |
| Low | CI/CD pipeline (GitHub Actions) |

---

## 12. Conclusion

PDF GPT is a production-quality React application demonstrating clean architecture, type-safe state management, a reusable component system, and real-world UX patterns. Every architectural choice — Redux for global state, SCSS modules for isolation, Axios interceptors for JWT, CSS custom properties for theming — is deliberate and documented.

The codebase is structured to scale: new features can be added as new slices, new service methods, and new page components without touching existing code. The styling system supports instant theme changes without re-renders, and the responsive layout works from 320px mobile up to 4K desktop.

---

*Built by **Sunit Pal** · MIT License*