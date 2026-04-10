import { useNavigate } from 'react-router-dom'
import { C, PrimaryBtn } from '../components/UI'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: '5rem', marginBottom: 16 }}>📚</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 900, color: C.text, marginBottom: 8 }}>Seite nicht gefunden</h1>
        <p style={{ color: C.muted, marginBottom: 28, fontSize: '0.95rem', lineHeight: 1.6 }}>
          Diese Seite existiert leider nicht.<br />Vielleicht wurde sie verschoben oder gelöscht.
        </p>
        <PrimaryBtn onClick={() => navigate('/')} style={{ borderRadius: 12, padding: '0.85rem 2rem' }}>
          Zur Startseite
        </PrimaryBtn>
      </div>
    </div>
  )
}
