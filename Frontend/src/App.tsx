import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppSelector } from '@/store/hooks'
import Home         from '@/pages/Home'
import Login        from '@/pages/Login'
import Signup       from '@/pages/Signup'
import Profile      from '@/pages/Profile'
import Subscription from '@/pages/Subscription'

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAppSelector(s => s.auth)
  if (token) return <Navigate to="/" replace />
  return <>{children}</>
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAppSelector(s => s.auth)
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {/* Public */}
      <Route path="/login"  element={<PublicRoute><Login  /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />

      {/* Protected */}
      <Route path="/"             element={<ProtectedRoute><Home         /></ProtectedRoute>} />
      <Route path="/profile"      element={<ProtectedRoute><Profile      /></ProtectedRoute>} />
      <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>
)

export default App