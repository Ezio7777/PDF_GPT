import React from 'react'
import styles from './Loader.module.scss'

interface LoaderProps {
  size?:  'sm' | 'md' | 'lg'
  color?: 'primary' | 'inherit' | 'white'
  label?: string
}

const Loader: React.FC<LoaderProps> = ({
  size  = 'md',
  color = 'primary',
  label,
}) => {
  const classes = [styles.spinner, styles[size], styles[color]].join(' ')

  return (
    <span className={styles.wrapper} role="status" aria-label={label ?? 'Loading…'}>
      <span className={classes} />
      {label && <span className={styles.label}>{label}</span>}
    </span>
  )
}

export default Loader