import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Send, Check, Package, Star, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, Avatar, Spinner, PrimaryBtn, GhostBtn } from '../components/UI'

// ── REVIEW MODAL ──────────────────────────────────────────────
function ReviewModal({ otherUser, swapId, onClose, onSaved }) {
  const { user } = useAuth()
  const [rating, setRating] = useState(5)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const labels = ['', 'Schlecht', 'Naja', 'Ok', 'Gut', 'Ausgezeichnet!']

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('reviews').insert({
      reviewer_id: user.id,
      reviewed_id: otherUser.id,
      swap_id: swapId,
      rating,
      comment: comment.trim() || null
    })
    // Recalculate and update average rating
    const { data: allReviews } = await supabase
      .from('reviews').select('rating').eq('reviewed_id', otherUser.id)
    if (allReviews?.length) {
      const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      const rounded = Math.round(avg * 10) / 10
      await supabase.from('profiles').update({ rating: rounded }).eq('id', otherUser.id)
      console.log(`Rating updated for ${otherUser.id}: ${rounded} (${allReviews.length} reviews)`)
    } else {
      await supabase.from('profiles').update({ rating: 0 }).eq('id', otherUser.id)
    }
    setSaving(false)
    onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(17,24,39,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: C.surface, borderRadius: 24, padding: '2rem', maxWidth: 400, width: '100%', boxShadow: '0 32px 80px rgba(0,0,0,0.25)', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={16} color={C.muted} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🎉</div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: C.text, marginBottom: 4 }}>Tausch abgeschlossen!</h2>
          <p style={{ fontSize: '0.85rem', color: C.muted }}>Wie war der Tausch mit <strong>{otherUser?.name}</strong>?</p>
        </div>

        {/* Stars */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          {[1,2,3,4,5].map(s => (
            <Star key={s} size={38} color={C.warning} fill={s <= (hovered || rating) ? C.warning : 'transparent'} style={{ cursor: 'pointer', transition: 'all 0.15s' }}
              onClick={() => setRating(s)} onMouseEnter={() => setHovered(s)} onMouseLeave={() => setHovered(0)} />
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: C.muted, marginBottom: 16, fontWeight: 500 }}>
          {labels[hovered || rating]}
        </p>

        <textarea value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Kommentar (optional) — Kommunikation, Buchzustand, ..."
          style={{ width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${C.border}`, borderRadius: 10, outline: 'none', fontSize: '0.88rem', color: C.text, background: C.bg, height: 80, resize: 'none', marginBottom: 16 }} />

        <PrimaryBtn onClick={handleSave} disabled={saving} style={{ width: '100%', borderRadius: 12, padding: '0.85rem' }}>
          {saving ? 'Wird gespeichert...' : '⭐ Bewertung abgeben'}
        </PrimaryBtn>
        <button onClick={onClose} style={{ width: '100%', marginTop: 8, padding: '0.6rem', background: 'transparent', border: 'none', cursor: 'pointer', color: C.muted, fontSize: '0.82rem' }}>
          Überspringen
        </button>
      </div>
    </div>
  )
}

// ── MAIN CHAT ─────────────────────────────────────────────────
export default function Chat() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [otherUser, setOtherUser] = useState(null)
  const [bookTitle, setBookTitle] = useState('')
  const [swapId, setSwapId] = useState(null)
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    fetchConversations()
  }, [user])

  useEffect(() => {
    if (activeConv) {
      fetchMessages(activeConv.id)
      fetchConvDetails(activeConv)
      const sub = supabase.channel(`chat_${activeConv.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConv.id}` },
          payload => setMessages(prev => [...prev, payload.new]))
        .subscribe()
      return () => supabase.removeChannel(sub)
    }
  }, [activeConv])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const fetchConversations = async () => {
    setLoading(true)
    const { data } = await supabase.from('conversations').select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('updated_at', { ascending: false })
    setConversations(data || [])
    setLoading(false)
  }

  const fetchConvDetails = async (conv) => {
    const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id
    const { data: p } = await supabase.from('profiles').select('*').eq('id', otherId).single()
    setOtherUser(p)
    if (conv.swap_request_id) {
      const { data: s } = await supabase.from('swap_requests')
        .select('id, books!requested_book_id(title)').eq('id', conv.swap_request_id).single()
      setBookTitle(s?.books?.title || 'Buch')
      setSwapId(s?.id || null)
    }
  }

  const fetchMessages = async (convId) => {
    const { data } = await supabase.from('messages').select('*')
      .eq('conversation_id', convId).order('created_at', { ascending: true })
    setMessages(data || [])
  }

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConv || sending) return
    setSending(true)
    const text = newMsg.trim()
    setNewMsg('')
    await supabase.from('messages').insert({ conversation_id: activeConv.id, sender_id: user.id, text })
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', activeConv.id)
    setSending(false)
  }

  const handleCompleteSwap = async () => {
    if (!window.confirm('Tausch als abgeschlossen markieren? Beide Bücher werden als getauscht markiert.')) return
    setCompleting(true)
    if (activeConv.swap_request_id) {
      const { data: swap } = await supabase.from('swap_requests').select('*').eq('id', activeConv.swap_request_id).single()
      if (swap) {
        await supabase.from('swap_requests').update({ status: 'completed' }).eq('id', swap.id)
        if (swap.requested_book_id) await supabase.from('books').update({ is_available: false }).eq('id', swap.requested_book_id)
        if (swap.offered_book_id) await supabase.from('books').update({ is_available: false }).eq('id', swap.offered_book_id)
        await supabase.rpc('increment_trades', { user_id: swap.requester_id })
        await supabase.rpc('increment_trades', { user_id: swap.owner_id })
      }
    }
    await supabase.from('conversations').update({ status: 'completed' }).eq('id', activeConv.id)
    setActiveConv(prev => ({ ...prev, status: 'completed' }))
    fetchConversations()
    setCompleting(false)
    // Show review modal instead of system message
    setShowReview(true)
  }

  // ── CONVERSATION LIST ────────────────────────────────────────
  if (!activeConv) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg }}>
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={20} color={C.muted} />
          </button>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text }}>Nachrichten</span>
        </div>
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '1rem 1.5rem' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner size={36} /></div>
          ) : conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: C.muted }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>💬</div>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>Noch keine Nachrichten</p>
              <p style={{ fontSize: '0.85rem' }}>Biete einen Tausch an um eine Unterhaltung zu starten</p>
            </div>
          ) : conversations.map(conv => (
            <ConvItem key={conv.id} conv={conv} userId={user.id} onClick={() => { setActiveConv(conv); setOtherUser(null); setBookTitle('') }} />
          ))}
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // ── CHAT VIEW ────────────────────────────────────────────────
  const isCompleted = activeConv.status === 'completed'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => { setActiveConv(null); setOtherUser(null) }} style={{ width: 36, height: 36, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={C.muted} />
        </button>
        <Avatar letter={otherUser?.name || '?'} size={36} src={otherUser?.avatar_url} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: C.text }}>{otherUser?.name || '...'}</div>
          <div style={{ fontSize: '0.72rem', color: C.muted }}>📚 {bookTitle || '...'}</div>
        </div>
        {isCompleted && (
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: C.success, background: C.successLight, padding: '0.4rem 0.8rem', borderRadius: 100 }}>✓ Abgeschlossen</span>
        )}
      </div>

      {/* Info banner */}
      {!isCompleted && (
        <div style={{ background: C.purpleLight, padding: '0.6rem 1.5rem', textAlign: 'center', fontSize: '0.78rem', color: C.purple, fontWeight: 500 }}>
          Tausch vereinbart! Klärt hier Versanddetails. Wenn beide Bücher angekommen sind → "Tausch abschließen"
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: C.muted, fontSize: '0.85rem' }}>
            Schreib die erste Nachricht! 👋<br />Klärt Versandadresse und wer zuerst schickt.
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === user.id
          return (
            <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 8 }}>
              {!isMe && <Avatar letter={otherUser?.name || '?'} size={28} src={otherUser?.avatar_url} />}
              <div style={{ maxWidth: '72%' }}>
                <div style={{ background: isMe ? `linear-gradient(135deg,${C.purple},${C.blue})` : C.surface, color: isMe ? '#fff' : C.text, padding: '0.65rem 1rem', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', fontSize: '0.88rem', lineHeight: 1.5, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: isMe ? 'none' : `1px solid ${C.border}`, wordBreak: 'break-word' }}>
                  {msg.text}
                </div>
                <div style={{ fontSize: '0.65rem', color: C.muted, marginTop: 3, textAlign: isMe ? 'right' : 'left', display: 'flex', alignItems: 'center', justifyContent: isMe ? 'flex-end' : 'flex-start', gap: 3 }}>
                  {new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  {isMe && <Check size={10} color={C.muted} />}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Complete button + input */}
      {!isCompleted ? (
        <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '0.75rem 1rem', flexShrink: 0 }}>
          <button onClick={handleCompleteSwap} disabled={completing} style={{ width: '100%', padding: '0.65rem', borderRadius: 10, border: 'none', background: completing ? C.border : C.successLight, color: completing ? C.muted : C.success, fontWeight: 700, fontSize: '0.85rem', cursor: completing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            <Package size={15} />{completing ? 'Wird abgeschlossen...' : '✓ Tausch abschließen — Bücher angekommen?'}
          </button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Nachricht schreiben..."
              style={{ flex: 1, padding: '0.7rem 1rem', border: `1.5px solid ${C.border}`, borderRadius: 100, outline: 'none', fontSize: '0.9rem', background: C.bg, color: C.text }} />
            <button onClick={sendMessage} disabled={!newMsg.trim() || sending}
              style={{ width: 44, height: 44, borderRadius: '50%', background: newMsg.trim() ? `linear-gradient(135deg,${C.purple},${C.blue})` : C.border, border: 'none', cursor: newMsg.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.18s' }}>
              <Send size={18} color="#fff" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Review Modal — appears after completing swap */}
      {showReview && otherUser && (
        <ReviewModal
          otherUser={otherUser}
          swapId={swapId}
          onClose={() => setShowReview(false)}
          onSaved={() => setShowReview(false)}
        />
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Conversation list item ────────────────────────────────────
function ConvItem({ conv, userId, onClick }) {
  const [otherUser, setOtherUser] = useState(null)
  const [bookTitle, setBookTitle] = useState('')

  useEffect(() => {
    const load = async () => {
      const otherId = conv.user1_id === userId ? conv.user2_id : conv.user1_id
      const { data: p } = await supabase.from('profiles').select('name, avatar_url').eq('id', otherId).single()
      setOtherUser(p)
      if (conv.swap_request_id) {
        const { data: s } = await supabase.from('swap_requests').select('books!requested_book_id(title)').eq('id', conv.swap_request_id).single()
        setBookTitle(s?.books?.title || 'Buch')
      }
    }
    load()
  }, [conv.id])

  return (
    <div onClick={onClick} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '1rem 1.2rem', marginBottom: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
      <Avatar letter={otherUser?.name || '?'} size={46} src={otherUser?.avatar_url} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: C.text, marginBottom: 2 }}>{otherUser?.name || '...'}</div>
        <div style={{ fontSize: '0.78rem', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📚 {bookTitle || '...'}</div>
      </div>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: conv.status === 'completed' ? C.success : C.purple, background: conv.status === 'completed' ? C.successLight : C.purpleLight, padding: '0.2rem 0.6rem', borderRadius: 100, whiteSpace: 'nowrap' }}>
        {conv.status === 'completed' ? '✓ Fertig' : 'Aktiv'}
      </span>
    </div>
  )
}
