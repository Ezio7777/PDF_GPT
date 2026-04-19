import axios from 'axios'
import { store } from '@/store/store'
import { logout } from '@/store/slices/authSlice'
import { clearChat } from '@/store/slices/chatSlice'

// ─── Helper: Decode JWT expiry without a library ─────────────────────────────
function isTokenExpired(token: string): boolean {
  try {
    const payloadBase64 = token.split('.')[1]
    if (!payloadBase64) return true

    const payload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')))
    const exp = payload.exp
    if (!exp) return true

    // exp is in seconds, Date.now() is in ms. Buffer of 10s.
    return Date.now() >= (exp * 1000) - 10_000
  } catch {
    return true
  }
}

// ─── Helper: Clean logout ─────────────────────────────────────────────────────
function handleExpiredSession() {
  store.dispatch(logout())
  store.dispatch(clearChat())
  localStorage.removeItem('pdf_gpt_token')
  localStorage.removeItem('pdf_gpt_user')
}

// ─── Axios Instance ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL?.trim(),
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request Interceptor: Attach JWT ────────────────────────
api.interceptors.request.use(
  config => {

    if (config.url?.includes('/auth/login') || config.url?.includes('/auth/signup')) {
      return config;
    }

    const token = store.getState().auth.token ?? localStorage.getItem('pdf_gpt_token');

    if (!token || isTokenExpired(token)) {
      handleExpiredSession();
      return Promise.reject(new Error('Session expired or invalid'));
    }

    config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  error => Promise.reject(error),
)

// ─── Response Interceptor: Handle 401 from server ────────────────────────────
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      handleExpiredSession()
    }
    return Promise.reject(error)
  }
)

export default api