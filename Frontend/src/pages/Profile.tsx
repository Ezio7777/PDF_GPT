import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout, updateUserName } from '@/store/slices/authSlice'
import { clearChat } from '@/store/slices/chatSlice'
import authService from '@/services/authService'
import Button from '@/components/common/Button'
import styles from './Profile.module.scss'
import ProfileLayout from '@/components/layout/ProfileLayout'

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info'
interface ToastProps { message: string; type: ToastType }

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

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  title:     string
  message:   string
  onConfirm: () => void
  onCancel:  () => void
  danger?:   boolean
  loading?:  boolean
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title, message, onConfirm, onCancel, danger, loading,
}) => (
  <div className={styles.dialogBackdrop} onClick={e => e.target === e.currentTarget && onCancel()}>
    <div className={`${styles.dialog} bounce-in`}>
      <div className={`${styles.dialogIcon} ${danger ? styles.dialogIconDanger : ''}`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8"  x2="12"   y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className={styles.dialogTitle}>{title}</h3>
      <p className={styles.dialogMessage}>{message}</p>
      <div className={styles.dialogActions}>
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={onConfirm} loading={loading}>
          Confirm
        </Button>
      </div>
    </div>
  </div>
)

// ─── Reset Password Modal ─────────────────────────────────────────────────────
interface ResetPasswordModalProps {
  onClose:   () => void
  onSuccess: () => void
  showToast: (msg: string, type: ToastType) => void
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ onClose, onSuccess, showToast }) => {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNew,  setConfirmNew]  = useState('')
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!oldPassword)          { setError('Current password is required.'); return }
    if (!newPassword)          { setError('New password is required.'); return }
    if (newPassword.length < 6){ setError('New password must be at least 6 characters.'); return }
    if (newPassword !== confirmNew) { setError('New passwords do not match.'); return }
    if (oldPassword === newPassword){ setError('New password must differ from current.'); return }

    setLoading(true)
    try {
      await authService.resetPassword({ oldPassword, newPassword })
      showToast('Password updated successfully!', 'success')
      onSuccess()
      onClose()
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string; msg?: string } } }
      setError(
        axiosErr?.response?.data?.detail ??
        axiosErr?.response?.data?.msg ??
        'Failed to reset password. Check your current password.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.dialogBackdrop} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`${styles.dialog} ${styles.dialogWide} bounce-in`}>
        <div className={styles.dialogHeader}>
          <h3 className={styles.dialogTitle}>Reset password</h3>
          <button className={styles.dialogCloseBtn} onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.passwordForm} noValidate>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Current password</label>
            <div className={styles.formInputWrap}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.formIcon}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type="password"
                className={styles.formInput}
                placeholder="Enter current password"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>New password</label>
            <div className={styles.formInputWrap}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.formIcon}>
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input
                type="password"
                className={styles.formInput}
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Confirm new password</label>
            <div className={styles.formInputWrap}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.formIcon}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <input
                type="password"
                className={styles.formInput}
                placeholder="Re-enter new password"
                value={confirmNew}
                onChange={e => setConfirmNew(e.target.value)}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
          </div>

          {error && (
            <div className={styles.formError}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              {error}
            </div>
          )}

          <div className={styles.dialogActions}>
            <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button variant="primary" size="sm" type="submit" loading={loading}>Update password</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Profile Page ─────────────────────────────────────────────────────────────
const Profile: React.FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user } = useAppSelector(s => s.auth)

  const [isEditingName, setIsEditingName] = useState(false)
  const [nameValue,      setNameValue]     = useState(user?.name ?? '')
  const [nameSaving,    setNameSaving]    = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // FIX 2: Added 'logout' to dialog state
  const [dialog,          setDialog]          = useState<null | 'delete' | 'logout'>(null)
  const [showResetModal, setShowResetModal]  = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)

  const [toast, setToast] = useState<null | { message: string; type: ToastType }>(null)

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    if (isEditingName) nameInputRef.current?.focus()
  }, [isEditingName])

  const handleStartEditName = () => {
    setNameValue(user?.name ?? '')
    setIsEditingName(true)
  }

  const handleCancelEditName = () => {
    setIsEditingName(false)
    setNameValue(user?.name ?? '')
  }

  const handleSaveName = async () => {
    const trimmed = nameValue.trim()
    if (!trimmed)             { showToast('Name cannot be empty.', 'error'); return }
    if (trimmed === user?.name) { setIsEditingName(false); return }

    setNameSaving(true)
    try {
      await authService.updateName({ name: trimmed })
      dispatch(updateUserName(trimmed))
      setIsEditingName(false)
      showToast('Name updated successfully!', 'success')
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      showToast(axiosErr?.response?.data?.detail ?? 'Failed to update name.', 'error')
    } finally {
      setNameSaving(false)
    }
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  handleSaveName()
    if (e.key === 'Escape') handleCancelEditName()
  }

  const handleDeleteAccount = async () => {
    setDeletingAccount(true)
    try {
      await authService.deleteAccount()
    } catch { /* ignore */ } finally {
      setDeletingAccount(false)
      setDialog(null)
      dispatch(logout())
      dispatch(clearChat())
      navigate('/login', { replace: true })
    }
  }

  const handleSignOut = () => {
    dispatch(logout())
    dispatch(clearChat())
    navigate('/login', { replace: true })
  }

  const displayName = user?.name ?? 'User'
  const initials    = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <ProfileLayout>
      <div className={styles.page}>
        <div className={styles.card}>

          <button className={styles.backBtn} onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>

          <div className={styles.avatarSection}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.identity}>
              <div className={styles.nameRow}>
                {isEditingName ? (
                  <div className={styles.nameEditWrap}>
                    <input
                      ref={nameInputRef}
                      className={styles.nameInput}
                      value={nameValue}
                      onChange={e => setNameValue(e.target.value)}
                      onKeyDown={handleNameKeyDown}
                      disabled={nameSaving}
                      maxLength={60}
                      aria-label="Edit name"
                    />
                    <button className={styles.nameSaveBtn} onClick={handleSaveName} disabled={nameSaving} title="Save">
                      {nameSaving ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 0.7s linear infinite' }}>
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      ) : (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                    <button className={styles.nameCancelBtn} onClick={handleCancelEditName} disabled={nameSaving} title="Cancel">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className={styles.name}>{displayName}</h1>
                    <button className={styles.nameEditBtn} onClick={handleStartEditName} aria-label="Edit name" title="Edit name">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
              <p className={styles.email}>{user?.email ?? '—'}</p>
              <span className={styles.badge}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="12" r="10" />
                </svg>
                Active
              </span>
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoCard}>
              <span className={styles.infoLabel}>Full name</span>
              <span className={styles.infoValue}>{displayName}</span>
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
              <span className={styles.infoValue}>
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>

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
                  <p className={styles.actionDesc}>Change your current account password</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setShowResetModal(true)}>
                Change
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
                  <p className={styles.actionDesc}>Permanently remove your account and all data</p>
                </div>
              </div>
              <Button variant="danger" size="sm" onClick={() => setDialog('delete')}>
                Delete
              </Button>
            </div>
          </div>

          <div className={styles.planSection}>
            <h2 className={styles.sectionTitle}>Plan</h2>
            <div className={styles.planCard} onClick={() => navigate('/subscription')}>
              <div className={styles.planInfo}>
                <div className={styles.planIcon}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div>
                  <p className={styles.planTitle}>Subscription</p>
                  <p className={styles.planDesc}>View and manage your current plan</p>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Connect with us</h2>
            <div className={styles.connectGrid}>
              <a href="mailto:sunitpal@example.com" className={styles.connectCard} target="_blank" rel="noopener noreferrer">
                <div className={`${styles.connectIcon} ${styles.emailIcon}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <div className={styles.connectInfo}>
                  <span className={styles.connectLabel}>Email</span>
                  <span className={styles.connectSub}>Contact us</span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.connectArrow}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </a>

              <a href="https://github.com/sunitpal" className={styles.connectCard} target="_blank" rel="noopener noreferrer">
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
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </a>

              <a href="https://linkedin.com/in/sunitpal" className={styles.connectCard} target="_blank" rel="noopener noreferrer">
                <div className={`${styles.connectIcon} ${styles.linkedinIcon}`}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </div>
                <div className={styles.connectInfo}>
                  <span className={styles.connectLabel}>LinkedIn</span>
                  <span className={styles.connectSub}>Sunit Pal</span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.connectArrow}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </a>
            </div>
          </div>

          <div className={styles.signOutContainer}>
            {/* FIX 2: Entire card triggers the logout confirmation dialog */}
            <div className={styles.signOutCard} onClick={() => setDialog('logout')}>
              <button className={styles.signOutBtn}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </div>
          </div>

        </div>
      </div>

      {showResetModal && (
        <ResetPasswordModal
          onClose={() => setShowResetModal(false)}
          onSuccess={() => {}}
          showToast={showToast}
        />
      )}

      {dialog === 'delete' && (
        <ConfirmDialog
          title="Delete account"
          message="This will permanently delete your account and all your chats. This cannot be undone."
          onConfirm={handleDeleteAccount}
          onCancel={() => setDialog(null)}
          danger
          loading={deletingAccount}
        />
      )}

      {/* FIX 2: Logout confirmation modal */}
      {dialog === 'logout' && (
        <ConfirmDialog
          title="Sign out"
          message="Are you sure you want to sign out of your account?"
          onConfirm={handleSignOut}
          onCancel={() => setDialog(null)}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} />}
    </ProfileLayout>
  )
}

export default Profile