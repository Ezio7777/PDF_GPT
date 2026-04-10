import api from './api'

export interface LoginPayload   { email: string; password: string }
export interface SignupPayload  { email: string; password: string }
export interface LoginResponse  { token: string }
export interface SignupResponse { msg: string }

const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/auth/login', payload)
    return res.data
  },

  async signup(payload: SignupPayload): Promise<SignupResponse> {
    const res = await api.post<SignupResponse>('/auth/signup', payload)
    return res.data
  },
}

export default authService