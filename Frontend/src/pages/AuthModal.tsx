import React, { useState, useEffect } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { loginSuccess } from '@/store/slices/authSlice'
import { closeModal } from '@/store/slices/uiSlice'
import authService from '@/services/authService'
import Modal from '@/components/common/Modal'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import styles from './AuthModal.module.scss'

type Tab = 'login' | 'signup'

interface AuthModalProps {
  isOpen: boolean
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen }) => {
  const dispatch = useAppDispatch()

  const [tab,      setTab]      = useState<Tab>('login')
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)
  const [toast,    setToast]    = useState<string | null>(null)

  // Auto-dismiss toast after 3s
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const reset = () => {
    setName('')
    setEmail('')
    setPassword('')
    setError(null)
    setSuccess(null)
    setLoading(false)
  }

  const switchTab = (t: Tab) => { setTab(t); reset() }

  // Close modal cleanly — no guest fallback
  const handleClose = () => {
    dispatch(closeModal())
    reset()
  }

  const validate = (): string | null => {
    if (tab === 'signup' && !name.trim()) return 'Full name is required.'
    if (!email.trim())                    return 'Email is required.'
    if (!/\S+@\S+\.\S+/.test(email))     return 'Enter a valid email.'
    if (!password)                        return 'Password is required.'
    if (password.length < 6)             return 'Password must be at least 6 characters.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const err = validate()
    if (err) { setError(err); return }

    setLoading(true)
    try {
      if (tab === 'login') {
        const res = await authService.login({ email, password })
        dispatch(loginSuccess({
          token: res.token,
          user: res.user
        }))
        dispatch(closeModal())
        reset()
      } else {
        await authService.signup({ name, email, password })
        setSuccess('Account created! Logging you in…')
        const res = await authService.login({ email, password })
        dispatch(loginSuccess({ token: res.token, user: { email, name } }))
        dispatch(closeModal())
        reset()
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string; msg?: string } } }
      setError(
        axiosErr?.response?.data?.detail ??
        axiosErr?.response?.data?.msg ??
        (tab === 'login' ? 'Invalid email or password.' : 'Signup failed. Try again.'),
      )
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = () => setToast('Google Sign-In coming soon!')

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} closable size="sm">
        <div className={styles.container}>

          {/* Brand */}
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <div>
              <h2 className={styles.brandName}>PDF GPT Creator</h2>
              <p className={styles.brandTagline}>by Sunit Pal — Chat with your documents</p>
            </div>
          </div>

          {/* Google SSO button */}
          <button className={styles.googleBtn} onClick={handleGoogle} type="button">
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className={styles.divider}><span>or</span></div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'login'  ? styles.activeTab : ''}`} onClick={() => switchTab('login')}>Log in</button>
            <button className={`${styles.tab} ${tab === 'signup' ? styles.activeTab : ''}`} onClick={() => switchTab('signup')}>Sign up</button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            {tab === 'signup' && (
              <Input
                label="Full name"
                type="text"
                placeholder="Sunit Pal"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={loading}
                autoComplete="name"
                leftIcon={
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                }
              />
            )}

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              leftIcon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              }
            />

            <Input
              label="Password"
              type="password"
              placeholder={tab === 'signup' ? 'At least 6 characters' : '••••••••'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              leftIcon={
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              }
            />

            {error && (
              <div className={styles.errorBanner}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            )}

            {success && (
              <div className={styles.successBanner}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {success}
              </div>
            )}

            <Button type="submit" variant="primary" size="md" fullWidth loading={loading}>
              {tab === 'login' ? 'Log in' : 'Create account'}
            </Button>
          </form>

          {/*
            Guest mode commented out per requirements:
            <Button variant="secondary" fullWidth onClick={handleGuest}>Continue as Guest</Button>
          */}
        </div>
      </Modal>

      {/* Toast notification */}
      {toast && (
        <div className={`${styles.toast} fade-in`}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8"  x2="12"   y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {toast}
        </div>
      )}
    </>
  )
}

export default AuthModal