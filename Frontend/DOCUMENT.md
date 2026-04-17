# Frontend Deep Dive — PDF GPT

> A comprehensive technical walkthrough of the React + TypeScript + Redux frontend — written for interviews, architecture reviews, and onboarding new engineers.

**Author:** Sunit Pal  
**Stack:** React 18 · TypeScript 5 · Redux Toolkit · SCSS Modules · React Router v6 · Axios  

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Routing System](#2-routing-system)
3. [State Management](#3-state-management)
4. [Services Layer](#4-services-layer)
5. [Component Breakdown](#5-component-breakdown)
6. [Profile Page Deep Dive](#6-profile-page-deep-dive)
7. [Styling System](#7-styling-system)
8. [UX Design Decisions](#8-ux-design-decisions)
9. [Performance Considerations](#9-performance-considerations)
10. [Interview Questions & Answers](#10-interview-questions--answers)
11. [Improvements & Scaling](#11-improvements--scaling)

---

## 1. High-Level Architecture

### How the App Is Structured

The application follows a **feature-first, service-backed** architecture with a clear separation between:

```
UI Layer           →   React components render from Redux state
State Layer        →   Redux Toolkit slices own all shared data
Service Layer      →   Axios-based functions handle all API calls
Infrastructure     →   api.ts adds JWT + handles 401 globally
```

There is no prop drilling. Every component reads what it needs from the Redux store using `useAppSelector`, and writes to it using `useAppDispatch`. This makes any component independently testable and refactorable.

### Component Hierarchy

```
main.tsx
  └── Provider (Redux store)
        └── App.tsx (BrowserRouter + Routes)
              ├── /login       → Login.tsx
              ├── /signup      → Signup.tsx
              │
              ├── /            → Home.tsx
              │     └── Layout (Header + Sidebar)
              │           └── ChatBox.tsx  OR  UploadBox.tsx
              │
              ├── /profile     → Profile.tsx
              │     └── ProfileLayout (Header only)
              │           ├── Toast (inline sub-component)
              │           ├── ConfirmDialog (inline sub-component)
              │           └── ResetPasswordModal (inline sub-component)
              │
              └── /subscription → Subscription.tsx
                    └── ProfileLayout (Header only)
                          └── PricingCard (inline sub-component)
```

### Data Flow

```
User clicks "Send"
  → ChatInput.tsx calls onSend(question)
  → ChatBox.tsx dispatches addMessage (optimistic UI)
  → ChatBox.tsx dispatches setLoading(true)
  → chatService.askQuestion({ question, chatId }) calls api.ts
  → api.ts attaches Bearer token via request interceptor
  → Backend responds with { answer }
  → ChatBox.tsx dispatches addMessage with AI response
  → ChatBox.tsx dispatches setLoading(false)
  → useAppSelector in ChatBox re-renders message list
```

The same unidirectional pattern applies everywhere:
**Component → dispatch action or call service → Redux state updates → component re-renders.**

---

## 2. Routing System

### Route Configuration

Routes are defined in `App.tsx` using React Router v6's declarative `<Routes>` API:

```
/login        → PublicRoute  → Login.tsx
/signup       → PublicRoute  → Signup.tsx
/             → ProtectedRoute → Home.tsx
/profile      → ProtectedRoute → Profile.tsx
/subscription → ProtectedRoute → Subscription.tsx
*             → Navigate to /
```

### Route Guards

Two wrapper components control access:

**`PublicRoute`** — If the user is already authenticated (`token` exists in Redux), redirects to `/`. This prevents logged-in users from seeing the login page.

```tsx
const PublicRoute = ({ children }) => {
  const { token } = useAppSelector(s => s.auth)
  if (token) return <Navigate to="/" replace />
  return <>{children}</>
}
```

**`ProtectedRoute`** — If there is no token, redirects to `/login`. This protects all application pages from unauthenticated access.

```tsx
const ProtectedRoute = ({ children }) => {
  const { token } = useAppSelector(s => s.auth)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}
```

### Navigation Flow

```
First visit (no token):
  → Any route → ProtectedRoute → redirects to /login

After login:
  → loginSuccess action fires
  → token saved to Redux + localStorage
  → navigate('/', { replace: true })
  → PublicRoute now redirects away from /login

After logout:
  → logout action fires
  → token removed from Redux + localStorage
  → navigate('/login', { replace: true })
  → ProtectedRoute now blocks access to /
```

The `replace: true` flag prevents the login page from being added to browser history, so pressing the back button after login doesn't return to the login page.

### Why `replace: true` Matters

Without `replace: true`, after a user logs in and clicks "Back" in the browser, they land on `/login` again. With `replace: true`, the current history entry is replaced, so "Back" takes them somewhere meaningful.

---

## 3. State Management

### Why Redux Toolkit and Not React Context?

| Factor | Redux Toolkit | React Context |
|---|---|---|
| Performance | Re-renders only subscribed components | Re-renders all consumers on any change |
| DevTools | Full Redux DevTools time-travel | No dedicated DevTools |
| Scalability | Slices are independently testable | Context grows messy at scale |
| Async patterns | RTK Query / thunks built in | Manual useReducer + useEffect |
| localStorage sync | Done inside slice reducers cleanly | Requires separate useEffect |

The auth token and user object are read by many components (Header, Sidebar, ChatBox, UploadBox). With Context, changing the token would re-render every Context consumer. With Redux, only components that call `useAppSelector(s => s.auth.token)` re-render.

### Store Structure

```ts
// store.ts
const store = configureStore({
  reducer: {
    auth: authReducer,   // token, user, isGuest
    chat: chatReducer,   // chats[], messages[], currentChatId, loading
    ui:   uiReducer,     // darkMode, sidebarOpen, sidebarCollapsed
  }
})

type RootState   = ReturnType<typeof store.getState>
type AppDispatch = typeof store.dispatch
```

The store has three slices, each owning a distinct domain:

- `auth` → who the user is and their credentials
- `chat` → all chat and message data
- `ui` → visual preferences and layout state

### authSlice Deep Dive

**State shape:**
```ts
{
  token:   string | null   // JWT token
  user:    { email: string; name?: string } | null
  isGuest: boolean         // kept for backwards compatibility
}
```

**Initial state bootstraps from localStorage:**
```ts
const storedToken = localStorage.getItem('pdf_gpt_token')
const storedUser  = localStorage.getItem('pdf_gpt_user')

const initialState = {
  token: storedToken ?? null,
  user:  storedUser ? JSON.parse(storedUser) : null,
}
```

This means on page refresh, the user is still logged in without any API call.

**Key actions:**

`loginSuccess` — Called after a successful login or signup API response. Saves token + user to both Redux state and `localStorage` atomically.

`logout` — Clears token + user from Redux state AND removes both keys from `localStorage`. Combined with `clearChat` dispatch in handlers to wipe chat state too.

`updateUserName` — Called after `PUT /auth/update-name` succeeds. Updates `state.user.name` in Redux AND re-serializes the user object to `localStorage`. This means the updated name survives a page refresh.

### chatSlice Deep Dive

**State shape:**
```ts
{
  chats:         Chat[]          // sidebar list
  currentChatId: string | null   // which chat is open
  messages:      Message[]       // messages of the open chat
  loading:       boolean         // AI is responding
}
```

**Key behaviours:**

- `setCurrentChat(null)` automatically clears `messages: []` — this prevents a flash of the previous chat's messages when switching.
- `removeChat` checks if the deleted chat is the currently open one, and if so, resets `currentChatId` to `null`.
- `prependChat` adds a new chat to the front of the list — so newly uploaded PDFs appear at the top of the sidebar immediately without refetching.
- `clearChat` resets everything — called on logout to ensure no data leaks between user sessions.

### uiSlice Deep Dive

**State shape:**
```ts
{
  darkMode:         boolean   // current theme
  sidebarOpen:      boolean   // mobile overlay drawer
  sidebarCollapsed: boolean   // desktop icon-only mode
}
```

`darkMode` and `sidebarCollapsed` are both persisted to `localStorage`. `darkMode` is also applied to the `<html>` element as `data-theme="dark"` immediately at slice initialisation time — before React even renders — which prevents a white flash on dark-mode page loads.

### Typed Hooks

```ts
// hooks.ts
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
```

These two lines are the entire typed hooks file. By using these instead of the raw `useDispatch` and `useSelector`, every dispatch call and every selector is fully typed — TypeScript will catch incorrect action payloads and wrong state paths at compile time.

**Usage in a component:**
```ts
const dispatch = useAppDispatch()
const { token, user } = useAppSelector(s => s.auth)
```

---

## 4. Services Layer

### api.ts — The Foundation

Every single API call goes through one Axios instance defined in `api.ts`:

```ts
const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})
```

**Request interceptor — JWT attachment:**
```ts
api.interceptors.request.use(config => {
  const token = store.getState().auth.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

This interceptor reads the current token directly from the Redux store on every request. This means there is no risk of using a stale token from a component-level variable.

**Response interceptor — 401 global handler:**
```ts
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      store.dispatch(logout())
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)
```

This is the single place that handles session expiry. Any 401 from any API call — regardless of which component triggered it — will log the user out and redirect them. No component needs to handle 401 individually.

### authService.ts

```ts
const authService = {
  login(payload):         Promise<LoginResponse>      // POST /auth/login
  signup(payload):        Promise<SignupResponse>      // POST /auth/signup
  updateName(payload):    Promise<GenericResponse>     // PUT /auth/update-name
  resetPassword(payload): Promise<GenericResponse>     // PUT /auth/reset-password
  deleteAccount():        Promise<GenericResponse>     // DELETE /auth/delete-account
}
```

Each method is a thin async function that calls `api.post/put/delete` and returns `res.data`. The TypeScript interfaces (`LoginPayload`, `LoginResponse`, etc.) are exported alongside the service so components get full type safety.

**The `LoginResponse` interface:**
```ts
export interface LoginResponse {
  token: string
  user: { email: string; name?: string }
}
```

The backend returns the user object directly on login. This means the frontend doesn't need to decode the JWT or make a separate `/me` API call — it just reads `res.user` directly and dispatches it to Redux.

### Error Handling Pattern

All service calls are wrapped in `try/catch` at the component level:

```ts
try {
  await authService.updateName({ name: trimmed })
  dispatch(updateUserName(trimmed))
  showToast('Name updated!', 'success')
} catch (err: unknown) {
  const axiosErr = err as { response?: { data?: { detail?: string } } }
  showToast(axiosErr?.response?.data?.detail ?? 'Failed to update name.', 'error')
}
```

**Why this pattern works:**
- The component shows user-friendly error messages from the backend's `detail` field
- If the backend doesn't provide a `detail`, a sensible fallback message is shown
- The `err as { response?: ... }` cast avoids TypeScript errors while safely accessing nested properties
- The 401 case is already handled globally in `api.ts` and never reaches this catch block

---

## 5. Component Breakdown

### Button Component

**Purpose:** A single reusable button that covers every use case in the app.

**Props:**
```ts
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:   'primary' | 'secondary' | 'ghost' | 'danger'
  size?:      'sm' | 'md' | 'lg'
  loading?:   boolean
  fullWidth?: boolean
  icon?:      React.ReactNode
}
```

**Key design decisions:**

1. **Extends native button attributes** — `type="submit"`, `disabled`, `onClick`, `aria-label` all work natively without needing to be explicitly declared in the interface.

2. **Loading state swaps content** — When `loading={true}`, the button replaces its children with a `<Loader size="sm" color="inherit" />` and sets `disabled={true}` automatically. This prevents double-submission without any additional logic in the parent.

3. **CSS module class composition** — Classes are built as an array and joined:
   ```ts
   const classes = [
     styles.btn,
     styles[variant],   // e.g. styles.primary
     styles[size],      // e.g. styles.md
     fullWidth ? styles.fullWidth : '',
     loading   ? styles.loading   : '',
   ].filter(Boolean).join(' ')
   ```
   This avoids conditional string concatenation and is easy to extend.

**How it interacts with the rest of the system:** The Button component is pure — it receives all instructions via props and has zero internal state (except the native button's `disabled` state). It does not talk to Redux or any service.

---

### ProfileLayout Component

**Purpose:** A minimal page shell for pages that do not need the sidebar.

**Why it exists separately from `Layout`:** The Profile and Subscription pages should not show the sidebar. Rather than passing a prop like `<Layout showSidebar={false}>`, a separate `ProfileLayout` component makes the intent explicit and keeps `Layout` clean. This follows the **composition over configuration** principle.

```tsx
const ProfileLayout = ({ children }) => (
  <div className={styles.shell}>
    <Header />
    <main className={styles.main}>
      {children}
    </main>
  </div>
)
```

It renders the `Header` (so dark mode, avatar, and logout still work), but has no `Sidebar`. The shell is a full-height flex column with `overflow-y: auto` on the main area.

---

### Toast System

**Purpose:** Non-blocking feedback messages that auto-dismiss after 3.5 seconds.

**Implementation:** The `Toast` component is defined as an inline sub-component inside `Profile.tsx`:

```tsx
type ToastType = 'success' | 'error' | 'info'

const Toast: React.FC<{ message: string; type: ToastType }> = ({ message, type }) => (
  <div className={`${styles.toast} ${styles[`toast_${type}`]} fade-in`}>
    {/* type-specific SVG icon */}
    {message}
  </div>
)
```

**State management in Profile:**
```ts
const [toast, setToast] = useState<null | { message: string; type: ToastType }>(null)

const showToast = (message: string, type: ToastType = 'info') => {
  setToast({ message, type })
  setTimeout(() => setToast(null), 3500)
}
```

The `showToast` helper is passed as a prop to `ResetPasswordModal` so it can trigger a success toast even after closing itself.

**Styling:** The toast is `position: fixed`, centered at the bottom of the viewport using `left: 50%; transform: translateX(-50%)`. It has `pointer-events: none` so it doesn't block clicks. Three SCSS classes — `toast_success`, `toast_error`, `toast_info` — apply different background colours.

---

### ConfirmDialog Component

**Purpose:** A reusable confirmation overlay that prevents accidental destructive actions.

**Props:**
```ts
interface ConfirmDialogProps {
  title:     string
  message:   string
  onConfirm: () => void
  onCancel:  () => void
  danger?:   boolean    // red confirm button if true
  loading?:  boolean    // shows loading state during async operation
}
```

**Key behaviour:**
- Clicking the backdrop (the dark overlay behind the dialog) calls `onCancel()` — implemented via `e.target === e.currentTarget` check.
- The `danger` prop switches the confirm button's variant from `primary` to `danger`, giving the user a visual warning.
- The `loading` prop disables both buttons and shows a spinner on the confirm button — used when `deleteAccount` API call is in progress.

---

### ResetPasswordModal Component

**Purpose:** A focused modal for changing the user's password with full client-side validation before hitting the API.

**Internal state:**
```ts
const [oldPassword, setOldPassword] = useState('')
const [newPassword, setNewPassword] = useState('')
const [confirmNew,  setConfirmNew]  = useState('')
const [loading,     setLoading]     = useState(false)
const [error,       setError]       = useState<string | null>(null)
```

**Validation chain (in order):**
1. Current password not empty
2. New password not empty
3. New password at least 6 characters
4. New and confirm passwords match
5. New password differs from current password

Each validation check returns early on failure, showing the specific error message. This gives precise, actionable feedback rather than a generic "form is invalid" message.

**API interaction:**
```ts
await authService.resetPassword({ oldPassword, newPassword })
showToast('Password updated successfully!', 'success')
onClose()
```

The modal calls `authService.resetPassword`, then calls the `showToast` function received from the parent (Profile), then calls `onClose`. The parent never needs to know about the modal's internal state.

---

## 6. Profile Page Deep Dive

The Profile page is the most complex component in the application. It manages multiple independent flows simultaneously, all without navigating away from the page.

### Architecture Decision

All three sub-components (Toast, ConfirmDialog, ResetPasswordModal) are defined **inside `Profile.tsx`** rather than as separate files. This is intentional:

- These components are not reused anywhere else in the app
- Co-locating them makes it obvious where they are used
- The file stays self-contained — reading one file gives you the full picture of the Profile feature

---

### Flow 1: Editing Name

**Step-by-step execution:**

```
1. User hovers over their name in the avatar section
   → CSS hover selector on .identity makes .nameEditBtn visible (opacity: 0 → 1)

2. User clicks the pencil icon (nameEditBtn)
   → handleStartEditName() fires
   → setNameValue(user?.name ?? '') copies current name to local state
   → setIsEditingName(true)

3. useEffect fires because isEditingName changed
   → nameInputRef.current?.focus()
   → Input is focused immediately

4. User types new name in the inline input
   → setNameValue(e.target.value) updates local state on every keystroke
   → Only local state changes, no Redux updates yet

5a. User presses Enter OR clicks the green ✓ button
   → handleSaveName() fires
   → Trims whitespace
   → If empty → showToast('Name cannot be empty.', 'error'), return
   → If unchanged → setIsEditingName(false), return (no API call)
   → setNameSaving(true) → spinner appears on save button

6. API call: PUT /auth/update-name { name: trimmedName }
   → On success:
       dispatch(updateUserName(trimmedName))
       → Redux updates state.auth.user.name
       → localStorage.setItem('pdf_gpt_user', JSON.stringify(updatedUser))
       setIsEditingName(false)
       showToast('Name updated successfully!', 'success')
   → On error:
       showToast(backendDetail ?? 'Failed to update name.', 'error')
       (editing mode stays open)

5b. User presses Escape OR clicks the × button
   → handleCancelEditName()
   → setIsEditingName(false)
   → setNameValue(user?.name ?? '') restores original value
   (no API call made)
```

**Why this UX pattern:** Inline editing is less disruptive than navigating to a separate page or opening a modal. The user sees the result immediately in context. The pencil icon only appearing on hover keeps the UI clean until the user actually wants to edit.

---

### Flow 2: Reset Password

```
1. User clicks "Change" button on the Reset password action card
   → setShowResetModal(true)
   → ResetPasswordModal renders (conditional rendering)
   → Bounce-in CSS animation plays

2. User fills in all three fields
   → Each field updates its own local state inside the modal
   → Error state is initially null

3. User clicks "Update password" (submits form)
   → handleSubmit(e) fires
   → e.preventDefault() stops page reload
   → setError(null) clears previous errors

4. Validation runs sequentially:
   → Missing current password → setError + return
   → Missing new password → setError + return
   → New password too short → setError + return
   → Passwords don't match → setError + return
   → Same as current → setError + return
   (Error banner renders below the form fields)

5. All validations pass:
   → setLoading(true)
   → authService.resetPassword({ oldPassword, newPassword })
   → On success:
       showToast('Password updated successfully!', 'success')
       onClose() → setShowResetModal(false)
   → On error:
       setError(backendDetail ?? fallback message)
       setLoading(false)
       (Modal stays open, user can correct and retry)
```

---

### Flow 3: Delete Account

```
1. User clicks "Delete" button on the danger action card
   → setDialog('delete')
   → ConfirmDialog renders with danger={true}

2. User sees the warning dialog
   → "Cancel" → setDialog(null), dialog unmounts
   → Clicking backdrop → same as Cancel

3. User clicks "Confirm"
   → handleDeleteAccount() fires
   → setDeletingAccount(true)
   → Both dialog buttons show loading/disabled state

4. API call: DELETE /auth/delete-account
   → try/catch with empty catch: even if the server returns an error,
     we proceed with clearing local data (the user wants out)
   → finally block always runs:
       setDeletingAccount(false)
       setDialog(null)
       dispatch(logout())      → clears Redux auth state + localStorage
       dispatch(clearChat())   → clears all chat data from Redux
       navigate('/login', { replace: true })
```

**Why the empty catch is intentional:** If the delete API fails (e.g., network error), the user's intent was still to delete their account. We clear all local session data regardless so they are not stuck in an unusable logged-in state. The account may still exist on the server, but the user can retry later.

---

### Flow 4: Logout

```
1. User clicks "Sign out" button at the bottom of the Profile page
   → handleSignOut() fires
   → dispatch(logout())
       → state.auth.token = null
       → state.auth.user  = null
       → localStorage.removeItem('pdf_gpt_token')
       → localStorage.removeItem('pdf_gpt_user')
   → dispatch(clearChat())
       → state.chat = initial state (empty chats, messages, etc.)
   → navigate('/login', { replace: true })

2. ProtectedRoute at / now sees no token
   → Redirects to /login (belt-and-suspenders protection)

3. PublicRoute at /login allows through
   → Login page renders with clean state
```

---

### Toast System in Profile

The `showToast` function is defined once in the `Profile` component and is:
- Called directly for name edit results and sign-out feedback
- Passed as a prop (`showToast={showToast}`) to `ResetPasswordModal` so that modal can trigger success toasts even after it closes

The auto-dismiss uses `setTimeout(() => setToast(null), 3500)`. Each call to `showToast` creates a new timeout. If two toasts fire within 3.5 seconds of each other (unlikely but possible), the first toast is immediately replaced by the second, and the timeout from the first call still fires but sets an already-null toast to null — harmless.

---

## 7. Styling System

### SCSS Modules

Every component has its own `.module.scss` file. The CSS Module system transforms class names at build time — `.container` in `Profile.module.scss` becomes something like `_container_abc123` in the output. This means:

- **Zero class name collisions** — two components can both have a `.container` class without conflict
- **Dead code elimination** — unused SCSS classes are tree-shaken automatically
- **Explicit coupling** — `styles.container` in JSX makes it obvious exactly which file provides the style

### Design Tokens

All design tokens are defined in `variables.scss`:

```scss
$color-primary:    #10a37f;
$radius-md:        10px;
$shadow-md:        0 4px 6px rgba(0,0,0,.07);
$transition-fast:  150ms ease;
```

These are injected into every SCSS file automatically via `vite.config.ts`:
```ts
css: {
  preprocessorOptions: {
    scss: {
      additionalData: `@use "@/styles/variables" as *;`
    }
  }
}
```

### Theming with CSS Custom Properties

Theming uses CSS custom properties (variables) defined in `global.scss`, not SCSS variables. This is the critical distinction:

- **SCSS variables** are resolved at compile time — they cannot change at runtime
- **CSS custom properties** are resolved at runtime — they can be changed by JavaScript or CSS selectors

```scss
:root {
  --primary:      #10a37f;
  --bg-secondary: #ffffff;
  --text-primary: #111827;
}

[data-theme="dark"] {
  --bg-secondary: #2f2f2f;
  --text-primary: #ececec;
}
```

Switching to dark mode is a single line of JavaScript:
```ts
document.documentElement.setAttribute('data-theme', 'dark')
```

This does not re-render React. It is instant and smooth.

### Naming Strategy

SCSS classes follow **BEM-inspired camelCase**:
- `.card` — block
- `.cardHeader` — element inside card
- `.dangerCard` — modifier for a danger variant of card
- `.actionTitle`, `.actionDesc`, `.actionIcon` — consistent sub-element naming

Classes are never global. The only global styles are in `global.scss` for resets, keyframe animations, scrollbar styling, and utility classes like `.fade-in` and `.bounce-in`.

---

## 8. UX Design Decisions

### Why Modals for Reset Password (Not a Separate Page)

A dedicated `/change-password` page would require navigation away from Profile, and after success, the user would need to navigate back. A modal:
- Keeps context — the user never leaves the profile page
- Is dismissible — pressing Escape or clicking the backdrop cancels without consequence
- Focuses attention — the backdrop dims the rest of the page, reducing cognitive load
- Does not add browser history entries — the URL does not change

### Why Toast Notifications Instead of Inline Error/Success Banners

Inline banners are best for form-level errors (e.g., "Email is required") because the user needs to fix something. Toasts are best for operation results (e.g., "Name updated successfully") because:
- The operation is complete — there is nothing to fix
- The user should continue working — a toast auto-dismisses without requiring interaction
- They are non-blocking — the user can see what changed while the toast is visible

In this app, **both are used**: inline error banners inside the reset password modal form, and toast notifications for operation outcomes.

### Why Inline Name Editing Instead of a Form

Showing an input directly where the name is displayed:
- Reduces the number of UI steps (no "Edit Profile" button → separate form → save → return)
- Makes the edit-result relationship obvious (the name updates in place)
- Feels modern and direct, consistent with tools like Notion and Linear

The pencil icon appearing only on hover keeps the default state clean. Users who are not trying to edit will never see the affordance.

### Accessibility Considerations

- All interactive elements have `aria-label` attributes where the visual label is ambiguous (icon-only buttons)
- The `ConfirmDialog` closes on `Escape` key press
- The `ResetPasswordModal` has a close button with `aria-label="Close"`
- `autoComplete` attributes are set correctly on all password fields (`current-password`, `new-password`) — this allows password managers to work correctly
- Buttons are never replaced with `div` or `span` — native `<button>` elements are keyboard-focusable and have correct ARIA roles by default
- The `role="dialog"` and `aria-modal="true"` attributes are set on the Modal component

---

## 9. Performance Considerations

### Avoiding Unnecessary Re-renders

**Selector granularity:** Components subscribe only to the specific state they need. `ChatInput.tsx` subscribes to `s => s.chat.loading` — not the entire chat slice. This means adding a new message to `messages[]` does not re-render the input bar.

**Conditional rendering over CSS `display: none`:** Modals, dialogs, and toasts are conditionally rendered (`{toast && <Toast />}`) rather than always mounted with hidden visibility. This means their internal state is reset each time they open, which is the desired behaviour for forms — you want a fresh form every time the reset password modal opens.

**`useCallback` for stable file handler:** In `UploadBox.tsx`, `handleFile` is wrapped in `useCallback` with `[dispatch]` as its dependency. Since `dispatch` from `useAppDispatch` is stable across renders, `handleFile` is only created once. This prevents the drag event listeners from being unnecessarily re-attached on every render.

**Smooth sidebar animation without JavaScript:** The sidebar width transition (`300ms cubic-bezier`) is implemented entirely in CSS — the SCSS class `.collapsed` is applied via a data attribute, and CSS handles the animation. No JavaScript `requestAnimationFrame` loop, no `setTimeout`. The browser's compositor thread handles it independently from the main thread.

### Optimized Hook Usage

**`useRef` for the name input focus:**
```ts
const nameInputRef = useRef<HTMLInputElement>(null)

useEffect(() => {
  if (isEditingName) nameInputRef.current?.focus()
}, [isEditingName])
```

Using `useRef` here avoids accessing the DOM directly in an event handler. The `useEffect` ensures the focus fires after the DOM has updated with the new input element.

**`useRef` for the chat scroll anchor:**
```ts
const bottomRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
}, [messages, loading])
```

The `scrollIntoView` call only runs when messages change or loading state changes — exactly the two cases when auto-scroll is needed. The `behavior: 'smooth'` produces an animated scroll rather than a jarring jump.

### Dark Mode Zero-Flash

```ts
// In uiSlice.ts — runs at module import time, before React renders
const storedDark = localStorage.getItem('pdf_gpt_dark')

if (storedDark === 'true') {
  document.documentElement.setAttribute('data-theme', 'dark')
}
```

This code runs synchronously when `uiSlice.ts` is first imported, which happens before the React component tree mounts. By the time the first pixel is painted, `data-theme="dark"` is already set. There is no flash of the default light theme.

---

## 10. Interview Questions & Answers

---

**Q1. Why did you choose Redux Toolkit over React Context for state management?**

Context works well for low-frequency updates like theme toggling. But this app has multiple components subscribing to auth state and chat state. With Context, any change to the context value would re-render every consumer. Redux's `useSelector` uses referential equality checks — only components whose selected value actually changed get re-rendered. Redux also provides DevTools for time-travel debugging, which is invaluable during development.

---

**Q2. How does your JWT authentication flow work end-to-end?**

On login, the backend returns `{ token, user }`. We dispatch `loginSuccess`, which saves both to Redux state and `localStorage`. The Axios request interceptor reads the token from `store.getState().auth.token` on every request and attaches it as `Authorization: Bearer <token>`. The response interceptor watches for `401` status globally — if detected, it dispatches `logout()` and redirects to `/login`. On page refresh, `authSlice`'s initial state bootstraps from `localStorage`, so the token is restored without any API call.

---

**Q3. How do you handle API errors gracefully?**

Three layers of error handling:
1. **Global 401 handler** in `api.ts` intercepts expired tokens and logs the user out automatically.
2. **Service layer** — each `authService` method is a typed async function. It throws on non-2xx responses, which the caller can `catch`.
3. **Component level** — each `try/catch` block reads `err?.response?.data?.detail` for the backend's specific message, with a sensible fallback if that field is absent. Error messages are shown either as inline banners (inside forms) or as toasts (for operation results).

---

**Q4. How is state persisted across page refreshes?**

Three things are persisted to `localStorage`:
- `pdf_gpt_token` — the JWT token
- `pdf_gpt_user` — the user's email and name as JSON
- `pdf_gpt_dark` — the dark mode preference
- `pdf_gpt_sidebar_collapsed` — the sidebar collapse state

All four are written in the relevant Redux slice reducers (not in components). On initial load, each slice reads from `localStorage` to set its initial state. This is simpler than `redux-persist` and covers exactly the data that needs to persist.

---

**Q5. How does the sidebar collapse animation work?**

The sidebar is always in the DOM — it is never conditionally rendered. Its width transitions between three states using CSS:
- `260px` — expanded (default)
- `60px` — collapsed (`.collapsed` class applied)
- `translateX(-100%)` off-screen — mobile overlay (`.mobileOpen` absent)

The transition is `width 300ms cubic-bezier(0.4, 0, 0.2, 1)` defined in SCSS. The collapse state is a boolean in `uiSlice` that is persisted to `localStorage`. The toggle differentiates between mobile and desktop using `window.innerWidth < 768`.

---

**Q6. Why does the Profile page not have a sidebar?**

The Profile page uses `ProfileLayout` instead of `Layout`. `ProfileLayout` renders just the `Header` and a `<main>` element with no sidebar. This was a deliberate UX decision — account management is a focused task that benefits from a clean, distraction-free canvas. Keeping a sidebar visible there would compete for attention with the card content.

---

**Q7. How does the inline name editing work?**

When the user clicks the pencil icon, `isEditingName` state flips to `true`. The static `<h1>` is replaced by an `<input>` via conditional rendering. A `useEffect` fires when `isEditingName` becomes true and focuses the input using a `useRef`. The input value is local component state, not Redux — there is no point putting a draft/unsaved value in the global store. Only when the user confirms (Enter or ✓) does the value get sent to the API and then dispatched to Redux via `updateUserName`. Pressing Escape restores the original value and closes edit mode without any API call.

---

**Q8. Why do you dispatch `clearChat()` on logout?**

To prevent data leakage. If User A logs out on a shared device and User B logs in, User B should not see User A's chats. `logout()` clears the auth token, and `clearChat()` clears all chat data from Redux memory. Since chats are never written to `localStorage` (only to Redux), they disappear automatically on page reload too, but dispatching `clearChat()` ensures the UI is clean immediately without requiring a reload.

---

**Q9. How does the Markdown rendering work for AI responses?**

User messages are rendered as plain `<p>` with `white-space: pre-wrap`. AI messages are passed through `<ReactMarkdown remarkPlugins={[remarkGfm]}>`. The `remark-gfm` plugin adds GitHub Flavored Markdown support: tables, strikethrough, task lists, autolinks. Custom renderers are provided for `code` (to distinguish inline code from fenced code blocks) and `a` (to add `target="_blank"` to all links). User messages intentionally do not go through Markdown rendering — users are typing natural questions, not formatting documents.

---

**Q10. How do you prevent double-form submission?**

The `Button` component's `loading` prop sets `disabled={true}` on the underlying `<button>` element. Since `loading` is set to `true` at the start of any async operation and cleared in the `finally` block, the button is disabled for the entire duration of the API call. Multiple clicks have no effect because the first click sets `loading(true)` immediately.

---

**Q11. How does dark mode work without a flash on load?**

The check runs inside `uiSlice.ts` at module import time (top-level, outside any function or component):

```ts
const storedDark = localStorage.getItem('pdf_gpt_dark')
if (storedDark === 'true') {
  document.documentElement.setAttribute('data-theme', 'dark')
}
```

Since Vite bundles all modules synchronously and this module is imported before `ReactDOM.createRoot()` is called, the `data-theme` attribute is set on `<html>` before the first paint. The browser applies the dark CSS variables immediately, so the user never sees a white flash.

---

**Q12. How is the PDF upload progress tracked?**

Axios supports an `onUploadProgress` callback:

```ts
await api.post('/pdf/upload', formData, {
  onUploadProgress: e => {
    if (e.total) setProgress(Math.round((e.loaded / e.total) * 100))
  }
})
```

The `progress` state (0–100) drives an SVG circular progress ring. The ring uses `stroke-dashoffset` calculated from the progress percentage — as the percentage increases, the dash offset decreases, making the ring "fill in". The calculation is `2 * Math.PI * radius * (1 - progress / 100)`.

---

**Q13. Why is `navigate(-1)` avoided and `navigate('/')` used instead on the Profile back button?**

`navigate(-1)` goes back in the browser history stack, but the history stack is not always what you expect. If a user arrived at `/profile` by clicking a deep link or by typing the URL directly, `navigate(-1)` would take them to an external page, or an empty history entry. Using `navigate('/')` always takes the user to the home page, which is the correct "parent" of the Profile page in the app's conceptual hierarchy.

---

**Q14. How do route guards work?**

`ProtectedRoute` reads `token` from `useAppSelector(s => s.auth.token)`. If the token is null or undefined, it renders `<Navigate to="/login" replace />` instead of the children. If the token exists, it renders `children`. This runs as part of the React render cycle — it is a render-time redirect, not a navigation side effect. `PublicRoute` does the inverse: if a token exists, redirect to `/`.

---

**Q15. How do you ensure the chat scroll-to-bottom works reliably?**

```ts
const bottomRef = useRef<HTMLDivElement>(null)

useEffect(() => {
  bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
}, [messages, loading])
```

A `<div ref={bottomRef} />` is placed as the last child of the messages container. Whenever `messages` or `loading` changes, `scrollIntoView` is called. This covers all cases: a new user message is added (`messages` changes), a new AI message arrives (`messages` changes), and the typing indicator appears or disappears (`loading` changes). Using `useEffect` ensures it runs after the DOM has updated with the new message.

---

**Q16. Explain the `useAppDispatch` and `useAppSelector` pattern.**

The raw `useDispatch` from react-redux returns `Dispatch<AnyAction>` — a loosely typed dispatch that accepts any action. `useAppDispatch` is a wrapper that returns `Dispatch<AppDispatch>`, which is typed to the specific action types of your Redux store. This means if you dispatch an action with a wrong payload type, TypeScript catches it at compile time.

Similarly, the raw `useSelector` has an `unknown` type for state. `useAppSelector` uses `TypedUseSelectorHook<RootState>`, which knows the exact shape of your entire Redux store. `s => s.auth.token` is fully typed — TypeScript knows `s.auth.token` is `string | null`, not `any`.

---

**Q17. Why are Toast, ConfirmDialog, and ResetPasswordModal defined inside Profile.tsx?**

These components are not used anywhere else in the application. Putting them in separate files would add three file imports, three module declarations, and force the reader to jump between files to understand one feature. Co-locating them inside `Profile.tsx` keeps the entire Profile feature in one place — you can read top to bottom and understand every behaviour without opening another file. If any of them needed to be reused, they would be moved to `components/common/`.

---

**Q18. How does the app handle network errors vs API errors?**

A network error (no response from server) produces an error object where `err.response` is `undefined`. An API error (server responded with 4xx/5xx) produces an object where `err.response.data` contains the error details.

The catch blocks handle both:
```ts
const axiosErr = err as { response?: { data?: { detail?: string } } }
const msg = axiosErr?.response?.data?.detail ?? 'Something went wrong. Please try again.'
```

If `response` is undefined (network error), the optional chaining returns `undefined` all the way, and the nullish coalescing `??` provides the fallback. If `response` exists but `detail` is absent, the same fallback applies.

---

**Q19. What happens when you delete a chat that is currently open?**

In `chatSlice.ts`, the `removeChat` reducer handles this case:

```ts
removeChat(state, action: PayloadAction<string>) {
  state.chats = state.chats.filter(c => c.chatId !== action.payload)
  if (state.currentChatId === action.payload) {
    state.currentChatId = null
    state.messages      = []
  }
}
```

If the deleted chat is the currently open one, `currentChatId` is set to `null` and `messages` is cleared. The Home page reads `currentChatId` and renders `<UploadBox />` when it is null, so the user immediately sees the upload interface instead of an empty or broken chat.

---

**Q20. How would you add real-time streaming for AI responses?**

Replace the current `POST /chat/ask` flow with a Server-Sent Events (SSE) connection:

1. Frontend opens an `EventSource` connection to `/chat/stream?chatId=...&question=...`
2. Backend streams tokens one by one as SSE events
3. Frontend uses `addMessage` to create the AI bubble with empty content initially, then updates it token by token using a new `appendToLastMessage` reducer
4. On the `[DONE]` event, close the EventSource and set loading to false

The `MessageBubble` component would re-render on each token because `messages` in the store updates, but since only the last message changes, only the last bubble re-renders.

---

## 11. Improvements & Scaling

### Code Quality

| Improvement | Benefit |
|---|---|
| Add Vitest + React Testing Library | Catch regressions, enable confident refactoring |
| Add Storybook for component library | Visual documentation, isolated development |
| Extract Toast to a global system using a Redux slice | Allows any component to trigger toasts without prop drilling |
| Add ESLint rules for import order and unused imports | Keeps codebase consistent as it grows |

### Features

| Improvement | Benefit |
|---|---|
| Streaming AI responses via SSE | Much better UX — user sees output as it is generated |
| Google OAuth backend integration | Reduces signup friction significantly |
| PDF preview panel alongside chat | User can reference the source document while chatting |
| Real Stripe integration for Subscription | Monetization — convert the static pricing page |
| Message search and export | Power user features |

### Architecture at Scale

**Extract Toast to Redux:**  
Currently, `showToast` is a local function in `Profile.tsx`. If other pages need toasts, each would need its own state. The correct scaling path is a `toastSlice` with a `showToast` action that any component can dispatch, and a single `<ToastContainer />` rendered at the root level.

**API layer improvements:**  
Add RTK Query to replace the manual `authService` and `chatService` pattern. RTK Query provides automatic caching, loading states, error states, and cache invalidation — eliminating most of the manual state management in chat fetching.

**Code splitting:**  
The Subscription page and Profile page can be lazy-loaded:
```ts
const Profile = React.lazy(() => import('./pages/Profile'))
```
This reduces the initial bundle size for users who never visit these pages.

**Absolute path consistency:**  
All imports use `@/` aliases (e.g., `@/store/slices/authSlice`). This is already configured and should be enforced via ESLint `import/no-relative-packages` to prevent any future relative import drift.

**State normalization for chats:**  
Currently `chats` is an array. At scale (100+ chats), linear searches like `chats.find(c => c.chatId === id)` become slow. The scaling solution is to normalize: store `chatsById: Record<string, Chat>` and `chatIds: string[]` — the same pattern used by Redux's `createEntityAdapter`.

---

*This document is a living reference. Update it when architecture decisions change. — Sunit Pal*