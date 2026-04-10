import axios from 'axios'
import { store } from '@/store/store'
import { logout } from '@/store/slices/authSlice'

const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request Interceptor: Attach JWT ────────────────────────────────────────
api.interceptors.request.use(
  config => {
    const token = store.getState().auth.token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error),
)

// ─── Response Interceptor: Handle 401 ───────────────────────────────────────
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      store.dispatch(logout())
      // Navigate to root — the app router will show the auth modal
      window.location.href = '/'
    }
    return Promise.reject(error)
  },
)

export default api