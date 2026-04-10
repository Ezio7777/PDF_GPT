import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import Home   from '@/pages/Home'
import Login  from '@/pages/Login'
import Signup from '@/pages/Signup'

// ─── Protected Route ──────────────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, isGuest } = useAppSelector(s => s.auth)
  if (!token && !isGuest) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ─── Public Route (redirect to / if already logged in) ────────────────────────
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
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />

        {/* Main app — Home handles auth modal internally for guests/unauthenticated */}
        <Route path="/" element={<Home />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App