import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Nav from './components/Nav'
import Footer from './components/Footer'
import AuthModal from './components/AuthModal'
import Landing from './pages/Landing'
import Explore from './pages/Explore'
import BookDetail from './pages/BookDetail'
import Upload from './pages/Upload'
import Profile from './pages/Profile'
import Chat from './pages/Chat'
import PublicProfile from './pages/PublicProfile'
import ResetPassword from './pages/ResetPassword'
import NotFound from './pages/NotFound'
import Impressum from './pages/Impressum'
import Datenschutz from './pages/Datenschutz'
import { Spinner } from './components/UI'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <Spinner size={36} />
    </div>
  )
  return user ? children : <Navigate to="/" replace />
}

function AppRoutes() {
  const [authOpen, setAuthOpen] = useState(false)
  const [authContext, setAuthContext] = useState('')
  const openAuth = (msg = '') => { setAuthContext(msg); setAuthOpen(true) }

  return (
    <div style={{ paddingBottom: 72 }}>
      <Nav onOpenAuth={openAuth} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/book/:id" element={<BookDetail onOpenAuth={openAuth} />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/user/:id" element={<PublicProfile />} />
        <Route path="/impressum" element={<Impressum />} />
        <Route path="/datenschutz" element={<Datenschutz />} />
        {/* Protected routes */}
        <Route path="/upload" element={<PrivateRoute><Upload /></PrivateRoute>} />
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
        <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
      {authOpen && (
        <AuthModal contextMsg={authContext} onClose={() => setAuthOpen(false)} />
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
