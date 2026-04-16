import React from 'react'
import Header from './Header'
import styles from './ProfileLayout.module.scss'

interface ProfileLayoutProps {
  children: React.ReactNode
}

const ProfileLayout: React.FC<ProfileLayoutProps> = ({ children }) => (
  <div className={styles.shell}>
    <Header />
    <main className={styles.main}>
      {children}
    </main>
  </div>
)

export default ProfileLayout