import { useState } from 'react'
import { X } from 'lucide-react'
import { BookOpen } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { C, PrimaryBtn, GoogleIcon, Input } from './UI'

export default function AuthModal({ onClose, contextMsg }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()

  const handleGoogle = async () => {
    setLoading(true)
    await signInWithGoogle()
    // Google redirects away, so no need to close
  }

  const handleReset = async () => {
    if (!email) { setError('Bitte E-Mail-Adresse eingeben.'); return }
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password'
    })
    setLoading(false)
    if (error) setError(error.message)
    else setError('✅ Reset-Link gesendet! Bitte prüfe dein Postfach.')
  }

  const handleEmail = async () => {
    setError('')
    if (!email || !password) { setError('Bitte alle Felder ausfüllen.'); return }
    if (password.length < 6) { setError('Passwort muss mindestens 6 Zeichen haben.'); return }
    setLoading(true)
    const { error } = mode === 'login'
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password, name)
    setLoading(false)
    if (error) {
      if (error.message.includes('Invalid login')) setError('E-Mail oder Passwort falsch.')
      else if (error.message.includes('already registered')) setError('Diese E-Mail ist bereits registriert.')
      else setError(error.message)
    } else {
      if (mode === 'register') setError('✅ Bestätigungs-E-Mail gesendet! Bitte prüfe dein Postfach.')
      else onClose()
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 24, padding: '2.5rem', maxWidth: 420, width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.25)', position: 'relative' }}>

        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} color={C.muted} />
        </button>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.purple},${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={18} color="#fff" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1rem', color: C.text }}>BlätterTausch</span>
        </div>

        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: C.text, marginBottom: 4 }}>
          {mode === 'login' ? 'Willkommen zurück 👋' : 'Konto erstellen ✨'}
        </h2>
        <p style={{ fontSize: '0.85rem', color: C.muted, marginBottom: 22, lineHeight: 1.5 }}>
          {contextMsg || (mode === 'login' ? 'Melde dich an, um Bücher zu tauschen.' : 'Kostenlos registrieren und lostauschen.')}
        </p>

        {/* Google */}
        <button onClick={handleGoogle} disabled={loading} style={{ width: '100%', padding: '0.8rem 1rem', border: `1.5px solid ${C.border}`, borderRadius: 12, background: C.surface, cursor: 'pointer', fontSize: '0.9rem', fontWeight: 500, color: C.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
          <GoogleIcon /> Mit Google {mode === 'login' ? 'anmelden' : 'registrieren'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0', color: C.muted, fontSize: '0.78rem' }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />oder mit E-Mail<div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {mode === 'register' && (
          <Input label="Vorname" value={name} onChange={e => setName(e.target.value)} placeholder="Dein Vorname" />
        )}
        <Input label="E-Mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="deine@email.de" />
        <Input label="Passwort" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mindestens 6 Zeichen" />
        {mode === 'login' && (
          <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 8 }}>
            <span onClick={handleReset} style={{ fontSize: '0.8rem', color: C.purple, cursor: 'pointer', fontWeight: 500 }}>
              Passwort vergessen?
            </span>
          </div>
        )}

        {error && (
          <div style={{ background: error.startsWith('✅') ? C.successLight : C.errorLight, color: error.startsWith('✅') ? C.success : C.error, padding: '0.65rem 1rem', borderRadius: 8, fontSize: '0.82rem', marginBottom: 12 }}>
            {error}
          </div>
        )}

        <PrimaryBtn onClick={handleEmail} disabled={loading} style={{ width: '100%', borderRadius: 12, padding: '0.85rem', marginBottom: 14, marginTop: 4 }}>
          {loading ? 'Lädt...' : mode === 'login' ? 'Anmelden →' : 'Konto erstellen →'}
        </PrimaryBtn>

        <div style={{ textAlign: 'center', fontSize: '0.82rem', color: C.muted }}>
          {mode === 'login' ? 'Noch kein Konto? ' : 'Bereits ein Konto? '}
          <span onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }} style={{ color: C.purple, cursor: 'pointer', fontWeight: 600 }}>
            {mode === 'login' ? 'Registrieren' : 'Anmelden'}
          </span>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.68rem', color: C.muted, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          Mit der Anmeldung stimmst du den AGB & Datenschutzbestimmungen zu.
        </p>
      </div>
    </div>
  )
}
