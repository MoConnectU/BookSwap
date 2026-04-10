import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { BookOpen, Home, Compass, Plus, User, MessageCircle, Bell } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { C, Avatar, PrimaryBtn, GhostBtn } from './UI'

export default function Nav({ onOpenAuth }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)   // neue Tausch-Anfragen
  const [unreadCount, setUnreadCount] = useState(0)     // ungelesene Chat-Nachrichten
  const initials = profile?.name || user?.email || '?'

  useEffect(() => {
    if (!user) { setPendingCount(0); setUnreadCount(0); return }
    fetchPending()
    fetchUnread()

    // Realtime: neue Tausch-Anfragen
    const subSwaps = supabase.channel('nav_pending')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'swap_requests',
        filter: `owner_id=eq.${user.id}`
      }, () => fetchPending())
      .subscribe()

    // Realtime: neue Nachrichten
    const subMessages = supabase.channel('nav_messages')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages'
      }, (payload) => {
        // nur zählen wenn jemand anderes schreibt
        if (payload.new.sender_id !== user.id) fetchUnread()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(subSwaps)
      supabase.removeChannel(subMessages)
    }
  }, [user])

  // Badge zurücksetzen wenn man auf /chat oder /profile geht
  useEffect(() => {
    if (location.pathname === '/chat') setUnreadCount(0)
    if (location.pathname === '/profile') setPendingCount(0)
  }, [location.pathname])

  const fetchPending = async () => {
    const { count } = await supabase
      .from('swap_requests')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('status', 'pending')
    setPendingCount(count || 0)
  }

  const fetchUnread = async () => {
    // Alle Konversationen des Users holen
    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .eq('status', 'active')

    if (!convs || convs.length === 0) { setUnreadCount(0); return }

    // Nachrichten der letzten 7 Tage zählen die nicht vom User selbst sind
    // und nach dem letzten Besuch des Chats kamen
    const convIds = convs.map(c => c.id)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .neq('sender_id', user.id)
      .gte('created_at', sevenDaysAgo)

    setUnreadCount(count || 0)
  }

  const Badge = ({ count }) => (
    <span style={{
      position: 'absolute', top: -3, right: -3,
      minWidth: 16, height: 16, borderRadius: 8,
      background: '#EF4444', color: '#fff',
      fontSize: '0.55rem', fontWeight: 800,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '2px solid #fff', padding: '0 2px'
    }}>
      {count > 9 ? '9+' : count}
    </span>
  )

  return (
    <>
      {/* TOP NAV */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.border}`, padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg,${C.purple},${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={16} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1rem', background: `linear-gradient(135deg,${C.purple},${C.blue})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            BlätterTausch
          </span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {user ? (
            <>
              {/* Chat-Button mit Unread-Badge */}
              <button
                onClick={() => { setUnreadCount(0); navigate('/chat') }}
                style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <MessageCircle size={18} color={unreadCount > 0 ? C.purple : C.muted} strokeWidth={unreadCount > 0 ? 2.5 : 1.8} />
                {unreadCount > 0 && <Badge count={unreadCount} />}
              </button>

              {/* Glocke mit Pending-Badge */}
              <button
                onClick={() => { setPendingCount(0); navigate('/profile') }}
                style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Bell size={18} color={pendingCount > 0 ? C.purple : C.muted} strokeWidth={pendingCount > 0 ? 2.5 : 1.8} />
                {pendingCount > 0 && <Badge count={pendingCount} />}
              </button>

              {/* Avatar — nur Navigation zum Profil */}
              <div onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
                <Avatar letter={initials} size={34} src={profile?.avatar_url} />
              </div>
            </>
          ) : (
            <>
              <GhostBtn onClick={() => onOpenAuth('Melde dich an.')} style={{ borderRadius: 10, padding: '0.45rem 1rem', fontSize: '0.82rem' }}>
                Anmelden
              </GhostBtn>
              <PrimaryBtn onClick={() => onOpenAuth('Erstelle ein Konto.')} style={{ borderRadius: 10, padding: '0.45rem 1rem', fontSize: '0.82rem' }} icon={Plus}>
                Einstellen
              </PrimaryBtn>
            </>
          )}
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.border}`, display: 'flex', zIndex: 90 }}>
        {[
          { path: '/', icon: Home, label: 'Start' },
          { path: '/explore', icon: Compass, label: 'Entdecken' },
          { path: '/upload', icon: Plus, label: 'Einstellen', special: true, protected: true },
          { path: '/chat', icon: MessageCircle, label: 'Chat', protected: true, badge: unreadCount },
          { path: '/profile', icon: User, label: 'Profil', protected: true, badge: pendingCount },
        ].map(({ path, icon: Icon, label, special, protected: prot, badge }) => {
          const active = location.pathname === path
          return (
            <button
              key={path}
              onClick={() => {
                if (prot && !user) { onOpenAuth(`Melde dich an, um ${label} zu nutzen.`); return }
                if (path === '/chat') setUnreadCount(0)
                if (path === '/profile') setPendingCount(0)
                navigate(path)
              }}
              style={{ flex: 1, padding: '0.7rem 0.5rem 0.6rem', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative' }}
            >
              {special ? (
                <div style={{ width: 38, height: 38, borderRadius: 12, background: `linear-gradient(135deg,${C.purple},${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }}>
                  <Icon size={19} color="#fff" />
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <Icon size={21} color={active ? C.purple : C.muted} strokeWidth={active ? 2.5 : 1.8} />
                  {badge > 0 && (
                    <span style={{ position: 'absolute', top: -4, right: -6, minWidth: 14, height: 14, borderRadius: 7, background: '#EF4444', color: '#fff', fontSize: '0.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fff', padding: '0 2px' }}>
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
              )}
              <span style={{ fontSize: '0.62rem', fontWeight: active || special ? 700 : 500, color: active || special ? C.purple : C.muted }}>{label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
