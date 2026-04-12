import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '@/store/slices/chatSlice'
import styles from './MessageBubble.module.scss'

interface MessageBubbleProps {
  message: Message
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard not available */ }
  }

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } catch { return '' }
  }

  return (
    <div className={`${styles.row} ${isUser ? styles.userRow : styles.aiRow} fade-in`}>

      {/* AI Avatar */}
      {!isUser && (
        <div className={styles.aiAvatar}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
      )}

      <div className={styles.bubbleWrap}>
        <span className={styles.roleLabel}>{isUser ? 'You' : 'PDF GPT'}</span>

        <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.aiBubble}`}>
          {isUser ? (
            // User messages: plain text, preserve line breaks
            <p className={styles.userContent}>{message.content}</p>
          ) : (
            // AI messages: full Markdown rendering
            <div className={styles.markdownBody}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Code blocks
                  code({ className, children, ...props }) {
                    const isBlock = className?.startsWith('language-')
                    return isBlock ? (
                      <pre className={styles.codeBlock}>
                        <code className={className} {...props}>{children}</code>
                      </pre>
                    ) : (
                      <code className={styles.inlineCode} {...props}>{children}</code>
                    )
                  },
                  // Links open in new tab
                  a({ href, children }) {
                    return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`${styles.footer} ${isUser ? styles.userFooter : ''}`}>
          <span className={styles.time}>{formatTime(message.timestamp)}</span>
          <button
            className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy'}
            aria-label="Copy message"
          >
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className={styles.userAvatar}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      )}
    </div>
  )
}

export default MessageBubble