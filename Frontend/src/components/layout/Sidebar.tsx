import React, { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCurrentChat, removeChat, setMessages } from '@/store/slices/chatSlice'
import chatService from '@/services/chatService'
import styles from './Sidebar.module.scss'

const Sidebar: React.FC = () => {
  const dispatch = useAppDispatch()
  const { chats, currentChatId, loading } = useAppSelector(s => s.chat)
  const { sidebarOpen } = useAppSelector(s => s.ui)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleSelectChat = async (chatId: string) => {
    if (chatId === currentChatId || loading) return
    dispatch(setCurrentChat(chatId))
    try {
      const msgs = await chatService.getChatMessages(chatId)
      dispatch(setMessages(msgs))
    } catch {
      // Errors handled by interceptor
    }
  }

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation()
    if (deletingId) return
    setDeletingId(chatId)
    try {
      await chatService.deleteChat(chatId)
      dispatch(removeChat(chatId))
    } catch {
      // silently fail — interceptor handles 401
    } finally {
      setDeletingId(null)
    }
  }

  const handleNewChat = () => {
    dispatch(setCurrentChat(null))
    dispatch(setMessages([]))
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const days = Math.floor(diff / 86400000)

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7)  return `${days}d ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (!sidebarOpen) return null

  return (
    <aside className={styles.sidebar}>
      {/* New chat button */}
      <div className={styles.top}>
        <button className={styles.newChat} onClick={handleNewChat}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Chat
        </button>
      </div>

      {/* Chat list */}
      <div className={styles.list}>
        {chats.length === 0 ? (
          <div className={styles.empty}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p>No chats yet</p>
            <span>Upload a PDF to start</span>
          </div>
        ) : (
          <>
            <p className={styles.sectionLabel}>Recent</p>
            {chats.map(chat => (
              <div
                key={chat.chatId}
                className={`${styles.chatItem} ${chat.chatId === currentChatId ? styles.active : ''}`}
                onClick={() => handleSelectChat(chat.chatId)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && handleSelectChat(chat.chatId)}
              >
                <div className={styles.chatIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>

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
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 0.7s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4h6v2" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.footerBranding}>
          <span>PDF GPT Creator</span>
          <span>v1.0</span>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar