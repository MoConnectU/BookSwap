import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, Card, CondBadge, Avatar, Spinner } from '../components/UI'

const COLORS = [
  'linear-gradient(135deg,#7C3AED,#A78BFA)',
  'linear-gradient(135deg,#2563EB,#60A5FA)',
  'linear-gradient(135deg,#0F766E,#34D399)',
  'linear-gradient(135deg,#D97706,#FCD34D)',
  'linear-gradient(135deg,#DC2626,#F87171)',
  'linear-gradient(135deg,#7C3AED,#DB2777)',
  'linear-gradient(135deg,#1E3A8A,#2563EB)',
  'linear-gradient(135deg,#065F46,#34D399)',
]

const FILTERS = ['Alle', 'Roman', 'Sachbuch', 'Schulbuch', 'Fantasy', 'Krimi', 'Kinder']

export default function Explore() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Alle')

  useEffect(() => { fetchBooks() }, [filter])

  const fetchBooks = async () => {
    setLoading(true)
    let query = supabase
      .from('books')
      .select('*, profiles(name, city, rating)')
      .eq('is_available', true)
      .order('created_at', { ascending: false })

    if (filter !== 'Alle') query = query.eq('category', filter)

    const { data, error } = await query
    if (!error) setBooks(data || [])
    setLoading(false)
  }

  // Bug 1 fix: filter out own books + search filter
  const filtered = books.filter(b => {
    const notOwn = !user || b.user_id !== user.id
    const matchSearch = b.title?.toLowerCase().includes(search.toLowerCase()) ||
      b.author?.toLowerCase().includes(search.toLowerCase())
    return notOwn && matchSearch
  })

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* Search + filters */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '1rem 1.5rem', position: 'sticky', top: 60, zIndex: 50 }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: '0.6rem 1rem', marginBottom: 12 }}>
            <Search size={16} color={C.muted} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Titel, Autor oder ISBN suchen..."
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', color: C.text, flex: 1 }}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: '0.35rem 1rem', borderRadius: 100, border: 'none', background: filter === f ? `linear-gradient(135deg,${C.purple},${C.blue})` : C.bg, color: filter === f ? '#fff' : C.muted, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
            <Spinner size={36} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: C.muted }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📭</div>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>Keine Bücher gefunden</p>
            <p style={{ fontSize: '0.85rem' }}>Versuche eine andere Suchanfrage oder Kategorie</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '0.82rem', color: C.muted, marginBottom: 14, fontWeight: 500 }}>
              {filtered.length} {filtered.length === 1 ? 'Buch' : 'Bücher'} gefunden
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(175px,1fr))', gap: '1rem' }}>
              {filtered.map((b, i) => (
                <Card key={b.id} onClick={() => navigate(`/book/${b.id}`)}>
                  <div style={{ height: 150, background: b.cover_url ? `url(${b.cover_url}) center/cover` : COLORS[i % COLORS.length], display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0.75rem' }}>
                    <CondBadge cond={b.condition} />
                    {!b.cover_url && <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{b.title}</span>}
                  </div>
                  <div style={{ padding: '0.9rem' }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: C.text, marginBottom: 2 }}>{b.title}</div>
                    <div style={{ fontSize: '0.75rem', color: C.muted, marginBottom: 10 }}>{b.author}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <Avatar letter={b.profiles?.name || '?'} size={22} />
                      <div>
                        <div style={{ fontSize: '0.72rem', fontWeight: 600, color: C.text }}>{b.profiles?.name}</div>
                        {b.profiles?.city && (
                          <div style={{ fontSize: '0.68rem', color: C.muted, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <MapPin size={9} />{b.profiles.city}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/book/${b.id}`) }}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: 8, border: `1.5px solid ${C.border}`, background: 'transparent', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: C.purple }}
                    >
                      ⇄ Tausch anbieten
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
