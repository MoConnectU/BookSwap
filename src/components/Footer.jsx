import { useNavigate, useLocation } from 'react-router-dom'
import { C } from './UI'

export default function Footer() {
  const navigate = useNavigate()
  const location = useLocation()

  // Footer nur auf der Landing-Seite anzeigen
  // Auf anderen Seiten stört er die Bottom-Nav
  const showOnPaths = ['/', '/impressum', '/datenschutz']
  if (!showOnPaths.includes(location.pathname)) return null

  return (
    <div style={{
      background: C.bark,
      padding: '1.25rem 1.5rem',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      // Auf Mobile über der Bottom-Nav
      marginBottom: 60,
    }}>
      <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
        © {new Date().getFullYear()} BlätterTausch
      </span>
      <div style={{ display: 'flex', gap: 20 }}>
        <button onClick={() => navigate('/impressum')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
          Impressum
        </button>
        <button onClick={() => navigate('/datenschutz')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
          Datenschutz
        </button>
      </div>
    </div>
  )
}
