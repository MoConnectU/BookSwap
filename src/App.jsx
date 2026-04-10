import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Nav from './components/Nav'
import AuthModal from './components/AuthModal'
import ReviewModal from './components/ReviewModal'
import Landing from './pages/Landing'
import Explore from './pages/Explore'
import BookDetail from './pages/BookDetail'
import Upload from './pages/Upload'
import Profile from './pages/Profile'
import Chat from './pages/Chat'
import PublicProfile from './pages/PublicProfile'

// Inner app has access to auth context
function InnerApp() {
  const { user } = useAuth()
  const [authOpen, setAuthOpen] = useState(false)
  const [authContext, setAuthContext] = useState('')
  const [pendingReview, setPendingReview] = useState(null) // { otherUser, swapId }
  const [dismissedSwaps, setDismissedSwaps] = useState(new Set())

  // Reset everything when user logs out
  useEffect(() => {
    if (!user) {
      setAuthOpen(false)
      setPendingReview(null)
      setDismissedSwaps(new Set())
    }
  }, [user])

  const openAuth = (msg = '') => {
    setAuthContext(msg)
    setAuthOpen(true)
  }

  const triggerReview = (otherUser, swapId) => {
    if (otherUser?.id && otherUser?.name && swapId && !dismissedSwaps.has(swapId)) {
      setPendingReview({ otherUser, swapId })
    }
  }

  return (
    <div style={{ paddingBottom: 72 }}>
      <Nav onOpenAuth={openAuth} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/book/:id" element={<BookDetail onOpenAuth={openAuth} />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/chat" element={<Chat onTriggerReview={triggerReview} />} />
        <Route path="/user/:id" element={<PublicProfile />} />
      </Routes>

      {/* AuthModal */}
      {authOpen && (
        <AuthModal contextMsg={authContext} onClose={() => setAuthOpen(false)} />
      )}

      {/* ReviewModal - managed at top level, always resets on logout */}
      {pendingReview && user && (
        <ReviewModal
          otherUser={pendingReview.otherUser}
          swapId={pendingReview.swapId}
          onClose={() => { setDismissedSwaps(prev => new Set([...prev, pendingReview.swapId])); setPendingReview(null) }}
          onSaved={() => { setDismissedSwaps(prev => new Set([...prev, pendingReview.swapId])); setPendingReview(null) }}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <InnerApp />
    </AuthProvider>
  )
}
