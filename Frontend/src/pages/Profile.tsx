import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout } from '@/store/slices/authSlice'
import { clearChat } from '@/store/slices/chatSlice'
import Layout from '@/components/layout/Layout'
import Button from '@/components/common/Button'
import styles from './Profile.module.scss'

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  message:   string
  onConfirm: () => void
  onCancel:  () => void
  danger?:   boolean
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ message, onConfirm, onCancel, danger }) => (
  <div className={styles.dialogBackdrop}>
    <div className={`${styles.dialog} bounce-in`}>
      <div className={styles.dialogIcon}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8"  x2="12"   y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <p className={styles.dialogMessage}>{message}</p>
      <div className={styles.dialogActions}>
        <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm}>Confirm</Button>
      </div>
    </div>
  </div>
)

// ─── Toast ────────────────────────────────────────────────────────────────────
interface ToastProps { message: string; type: 'success' | 'info' | 'error' }
const Toast: React.FC<ToastProps> = ({ message, type }) => (
  <div className={`${styles.toast} ${styles[`toast_${type}`]} fade-in`}>
    {type === 'success' && (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )}
    {type === 'error' && (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    )}
    {type === 'info' && (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    )}
    {message}
  </div>
)

// ─── Profile Page ─────────────────────────────────────────────────────────────
const Profile: React.FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user } = useAppSelector(s => s.auth)

  const [dialog, setDialog]   = useState<null | 'reset' | 'delete'>(null)
  const [toast,  setToast]    = useState<null | { message: string; type: 'success' | 'info' | 'error' }>(null)

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleResetPassword = () => {
    setDialog(null)
    // TODO: integrate real reset-password API
    showToast('Password reset link sent to your email.', 'success')
  }

  const handleDeleteAccount = () => {
    setDialog(null)
    // TODO: integrate real delete-account API
    dispatch(logout())
    dispatch(clearChat())
    navigate('/login', { replace: true })
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? 'SP'

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.card}>

          {/* ── Back button ── */}
          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>

          {/* ── Avatar + identity ── */}
          <div className={styles.avatarSection}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.identity}>
              <h1 className={styles.name}>{user?.name ?? 'User'}</h1>
              <p className={styles.email}>{user?.email ?? '—'}</p>
              <span className={styles.badge}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Active
              </span>
            </div>
          </div>

          {/* ── Info cards ── */}
          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <span className={styles.infoLabel}>Full name</span>
              <span className={styles.infoValue}>{user?.name ?? '—'}</span>
            </div>
            <div className={styles.infoCard}>
              <span className={styles.infoLabel}>Email address</span>
              <span className={styles.infoValue}>{user?.email ?? '—'}</span>
            </div>
            <div className={styles.infoCard}>
              <span className={styles.infoLabel}>Account type</span>
              <span className={styles.infoValue}>Standard</span>
            </div>
            <div className={styles.infoCard}>
              <span className={styles.infoLabel}>Member since</span>
              <span className={styles.infoValue}>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>

          {/* ── Account actions ── */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Account</h2>

            <div className={styles.actionCard}>
              <div className={styles.actionInfo}>
                <div className={styles.actionIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <p className={styles.actionTitle}>Reset password</p>
                  <p className={styles.actionDesc}>We'll send a reset link to your email</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setDialog('reset')}>
                Reset
              </Button>
            </div>

            <div className={`${styles.actionCard} ${styles.dangerCard}`}>
              <div className={styles.actionInfo}>
                <div className={`${styles.actionIcon} ${styles.dangerIcon}`}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                  </svg>
                </div>
                <div>
                  <p className={styles.actionTitle}>Delete account</p>
                  <p className={styles.actionDesc}>Permanently remove all your data</p>
                </div>
              </div>
              <Button variant="danger" size="sm" onClick={() => setDialog('delete')}>
                Delete
              </Button>
            </div>
          </div>

          {/* ── Connect with us ── */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Connect with us</h2>
            <div className={styles.connectGrid}>

              {/* Email */}
              <a
                href="mailto:sunitpal@example.com"
                className={styles.connectCard}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className={`${styles.connectIcon} ${styles.emailIcon}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div className={styles.connectInfo}>
                  <span className={styles.connectLabel}>Email us</span>
                  <span className={styles.connectSub}>sunitpal@example.com</span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.connectArrow}>
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>

              {/* GitHub */}
              <a
                href="https://github.com/sunitpal"
                className={styles.connectCard}
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className={`${styles.connectIcon} ${styles.githubIcon}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                </div>
                <div className={styles.connectInfo}>
                  <span className={styles.connectLabel}>GitHub</span>
                  <span className={styles.connectSub}>@sunitpal</span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.connectArrow}>
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </a>

            </div>
          </div>

          {/* ── Sign out ── */}
          <div className={styles.signOutRow}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                dispatch(logout())
                dispatch(clearChat())
                navigate('/login', { replace: true })
              }}
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              }
            >
              Sign out
            </Button>
          </div>

        </div>
      </div>

      {/* ── Confirm dialogs ── */}
      {dialog === 'reset' && (
        <ConfirmDialog
          message="Send a password reset link to your registered email address?"
          onConfirm={handleResetPassword}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'delete' && (
        <ConfirmDialog
          message="This will permanently delete your account and all chats. This action cannot be undone."
          onConfirm={handleDeleteAccount}
          onCancel={() => setDialog(null)}
          danger
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </Layout>
  )
}

export default Profile