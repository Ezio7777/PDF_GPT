import React, { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { addMessage, setLoading } from '@/store/slices/chatSlice'
import chatService from '@/services/chatService'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
// import Loader from '@/components/common/Loader'
import styles from './ChatBox.module.scss'

const TypingIndicator: React.FC = () => (
  <div className={styles.typingRow}>
    <div className={styles.aiAvatarSmall}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    </div>
    <div className={styles.typingBubble}>
      <span className={styles.dot} />
      <span className={styles.dot} />
      <span className={styles.dot} />
    </div>
  </div>
)

const ChatBox: React.FC = () => {
  const dispatch = useAppDispatch()
  const { messages, currentChatId, loading } = useAppSelector(s => s.chat)
  const { token, isGuest } = useAppSelector(s => s.auth)

  const bottomRef = useRef<HTMLDivElement>(null)

  // Smooth scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async (question: string) => {
    if (!currentChatId) return

    const userMsg = {
      role:      'user' as const,
      content:   question,
      timestamp: new Date().toISOString(),
    }
    dispatch(addMessage(userMsg))
    dispatch(setLoading(true))

    try {
      const res = await chatService.askQuestion({ question, chatId: currentChatId })

      const aiMsg = {
        role:      'ai' as const,
        content:   res.answer,
        timestamp: new Date().toISOString(),
      }
      dispatch(addMessage(aiMsg))
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      const errMsg = axiosErr?.response?.data?.detail ?? 'Something went wrong. Please try again.'
      dispatch(addMessage({
        role:      'ai',
        content:   `⚠️ ${errMsg}`,
        timestamp: new Date().toISOString(),
      }))
    } finally {
      dispatch(setLoading(false))
    }
  }

  const isReadOnly = !token && !isGuest

  return (
    <div className={styles.container}>
      {/* Messages area */}
      <div className={styles.messages}>
        {messages.length === 0 ? (
          <div className={styles.emptyChat}>
            <div className={styles.emptyChatIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h3>Chat opened</h3>
            <p>Ask any question about your PDF document below.</p>
          </div>
        ) : (
          <div className={styles.messageList}>
            {messages.map((msg, idx) => (
              <MessageBubble key={idx} message={msg} />
            ))}
          </div>
        )}

        {/* AI Typing indicator */}
        {loading && <TypingIndicator />}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      {isReadOnly ? (
        <div className={styles.guestNotice}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Please log in to ask questions.
        </div>
      ) : (
        <ChatInput onSend={handleSend} disabled={!currentChatId || loading} />
      )}
    </div>
  )
}

export default ChatBox