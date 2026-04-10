import React, { useState, useRef, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setCurrentChat, prependChat } from '@/store/slices/chatSlice'
import pdfService from '@/services/pdfService'
import chatService from '@/services/chatService'
import styles from './UploadBox.module.scss'

const UploadBox: React.FC = () => {
  const dispatch       = useAppDispatch()
  const { token }      = useAppSelector(s => s.auth)

  const [dragging,  setDragging]  = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress,  setProgress]  = useState(0)
  const [error,     setError]     = useState<string | null>(null)
  const [fileName,  setFileName]  = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    const validationError = pdfService.validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setFileName(file.name)
    setUploading(true)
    setProgress(0)

    try {
      const { chatId } = await pdfService.uploadPDF(file, pct => setProgress(pct))

      // Fetch updated chat list to get the new chat's title
      const chats = await chatService.getChatList()
      const newChat = chats.find(c => c.chatId === chatId)
      if (newChat) {
        dispatch(prependChat(newChat))
      }

      dispatch(setCurrentChat(chatId))
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      setError(axiosErr?.response?.data?.detail ?? 'Upload failed. Please try again.')
      setFileName(null)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [dispatch])

  // ── Drag events ──────────────────────────────────────────────────────────────
  const onDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = ()                   => setDragging(false)
  const onDrop      = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const isLoggedIn = !!token

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        {/* Title */}
        <div className={styles.titleRow}>
          <div className={styles.titleIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div>
            <h2 className={styles.title}>Upload a PDF</h2>
            <p className={styles.subtitle}>Chat with any document — reports, papers, contracts</p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          className={`${styles.dropZone} ${dragging ? styles.dragging : ''} ${uploading ? styles.uploading : ''} ${!isLoggedIn ? styles.locked : ''}`}
          onDragOver={isLoggedIn ? onDragOver : undefined}
          onDragLeave={isLoggedIn ? onDragLeave : undefined}
          onDrop={isLoggedIn ? onDrop : undefined}
          onClick={() => isLoggedIn && !uploading && inputRef.current?.click()}
          role="button"
          tabIndex={isLoggedIn ? 0 : -1}
          aria-label="Upload PDF"
          onKeyDown={e => e.key === 'Enter' && isLoggedIn && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className={styles.hiddenInput}
            onChange={onFileChange}
            disabled={!isLoggedIn || uploading}
          />

          {uploading ? (
            <div className={styles.uploadingState}>
              <div className={styles.progressRing}>
                <svg width="56" height="56" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="var(--border-color)" strokeWidth="4" />
                  <circle
                    cx="28" cy="28" r="24"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 24}`}
                    strokeDashoffset={`${2 * Math.PI * 24 * (1 - progress / 100)}`}
                    transform="rotate(-90 28 28)"
                    style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                  />
                </svg>
                <span className={styles.progressPct}>{progress}%</span>
              </div>
              <p className={styles.uploadingLabel}>Uploading <strong>{fileName}</strong></p>
              <p className={styles.uploadingHint}>Processing your PDF…</p>
            </div>
          ) : !isLoggedIn ? (
            <div className={styles.lockedState}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <p>Log in to upload PDFs</p>
              <span>Guest users can only browse existing chats</span>
            </div>
          ) : (
            <div className={styles.idleState}>
              <div className={`${styles.uploadIcon} ${dragging ? styles.drag : ''}`}>
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 16 12 12 8 16" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                </svg>
              </div>
              <p className={styles.dropText}>
                {dragging ? 'Drop your PDF here' : 'Drag & drop your PDF here'}
              </p>
              <span className={styles.orText}>or</span>
              <span className={styles.browseText}>Click to browse</span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className={styles.error}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            {error}
          </div>
        )}

        {/* Constraints */}
        <div className={styles.constraints}>
          <span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            PDF only
          </span>
          <span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Max 2 MB
          </span>
          <span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Auto-creates a chat
          </span>
        </div>
      </div>
    </div>
  )
}

export default UploadBox