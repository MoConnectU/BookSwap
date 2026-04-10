import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { C, PrimaryBtn } from '../components/UI'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Check if we have a valid session from the reset link
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User clicked the reset link - we're ready
      }
    })
  }, [])

  const handleReset = async () => {
    if (!password) { setError('Bitte neues Passwort eingeben.'); return }
    if (password.length < 6) { setError('Passwort muss mindestens 6 Zeichen haben.'); return }
    if (password !== confirm) { setError('Passwörter stimmen nicht überein.'); return }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)
    if (error) {
      setError('Fehler: ' + error.message)
    } else {
      setSuccess(true)
      setTimeout(() => navigate('/'), 3000)
    }
  }

  const inputStyle = {
    width: '100%', padding: '0.75rem 1rem',
    border: `1.5px solid ${C.border}`, borderRadius: 10,
    outline: 'none', fontSize: '0.9rem', color: C.text,
    background: C.bg, marginBottom: 12
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: C.surface, borderRadius: 24, padding: '2.5rem', maxWidth: 420, width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.1)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.purple},${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: C.text }}>BlätterTausch</span>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: C.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={30} color={C.success} />
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: C.text, marginBottom: 8 }}>Passwort geändert!</h2>
            <p style={{ color: C.muted, fontSize: '0.9rem' }}>Du wirst in 3 Sekunden zur Startseite weitergeleitet...</p>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: C.text, marginBottom: 4 }}>Neues Passwort</h2>
            <p style={{ fontSize: '0.85rem', color: C.muted, marginBottom: 24 }}>Gib dein neues Passwort ein.</p>

            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>Neues Passwort</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Mindestens 6 Zeichen"
              style={inputStyle}
            />

            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>Passwort bestätigen</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Passwort wiederholen"
              style={{ ...inputStyle, marginBottom: 16 }}
            />

            {error && (
              <div style={{ background: error.startsWith('✅') ? C.successLight : '#FEE2E2', color: error.startsWith('✅') ? C.success : '#EF4444', padding: '0.65rem', borderRadius: 8, fontSize: '0.82rem', marginBottom: 12 }}>
                {error}
              </div>
            )}

            <PrimaryBtn onClick={handleReset} disabled={loading} style={{ width: '100%', borderRadius: 12, padding: '0.85rem' }} icon={Check}>
              {loading ? 'Wird gespeichert...' : 'Passwort ändern'}
            </PrimaryBtn>
          </>
        )}
      </div>
    </div>
  )
}
