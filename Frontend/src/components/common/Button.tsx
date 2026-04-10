import React from 'react'
import styles from './Button.module.scss'
import Loader from './Loader'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  'primary' | 'secondary' | 'ghost' | 'danger'
  size?:     'sm' | 'md' | 'lg'
  loading?:  boolean
  fullWidth?: boolean
  icon?:     React.ReactNode
}

const Button: React.FC<ButtonProps> = ({
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  fullWidth = false,
  icon,
  children,
  disabled,
  className = '',
  ...rest
}) => {
  const classes = [
    styles.btn,
    styles[variant],
    styles[size],
    fullWidth  ? styles.fullWidth  : '',
    loading    ? styles.loading    : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <Loader size="sm" color="inherit" />
      ) : (
        <>
          {icon && <span className={styles.icon}>{icon}</span>}
          {children}
        </>
      )}
    </button>
  )
}

export default Button