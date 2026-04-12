import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCurrentChat, removeChat, setMessages } from '@/store/slices/chatSlice'
import { closeSidebar } from '@/store/slices/uiSlice'
import chatService from '@/services/chatService'
import styles from './Sidebar.module.scss'

const Sidebar: React.FC = () => {
  const dispatch  = useAppDispatch()
  const navigate  = useNavigate()
  const { chats, currentChatId, loading } = useAppSelector(s => s.chat)
  const { sidebarOpen, sidebarCollapsed } = useAppSelector(s => s.ui)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleSelectChat = async (chatId: string) => {
    if (chatId === currentChatId || loading) return
    dispatch(setCurrentChat(chatId))
    dispatch(closeSidebar())           // close on mobile after selecting
    try {
      const msgs = await chatService.getChatMessages(chatId)
      dispatch(setMessages(msgs))
    } catch { /* interceptor handles 401 */ }
  }

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation()
    if (deletingId) return
    setDeletingId(chatId)
    try {
      await chatService.deleteChat(chatId)
      dispatch(removeChat(chatId))
    } catch { /* silently fail */ } finally {
      setDeletingId(null)
    }
  }

  const handleNewChat = () => {
    dispatch(setCurrentChat(null))
    dispatch(setMessages([]))
    dispatch(closeSidebar())
  }

  const formatDate = (iso: string) => {
    const d    = new Date(iso)
    const diff = Date.now() - d.getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7)  return `${days}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Sidebar is always in DOM — CSS drives the collapsed/open state
  const sidebarClass = [
    styles.sidebar,
    sidebarCollapsed ? styles.collapsed : '',
    sidebarOpen      ? styles.mobileOpen : '',
  ].filter(Boolean).join(' ')

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className={styles.backdrop}
          onClick={() => dispatch(closeSidebar())}
          aria-hidden="true"
        />
      )}

      <aside className={sidebarClass}>
        {/* New chat */}
        <div className={styles.top}>
          <button
            className={styles.newChat}
            onClick={handleNewChat}
            title="New Chat"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5"  y1="12" x2="19" y2="12" />
            </svg>
            {!sidebarCollapsed && <span>New Chat</span>}
          </button>
        </div>

        {/* Chat list */}
        <div className={styles.list}>
          {chats.length === 0 ? (
            !sidebarCollapsed && (
              <div className={styles.empty}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p>No chats yet</p>
                <span>Upload a PDF to start</span>
              </div>
            )
          ) : (
            <>
              {!sidebarCollapsed && <p className={styles.sectionLabel}>Recent</p>}
              {chats.map(chat => (
                <div
                  key={chat.chatId}
                  className={`${styles.chatItem} ${chat.chatId === currentChatId ? styles.active : ''}`}
                  onClick={() => handleSelectChat(chat.chatId)}
                  role="button"
                  tabIndex={0}
                  title={sidebarCollapsed ? chat.title : undefined}
                  onKeyDown={e => e.key === 'Enter' && handleSelectChat(chat.chatId)}
                >
                  <div className={styles.chatIcon}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>

                  {!sidebarCollapsed && (
                    <>
                      <div className={styles.chatInfo}>
                        <span className={styles.chatTitle}>{chat.title}</span>
                        <span className={styles.chatDate}>{formatDate(chat.createdAt)}</span>
                      </div>
                      <button
                        className={styles.deleteBtn}
                        onClick={e => handleDelete(e, chat.chatId)}
                        aria-label="Delete chat"
                        title="Delete"
                        disabled={deletingId === chat.chatId}
                      >
                        {deletingId === chat.chatId ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.spin}>
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6M9 6V4h6v2" />
                          </svg>
                        )}
                      </button>
                    </>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer — Settings */}
        <div className={styles.footer}>
          <button
            className={styles.settingsBtn}
            onClick={() => navigate('/profile')}
            title="Settings / Profile"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            {!sidebarCollapsed && <span>Settings</span>}
          </button>

          {!sidebarCollapsed && (
            <div className={styles.footerBranding}>
              <span>PDF GPT</span>
              <span>v1.0</span>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}

export default Sidebar