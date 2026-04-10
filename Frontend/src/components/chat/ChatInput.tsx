import React, { useState, useRef, useEffect } from 'react'
import { useAppSelector } from '@/store/hooks'
import styles from './ChatInput.module.scss'

interface ChatInputProps {
  onSend:   (question: string) => Promise<void>
  disabled?: boolean
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [value,     setValue]     = useState('')
  const [sending,   setSending]   = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { loading } = useAppSelector(s => s.chat)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [value])

  const handleSend = async () => {
    const question = value.trim()
    if (!question || sending || loading || disabled) return

    setValue('')
    setSending(true)
    try {
      await onSend(question)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isDisabled = disabled || sending || loading

  return (
    <div className={styles.container}>
      <div className={`${styles.inputBox} ${isDisabled ? styles.disabled : ''}`}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your PDF…"
          rows={1}
          disabled={isDisabled}
          aria-label="Chat input"
        />

        <button
          className={`${styles.sendBtn} ${value.trim() ? styles.active : ''}`}
          onClick={handleSend}
          disabled={!value.trim() || isDisabled}
          aria-label="Send message"
          title="Send (Enter)"
        >
          {sending || loading ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: 'spin 0.7s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>

      <p className={styles.hint}>
        Press <kbd>Enter</kbd> to send · <kbd>Shift+Enter</kbd> for new line
      </p>
    </div>
  )
}

export default ChatInput