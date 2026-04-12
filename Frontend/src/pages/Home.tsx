import React, { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setChats } from '@/store/slices/chatSlice'
import { openModal } from '@/store/slices/uiSlice'
import chatService from '@/services/chatService'
import Layout from '@/components/layout/Layout'
import UploadBox from '@/components/pdf/UploadBox'
import ChatBox from '@/components/chat/ChatBox'
import AuthModal from './AuthModal'

const Home: React.FC = () => {
  const dispatch = useAppDispatch()
  const { token } = useAppSelector(s => s.auth)
  const { currentChatId } = useAppSelector(s => s.chat)
  const { showAuthModal } = useAppSelector(s => s.ui)

  // Show auth modal when not logged in
  useEffect(() => {
    if (!token) {
      dispatch(openModal())
    }
  }, [token, dispatch])

  // Fetch chat list immediately after login
  useEffect(() => {
    if (!token) return
    const fetchChats = async () => {
      try {
        const chats = await chatService.getChatList()
        dispatch(setChats(chats))
      } catch { /* interceptor handles 401 */ }
    }
    fetchChats()
  }, [token, dispatch])

  return (
    <>
      <Layout>
        {currentChatId ? <ChatBox /> : <UploadBox />}
      </Layout>

      <AuthModal isOpen={showAuthModal} />
    </>
  )
}

export default Home