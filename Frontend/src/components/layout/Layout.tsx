import React from 'react'
import Header from './Header'
import Sidebar from './Sidebar'
import styles from './Layout.module.scss'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className={styles.appShell}>
      <Header />

      <div className={styles.body}>
        <Sidebar />

        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout