import api from './api'
import type { Chat, Message } from '@/store/slices/chatSlice'

export interface AskPayload  { question: string; chatId: string }
export interface AskResponse { answer: string }
export interface DeleteResponse { msg: string }

const chatService = {
  async getChatList(): Promise<Chat[]> {
    const res = await api.get<Chat[]>('/chat/list')
    return res.data
  },

  async getChatMessages(chatId: string): Promise<Message[]> {
    const res = await api.get<Message[]>(`/chat/${chatId}`)
    return res.data
  },

  async askQuestion(payload: AskPayload): Promise<AskResponse> {
    const res = await api.post<AskResponse>('/chat/ask', payload)
    return res.data
  },

  async deleteChat(chatId: string): Promise<DeleteResponse> {
    const res = await api.delete<DeleteResponse>(`/chat/${chatId}`)
    return res.data
  },
}

export default chatService