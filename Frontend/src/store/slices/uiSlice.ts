import { createSlice } from '@reduxjs/toolkit'

interface UIState {
  darkMode:         boolean
  showAuthModal:    boolean
  sidebarOpen:      boolean   // mobile: drawer visible
  sidebarCollapsed: boolean   // desktop: icon-only mode
}

const storedDark      = localStorage.getItem('pdf_gpt_dark')
const storedCollapsed = localStorage.getItem('pdf_gpt_sidebar_collapsed')

const initialState: UIState = {
  darkMode:         storedDark === 'true',
  showAuthModal:    false,
  sidebarOpen:      false,           // mobile drawer starts closed
  sidebarCollapsed: storedCollapsed === 'true',
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

    // Mobile: toggle overlay drawer
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen
    },

    closeSidebar(state) {
      state.sidebarOpen = false
    },

    // Desktop: toggle icon-only collapse
    toggleSidebarCollapse(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed
      localStorage.setItem('pdf_gpt_sidebar_collapsed', String(state.sidebarCollapsed))
    },
  },
})

export const {
  toggleTheme,
  openModal,
  closeModal,
  toggleSidebar,
  closeSidebar,
  toggleSidebarCollapse,
} = uiSlice.actions
export default uiSlice.reducer