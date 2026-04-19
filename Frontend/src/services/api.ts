import axios from 'axios'
import { store } from '@/store/store'
// import { logout } from '@/store/slices/authSlice'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL?.trim(),
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request Interceptor: Attach JWT ────────────────────────────────────────
api.interceptors.request.use(
  config => {
    let token = store.getState().auth.token;

    if (!token) {
      token = localStorage.getItem('pdf_gpt_token');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn("No token found in Redux or LocalStorage for request:", config.url);
    }
    return config;
  },
  error => Promise.reject(error),
)

// ─── Response Interceptor: Handle 401 ───────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        // localStorage.clear();
        // window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api