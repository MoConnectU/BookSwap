import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Home, Compass, Plus, User, MessageCircle, Bell } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { C, Avatar, PrimaryBtn, GhostBtn } from './UI'

// ── Logo — zwei Bücher + Pfeil, warme Töne ────────────────────
const LogoIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
    <rect width="32" height="32" rx="9" fill="url(#logoWarm)" />
    <rect x="5" y="8" width="8" height="11" rx="1.5" fill="white" opacity="0.9"/>
    <rect x="6" y="9" width="2" height="9" rx="1" fill="url(#logoWarm)" opacity="0.5"/>
    <rect x="19" y="13" width="8" height="11" rx="1.5" fill="white" opacity="0.9"/>
    <rect x="20" y="14" width="2" height="9" rx="1" fill="url(#logoWarm)" opacity="0.5"/>
    <path d="M14 12 L18 15 L14 18" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.95"/>
    <defs>
      <linearGradient id="logoWarm" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
        <stop stopColor="#3D2B1F"/>
        <stop offset="1" stopColor="#C8843A"/>
      </linearGradient>
    </defs>
  </svg>
)

export default function Nav({ onOpenAuth }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  const [pendingCount, setPendingCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const initials = profile?.name || user?.email || '?'

  useEffect(() => {
    if (!user) { setPendingCount(0); setUnreadCount(0); return }
    fetchPending()
    fetchUnread()
    const subSwaps = supabase.channel('nav_pending')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'swap_requests', filter: `owner_id=eq.${user.id}` }, () => fetchPending())
      .subscribe()
    const subMessages = supabase.channel('nav_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new.sender_id !== user.id) fetchUnread()
      })
      .subscribe()
    return () => { supabase.removeChannel(subSwaps); supabase.removeChannel(subMessages) }
  }, [user])

  useEffect(() => {
    if (location.pathname === '/chat') setUnreadCount(0)
    if (location.pathname === '/profile') setPendingCount(0)
  }, [location.pathname])

  const fetchPending = async () => {
    const { count } = await supabase.from('swap_requests')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', user.id).eq('status', 'pending')
    setPendingCount(count || 0)
  }

  const fetchUnread = async () => {
    const { data: convs } = await supabase.from('conversations').select('id')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`).eq('status', 'active')
    if (!convs || convs.length === 0) { setUnreadCount(0); return }
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count } = await supabase.from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convs.map(c => c.id))
      .neq('sender_id', user.id)
      .gte('created_at', sevenDaysAgo)
    setUnreadCount(count || 0)
  }

  const NotifBadge = ({ count }) => (
    <span style={{ position: 'absolute', top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 8, background: C.error, color: '#fff', fontSize: '0.55rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff', padding: '0 2px' }}>
      {count > 9 ? '9+' : count}
    </span>
  )

  return (
    <>
      {/* TOP NAV */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(253,250,244,0.97)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${C.border}`, padding: '0 1.5rem', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

        <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
          <LogoIcon />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
            <span style={{ fontWeight: 900, fontSize: '1.05rem', letterSpacing: '-0.03em', color: C.bark }}>
              BlätterTausch
            </span>
            <span style={{ fontSize: '0.58rem', color: C.dust, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Bücher tauschen
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {user ? (
            <>
              <button onClick={() => { setUnreadCount(0); navigate('/chat') }} style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, background: unreadCount > 0 ? C.purpleLight : C.cream, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                <MessageCircle size={18} color={unreadCount > 0 ? C.purple : C.muted} strokeWidth={unreadCount > 0 ? 2.5 : 1.8} />
                {unreadCount > 0 && <NotifBadge count={unreadCount} />}
              </button>
              <button onClick={() => { setPendingCount(0); navigate('/profile') }} style={{ position: 'relative', width: 38, height: 38, borderRadius: 10, background: pendingCount > 0 ? C.purpleLight : C.cream, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                <Bell size={18} color={pendingCount > 0 ? C.purple : C.muted} strokeWidth={pendingCount > 0 ? 2.5 : 1.8} />
                {pendingCount > 0 && <NotifBadge count={pendingCount} />}
              </button>
              <div onClick={() => navigate('/profile')} style={{ cursor: 'pointer', marginLeft: 2 }}>
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
            <button key={path} onClick={() => {
              if (prot && !user) { onOpenAuth(`Melde dich an, um ${label} zu nutzen.`); return }
              if (path === '/chat') setUnreadCount(0)
              if (path === '/profile') setPendingCount(0)
              navigate(path)
            }} style={{ flex: 1, padding: '0.7rem 0.5rem 0.6rem', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, position: 'relative' }}>
              {special ? (
                <div style={{ width: 38, height: 38, borderRadius: 12, background: `linear-gradient(135deg,${C.bark},${C.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(61,43,31,0.35)' }}>
                  <Icon size={19} color="#fff" />
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <Icon size={21} color={active ? C.purple : C.muted} strokeWidth={active ? 2.5 : 1.8} />
                  {badge > 0 && (
                    <span style={{ position: 'absolute', top: -4, right: -6, minWidth: 14, height: 14, borderRadius: 7, background: C.error, color: '#fff', fontSize: '0.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid #fff', padding: '0 2px' }}>
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
              )}
              <span style={{ fontSize: '0.62rem', fontWeight: active || special ? 700 : 500, color: active ? C.purple : special ? C.purple : C.muted }}>{label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
