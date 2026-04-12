import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import Home    from '@/pages/Home'
import Login   from '@/pages/Login'
import Signup  from '@/pages/Signup'
import Profile from '@/pages/Profile'

// ─── Protected Route: requires real login (not guest) ─────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAppSelector(s => s.auth)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ─── Public Route: redirect away if already logged in ─────────────────────────
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAppSelector(s => s.auth)
  if (token) return <Navigate to="/" replace />
  return <>{children}</>
}

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public auth pages */}
        <Route path="/login"  element={<PublicRoute><Login  /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

        {/* Protected pages */}
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Main app — Home handles auth modal for unauthenticated visitors */}
        <Route path="/" element={<Home />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App