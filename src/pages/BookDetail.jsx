import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, MapPin, Star, ArrowLeftRight, MessageCircle, Check, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, Card, Avatar, Badge, CondBadge, PrimaryBtn, GhostBtn, Spinner } from '../components/UI'

export default function BookDetail({ onOpenAuth }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [book, setBook] = useState(null)
  const [myBooks, setMyBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [swapOpen, setSwapOpen] = useState(false)
  const [selectedBook, setSelectedBook] = useState(null)
  const [swapLoading, setSwapLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [existingConv, setExistingConv] = useState(null)

  const COLORS = [
    'linear-gradient(135deg,#7C3AED,#A78BFA)',
    'linear-gradient(135deg,#2563EB,#60A5FA)',
    'linear-gradient(135deg,#0F766E,#34D399)',
  ]

  useEffect(() => {
    fetchBook()
    if (user) {
      fetchMyBooks()
      checkExistingConversation()
    }
  }, [id, user])

  const fetchBook = async () => {
    const { data } = await supabase
      .from('books')
      .select('*, profiles(id, name, city, rating, trades_count, avatar_url)')
      .eq('id', id).single()
    setBook(data)
    setLoading(false)
  }

  const fetchMyBooks = async () => {
    const { data } = await supabase
      .from('books').select('*')
      .eq('user_id', user.id)
      .eq('is_available', true)
    setMyBooks(data || [])
  }

  // Bug 3 fix: check if conversation already exists with this book owner
  const checkExistingConversation = async () => {
    const { data: bookData } = await supabase
      .from('books').select('user_id').eq('id', id).single()
    if (!bookData) return

    const ownerId = bookData.user_id
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${ownerId}),and(user1_id.eq.${ownerId},user2_id.eq.${user.id})`)
      .single()
    if (conv) setExistingConv(conv.id)
  }

  const handleSwapClick = () => {
    if (!user) { onOpenAuth('Melde dich an, um einen Tausch anzubieten.'); return }
    setSwapOpen(true)
  }

  const handleMessageClick = () => {
    if (!user) { onOpenAuth('Melde dich an, um Nachrichten zu senden.'); return }
    if (existingConv) {
      navigate('/chat')
    } else {
      onOpenAuth && alert('Starte zuerst einen Tausch, um Nachrichten senden zu können.')
    }
  }

  const handleSwapConfirm = async () => {
    if (!selectedBook) return
    setSwapLoading(true)
    const { data: newSwap, error } = await supabase.from('swap_requests').insert({
      requester_id: user.id,
      owner_id: book.profiles.id,
      requested_book_id: book.id,
      offered_book_id: selectedBook.id,
      status: 'pending'
    }).select().single()
    
    // Send email notification to book owner
    if (!error && newSwap) {
      fetch(`https://jtncwqysnnqvkixgvgyn.supabase.co/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ type: 'new_request', swapRequestId: newSwap.id })
      })
    }
    setSwapLoading(false)
    if (!error) { setSwapOpen(false); setSuccess(true) }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
      <Spinner size={36} />
    </div>
  )
  if (!book) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: C.muted }}>Buch nicht gefunden.</div>
  )

  const gradient = COLORS[0]
  const isOwnBook = user?.id === book.user_id

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* Back bar */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={C.muted} />
        </button>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text }}>Buchdetails</span>
      </div>

      {/* Cover banner */}
      <div style={{ height: 200, background: book.cover_url ? `url(${book.cover_url}) center/cover` : gradient, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.5))' }} />
      </div>

      <div style={{ maxWidth: 700, margin: '-60px auto 0', padding: '0 1.5rem 3rem', position: 'relative' }}>
        {/* Title row */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end', marginBottom: 20 }}>
          <div style={{ width: 100, height: 140, borderRadius: '6px 14px 14px 6px', background: book.cover_url ? `url(${book.cover_url}) center/cover` : gradient, flexShrink: 0, boxShadow: '0 12px 32px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0.5rem' }}>
            {!book.cover_url && <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.3 }}>{book.title}</span>}
          </div>
          <div style={{ paddingBottom: 8 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff', marginBottom: 2, textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>{book.title}</h1>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.9rem', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>{book.author}</p>
          </div>
        </div>

        {/* Details */}
        <Card style={{ padding: '1.5rem', marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            <CondBadge cond={book.condition} />
            {book.category && <Badge>{book.category}</Badge>}
          </div>
          {book.description && <p style={{ fontSize: '0.9rem', color: C.muted, lineHeight: 1.7 }}>{book.description}</p>}
        </Card>

        {/* Owner */}
        {book.profiles && (
          <Card style={{ padding: '1.2rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
            onClick={() => navigate(`/user/${book.profiles.id}`)}>
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

        {/* Action buttons — only show if not own book */}
        {!isOwnBook && (
          <div style={{ display: 'flex', gap: 12 }}>
            <PrimaryBtn
              onClick={handleSwapClick}
              style={{ flex: 1, padding: '1rem', borderRadius: 14, fontSize: '1rem' }}
              icon={ArrowLeftRight}
            >
              Tausch anbieten
            </PrimaryBtn>
            {/* Bug 3 fix: Nachricht only shows if conversation exists */}
            {existingConv && (
              <GhostBtn
                onClick={handleMessageClick}
                style={{ borderRadius: 14, fontSize: '0.95rem', padding: '1rem 1.2rem' }}
                icon={MessageCircle}
              >
                Nachricht
              </GhostBtn>
            )}
          </div>
        )}

        {isOwnBook && (
          <div style={{ background: C.purpleLight, borderRadius: 12, padding: '1rem', textAlign: 'center', color: C.purple, fontSize: '0.85rem', fontWeight: 500 }}>
            Das ist dein eigenes Buch
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
              <button onClick={() => setSwapOpen(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color={C.muted} />
              </button>
            </div>

            {myBooks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: C.muted }}>
                <p style={{ marginBottom: 12 }}>Du hast noch keine Bücher eingestellt.</p>
                <PrimaryBtn onClick={() => { setSwapOpen(false); navigate('/upload') }}>
                  Jetzt Buch einstellen
                </PrimaryBtn>
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
                  <PrimaryBtn
                    onClick={handleSwapConfirm}
                    disabled={!selectedBook || swapLoading}
                    style={{ flex: 1, borderRadius: 12 }}
                    icon={Check}
                  >
                    {swapLoading ? 'Wird gesendet...' : 'Anfrage senden'}
                  </PrimaryBtn>
                  <GhostBtn onClick={() => setSwapOpen(false)} style={{ borderRadius: 12 }}>Abbrechen</GhostBtn>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* SUCCESS */}
      {success && (
        <div onClick={() => { setSuccess(false); navigate('/explore') }} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(17,24,39,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: C.surface, borderRadius: 24, padding: '2.5rem', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 32px 80px rgba(0,0,0,0.25)' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Check size={34} color={C.success} strokeWidth={2.5} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: C.text, marginBottom: 8 }}>Anfrage gesendet! 🎉</h2>
            <p style={{ color: C.muted, fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 24 }}>
              <strong>{book.profiles?.name}</strong> wurde benachrichtigt.<br />
              Sobald er/sie annimmt, öffnet sich der Chat.
            </p>
            <PrimaryBtn onClick={() => { setSuccess(false); navigate('/explore') }} style={{ width: '100%', borderRadius: 12 }}>
              Weitere Bücher entdecken
            </PrimaryBtn>
          </div>
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
