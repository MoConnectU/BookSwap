import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, MapPin, Star, ArrowLeftRight, MessageCircle, Check, X, Pencil, Upload } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, Card, Avatar, Badge, CondBadge, PrimaryBtn, GhostBtn, Spinner, Toast } from '../components/UI'

const CONDITIONS = ['Wie neu', 'Sehr gut', 'Gut', 'Akzeptabel']
const CATEGORIES = ['Roman', 'Sachbuch', 'Schulbuch', 'Studium / Fachbuch', 'Krimi / Thriller', 'Fantasy / SciFi', 'Kinder / Jugend', 'Ratgeber', 'Sonstiges']

export default function BookDetail({ onOpenAuth }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [book, setBook] = useState(null)
  const [myBooks, setMyBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [swapOpen, setSwapOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState(null)
  const [swapLoading, setSwapLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [existingConv, setExistingConv] = useState(null)
  const [toast, setToast] = useState(null)

  const COLORS = [
    'linear-gradient(135deg,#7C3AED,#A78BFA)',
    'linear-gradient(135deg,#2563EB,#60A5FA)',
    'linear-gradient(135deg,#0F766E,#34D399)',
  ]

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetchBook()
    if (user) { fetchMyBooks(); checkExistingConversation() }
  }, [id, user])

  const fetchBook = async () => {
    setLoading(true); setError(null)
    const { data, error } = await supabase
      .from('books')
      .select('*, profiles(id, name, city, rating, trades_count, avatar_url)')
      .eq('id', id).single()
    if (error) setError('Buch konnte nicht geladen werden. Bitte versuche es erneut.')
    else setBook(data)
    setLoading(false)
  }

  const fetchMyBooks = async () => {
    const { data } = await supabase.from('books').select('*').eq('user_id', user.id).eq('is_available', true)
    setMyBooks(data || [])
  }

  const checkExistingConversation = async () => {
    const { data: bookData } = await supabase.from('books').select('user_id').eq('id', id).single()
    if (!bookData) return
    const { data: conv } = await supabase.from('conversations').select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${bookData.user_id}),and(user1_id.eq.${bookData.user_id},user2_id.eq.${user.id})`).single()
    if (conv) setExistingConv(conv.id)
  }

  const handleSwapClick = () => {
    if (!user) { onOpenAuth('Melde dich an, um einen Tausch anzubieten.'); return }
    setSwapOpen(true)
  }

  const handleMessageClick = () => {
    if (!user) { onOpenAuth('Melde dich an, um Nachrichten zu senden.'); return }
    if (existingConv) navigate('/chat')
    else showToast('Starte zuerst einen Tausch, um Nachrichten senden zu können.', 'info')
  }

  const handleSwapConfirm = async () => {
    if (!selectedBook) return
    setSwapLoading(true)
    const { data: newSwap, error } = await supabase.from('swap_requests').insert({
      requester_id: user.id, owner_id: book.profiles.id,
      requested_book_id: book.id, offered_book_id: selectedBook.id, status: 'pending'
    }).select().single()
    if (error) { showToast('Fehler beim Senden der Anfrage.', 'error'); setSwapLoading(false); return }
    if (newSwap) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        await fetch(`https://jtncwqysnnqvkixgvgyn.supabase.co/functions/v1/send-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ type: 'new_request', swapRequestId: newSwap.id })
        })
      } catch (e) { console.warn('E-Mail fehlgeschlagen:', e) }
    }
    setSwapLoading(false); setSwapOpen(false); setSuccess(true)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner size={36} /></div>

  if (error) return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={20} color={C.muted} /></button>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text }}>Buchdetails</span>
      </div>
      <div style={{ padding: '4rem 2rem', textAlign: 'center', color: C.muted }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>😕</div>
        <p style={{ fontWeight: 600, marginBottom: 8, color: C.text }}>{error}</p>
        <button onClick={fetchBook} style={{ padding: '0.6rem 1.5rem', borderRadius: 10, border: `1.5px solid ${C.border}`, background: 'transparent', color: C.purple, cursor: 'pointer', fontWeight: 600 }}>Erneut versuchen</button>
      </div>
    </div>
  )

  if (!book) return <div style={{ padding: '2rem', textAlign: 'center', color: C.muted }}>Buch nicht gefunden.</div>

  const gradient = COLORS[0]
  const isOwnBook = user?.id === book.user_id

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={20} color={C.muted} /></button>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text }}>Buchdetails</span>
      </div>

      <div style={{ height: 200, background: book.cover_url ? `url(${book.cover_url}) center/cover` : gradient, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.5))' }} />
      </div>

      <div style={{ maxWidth: 700, margin: '-60px auto 0', padding: '0 1.5rem 3rem', position: 'relative' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', marginBottom: 20 }}>
          <div style={{ width: 100, height: 140, borderRadius: '6px 14px 14px 6px', background: book.cover_url ? `url(${book.cover_url}) center/cover` : gradient, flexShrink: 0, boxShadow: '0 12px 32px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0.5rem' }}>
            {!book.cover_url && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.3 }}>{book.title}</span>}
          </div>
          <div style={{ paddingBottom: 8 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: 2, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{book.title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{book.author}</p>
          </div>
        </div>

        <Card style={{ padding: '1.5rem', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <CondBadge cond={book.condition} />
            {book.category && <Badge>{book.category}</Badge>}
          </div>
          {book.description
            ? <p style={{ fontSize: '0.9rem', color: C.muted, lineHeight: 1.7 }}>{book.description}</p>
            : <p style={{ fontSize: '0.85rem', color: C.muted, fontStyle: 'italic' }}>Keine Beschreibung vorhanden.</p>
          }
        </Card>

        {book.profiles && (
          <Card style={{ padding: '1.2rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }} onClick={() => navigate(`/user/${book.profiles.id}`)}>
            <Avatar letter={book.profiles.name || '?'} size={48} src={book.profiles.avatar_url} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: C.text, fontSize: '0.95rem' }}>{book.profiles.name}</div>
              <div style={{ fontSize: '0.8rem', color: C.muted, display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                {book.profiles.city && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><MapPin size={11} />{book.profiles.city}</span>}
                {book.profiles.rating && <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Star size={11} color={C.warning} fill={C.warning} />{book.profiles.rating?.toFixed(1)} · {book.profiles.trades_count || 0} Tausche</span>}
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', color: C.purple, fontWeight: 500 }}>Profil →</span>
          </Card>
        )}

        {/* Fremdes Buch */}
        {!isOwnBook && (
          <div style={{ display: 'flex', gap: 12 }}>
            <PrimaryBtn onClick={handleSwapClick} style={{ flex: 1, padding: '1rem', borderRadius: 14, fontSize: '1rem' }} icon={ArrowLeftRight}>Tausch anbieten</PrimaryBtn>
            {existingConv && <GhostBtn onClick={handleMessageClick} style={{ borderRadius: 14, fontSize: '0.95rem', padding: '1rem 1.2rem' }} icon={MessageCircle}>Nachricht</GhostBtn>}
          </div>
        )}

        {/* Eigenes Buch */}
        {isOwnBook && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ background: C.purpleLight, borderRadius: 12, padding: '1rem', textAlign: 'center', color: C.purple, fontSize: '0.85rem', fontWeight: 500 }}>
              Das ist dein eigenes Buch
            </div>
            <button onClick={() => setEditOpen(true)} style={{ width: '100%', padding: '0.85rem', borderRadius: 14, border: `1.5px solid ${C.purpleMid}`, background: C.purpleLight, color: C.purple, cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Pencil size={16} /> Buch bearbeiten
            </button>
          </div>
        )}
      </div>

      {/* SWAP MODAL */}
      {swapOpen && (
        <div onClick={() => setSwapOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(17,24,39,0.6)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 20, padding: '2rem', maxWidth: 480, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: C.text }}>Tausch vorschlagen</h2>
                <p style={{ fontSize: '0.82rem', color: C.muted, marginTop: 2 }}>Für: <strong>{book.title}</strong></p>
              </div>
              <button onClick={() => setSwapOpen(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} color={C.muted} /></button>
            </div>
            {myBooks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: C.muted }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📚</div>
                <p style={{ marginBottom: 6, fontWeight: 600, color: C.text }}>Du hast noch keine Bücher eingestellt.</p>
                <p style={{ fontSize: '0.82rem', marginBottom: 16 }}>Stelle zuerst ein Buch ein, dann kannst du tauschen.</p>
                <PrimaryBtn onClick={() => { setSwapOpen(false); navigate('/upload') }}>Jetzt Buch einstellen</PrimaryBtn>
              </div>
            ) : (
              <>
                <p style={{ fontSize: '0.78rem', fontWeight: 600, color: C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Wähle dein Angebot:</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8, marginBottom: 20 }}>
                  {myBooks.map((b, i) => (
                    <div key={b.id} onClick={() => setSelectedBook(b)} style={{ border: `2px solid ${selectedBook?.id === b.id ? C.purple : C.border}`, borderRadius: 12, padding: '0.75rem 0.5rem', cursor: 'pointer', background: selectedBook?.id === b.id ? C.purpleLight : 'transparent', textAlign: 'center', transition: 'all 0.18s' }}>
                      <div style={{ width: 40, height: 55, borderRadius: '3px 7px 7px 3px', background: b.cover_url ? `url(${b.cover_url}) center/cover` : COLORS[i % COLORS.length], margin: '0 auto 6px', boxShadow: '1px 2px 6px rgba(0,0,0,0.15)' }} />
                      <span style={{ fontSize: '0.7rem', color: C.text, fontWeight: 600, display: 'block', lineHeight: 1.2 }}>{b.title}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <PrimaryBtn onClick={handleSwapConfirm} disabled={!selectedBook || swapLoading} style={{ flex: 1, borderRadius: 12 }} icon={Check}>
                    {swapLoading ? 'Wird gesendet...' : 'Anfrage senden'}
                  </PrimaryBtn>
                  <GhostBtn onClick={() => setSwapOpen(false)} style={{ borderRadius: 12 }}>Abbrechen</GhostBtn>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editOpen && <EditBookModal book={book} user={user} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); fetchBook() }} />}

      {/* SUCCESS */}
      {success && (
        <div onClick={() => { setSuccess(false); navigate('/explore') }} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(17,24,39,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 24, padding: '2.5rem', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 32px 80px rgba(0,0,0,0.25)' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={34} color={C.success} strokeWidth={2.5} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: C.text, marginBottom: 8 }}>Anfrage gesendet! 🎉</h2>
            <p style={{ color: C.muted, fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
              <strong>{book.profiles?.name}</strong> wurde benachrichtigt.<br />Sobald er/sie annimmt, öffnet sich der Chat.
            </p>
            <PrimaryBtn onClick={() => { setSuccess(false); navigate('/explore') }} style={{ width: '100%', borderRadius: 12 }}>Weitere Bücher entdecken</PrimaryBtn>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
    </div>
  )
}

// ── EDIT BOOK MODAL ────────────────────────────────────────────
function EditBookModal({ book, user, onClose, onSaved }) {
  const [title, setTitle] = useState(book.title || '')
  const [author, setAuthor] = useState(book.author || '')
  const [isbn, setIsbn] = useState(book.isbn || '')
  const [category, setCategory] = useState(book.category || 'Roman')
  const [condition, setCondition] = useState(book.condition || 'Gut')
  const [description, setDescription] = useState(book.description || '')
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(book.cover_url || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleSave = async () => {
    if (!title.trim() || !author.trim()) { setError('Titel und Autor sind Pflichtfelder.'); return }
    setLoading(true); setError('')
    let cover_url = book.cover_url
    if (coverFile) {
      const ext = coverFile.name.split('.').pop()
      const filename = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('book-covers').upload(filename, coverFile)
      if (!uploadError) {
        const { data } = supabase.storage.from('book-covers').getPublicUrl(filename)
        cover_url = data.publicUrl
      }
    }
    const { error: updateError } = await supabase.from('books')
      .update({ title: title.trim(), author: author.trim(), isbn: isbn.trim() || null, category, condition, description: description.trim() || null, cover_url })
      .eq('id', book.id).eq('user_id', user.id)
    setLoading(false)
    if (updateError) { setError('Fehler beim Speichern: ' + updateError.message); return }
    onSaved(); onClose()
  }

  const inputStyle = { width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${C.border}`, borderRadius: 10, outline: 'none', fontSize: '0.9rem', color: C.text, background: C.bg, boxSizing: 'border-box' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: C.bg, borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: C.bg, zIndex: 1 }}>
          <span style={{ fontWeight: 800, fontSize: '1.05rem', color: C.text }}>Buch bearbeiten</span>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: '50%', border: 'none', background: C.surface, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} color={C.muted} /></button>
        </div>
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'block', cursor: 'pointer' }}>
            <input type="file" accept="image/*" onChange={e => { const f = e.target.files[0]; if (!f) return; setCoverFile(f); setCoverPreview(URL.createObjectURL(f)) }} style={{ display: 'none' }} />
            {coverPreview ? (
              <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', height: 180 }}>
                <img src={coverPreview} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Upload size={22} color="#fff" /><span style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 600 }}>Foto ändern</span>
                </div>
              </div>
            ) : (
              <div style={{ border: `2px dashed ${C.purpleMid}`, borderRadius: 14, padding: '2rem', textAlign: 'center', background: C.purpleLight }}>
                <Upload size={22} color={C.purple} style={{ margin: '0 auto 8px' }} />
                <p style={{ fontWeight: 700, color: C.purple, marginBottom: 4, fontSize: '0.9rem' }}>Buchfoto hochladen</p>
                <p style={{ fontSize: '0.78rem', color: C.muted }}>JPG oder PNG · max. 5 MB</p>
              </div>
            )}
          </label>
          <div><label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.text, marginBottom: 6 }}>Titel *</label><input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="Buchtitel" /></div>
          <div><label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.text, marginBottom: 6 }}>Autor *</label><input style={inputStyle} value={author} onChange={e => setAuthor(e.target.value)} placeholder="Autor" /></div>
          <div><label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.text, marginBottom: 6 }}>ISBN (optional)</label><input style={inputStyle} value={isbn} onChange={e => setIsbn(e.target.value)} placeholder="978-3-..." /></div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.text, marginBottom: 6 }}>Kategorie</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.text, marginBottom: 8 }}>Zustand</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CONDITIONS.map(c => (
                <button key={c} onClick={() => setCondition(c)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: `1.5px solid ${condition === c ? C.purple : C.border}`, background: condition === c ? C.purpleLight : 'transparent', color: condition === c ? C.purple : C.muted, fontWeight: condition === c ? 700 : 400, fontSize: '0.82rem', cursor: 'pointer' }}>{c}</button>
              ))}
            </div>
          </div>
          <div><label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.text, marginBottom: 6 }}>Beschreibung (optional)</label><textarea style={{ ...inputStyle, height: 90, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Kurze Beschreibung..." /></div>
          {error && <div style={{ background: '#FEE2E2', color: '#EF4444', padding: '0.65rem 1rem', borderRadius: 8, fontSize: '0.82rem' }}>{error}</div>}
          <PrimaryBtn onClick={handleSave} disabled={loading} style={{ width: '100%', padding: '1rem', borderRadius: 14, fontSize: '0.95rem' }} icon={loading ? null : Check}>
            {loading ? 'Wird gespeichert...' : 'Änderungen speichern'}
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}
