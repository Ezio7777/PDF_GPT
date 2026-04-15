import api from './api'

export interface LoginPayload    { email: string; password: string }
export interface SignupPayload   { email: string; password: string; name: string }
export interface LoginResponse {
  token: string
  user: {
    email: string
    name?: string
  }
}
export interface SignupResponse  { msg: string }
export interface UpdateNamePayload { name: string }
export interface ResetPasswordPayload { oldPassword: string; newPassword: string }
export interface GenericResponse { msg: string }

const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const res = await api.post<LoginResponse>('/auth/login', payload)
    return res.data
  },

  async signup(payload: SignupPayload): Promise<SignupResponse> {
    const res = await api.post<SignupResponse>('/auth/signup', payload)
    return res.data
  },

  // PUT /auth/update-name  — Bearer token in header (handled by interceptor)
  async updateName(payload: UpdateNamePayload): Promise<GenericResponse> {
    const res = await api.put<GenericResponse>('/auth/update-name', payload)
    return res.data
  },

  // PUT /auth/reset-password
  async resetPassword(payload: ResetPasswordPayload): Promise<GenericResponse> {
    const res = await api.put<GenericResponse>('/auth/reset-password', payload)
    return res.data
  },

  // DELETE /auth/delete-account
  async deleteAccount(): Promise<GenericResponse> {
    const res = await api.delete<GenericResponse>('/auth/delete-account')
    return res.data
  },
}

export default authService