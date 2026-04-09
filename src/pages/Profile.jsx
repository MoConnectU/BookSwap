import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Check, Bell, LogOut, Trash2, MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, Card, Avatar, Badge, PrimaryBtn, Spinner } from '../components/UI'

const COLORS = [
  'linear-gradient(135deg,#7C3AED,#A78BFA)',
  'linear-gradient(135deg,#2563EB,#60A5FA)',
  'linear-gradient(135deg,#0F766E,#34D399)',
  'linear-gradient(135deg,#D97706,#FCD34D)',
]

export default function Profile() {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const [myBooks, setMyBooks] = useState([])
  const [swapRequests, setSwapRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('books')
  const [deleting, setDeleting] = useState(null)
  const [responding, setResponding] = useState(null)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    fetchMyData()
  }, [user])

  const fetchMyData = async () => {
    setLoading(true)
    const [{ data: books }, { data: swaps }] = await Promise.all([
      supabase.from('books').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('swap_requests')
        .select('*, books!requested_book_id(title, author), profiles!requester_id(name, avatar_url)')
        .eq('owner_id', user.id).eq('status', 'pending')
    ])
    setMyBooks(books || [])
    setSwapRequests(swaps || [])
    setLoading(false)
  }

  const handleDeleteBook = async (bookId, coverUrl) => {
    if (!window.confirm('Buch wirklich löschen? Das kann nicht rückgängig gemacht werden.')) return
    setDeleting(bookId)
    if (coverUrl && coverUrl.includes('/book-covers/')) {
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
    setResponding(null)
    if (status === 'accepted') {
      // Chat wird automatisch erstellt via DB Trigger
      // Kurz warten dann zu Chat navigieren
      setTimeout(() => navigate('/chat'), 800)
    }
    fetchMyData()
  }

  const handleSignOut = async () => { await signOut(); navigate('/') }
  const name = profile?.name || user?.email?.split('@')[0] || 'Leser'

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,${C.purple},${C.blue})`, padding: '2.5rem 1.5rem 3.5rem' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Avatar letter={name} size={72} src={profile?.avatar_url} />
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>{name}</h2>
              <p style={{ opacity: 0.7, fontSize: '0.82rem', color: '#fff', marginTop: 2 }}>{user?.email}</p>
              <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
                {[[myBooks.length,'Bücher'],[profile?.trades_count||0,'Tausche'],[profile?.rating?profile.rating.toFixed(1)+'★':'–','Bewertung']].map(([n,l]) => (
                  <div key={l}>
                    <div style={{ fontWeight: 900, fontSize: '1.2rem', color: '#fff' }}>{n}</div>
                    <div style={{ fontSize: '0.7rem', opacity: 0.65, color: '#fff' }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <button onClick={handleSignOut} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10, padding: '0.6rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: '0.82rem', fontWeight: 500 }}>
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
          <Card onClick={() => navigate('/chat')} style={{ padding: '1.1rem', display: 'flex', alignItems: 'center', gap: 10, position: 'relative', cursor: 'pointer' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.blueLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><MessageCircle size={18} color={C.blue} /></div>
            <div><div style={{ fontWeight: 700, fontSize: '0.85rem', color: C.text }}>Nachrichten</div><div style={{ fontSize: '0.72rem', color: C.muted }}>Chat öffnen</div></div>
          </Card>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: 20 }}>
          {[['books','Mein Regal'],['swaps',`Anfragen (${swapRequests.length})`]].map(([id,label]) => (
            <div key={id} onClick={() => setTab(id)} style={{ padding: '0.7rem 1.3rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', color: tab===id?C.text:C.muted, borderBottom: `2px solid ${tab===id?C.purple:'transparent'}`, marginBottom: -1, position: 'relative' }}>
              {label}
              {id === 'swaps' && swapRequests.length > 0 && (
                <span style={{ position: 'absolute', top: 8, right: 4, width: 16, height: 16, borderRadius: '50%', background: C.purple, color: '#fff', fontSize: '0.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{swapRequests.length}</span>
              )}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><Spinner /></div>
        ) : tab === 'books' ? (
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
                      <button onClick={() => handleDeleteBook(b.id, b.cover_url)} disabled={deleting === b.id} style={{ width: '100%', padding: '0.45rem', borderRadius: 8, border: '1px solid #FEE2E2', background: '#FFF5F5', color: '#EF4444', cursor: deleting === b.id ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                        <Trash2 size={12} />{deleting === b.id ? 'Löschen...' : 'Löschen'}
                      </button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : (
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
                      style={{ flex: 1, padding: '0.65rem', borderRadius: 10, border: 'none', background: responding === s.id ? C.border : `linear-gradient(135deg,${C.purple},${C.blue})`, color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: responding === s.id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      <Check size={14} /> {responding === s.id ? 'Wird angenommen...' : 'Annehmen → Chat öffnet sich'}
                    </button>
                    <button
                      onClick={() => handleSwapResponse(s.id, 'declined')}
                      disabled={responding === s.id}
                      style={{ padding: '0.65rem 1rem', borderRadius: 10, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      Ablehnen
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
