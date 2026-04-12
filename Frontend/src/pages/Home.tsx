import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { setChats } from '@/store/slices/chatSlice'
import chatService from '@/services/chatService'
import Layout from '@/components/layout/Layout'
import UploadBox from '@/components/pdf/UploadBox'
import ChatBox from '@/components/chat/ChatBox'

const Home: React.FC = () => {
  const dispatch  = useAppDispatch()
  const navigate  = useNavigate()
  const { token } = useAppSelector(s => s.auth)
  const { currentChatId } = useAppSelector(s => s.chat)

  // If not logged in → go to the dedicated login page (no modal overlap)
  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true })
    }
  }, [token, navigate])

  // Fetch chat list as soon as we have a token
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

  // Don't render layout until we're authenticated
  if (!token) return null

  return (
    <Layout>
      {currentChatId ? <ChatBox /> : <UploadBox />}
    </Layout>
  )
}

export default Home