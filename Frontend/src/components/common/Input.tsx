import React from 'react'
import styles from './Input.module.scss'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:    string
  error?:    string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...rest
}) => {
  const inputId = id ?? `input-${Math.random().toString(36).slice(2, 7)}`

  return (
    <div className={styles.wrapper}>
      {label && (
        <label htmlFor={inputId} className={styles.label}>
          {label}
        </label>
      )}

      <div className={`${styles.inputWrap} ${error ? styles.hasError : ''}`}>
        {leftIcon  && <span className={`${styles.icon} ${styles.left}`}>{leftIcon}</span>}
        <input
          id={inputId}
          className={`${styles.input} ${leftIcon ? styles.withLeft : ''} ${rightIcon ? styles.withRight : ''} ${className}`}
          {...rest}
        />
        {rightIcon && <span className={`${styles.icon} ${styles.right}`}>{rightIcon}</span>}
      </div>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}

export default Input