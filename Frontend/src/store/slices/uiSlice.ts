import { createSlice } from '@reduxjs/toolkit'

interface UIState {
  darkMode:      boolean
  showAuthModal: boolean
  sidebarOpen:   boolean
}

const storedDark = localStorage.getItem('pdf_gpt_dark')

const initialState: UIState = {
  darkMode:      storedDark === 'true',
  showAuthModal: false,
  sidebarOpen:   true,
}

// Apply dark mode on load
if (storedDark === 'true') {
  document.documentElement.setAttribute('data-theme', 'dark')
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleTheme(state) {
      state.darkMode = !state.darkMode
      const theme = state.darkMode ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem('pdf_gpt_dark', String(state.darkMode))
    },

    openModal(state) {
      state.showAuthModal = true
    },

    closeModal(state) {
      state.showAuthModal = false
    },

    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },
  },
})

export const { toggleTheme, openModal, closeModal, toggleSidebar } = uiSlice.actions
export default uiSlice.reducer