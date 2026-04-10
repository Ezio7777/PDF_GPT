import React, { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setChats } from '@/store/slices/chatSlice'
import { openModal } from '@/store/slices/uiSlice'
import chatService from '@/services/chatService'
import Layout from '@/components/layout/Layout'
import UploadBox from '@/components/pdf/UploadBox'
import ChatBox from '@/components/chat/ChatBox'
import AuthModal from './AuthModal'
// import Loader from '@/components/common/Loader'
// import styles from './Home.module.scss'

const Home: React.FC = () => {
  const dispatch = useAppDispatch()
  const { token, isGuest } = useAppSelector(s => s.auth)
  const { currentChatId }  = useAppSelector(s => s.chat)
  const { showAuthModal }  = useAppSelector(s => s.ui)

  const isAuthenticated = !!token || isGuest

  // Show auth modal on first visit
  useEffect(() => {
    if (!isAuthenticated) {
      dispatch(openModal())
    }
  }, [isAuthenticated, dispatch])

  // Fetch chat list after login
  useEffect(() => {
    if (!token) return

    const fetchChats = async () => {
      try {
        const chats = await chatService.getChatList()
        dispatch(setChats(chats))
      } catch {
        // interceptor handles 401
      }
    }

    fetchChats()
  }, [token, dispatch])

  return (
    <>
      <Layout>
        {currentChatId ? (
          <ChatBox />
        ) : (
          <UploadBox />
        )}
      </Layout>

      {/* Auth modal */}
      <AuthModal isOpen={showAuthModal} />
    </>
  )
}

export default Home