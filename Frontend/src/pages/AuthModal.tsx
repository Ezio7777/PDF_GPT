import React, { useState } from 'react'
import { useAppDispatch } from '@/store/hooks'
import { loginSuccess, continueAsGuest } from '@/store/slices/authSlice'
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
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)

  const reset = () => {
    setEmail('')
    setPassword('')
    setError(null)
    setSuccess(null)
    setLoading(false)
  }

  const switchTab = (t: Tab) => {
    setTab(t)
    reset()
  }

  const validate = (): string | null => {
    if (!email.trim())           return 'Email is required.'
    if (!/\S+@\S+\.\S+/.test(email)) return 'Enter a valid email.'
    if (!password)               return 'Password is required.'
    if (password.length < 6)    return 'Password must be at least 6 characters.'
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
        dispatch(loginSuccess({ token: res.token, user: { email } }))
        dispatch(closeModal())
        reset()
      } else {
        await authService.signup({ email, password })
        setSuccess('Account created! Logging you in…')

        // Auto-login after signup
        const res = await authService.login({ email, password })
        dispatch(loginSuccess({ token: res.token, user: { email } }))
        dispatch(closeModal())
        reset()
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string; msg?: string } } }
      const msg =
        axiosErr?.response?.data?.detail ??
        axiosErr?.response?.data?.msg ??
        (tab === 'login' ? 'Invalid email or password.' : 'Signup failed. Try again.')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = () => {
    dispatch(continueAsGuest())
    dispatch(closeModal())
    reset()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleGuest}   // closing = guest mode
      closable
      size="sm"
    >
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

        {/* Tab switcher */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'login'  ? styles.activeTab : ''}`}
            onClick={() => switchTab('login')}
          >
            Log in
          </button>
          <button
            className={`${styles.tab} ${tab === 'signup' ? styles.activeTab : ''}`}
            onClick={() => switchTab('signup')}
          >
            Sign up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form} noValidate>
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

          {/* Error / success */}
          {error && (
            <div className={styles.errorBanner}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
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

          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            loading={loading}
          >
            {tab === 'login' ? 'Log in' : 'Create account'}
          </Button>
        </form>

        {/* Divider */}
        <div className={styles.divider}>
          <span>or</span>
        </div>

        {/* Guest */}
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={handleGuest}
          icon={
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
        >
          Continue as Guest
        </Button>

        <p className={styles.guestNote}>
          Guests can browse chats but cannot upload PDFs or ask questions.
        </p>
      </div>
    </Modal>
  )
}

export default AuthModal