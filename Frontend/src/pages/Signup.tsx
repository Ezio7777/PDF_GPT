import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/store/hooks'
import { loginSuccess } from '@/store/slices/authSlice'
import authService from '@/services/authService'
import Input from '@/components/common/Input'
import Button from '@/components/common/Button'
import styles from './Login.module.scss'

const Signup: React.FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [loading,  setLoading]  = useState(false)

  const validate = (): string | null => {
    if (!email.trim())                    return 'Email is required.'
    if (!/\S+@\S+\.\S+/.test(email))     return 'Enter a valid email address.'
    if (!password)                        return 'Password is required.'
    if (password.length < 6)             return 'Password must be at least 6 characters.'
    if (password !== confirm)            return 'Passwords do not match.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const err = validate()
    if (err) { setError(err); return }

    setLoading(true)
    try {
      await authService.signup({ email, password })
      // Auto-login after successful signup
      const res = await authService.login({ email, password })
      dispatch(loginSuccess({ token: res.token, user: { email } }))
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string; msg?: string } } }
      setError(
        axiosErr?.response?.data?.detail ??
        axiosErr?.response?.data?.msg ??
        'Signup failed. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <h1 className={styles.logoText}>PDF GPT</h1>
        </div>

        <h2 className={styles.heading}>Create your account</h2>
        <p className={styles.subheading}>Start chatting with your documents today</p>

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
            placeholder="At least 6 characters"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
            leftIcon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            }
          />

          <Input
            label="Confirm password"
            type="password"
            placeholder="Re-enter your password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            disabled={loading}
            autoComplete="new-password"
            leftIcon={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            }
          />

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

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
          >
            Create account
          </Button>
        </form>

        <p className={styles.switchText}>
          Already have an account?{' '}
          <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  )
}

export default Signup