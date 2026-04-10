import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

export interface Chat {
  chatId:    string
  title:     string
  createdAt: string
}

export interface Message {
  role:      'user' | 'ai'
  content:   string
  timestamp: string
}

interface ChatState {
  chats:         Chat[]
  currentChatId: string | null
  messages:      Message[]
  loading:       boolean
}

const initialState: ChatState = {
  chats:         [],
  currentChatId: null,
  messages:      [],
  loading:       false,
}

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setChats(state, action: PayloadAction<Chat[]>) {
      state.chats = action.payload
    },

    setMessages(state, action: PayloadAction<Message[]>) {
      state.messages = action.payload
    },

    setCurrentChat(state, action: PayloadAction<string | null>) {
      state.currentChatId = action.payload
      if (action.payload === null) state.messages = []
    },

    addMessage(state, action: PayloadAction<Message>) {
      state.messages.push(action.payload)
    },

    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },

    removeChat(state, action: PayloadAction<string>) {
      state.chats = state.chats.filter(c => c.chatId !== action.payload)
      if (state.currentChatId === action.payload) {
        state.currentChatId = null
        state.messages      = []
      }
    },

    prependChat(state, action: PayloadAction<Chat>) {
      state.chats.unshift(action.payload)
    },

    clearChat(state) {
      state.chats         = []
      state.currentChatId = null
      state.messages      = []
      state.loading       = false
    },
  },
})

export const {
  setChats,
  setMessages,
  setCurrentChat,
  addMessage,
  setLoading,
  removeChat,
  prependChat,
  clearChat,
} = chatSlice.actions

export default chatSlice.reducer