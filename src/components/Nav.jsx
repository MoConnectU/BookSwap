import { useNavigate, useLocation } from 'react-router-dom'
import { BookOpen, Home, Compass, Plus, User, Bell } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { C, Avatar, PrimaryBtn, GhostBtn } from './UI'

export default function Nav({ onOpenAuth }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, signOut } = useAuth()

  const initials = profile?.name || user?.email || '?'

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
              <button onClick={() => navigate('/profile')} style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bell size={18} color={C.muted} />
              </button>
              <div onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
                <Avatar letter={initials} size={34} src={profile?.avatar_url} />
              </div>
            </>
          ) : (
            <>
              <GhostBtn onClick={() => onOpenAuth('Melde dich an.')} style={{ borderRadius: 10, padding: '0.45rem 1rem', fontSize: '0.82rem' }}>
                Anmelden
              </GhostBtn>
              <PrimaryBtn onClick={() => onOpenAuth('Erstelle ein Konto, um Bücher einzustellen.')} style={{ borderRadius: 10, padding: '0.45rem 1rem', fontSize: '0.82rem' }} icon={Plus}>
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
          { path: '/profile', icon: User, label: 'Profil', protected: true },
        ].map(({ path, icon: Icon, label, special, protected: prot }) => {
          const active = location.pathname === path
          return (
            <button key={path} onClick={() => {
              if (prot && !user) { onOpenAuth(`Melde dich an, um ${label} zu nutzen.`); return }
              navigate(path)
            }} style={{ flex: 1, padding: '0.7rem 0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              {special ? (
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg,${C.purple},${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }}>
                  <Icon size={20} color="#fff" />
                </div>
              ) : (
                <Icon size={22} color={active ? C.purple : C.muted} strokeWidth={active ? 2.5 : 1.8} />
              )}
              <span style={{ fontSize: '0.65rem', fontWeight: active || special ? 700 : 500, color: active || special ? C.purple : C.muted }}>{label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
