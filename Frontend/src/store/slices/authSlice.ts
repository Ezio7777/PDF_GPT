import { createSlice} from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface User {
  email: string
  name?: string
}

interface AuthState {
  token:   string | null
  user:    User | null
  isGuest: boolean
}

const storedToken = localStorage.getItem('pdf_gpt_token')
const storedUser  = localStorage.getItem('pdf_gpt_user')

const initialState: AuthState = {
  token:   storedToken ?? null,
  user:    storedUser ? (JSON.parse(storedUser) as User) : null,
  isGuest: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action: PayloadAction<{ token: string; user: User }>) {
      state.token   = action.payload.token
      state.user    = action.payload.user
      state.isGuest = false
      localStorage.setItem('pdf_gpt_token', action.payload.token)
      localStorage.setItem('pdf_gpt_user',  JSON.stringify(action.payload.user))
    },

    // continueAsGuest kept for type-safety but UI removed per requirements
    continueAsGuest(state) {
      state.token   = null
      state.user    = null
      state.isGuest = true
    },

    logout(state) {
      // Clear all auth state
      state.token   = null
      state.user    = null
      state.isGuest = false
      // Clear localStorage completely
      localStorage.removeItem('pdf_gpt_token')
      localStorage.removeItem('pdf_gpt_user')
    },

    // Sync name change to Redux + localStorage after successful API call
    updateUserName(state, action: PayloadAction<string>) {
      if (state.user) {
        state.user.name = action.payload
        localStorage.setItem('pdf_gpt_user', JSON.stringify(state.user))
      }
    },
  },
})

export const { loginSuccess, continueAsGuest, logout, updateUserName } = authSlice.actions
export default authSlice.reducer