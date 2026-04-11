import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, BookOpen, Users, ArrowLeftRight, Eye, Star, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, Card, Avatar, Spinner } from '../components/UI'

// ── Admin User-IDs (sicher — nicht im Browser sichtbar) ──────
// Nur diese Supabase User-IDs haben Zugriff
const ADMIN_USER_IDS = [
  '6f4e3098-ae93-4147-8041-06d2ed75b0c4', // hemmito12@gmail.com (Mo B)
]

// ── Balken-Chart ──────────────────────────────────────────────
function BarChart({ data, color = C.purple }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 110, fontSize: '0.78rem', color: C.muted, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.label}
          </div>
          <div style={{ flex: 1, background: C.cream, borderRadius: 4, height: 22, position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0,
              width: `${Math.max((item.value / max) * 100, 2)}%`,
              background: color,
              borderRadius: 4,
              transition: 'width 0.8s ease',
            }} />
            <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', fontWeight: 700, color: item.value / max > 0.5 ? '#fff' : C.muted }}>
              {item.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Stat Card ─────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = C.purple }) {
  return (
    <Card style={{ padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} color={color} />
        </div>
        <div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: C.bark, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: '0.78rem', color: C.muted, marginTop: 2 }}>{label}</div>
          {sub && <div style={{ fontSize: '0.72rem', color: color, fontWeight: 600, marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
    </Card>
  )
}

export default function Admin() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [unlocked, setUnlocked] = useState(false)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState(false)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [accessDenied, setAccessDenied] = useState(false)

  // Prüfen ob User eingeloggt und Admin ist
  useEffect(() => {
    if (user && !ADMIN_USER_IDS.includes(user.id)) {
      setAccessDenied(true)
    }
  }, [user])

  const handleUnlock = () => {
    if (code === 'swap2024admin') {
      setUnlocked(true)
      loadStats()
    } else {
      setCodeError(true)
      setTimeout(() => setCodeError(false), 2000)
    }
  }

  const loadStats = async () => {
    setLoading(true)
    const [
      { count: totalUsers },
      { count: totalBooks },
      { count: availableBooks },
      { count: totalSwaps },
      { count: completedSwaps },
      { data: topViewedBooks },
      { data: topRequestedBooks },
      { data: categoryData },
      { data: topTraders },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('books').select('*', { count: 'exact', head: true }),
      supabase.from('books').select('*', { count: 'exact', head: true }).eq('is_available', true),
      supabase.from('swap_requests').select('*', { count: 'exact', head: true }),
      supabase.from('swap_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),

      // Top 5 meistgesehene Bücher
      supabase.from('books').select('title, author, view_count, profiles(name)')
        .eq('is_available', true)
        .order('view_count', { ascending: false })
        .limit(5),

      // Top 5 meistgefragte Bücher (meiste Tausch-Anfragen)
      supabase.from('swap_requests').select('requested_book_id, books!requested_book_id(title, author)')
        .not('status', 'eq', 'declined'),

      // Bücher pro Kategorie
      supabase.from('books').select('category').eq('is_available', true),

      // Top Tauscher
      supabase.from('profiles').select('name, avatar_url, trades_count, city')
        .order('trades_count', { ascending: false })
        .limit(5),
    ])

    // Kategorien auswerten
    const catMap = {}
    categoryData?.forEach(b => {
      const cat = b.category || 'Sonstiges'
      catMap[cat] = (catMap[cat] || 0) + 1
    })
    const categories = Object.entries(catMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)

    // Meistgefragte Bücher auswerten
    const reqMap = {}
    topRequestedBooks?.forEach(r => {
      const title = r.books?.title
      if (title) reqMap[title] = (reqMap[title] || 0) + 1
    })
    const topRequested = Object.entries(reqMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    setStats({
      totalUsers: totalUsers || 0,
      totalBooks: totalBooks || 0,
      availableBooks: availableBooks || 0,
      totalSwaps: totalSwaps || 0,
      completedSwaps: completedSwaps || 0,
      topViewedBooks: topViewedBooks || [],
      topRequested,
      categories,
      topTraders: topTraders || [],
    })
    setLoading(false)
  }

  // ── Kein Zugriff ──────────────────────────────────────────
  if (accessDenied) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🚫</div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 900, color: C.bark, marginBottom: 8 }}>Kein Zugriff</h1>
          <p style={{ fontSize: '0.85rem', color: C.muted, marginBottom: 20 }}>Du hast keine Berechtigung für diesen Bereich.</p>
          <button onClick={() => navigate('/')} style={{ padding: '0.7rem 1.5rem', borderRadius: 12, background: `linear-gradient(135deg,${C.bark},${C.purple})`, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Zur Startseite
          </button>
        </div>
      </div>
    )
  }

  // ── Login Screen ───────────────────────────────────────────
  if (!unlocked) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
        <div style={{ maxWidth: 360, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔐</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: C.bark, marginBottom: 8 }}>Admin-Bereich</h1>
          <p style={{ fontSize: '0.85rem', color: C.muted, marginBottom: 24 }}>Nur für Administratoren</p>
          <input
            value={code}
            onChange={e => setCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
            type="password"
            placeholder="Zugangscode eingeben"
            style={{ width: '100%', padding: '0.85rem 1rem', border: `2px solid ${codeError ? '#EF4444' : C.border}`, borderRadius: 12, outline: 'none', fontSize: '1rem', textAlign: 'center', color: C.text, background: C.bg, marginBottom: 12, boxSizing: 'border-box', transition: 'border-color 0.2s' }}
          />
          {codeError && <p style={{ color: '#EF4444', fontSize: '0.82rem', marginBottom: 8 }}>Falscher Zugangscode</p>}
          <button onClick={handleUnlock} style={{ width: '100%', padding: '0.85rem', borderRadius: 12, background: `linear-gradient(135deg,${C.bark},${C.purple})`, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem' }}>
            Einloggen
          </button>
          <button onClick={() => navigate(-1)} style={{ marginTop: 12, background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '0.85rem' }}>
            ← Zurück
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, zIndex: 50 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={C.muted} />
        </button>
        <div>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text }}>📊 Analytics Dashboard</span>
        </div>
        <button onClick={loadStats} style={{ marginLeft: 'auto', padding: '0.4rem 0.8rem', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: '0.78rem' }}>
          🔄 Aktualisieren
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <Spinner size={36} />
        </div>
      ) : stats ? (
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '1.5rem' }}>

          {/* ── Übersicht ── */}
          <h2 style={{ fontSize: '0.78rem', fontWeight: 700, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Übersicht</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10, marginBottom: 24 }}>
            <StatCard icon={Users} label="Registrierte User" value={stats.totalUsers} color={C.blue} />
            <StatCard icon={BookOpen} label="Bücher online" value={stats.availableBooks} sub={`${stats.totalBooks} gesamt`} color={C.purple} />
            <StatCard icon={ArrowLeftRight} label="Tausche gesamt" value={stats.totalSwaps} sub={`${stats.completedSwaps} abgeschlossen`} color={C.success} />
            <StatCard icon={TrendingUp} label="Abschlussrate" value={stats.totalSwaps > 0 ? Math.round((stats.completedSwaps / stats.totalSwaps) * 100) + '%' : '–'} color={C.warning} />
          </div>

          {/* ── Beliebteste Bücher nach Aufrufen ── */}
          <Card style={{ padding: '1.25rem', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Eye size={16} color={C.purple} />
              <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: C.text }}>Meistgesehene Bücher</h3>
              <span style={{ fontSize: '0.72rem', color: C.muted, marginLeft: 4 }}>nach Aufrufen</span>
            </div>
            {stats.topViewedBooks.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: C.muted, textAlign: 'center', padding: '1rem' }}>Noch keine Aufrufe gemessen</p>
            ) : (
              <BarChart
                data={stats.topViewedBooks.map(b => ({ label: b.title, value: b.view_count || 0 }))}
                color={C.purple}
              />
            )}
          </Card>

          {/* ── Meistgefragte Bücher ── */}
          <Card style={{ padding: '1.25rem', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <ArrowLeftRight size={16} color={C.blue} />
              <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: C.text }}>Meistgefragte Bücher</h3>
              <span style={{ fontSize: '0.72rem', color: C.muted, marginLeft: 4 }}>nach Tausch-Anfragen</span>
            </div>
            {stats.topRequested.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: C.muted, textAlign: 'center', padding: '1rem' }}>Noch keine Anfragen</p>
            ) : (
              <BarChart data={stats.topRequested} color={C.blue} />
            )}
          </Card>

          {/* ── Beliebte Kategorien ── */}
          <Card style={{ padding: '1.25rem', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <BookOpen size={16} color={C.success} />
              <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: C.text }}>Bücher nach Kategorie</h3>
            </div>
            {stats.categories.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: C.muted, textAlign: 'center', padding: '1rem' }}>Keine Daten</p>
            ) : (
              <BarChart data={stats.categories} color={C.success} />
            )}
          </Card>

          {/* ── Top Tauscher ── */}
          <Card style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Star size={16} color={C.warning} />
              <h3 style={{ fontWeight: 700, fontSize: '0.9rem', color: C.text }}>Aktivste Tauscher</h3>
            </div>
            {stats.topTraders.filter(t => t.trades_count > 0).length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: C.muted, textAlign: 'center', padding: '1rem' }}>Noch keine abgeschlossenen Tausche</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stats.topTraders.filter(t => t.trades_count > 0).map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 20, fontSize: '0.78rem', fontWeight: 700, color: i === 0 ? '#F59E0B' : C.muted, textAlign: 'center' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                    </span>
                    <Avatar letter={t.name || '?'} size={34} src={t.avatar_url} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.text }}>{t.name}</div>
                      {t.city && <div style={{ fontSize: '0.72rem', color: C.muted }}>📍 {t.city}</div>}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1rem', fontWeight: 900, color: C.purple }}>{t.trades_count}</div>
                      <div style={{ fontSize: '0.68rem', color: C.muted }}>Tausche</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>
      ) : null}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
