import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from '@/store/store'
import { logout } from '@/store/slices/authSlice'
import { clearChat } from '@/store/slices/chatSlice'
import App from './App'
import '@/styles/global.scss'

// ─── Viewport height fix (iOS Safari) ────────────────────────────────────────
const setAppHeight = () => {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`)
}
setAppHeight()
window.addEventListener('resize', setAppHeight)
window.addEventListener('orientationchange', () => setTimeout(setAppHeight, 100))

// ─── Check token validity on load ────────────────────────────────────────────
const checkTokenOnLoad = () => {
  const token = localStorage.getItem('pdf_gpt_token')
  if (!token) return

  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    const isExpired = Date.now() >= (payload.exp * 1000) - 10_000

    if (isExpired) {
      console.warn('Stored token is expired — clearing session')
      store.dispatch(logout())
      store.dispatch(clearChat())
    }
  } catch {
    store.dispatch(logout())
    store.dispatch(clearChat())
  }
}

checkTokenOnLoad()

// ─────────────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
)