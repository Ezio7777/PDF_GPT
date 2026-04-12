import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout } from '@/store/slices/authSlice'
import { toggleTheme, toggleSidebar, toggleSidebarCollapse } from '@/store/slices/uiSlice'
import { clearChat } from '@/store/slices/chatSlice'
import styles from './Header.module.scss'

const Header: React.FC = () => {
  const dispatch   = useAppDispatch()
  const navigate   = useNavigate()
  const { user }   = useAppSelector(s => s.auth)
  const { darkMode, sidebarCollapsed } = useAppSelector(s => s.ui)

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    dispatch(logout())
    dispatch(clearChat())
    setDropdownOpen(false)
    navigate('/login', { replace: true })
  }

  const handleSidebarToggle = () => {
    const isMobile = window.innerWidth < 768
    if (isMobile) dispatch(toggleSidebar())
    else dispatch(toggleSidebarCollapse())
  }

  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : user?.email
      ? user.email.slice(0, 2).toUpperCase()
      : 'SP'

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button
          className={styles.sidebarToggle}
          onClick={handleSidebarToggle}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6"  x2="21" y2="6"  />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <span className={styles.logoText}>PDF GPT</span>
          <span className={styles.logoBy}>by Sunit Pal</span>
        </div>
      </div>

      <div className={styles.right}>
        <button
          className={styles.themeBtn}
          onClick={() => dispatch(toggleTheme())}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1"  x2="12" y2="3"  />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22"   x2="5.64"  y2="5.64"   />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1"  y1="12" x2="3"  y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64"  y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"  />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        <div className={styles.avatarWrap} ref={dropdownRef}>
          <button
            className={styles.avatar}
            onClick={() => setDropdownOpen(p => !p)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            title={user?.email ?? 'Account'}
          >
            {initials}
          </button>

          {dropdownOpen && (
            <div className={`${styles.dropdown} fade-in`}>
              {user && (
                <div className={styles.dropdownUser}>
                  {user.name && <span className={styles.dropdownName}>{user.name}</span>}
                  <span className={styles.dropdownEmail}>{user.email}</span>
                </div>
              )}

              <button
                className={styles.dropdownItem}
                onClick={() => { navigate('/profile'); setDropdownOpen(false) }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile
              </button>

              <div className={styles.divider} />

              <button
                className={`${styles.dropdownItem} ${styles.danger}`}
                onClick={handleLogout}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header