import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import Nav from './components/Nav'
import AuthModal from './components/AuthModal'
import Landing from './pages/Landing'
import Explore from './pages/Explore'
import BookDetail from './pages/BookDetail'
import Upload from './pages/Upload'
import Profile from './pages/Profile'
import Chat from './pages/Chat'
import PublicProfile from './pages/PublicProfile'

export default function App() {
  const [authOpen, setAuthOpen] = useState(false)
  const [authContext, setAuthContext] = useState('')

  const openAuth = (msg = '') => {
    setAuthContext(msg)
    setAuthOpen(true)
  }

  return (
    <AuthProvider>
      <div style={{ paddingBottom: 72 }}>
        <Nav onOpenAuth={openAuth} />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/book/:id" element={<BookDetail onOpenAuth={openAuth} />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/user/:id" element={<PublicProfile />} />
        </Routes>
        {authOpen && (
          <AuthModal contextMsg={authContext} onClose={() => setAuthOpen(false)} />
        )}
      </div>
    </AuthProvider>
  )
}
