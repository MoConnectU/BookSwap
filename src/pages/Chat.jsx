import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft, Send, Check, Package, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, Avatar, Spinner } from '../components/UI'

export default function Chat() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [convDetails, setConvDetails] = useState({})
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [otherUser, setOtherUser] = useState(null)
  const [bookTitle, setBookTitle] = useState('')
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [deletingConv, setDeletingConv] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    const convId = searchParams.get('conv')
    fetchConversations(convId)
  }, [user])

  useEffect(() => {
    if (!activeConv) return
    fetchMessages(activeConv.id)
    fetchConvDetails(activeConv)
    const sub = supabase.channel(`chat_${activeConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${activeConv.id}`
      }, payload => setMessages(prev => [...prev, payload.new]))
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [activeConv])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchConversations = async (openConvId = null) => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .not('hidden_for', 'cs', `{${user.id}}`)  // ausblenden wenn User es gelöscht hat
      .order('updated_at', { ascending: false })

    if (error) { setError('Nachrichten konnten nicht geladen werden.'); setLoading(false); return }

    const convs = data || []
    setConversations(convs)

    if (convs.length > 0) {
      const otherUserIds = convs.map(c => c.user1_id === user.id ? c.user2_id : c.user1_id)
      const swapIds = convs.filter(c => c.swap_request_id).map(c => c.swap_request_id)

      const [{ data: profiles }, { data: swaps }] = await Promise.all([
        supabase.from('profiles').select('id, name, avatar_url').in('id', [...new Set(otherUserIds)]),
        swapIds.length > 0
          ? supabase.from('swap_requests').select('id, books!requested_book_id(title)').in('id', swapIds)
          : Promise.resolve({ data: [] })
      ])

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
      const swapMap = Object.fromEntries((swaps || []).map(s => [s.id, s]))

      const details = {}
      convs.forEach(c => {
        const otherId = c.user1_id === user.id ? c.user2_id : c.user1_id
        details[c.id] = {
          otherUser: profileMap[otherId] || null,
          bookTitle: c.swap_request_id ? (swapMap[c.swap_request_id]?.books?.title || 'Buch') : ''
        }
      })
      setConvDetails(details)

      if (openConvId) {
        const conv = convs.find(c => c.id === openConvId)
        if (conv) { setActiveConv(conv); setLoading(false); return }
      }
    }

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
    if (!window.confirm('Tausch als abgeschlossen markieren?')) return
    setCompleting(true)
    try {
      if (activeConv.swap_request_id) {
        const { data: swap, error: swapError } = await supabase.from('swap_requests')
          .select('*').eq('id', activeConv.swap_request_id).single()
        if (swapError || !swap) throw new Error('Tausch nicht gefunden')
        await supabase.from('swap_requests').update({ status: 'completed' }).eq('id', swap.id)
        if (swap.requested_book_id) await supabase.from('books').update({ is_available: false }).eq('id', swap.requested_book_id)
        if (swap.offered_book_id) await supabase.from('books').update({ is_available: false }).eq('id', swap.offered_book_id)
        try {
          await supabase.rpc('increment_trades', { user_id: swap.requester_id })
          await supabase.rpc('increment_trades', { user_id: swap.owner_id })
        } catch (rpcErr) { console.warn('Tausch-Zähler Fehler:', rpcErr) }
      }
      await supabase.from('conversations').update({ status: 'completed' }).eq('id', activeConv.id)
      setActiveConv(prev => ({ ...prev, status: 'completed' }))
      fetchConversations()
      navigate('/profile')
    } catch (err) {
      alert('Fehler beim Abschließen. Bitte versuche es erneut.')
    } finally {
      setCompleting(false)
    }
  }

  // Konversation für diesen User ausblenden
  const handleDeleteConversation = async () => {
    if (!window.confirm('Diesen Chat aus deiner Liste entfernen? Der andere Nutzer sieht ihn weiterhin.')) return
    setDeletingConv(true)
    await supabase.rpc('hide_conversation_for_user', { conv_id: activeConv.id, user_id: user.id })
    setDeletingConv(false)
    handleBackToList()
    fetchConversations()
  }

  const handleBackToList = () => {
    setActiveConv(null)
    setOtherUser(null)
    navigate('/chat', { replace: true })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: C.bg }}>
        <Spinner size={36} />
      </div>
    )
  }

  // ── CONVERSATION LIST ──────────────────────────────────────────
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
          {error ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: C.muted }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>😕</div>
              <p style={{ fontWeight: 600, marginBottom: 8, color: C.text }}>{error}</p>
              <button onClick={() => fetchConversations()} style={{ padding: '0.6rem 1.5rem', borderRadius: 10, border: `1.5px solid ${C.border}`, background: 'transparent', color: C.purple, cursor: 'pointer', fontWeight: 600 }}>Erneut versuchen</button>
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: C.muted }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>💬</div>
              <p style={{ fontWeight: 600, marginBottom: 6 }}>Noch keine Nachrichten</p>
              <p style={{ fontSize: '0.85rem' }}>Biete einen Tausch an um eine Unterhaltung zu starten</p>
            </div>
          ) : conversations.map(conv => {
            const details = convDetails[conv.id] || {}
            return (
              <div key={conv.id}
                onClick={() => { setActiveConv(conv); setOtherUser(null); setBookTitle('') }}
                style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '1rem 1.2rem', marginBottom: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar letter={details.otherUser?.name || '?'} size={46} src={details.otherUser?.avatar_url} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: C.text, marginBottom: 2 }}>{details.otherUser?.name || '...'}</div>
                  <div style={{ fontSize: '0.78rem', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📚 {details.bookTitle || '...'}</div>
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 600, color: conv.status === 'completed' ? C.success : C.purple, background: conv.status === 'completed' ? C.successLight : C.purpleLight, padding: '0.2rem 0.6rem', borderRadius: 100, whiteSpace: 'nowrap' }}>
                  {conv.status === 'completed' ? '✓ Fertig' : 'Aktiv'}
                </span>
              </div>
            )
          })}
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // ── CHAT VIEW ──────────────────────────────────────────────────
  const isCompleted = activeConv.status === 'completed'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg }}>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={handleBackToList} style={{ width: 36, height: 36, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={C.muted} />
        </button>
        <Avatar letter={otherUser?.name || '?'} size={36} src={otherUser?.avatar_url} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: C.text }}>{otherUser?.name || '...'}</div>
          <div style={{ fontSize: '0.72rem', color: C.muted }}>📚 {bookTitle || '...'}</div>
        </div>

        {/* Chat löschen Button */}
        <button
          onClick={handleDeleteConversation}
          disabled={deletingConv}
          title="Chat aus meiner Liste entfernen"
          style={{ width: 34, height: 34, borderRadius: '50%', background: C.bg, border: `1px solid ${C.border}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
        >
          <Trash2 size={14} color={C.muted} />
        </button>

        {isCompleted && (
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: C.success, background: C.successLight, padding: '0.4rem 0.8rem', borderRadius: 100 }}>✓ Abgeschlossen</span>
        )}
      </div>

      {!isCompleted && (
        <div style={{ background: C.purpleLight, padding: '0.6rem 1.5rem', textAlign: 'center', fontSize: '0.78rem', color: C.purple, fontWeight: 500 }}>
          Tausch vereinbart! Klärt hier Versanddetails. Wenn beide Bücher angekommen sind → "Tausch abschließen"
        </div>
      )}

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

      {!isCompleted ? (
        <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '0.75rem 1rem', flexShrink: 0 }}>
          <button onClick={handleCompleteSwap} disabled={completing} style={{ width: '100%', padding: '0.65rem', borderRadius: 10, border: 'none', background: completing ? C.border : C.successLight, color: completing ? C.muted : C.success, fontWeight: 700, fontSize: '0.85rem', cursor: completing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
            <Package size={15} />{completing ? 'Wird abgeschlossen...' : '✓ Tausch abschließen'}
          </button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Nachricht schreiben..."
              style={{ flex: 1, padding: '0.7rem 1rem', border: `1.5px solid ${C.border}`, borderRadius: 100, outline: 'none', fontSize: '0.9rem', background: C.bg, color: C.text }}
            />
            <button onClick={sendMessage} disabled={!newMsg.trim() || sending} style={{ width: 44, height: 44, borderRadius: '50%', background: newMsg.trim() ? `linear-gradient(135deg,${C.purple},${C.blue})` : C.border, border: 'none', cursor: newMsg.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.18s' }}>
              <Send size={18} color="#fff" />
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: C.successLight, padding: '1rem', textAlign: 'center', fontSize: '0.85rem', color: C.success, fontWeight: 600, flexShrink: 0 }}>
          ✓ Tausch abgeschlossen — Bewertung im Profil unter "Verlauf" abgeben
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
