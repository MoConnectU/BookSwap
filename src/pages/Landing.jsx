import { useNavigate } from 'react-router-dom'
import { Sparkles, ArrowRight } from 'lucide-react'
import { C, Card, PrimaryBtn, GhostBtn, Badge, CondBadge } from '../components/UI'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Landing() {
  const navigate = useNavigate()
  const [recentBooks, setRecentBooks] = useState([])
  const [stats, setStats] = useState({ books: 0, trades: 0, users: 0 })

  const COLORS = [
    'linear-gradient(135deg,#7C3AED,#A78BFA)',
    'linear-gradient(135deg,#2563EB,#60A5FA)',
    'linear-gradient(135deg,#0F766E,#34D399)',
    'linear-gradient(135deg,#D97706,#FCD34D)',
  ]

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    // Recent books
    const { data: books } = await supabase
      .from('books').select('*, profiles(name, city)')
      .eq('is_available', true)
      .order('created_at', { ascending: false })
      .limit(4)
    if (books) setRecentBooks(books)

    // Real stats
    const [
      { count: bookCount },
      { count: tradeCount },
      { count: userCount }
    ] = await Promise.all([
      supabase.from('books').select('*', { count: 'exact', head: true }),
      supabase.from('swap_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
    ])
    setStats({
      books: bookCount || 0,
      trades: tradeCount || 0,
      users: userCount || 0,
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* HERO */}
      <div style={{ background: 'linear-gradient(160deg, #1E0A3C 0%, #1E3A8A 60%, #2563EB 100%)', padding: '3.5rem 1.5rem 5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(167,139,250,0.15)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(37,99,235,0.2)', filter: 'blur(50px)' }} />
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', padding: '0.35rem 1rem', borderRadius: 100, fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500, marginBottom: 20 }}>
            <Sparkles size={12} /> Kostenlos · Nachhaltig · Einfach
          </div>
          <h1 style={{ fontSize: 'clamp(2rem,6vw,3rem)', fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 16, letterSpacing: '-0.02em' }}>
            Bücher tauschen,<br />
            <span style={{ background: 'linear-gradient(90deg,#A78BFA,#60A5FA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              statt kaufen.
            </span>
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 28, maxWidth: 440, margin: '0 auto 28px' }}>
            Stell deine gelesenen Bücher ein und tausche sie direkt mit anderen Lesern — kostenlos, fair, nachhaltig.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <PrimaryBtn onClick={() => navigate('/explore')} style={{ background: '#fff', color: C.purple, boxShadow: '0 4px 20px rgba(255,255,255,0.2)', padding: '0.85rem 2rem', fontSize: '0.95rem' }}>
              Bücher entdecken →
            </PrimaryBtn>
            <GhostBtn onClick={() => navigate('/upload')} style={{ border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 12, padding: '0.85rem 2rem', fontSize: '0.95rem' }}>
              Buch einstellen
            </GhostBtn>
          </div>
        </div>
      </div>

      {/* REAL STATS */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '1.2rem 2rem', display: 'flex', justifyContent: 'center', gap: '2.5rem', flexWrap: 'wrap' }}>
        {[
          [stats.books, 'Bücher online'],
          [stats.trades, 'Tausche gemacht'],
          [stats.users, 'Aktive Leser'],
          ['0€', 'Pro Tausch'],
        ].map(([n, l]) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 900, fontSize: '1.3rem', background: `linear-gradient(135deg,${C.purple},${C.blue})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{n}</div>
            <div style={{ fontSize: '0.75rem', color: C.muted, fontWeight: 500 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* HOW IT WORKS */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem 1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Badge>So funktioniert's</Badge>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: C.text, marginTop: 10 }}>3 Schritte zum Wunschtitel</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1.2rem' }}>
          {[
            { step: '01', icon: '📚', title: 'Einstellen', desc: 'Foto + Titel + Zustand in 2 Minuten.', color: C.purpleLight, accent: C.purple },
            { step: '02', icon: '🔍', title: 'Entdecken', desc: 'Stöbere & finde deinen Match.', color: C.blueLight, accent: C.blue },
            { step: '03', icon: '✅', title: 'Tauschen', desc: 'Anfrage senden — beide glücklich.', color: C.successLight, accent: C.success },
          ].map(s => (
            <Card key={s.step} style={{ padding: '1.5rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', marginBottom: 12 }}>{s.icon}</div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: s.accent, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Schritt {s.step}</div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: C.text, marginBottom: 6 }}>{s.title}</h3>
              <p style={{ fontSize: '0.85rem', color: C.muted, lineHeight: 1.6 }}>{s.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* RECENT BOOKS */}
      {recentBooks.length > 0 && (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem 3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: C.text }}>Neu eingestellt</h2>
            <span onClick={() => navigate('/explore')} style={{ fontSize: '0.85rem', color: C.purple, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              Alle <ArrowRight size={14} />
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '1rem' }}>
            {recentBooks.map((b, i) => (
              <Card key={b.id} onClick={() => navigate(`/book/${b.id}`)}>
                <div style={{ height: 120, background: b.cover_url ? `url(${b.cover_url}) center/cover` : COLORS[i % COLORS.length], display: 'flex', alignItems: 'flex-end', padding: '0 0.75rem 0.75rem' }}>
                  {!b.cover_url && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{b.title}</span>}
                </div>
                <div style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.text, marginBottom: 2 }}>{b.title}</div>
                  <div style={{ fontSize: '0.72rem', color: C.muted, marginBottom: 6 }}>{b.author}</div>
                  <CondBadge cond={b.condition} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
