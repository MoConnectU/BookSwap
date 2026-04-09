import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Send, Check, Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, Avatar, Spinner } from '../components/UI'

export default function Chat() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [otherUser, setOtherUser] = useState(null)
  const [bookTitle, setBookTitle] = useState('')
  const [newMsg, setNewMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
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
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'messages',
          filter: `conversation_id=eq.${activeConv.id}`
        }, payload => {
          setMessages(prev => [...prev, payload.new])
        })
        .subscribe()
      return () => supabase.removeChannel(sub)
    }
  }, [activeConv])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchConversations = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('updated_at', { ascending: false })

    if (error) console.error('Conv error:', error)
    setConversations(data || [])
    setLoading(false)
  }

  const fetchConvDetails = async (conv) => {
    // Get other user
    const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id
    const { data: otherProfile } = await supabase
      .from('profiles').select('*').eq('id', otherId).single()
    setOtherUser(otherProfile)

    // Get book title from swap request
    if (conv.swap_request_id) {
      const { data: swap } = await supabase
        .from('swap_requests')
        .select('books!requested_book_id(title)')
        .eq('id', conv.swap_request_id)
        .single()
      setBookTitle(swap?.books?.title || 'Buch')
    }
  }

  const fetchConvDetails_list = async (conv) => {
    const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id
    const { data } = await supabase.from('profiles').select('name, avatar_url').eq('id', otherId).single()
    return data
  }

  const fetchMessages = async (convId) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConv || sending) return
    setSending(true)
    const text = newMsg.trim()
    setNewMsg('')

    const { data: msg } = await supabase.from('messages').insert({
      conversation_id: activeConv.id,
      sender_id: user.id,
      text
    }).select().single()

    // Realtime listener handles the new message
    await supabase.from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', activeConv.id)
    setSending(false)
  }

  const handleCompleteSwap = async () => {
    if (!window.confirm('Tausch als abgeschlossen markieren? Beide Bücher werden als getauscht markiert.')) return
    if (activeConv.swap_request_id) {
      // Get the swap to find both books
      const { data: swap } = await supabase
        .from('swap_requests')
        .select('*')
        .eq('id', activeConv.swap_request_id)
        .single()
      if (swap) {
        await supabase.from('swap_requests').update({ status: 'completed' }).eq('id', swap.id)
        if (swap.requested_book_id) await supabase.from('books').update({ is_available: false }).eq('id', swap.requested_book_id)
        if (swap.offered_book_id) await supabase.from('books').update({ is_available: false }).eq('id', swap.offered_book_id)
      }
    }
    await supabase.from('conversations').update({ status: 'completed' }).eq('id', activeConv.id)
    setActiveConv(prev => ({ ...prev, status: 'completed' }))
    // Send system message
    await supabase.from('messages').insert({
      conversation_id: activeConv.id,
      sender_id: user.id,
      text: '✅ Tausch wurde als abgeschlossen markiert!'
    })
    fetchMessages(activeConv.id)
    fetchConversations()
  }

  // ── CONVERSATION LIST ──────────────────────────────────────
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
          ) : (
            conversations.map(conv => (
              <ConvItem key={conv.id} conv={conv} userId={user.id} onClick={() => setActiveConv(conv)} />
            ))
          )}
        </div>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  // ── CHAT VIEW ──────────────────────────────────────────────
  const isCompleted = activeConv.status === 'completed'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: C.bg }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => { setActiveConv(null); setOtherUser(null); }} style={{ width: 36, height: 36, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={C.muted} />
        </button>
        <Avatar letter={otherUser?.name || '?'} size={36} src={otherUser?.avatar_url} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: C.text }}>{otherUser?.name || 'Lade...'}</div>
          <div style={{ fontSize: '0.72rem', color: C.muted }}>📚 {bookTitle}</div>
        </div>
        {!isCompleted ? (
          <button onClick={handleCompleteSwap} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 0.9rem', background: C.successLight, border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: C.success, whiteSpace: 'nowrap' }}>
            <Package size={14} /> Tausch abschließen
          </button>
        ) : (
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: C.success, background: C.successLight, padding: '0.4rem 0.8rem', borderRadius: 100 }}>✓ Abgeschlossen</span>
        )}
      </div>

      {/* Info banner */}
      <div style={{ background: C.purpleLight, padding: '0.6rem 1.5rem', textAlign: 'center', fontSize: '0.78rem', color: C.purple, fontWeight: 500 }}>
        Tausch vereinbart! Klärt hier Versanddetails. Wenn beide Bücher angekommen sind → "Tausch abschließen"
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: C.muted, fontSize: '0.85rem' }}>
            Schreib die erste Nachricht! 👋<br />
            Klärt Versandadresse und wer zuerst schickt.
          </div>
        )}
        {messages.map(msg => {
          const isMe = msg.sender_id === user.id
          const isSystem = msg.text?.startsWith('✅')
          if (isSystem) return (
            <div key={msg.id} style={{ textAlign: 'center', padding: '0.5rem 1rem', background: C.successLight, borderRadius: 100, fontSize: '0.8rem', color: C.success, fontWeight: 600, margin: '4px auto', maxWidth: 320 }}>
              {msg.text}
            </div>
          )
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

      {/* Input */}
      {!isCompleted ? (
        <div style={{ background: C.surface, borderTop: `1px solid ${C.border}`, padding: '0.75rem 1rem', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <input
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Nachricht schreiben..."
            style={{ flex: 1, padding: '0.7rem 1rem', border: `1.5px solid ${C.border}`, borderRadius: 100, outline: 'none', fontSize: '0.9rem', background: C.bg, color: C.text }}
          />
          <button
            onClick={sendMessage}
            disabled={!newMsg.trim() || sending}
            style={{ width: 44, height: 44, borderRadius: '50%', background: newMsg.trim() ? `linear-gradient(135deg,${C.purple},${C.blue})` : C.border, border: 'none', cursor: newMsg.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: newMsg.trim() ? '0 4px 12px rgba(124,58,237,0.35)' : 'none', transition: 'all 0.18s' }}
          >
            <Send size={18} color="#fff" />
          </button>
        </div>
      ) : (
        <div style={{ background: C.successLight, padding: '1rem', textAlign: 'center', fontSize: '0.85rem', color: C.success, fontWeight: 600 }}>
          ✓ Dieser Tausch ist abgeschlossen — Viel Spaß mit dem Buch! 📚
        </div>
      )}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

// ── Conversation list item with async profile loading ────────
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
    <div onClick={onClick} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '1rem 1.2rem', marginBottom: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, transition: 'all 0.18s' }}>
      <Avatar letter={otherUser?.name || '?'} size={46} src={otherUser?.avatar_url} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: C.text, marginBottom: 2 }}>{otherUser?.name || '...'}</div>
        <div style={{ fontSize: '0.78rem', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          📚 {bookTitle || '...'}
        </div>
      </div>
      <span style={{ fontSize: '0.7rem', fontWeight: 600, color: conv.status === 'completed' ? C.success : C.purple, background: conv.status === 'completed' ? C.successLight : C.purpleLight, padding: '0.2rem 0.6rem', borderRadius: 100, whiteSpace: 'nowrap' }}>
        {conv.status === 'completed' ? '✓ Fertig' : 'Aktiv'}
      </span>
    </div>
  )
}
