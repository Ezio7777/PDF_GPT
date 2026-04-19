import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from '@/store/store'
import App from './App'
import '@/styles/global.scss'


const setAppHeight = () => {
  document.documentElement.style.setProperty(
    '--app-height',
    `${window.innerHeight}px`
  )
}

setAppHeight()
window.addEventListener('resize', setAppHeight)
// Re-run on orientation change (iOS needs this separately)
window.addEventListener('orientationchange', () => {
  setTimeout(setAppHeight, 100)
})
// ─────────────────────────────────────────────────────────────────────────────

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
)