import { useState } from 'react'
import { X, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, PrimaryBtn, Avatar } from './UI'

export default function ReviewModal({ swap, reviewedUser, onClose, onSaved }) {
  const { user } = useAuth()
  const [rating, setRating] = useState(5)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')

    // Check if already reviewed
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('reviewer_id', user.id)
      .eq('swap_id', swap.id)
      .single()

    if (existing) {
      setError('Du hast diesen Tausch bereits bewertet.')
      setSaving(false)
      return
    }

    const { error: insertError } = await supabase.from('reviews').insert({
      reviewer_id: user.id,
      reviewed_id: reviewedUser.id,
      swap_id: swap.id,
      rating,
      comment: comment.trim() || null
    })

    if (insertError) { setError('Fehler beim Speichern.'); setSaving(false); return }

    // Update average rating
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('reviewed_id', reviewedUser.id)

    if (allReviews?.length) {
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      await supabase.from('profiles').update({ rating: Math.round(avg * 10) / 10 }).eq('id', reviewedUser.id)
    }

    setSaving(false)
    onSaved()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 24, padding: '2rem', maxWidth: 400, width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.25)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} color={C.muted} />
        </button>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: C.text, marginBottom: 4 }}>Bewertung abgeben</h2>
        <p style={{ fontSize: '0.85rem', color: C.muted, marginBottom: 20 }}>Wie war der Tausch mit {reviewedUser.name}?</p>

        {/* Stars */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
          {[1,2,3,4,5].map(s => (
            <Star
              key={s}
              size={36}
              color={C.warning}
              fill={s <= (hovered || rating) ? C.warning : 'transparent'}
              style={{ cursor: 'pointer', transition: 'all 0.15s' }}
              onClick={() => setRating(s)}
              onMouseEnter={() => setHovered(s)}
              onMouseLeave={() => setHovered(0)}
            />
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: C.muted, marginBottom: 16 }}>
          {['','Schlecht','Naja','Ok','Gut','Ausgezeichnet!'][hovered || rating]}
        </p>

        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Kommentar (optional) — Wie war die Kommunikation, der Zustand des Buches, ...?"
          style={{ width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${C.border}`, borderRadius: 10, outline: 'none', fontSize: '0.88rem', color: C.text, background: C.bg, height: 90, resize: 'vertical', marginBottom: 16 }}
        />

        {error && (
          <div style={{ background: '#FEE2E2', color: '#EF4444', padding: '0.65rem', borderRadius: 8, fontSize: '0.82rem', marginBottom: 12 }}>{error}</div>
        )}

        <PrimaryBtn onClick={handleSave} disabled={saving} style={{ width: '100%', borderRadius: 12, padding: '0.85rem' }}>
          {saving ? 'Wird gespeichert...' : '⭐ Bewertung abgeben'}
        </PrimaryBtn>
      </div>
    </div>
  )
}
