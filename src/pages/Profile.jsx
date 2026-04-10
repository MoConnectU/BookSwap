import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Check, LogOut, Trash2, MessageCircle, Edit2, Camera, X, Star } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, Card, Avatar, Badge, PrimaryBtn, Spinner } from '../components/UI'
import ReviewModal from '../components/ReviewModal'

const COLORS = [
  'linear-gradient(135deg,#7C3AED,#A78BFA)',
  'linear-gradient(135deg,#2563EB,#60A5FA)',
  'linear-gradient(135deg,#0F766E,#34D399)',
  'linear-gradient(135deg,#D97706,#FCD34D)',
]

function ratingDisplay(r) {
  if (!r || r === 0) return 'Neu'
  return r.toFixed(1) + '★'
}

export default function Profile() {
  const navigate = useNavigate()
  const { user, profile, signOut, refreshProfile } = useAuth()
  const [myBooks, setMyBooks] = useState([])
  const [swapRequests, setSwapRequests] = useState([])
  const [completedSwaps, setCompletedSwaps] = useState([])
  const [myReviews, setMyReviews] = useState([])     // reviews I GAVE
  const [receivedReviews, setReceivedReviews] = useState([]) // reviews I RECEIVED
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('books')
  const [deleting, setDeleting] = useState(null)
  const [responding, setResponding] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState(null) // { otherUser, swapId }

  const fetchMyData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [
      { data: books },
      { data: swaps },
      { data: completed },
      { data: reviews },
      { data: received }
    ] = await Promise.all([
      supabase.from('books')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('swap_requests')
        .select('*, books!requested_book_id(title, author), profiles!requester_id(name, avatar_url)')
        .eq('owner_id', user.id)
        .eq('status', 'pending'),
      supabase.from('swap_requests')
        .select('id, created_at, requester_id, owner_id, requested:books!requested_book_id(title), offered:books!offered_book_id(title), requester:profiles!requester_id(id, name, avatar_url), owner:profiles!owner_id(id, name, avatar_url)')
        .or(`requester_id.eq.${user.id},owner_id.eq.${user.id}`)
        .eq('status', 'completed')
        .order('created_at', { ascending: false }),
      supabase.from('reviews')
        .select('*, reviewer:profiles!reviewer_id(name, avatar_url)')
        .eq('reviewer_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('reviews')
        .select('*, reviewer:profiles!reviewer_id(name, avatar_url)')
        .eq('reviewed_id', user.id)
        .order('created_at', { ascending: false })
    ])
    setMyBooks(books || [])
    setSwapRequests(swaps || [])
    setCompletedSwaps(completed || [])
    setMyReviews(reviews || [])
    setReceivedReviews(received || [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    if (!user) { navigate('/'); return }
    fetchMyData()
    refreshProfile()
  }, [user, fetchMyData])

  const handleDeleteBook = async (bookId, coverUrl) => {
    if (!window.confirm('Buch wirklich löschen?')) return
    setDeleting(bookId)
    if (coverUrl?.includes('/book-covers/')) {
      const path = coverUrl.split('/book-covers/')[1]
      if (path) await supabase.storage.from('book-covers').remove([path])
    }
    const { error } = await supabase.from('books').delete().eq('id', bookId)
    if (!error) setMyBooks(prev => prev.filter(b => b.id !== bookId))
    setDeleting(null)
  }

  const handleSwapResponse = async (swapId, status) => {
    setResponding(swapId)
    await supabase.from('swap_requests').update({ status }).eq('id', swapId)
    
    // Send email notification
    if (status === 'accepted') {
      const { data: { session } } = await supabase.auth.getSession()
      await fetch(`https://jtncwqysnnqvkixgvgyn.supabase.co/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ type: 'request_accepted', swapRequestId: swapId })
      })
      setTimeout(() => navigate('/chat'), 800)
    }
    setResponding(null)
    fetchMyData()
  }

  const handleReviewSaved = async () => {
    setReviewTarget(null)
    await refreshProfile()
    fetchMyData()
  }

  const handleSignOut = async () => { await signOut(); navigate('/') }
  const name = profile?.name || user?.email?.split('@')[0] || 'Leser'

  // Check if user already reviewed a swap
  const hasReviewed = (swapId) => myReviews.some(r => r.swap_id === swapId)

  // Get the other person in a swap
  const getOtherPerson = (swap) => {
    if (swap.requester_id === user.id) {
      return { ...swap.owner, id: swap.owner_id }
    }
    return { ...swap.requester, id: swap.requester_id }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,${C.purple},${C.blue})`, padding: '2.5rem 1.5rem 3.5rem' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <Avatar letter={name} size={72} src={profile?.avatar_url} />
              <button onClick={() => setEditOpen(true)} style={{ position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                <Camera size={12} color={C.purple} />
              </button>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>{name}</h2>
                <button onClick={() => setEditOpen(true)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 6, padding: '0.2rem 0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Edit2 size={12} color="#fff" />
                  <span style={{ fontSize: '0.72rem', color: '#fff', fontWeight: 500 }}>Bearbeiten</span>
                </button>
              </div>
              <p style={{ opacity: 0.7, fontSize: '0.82rem', color: '#fff', marginTop: 2 }}>
                {profile?.city ? `📍 ${profile.city} · ` : ''}{user?.email}
              </p>
              <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
                {[
                  [myBooks.length, 'Bücher'],
                  [profile?.trades_count || 0, 'Tausche'],
                  [ratingDisplay(profile?.rating), 'Bewertung']
                ].map(([n, l]) => (
                  <div key={l}>
                    <div style={{ fontWeight: 900, fontSize: '1.2rem', color: '#fff' }}>{n}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.65, color: '#fff' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button onClick={handleSignOut} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: '0.82rem', fontWeight: 500, flexShrink: 0 }}>
            <LogOut size={16} /> Abmelden
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '-24px auto 0', padding: '0 1.5rem 3rem', position: 'relative' }}>
        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          <Card onClick={() => navigate('/upload')} style={{ padding: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.purpleLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Plus size={18} color={C.purple} /></div>
            <div><div style={{ fontWeight: 700, fontSize: '0.85rem', color: C.text }}>Buch einstellen</div><div style={{ fontSize: '0.72rem', color: C.muted }}>Neues Buch hinzufügen</div></div>
          </Card>
          <Card onClick={() => navigate('/chat')} style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><MessageCircle size={18} color={C.blue} /></div>
            <div><div style={{ fontWeight: 700, fontSize: '0.85rem', color: C.text }}>Nachrichten</div><div style={{ fontSize: '0.72rem', color: C.muted }}>Chat öffnen</div></div>
          </Card>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
          {[
            ['books', 'Mein Regal'],
            ['swaps', `Anfragen (${swapRequests.length})`],
            ['history', `Verlauf (${completedSwaps.length})`]
          ].map(([id, label]) => (
            <div key={id} onClick={() => setTab(id)} style={{ padding: '0.7rem 1.1rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: tab === id ? C.text : C.muted, borderBottom: `2px solid ${tab === id ? C.purple : 'transparent'}`, marginBottom: -1, position: 'relative', whiteSpace: 'nowrap' }}>
              {label}
              {id === 'swaps' && swapRequests.length > 0 && (
                <span style={{ position: 'absolute', top: 6, right: 2, width: 16, height: 16, borderRadius: '50%', background: C.purple, color: '#fff', fontSize: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{swapRequests.length}</span>
              )}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div>
        ) : tab === 'books' ? (
          // ── MY BOOKS ──────────────────────────────────────────
          myBooks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📚</div>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Noch keine Bücher eingestellt</p>
              <PrimaryBtn onClick={() => navigate('/upload')} icon={Plus}>Erstes Buch einstellen</PrimaryBtn>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '1rem' }}>
              {myBooks.map((b, i) => (
                <Card key={b.id}>
                  <div style={{ height: 120, background: b.cover_url ? `url(${b.cover_url}) center/cover` : COLORS[i % COLORS.length], display: 'flex', alignItems: 'flex-end', padding: '0 0.6rem 0.6rem' }}>
                    {!b.cover_url && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{b.title}</span>}
                  </div>
                  <div style={{ padding: '0.8rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.text, marginBottom: 2 }}>{b.title}</div>
                    <div style={{ fontSize: '0.7rem', color: C.muted, marginBottom: 6 }}>{b.author}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.7rem', color: b.is_available ? C.success : C.muted, fontWeight: 600, marginBottom: 8 }}>
                      <Check size={11} /> {b.is_available ? 'Online' : 'Getauscht'} · {b.condition}
                    </div>
                    {b.is_available && (
                      <button
                        onClick={() => handleDeleteBook(b.id, b.cover_url)}
                        disabled={deleting === b.id}
                        style={{ width: '100%', padding: '0.45rem', borderRadius: 8, border: '1px solid #FEE2E2', background: '#FFF5F5', color: '#EF4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <Trash2 size={12} />{deleting === b.id ? 'Löschen...' : 'Löschen'}
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : tab === 'swaps' ? (
          // ── SWAP REQUESTS ─────────────────────────────────────
          swapRequests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🤝</div>
              <p style={{ fontWeight: 600 }}>Keine offenen Anfragen</p>
              <p style={{ fontSize: '0.85rem', marginTop: 6 }}>Wenn jemand dein Buch tauschen möchte, erscheint es hier</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {swapRequests.map(s => (
                <Card key={s.id} style={{ padding: '1.2rem' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
                    <Avatar letter={s.profiles?.name || '?'} size={40} src={s.profiles?.avatar_url} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, color: C.text, fontSize: '0.9rem' }}>{s.profiles?.name} möchte tauschen</p>
                      <p style={{ fontSize: '0.8rem', color: C.muted, marginTop: 2 }}>Möchte: <strong>{s.books?.title}</strong></p>
                    </div>
                    <Badge>Neu</Badge>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleSwapResponse(s.id, 'accepted')}
                      disabled={responding === s.id}
                      style={{ flex: 1, padding: '0.65rem', borderRadius: 10, border: 'none', background: responding === s.id ? C.border : `linear-gradient(135deg,${C.purple},${C.blue})`, color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <Check size={14} />{responding === s.id ? 'Wird angenommen...' : 'Annehmen → Chat öffnet sich'}
                    </button>
                    <button
                      onClick={() => handleSwapResponse(s.id, 'declined')}
                      disabled={responding === s.id}
                      style={{ padding: '0.65rem 1rem', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
                      Ablehnen
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : (
          // ── HISTORY TAB ───────────────────────────────────────
          completedSwaps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📖</div>
              <p style={{ fontWeight: 600 }}>Noch keine abgeschlossenen Tausche</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {completedSwaps.map(s => {
                const otherPerson = getOtherPerson(s)
                const review = receivedReviews.find(r => r.swap_id === s.id)
                const alreadyReviewed = hasReviewed(s.id)
                return (
                  <Card key={s.id} style={{ padding: '1.2rem' }}>
                    {/* Swap info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <p style={{ fontWeight: 700, color: C.text, fontSize: '0.9rem', marginBottom: 4 }}>
                          Tausch mit {otherPerson?.name || 'Nutzer'}
                        </p>
                        <p style={{ fontSize: '0.8rem', color: C.muted }}>
                          📚 {s.requested?.title || '?'} ⇄ {s.offered?.title || '?'}
                        </p>
                        <p style={{ fontSize: '0.72rem', color: C.muted, marginTop: 4 }}>
                          {new Date(s.created_at).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: C.success, background: C.successLight, padding: '0.3rem 0.7rem', borderRadius: 100, whiteSpace: 'nowrap' }}>
                        ✓ Abgeschlossen
                      </span>
                    </div>

                    {/* Review received */}
                    {review && (
                      <div style={{ background: C.bg, borderRadius: 10, padding: '0.75rem', display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                        <Avatar letter={review.reviewer?.name || '?'} size={32} src={review.reviewer?.avatar_url} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: C.text }}>{review.reviewer?.name}</span>
                            <div style={{ display: 'flex', gap: 2 }}>
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} size={11} color={C.warning} fill={s <= review.rating ? C.warning : 'transparent'} />
                              ))}
                            </div>
                          </div>
                          {review.comment && <p style={{ fontSize: '0.8rem', color: C.muted }}>{review.comment}</p>}
                        </div>
                      </div>
                    )}

                    {/* Review button — only if not yet reviewed */}
                    {!alreadyReviewed && otherPerson && (
                      <button
                        onClick={() => setReviewTarget({ otherUser: otherPerson, swapId: s.id })}
                        style={{ width: '100%', padding: '0.6rem', borderRadius: 10, border: `1.5px solid ${C.warning}`, background: 'rgba(245,158,11,0.06)', color: C.warning, fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Star size={14} fill={C.warning} color={C.warning} /> {otherPerson?.name} bewerten
                      </button>
                    )}
                    {alreadyReviewed && (
                      <p style={{ fontSize: '0.75rem', color: C.success, textAlign: 'center', marginTop: 4 }}>
                        ✓ Du hast bereits bewertet
                      </p>
                    )}
                  </Card>
                )
              })}
            </div>
          )
        )}
      </div>

      {/* Edit Profile Modal */}
      {editOpen && (
        <EditProfileModal
          profile={profile}
          user={user}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); refreshProfile() }}
        />
      )}

      {/* Review Modal — only opened from history tab */}
      {reviewTarget && (
        <ReviewModal
          otherUser={reviewTarget.otherUser}
          swapId={reviewTarget.swapId}
          onClose={() => setReviewTarget(null)}
          onSaved={handleReviewSaved}
        />
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── EDIT PROFILE MODAL ────────────────────────────────────────
function EditProfileModal({ profile, user, onClose, onSaved }) {
  const [name, setName] = useState(profile?.name || '')
  const [city, setCity] = useState(profile?.city || '')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!name.trim()) { setError('Name darf nicht leer sein.'); return }
    setSaving(true)
    setError('')
    let avatar_url = profile?.avatar_url || null
    if (avatarFile) {
      const ext = avatarFile.name.split('.').pop()
      const filename = `avatars/${user.id}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('book-covers')
        .upload(filename, avatarFile, { upsert: true })
      if (!uploadError) {
        const { data } = supabase.storage.from('book-covers').getPublicUrl(filename)
        avatar_url = data.publicUrl
      }
    }
    const { error: updateError } = await supabase.from('profiles')
      .update({ name: name.trim(), city: city.trim() || null, avatar_url })
      .eq('id', user.id)
    setSaving(false)
    if (updateError) { setError('Fehler beim Speichern.'); return }
    onSaved()
  }

  const inputStyle = { width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${C.border}`, borderRadius: 10, outline: 'none', fontSize: '0.9rem', color: C.text, background: C.bg, marginBottom: 12 }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 24, padding: '2rem', maxWidth: 420, width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.25)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} color={C.muted} />
        </button>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: C.text, marginBottom: 20 }}>Profil bearbeiten</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          {avatarPreview ? (
            <img src={avatarPreview} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <Avatar letter={name || '?'} size={72} />
          )}
          <label style={{ cursor: 'pointer' }}>
            <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
            <div style={{ padding: '0.5rem 1rem', border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: '0.85rem', fontWeight: 500, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Camera size={14} /> Foto ändern
            </div>
          </label>
        </div>
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>Name *</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Dein Name" style={inputStyle} />
        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>Stadt</label>
        <input value={city} onChange={e => setCity(e.target.value)} placeholder="z.B. Berlin" style={{ ...inputStyle, marginBottom: 16 }} />
        {error && <div style={{ background: '#FEE2E2', color: '#EF4444', padding: '0.65rem', borderRadius: 8, fontSize: '0.82rem', marginBottom: 12 }}>{error}</div>}
        <PrimaryBtn onClick={handleSave} disabled={saving} style={{ width: '100%', borderRadius: 12, padding: '0.85rem' }} icon={Check}>
          {saving ? 'Wird gespeichert...' : 'Speichern'}
        </PrimaryBtn>
      </div>
    </div>
  )
}
