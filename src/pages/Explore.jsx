import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, Card, CondBadge, Avatar, Spinner } from '../components/UI'

const COLORS = [
  'linear-gradient(135deg,#3D2B1F,#C8843A)',
  'linear-gradient(135deg,#5C7A5E,#A8C5AB)',
  'linear-gradient(135deg,#8B6B4E,#C8A882)',
  'linear-gradient(135deg,#4A5E4C,#7A9E7E)',
  'linear-gradient(135deg,#6B4226,#D4956A)',
  'linear-gradient(135deg,#3D5A3E,#8FAF91)',
  'linear-gradient(135deg,#2C1F14,#8B6B4E)',
  'linear-gradient(135deg,#4A3728,#A08060)',
]

const FILTERS = ['Alle', 'Roman', 'Sachbuch', 'Schulbuch', 'Fantasy', 'Krimi', 'Kinder']

export default function Explore() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [books, setBooks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('Alle')

  useEffect(() => { fetchBooks() }, [filter])

  useEffect(() => {
    const onFocus = () => fetchBooks()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [filter])

  const fetchBooks = async () => {
    setLoading(true)
    setError(null)
    let query = supabase
      .from('books')
      .select('*, profiles(name, city, rating)')
      .eq('is_available', true)
      .order('created_at', { ascending: false })
    if (filter !== 'Alle') query = query.eq('category', filter)
    const { data, error } = await query
    if (error) { setError('Bücher konnten nicht geladen werden. Bitte versuche es erneut.'); setLoading(false); return }
    setBooks(data || [])
    setLoading(false)
  }

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
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '0.35rem 1rem', borderRadius: 100, border: 'none',
                background: filter === f ? `linear-gradient(135deg,${C.bark},${C.purple})` : C.cream,
                color: filter === f ? '#fff' : C.muted,
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                whiteSpace: 'nowrap', flexShrink: 0
              }}>
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
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: C.muted }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>😕</div>
            <p style={{ fontWeight: 600, marginBottom: 8, color: C.text }}>{error}</p>
            <button onClick={fetchBooks} style={{ padding: '0.6rem 1.5rem', borderRadius: 10, border: `1.5px solid ${C.border}`, background: 'transparent', color: C.purple, cursor: 'pointer', fontWeight: 600 }}>
              Erneut versuchen
            </button>
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
                  {/* Cover mit Badge oben links */}
                  <div style={{
                    height: 150,
                    background: b.cover_url ? `url(${b.cover_url}) center/cover` : COLORS[i % COLORS.length],
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '0.6rem',
                  }}>
                    {/* Badge oben links — solide Farbe */}
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <CondBadge cond={b.condition} />
                    </div>
                    {!b.cover_url && (
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{b.title}</span>
                    )}
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
                    <button onClick={e => { e.stopPropagation(); navigate(`/book/${b.id}`) }} style={{
                      width: '100%', padding: '0.5rem', borderRadius: 8,
                      border: `1.5px solid ${C.border}`, background: 'transparent',
                      cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: C.purple
                    }}>
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
