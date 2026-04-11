import { useNavigate } from 'react-router-dom'
import { ArrowRight, Package } from 'lucide-react'
import { C, Card, PrimaryBtn, GhostBtn, CondBadge } from '../components/UI'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

// ── Count-Up Hook ──────────────────────────────────────────────
function useCountUp(target, duration = 1200, start = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start || target === 0) { setValue(target); return }
    const startTime = performance.now()
    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(animate)
      else setValue(target)
    }
    requestAnimationFrame(animate)
  }, [target, start, duration])
  return value
}

// ── Animated Stat ──────────────────────────────────────────────
function AnimatedStat({ value, label, prefix = '', suffix = '', delay = 0 }) {
  const [started, setStarted] = useState(false)
  const ref = useRef(null)
  const count = useCountUp(typeof value === 'number' ? value : 0, 1400 + delay, started)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true) },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const display = typeof value === 'number' ? `${prefix}${count}${suffix}` : value

  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <div style={{
        fontWeight: 900,
        fontSize: '1.6rem',
        background: `linear-gradient(135deg,${C.purple},${C.blue})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '-0.02em',
        lineHeight: 1,
        marginBottom: 4,
        transition: 'all 0.05s',
      }}>
        {display}
      </div>
      <div style={{ fontSize: '0.75rem', color: C.muted, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

// ── Steps mit Pfad ─────────────────────────────────────────────
const STEPS = [
  { num: '01', emoji: '📚', title: 'Buch einstellen', desc: 'Foto, Titel & Zustand hochladen' },
  { num: '02', emoji: '🔍', title: 'Entdecken', desc: 'Stöbere & finde deinen Match' },
  { num: '03', emoji: '🤝', title: 'Anfragen', desc: 'Biete dein Buch als Tausch an' },
  { num: '04', emoji: '💬', title: 'Versand klären', desc: 'Im Chat Adresse austauschen' },
  { num: '05', emoji: '⭐', title: 'Bewerten', desc: 'Tausch abschließen & bewerten' },
]

function HowItWorks() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '3.5rem 1.5rem 1rem' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <span style={{ display: 'inline-block', padding: '0.25rem 1rem', borderRadius: 100, background: C.purpleLight, color: C.purple, fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>
          So funktioniert's
        </span>
        <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 900, color: C.text, letterSpacing: '-0.02em', margin: 0 }}>
          In 5 Schritten zum Tausch
        </h2>
        <p style={{ color: C.muted, fontSize: '0.9rem', marginTop: 8 }}>
          Jeder zahlt seinen eigenen Versand — kein Geld, nur Bücher.
        </p>
      </div>

      {/* Steps mit Verbindungslinie */}
      <div style={{ position: 'relative' }}>
        {/* Verbindungslinie (desktop) */}
        <div style={{
          position: 'absolute',
          top: 28,
          left: '10%',
          right: '10%',
          height: 2,
          background: `linear-gradient(90deg, ${C.purpleLight}, ${C.purple}33, ${C.blue}33, ${C.purpleLight})`,
          borderRadius: 1,
          display: 'none',
        }} className="steps-line" />

        <div style={{ display: 'flex', gap: 0, justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 20 }}>
          {STEPS.map((step, i) => (
            <div key={step.num} style={{ display: 'flex', alignItems: 'flex-start', gap: 0, flex: '1 1 180px', maxWidth: 200, position: 'relative' }}>
              {/* Pfeil zwischen Steps */}
              {i < STEPS.length - 1 && (
                <div style={{
                  position: 'absolute',
                  right: -16,
                  top: 22,
                  zIndex: 1,
                  color: C.purpleMid,
                  fontSize: '1rem',
                  fontWeight: 900,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <ArrowRight size={14} color={C.purpleMid} />
                </div>
              )}

              <div style={{
                background: C.surface,
                border: `1.5px solid ${C.border}`,
                borderRadius: 16,
                padding: '1.1rem 0.9rem',
                width: '100%',
                textAlign: 'center',
                transition: 'all 0.2s',
                position: 'relative',
              }}>
                {/* Schritt-Nummer oben links */}
                <div style={{
                  position: 'absolute',
                  top: 8,
                  left: 10,
                  fontSize: '0.6rem',
                  fontWeight: 800,
                  color: C.purpleMid,
                  letterSpacing: '0.05em',
                }}>
                  {step.num}
                </div>

                {/* Emoji zentriert */}
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: C.purpleLight,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  margin: '0 auto 10px',
                }}>
                  {step.emoji}
                </div>

                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: C.text, marginBottom: 4 }}>
                  {step.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: C.muted, lineHeight: 1.5 }}>
                  {step.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Versand-Hinweis */}
      <div style={{ marginTop: 24, background: C.purpleLight, borderRadius: 14, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Package size={20} color={C.purple} style={{ flexShrink: 0 }} />
        <div>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: C.purple, marginBottom: 2 }}>Wie läuft der Versand?</p>
          <p style={{ fontSize: '0.8rem', color: C.muted, lineHeight: 1.5 }}>Jeder schickt sein Buch auf eigene Kosten. Klärt im Chat Adressen & wer zuerst schickt. Büchersendung bei der Post kostet oft unter 2€.</p>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────
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

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    const { data: books } = await supabase
      .from('books').select('*, profiles(name, city)')
      .eq('is_available', true)
      .order('created_at', { ascending: false })
      .limit(4)
    if (books) setRecentBooks(books)

    const [{ count: bookCount }, { count: tradeCount }, { count: userCount }] = await Promise.all([
      supabase.from('books').select('*', { count: 'exact', head: true }).eq('is_available', true),
      supabase.from('swap_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
    ])
    setStats({ books: bookCount || 0, trades: tradeCount || 0, users: userCount || 0 })
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* HERO */}
      <div style={{ background: 'linear-gradient(160deg, #1E0A3C 0%, #1E3A8A 60%, #2563EB 100%)', padding: '3.5rem 1.5rem 5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(167,139,250,0.15)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(37,99,235,0.2)', filter: 'blur(50px)' }} />
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', padding: '0.35rem 1rem', borderRadius: 100, fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500, marginBottom: 20 }}>
            ✨ Kostenlos · Nachhaltig · Einfach
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

      {/* STATS mit Count-Up */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(1.5rem, 5vw, 4rem)', flexWrap: 'wrap' }}>
          <AnimatedStat value={stats.books} label="Bücher online" delay={0} />
          <AnimatedStat value={stats.trades} label="Tausche gemacht" delay={100} />
          <AnimatedStat value={stats.users} label="Aktive Leser" delay={200} />
          <AnimatedStat value="0€" label="Pro Tausch" delay={300} />
        </div>
      </div>

      {/* HOW IT WORKS */}
      <HowItWorks />

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
                <div style={{ height: 120, background: b.cover_url ? `url(${b.cover_url}) center/cover` : COLORS[i % COLORS.length], display: 'flex', alignItems: 'flex-start', padding: '0.6rem', position: 'relative' }}>
                  {/* CondBadge oben links — kompakt */}
                  <CondBadge cond={b.condition} />
                  {!b.cover_url && (
                    <span style={{ position: 'absolute', bottom: 8, left: 8, right: 8, fontSize: '0.75rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{b.title}</span>
                  )}
                </div>
                <div style={{ padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.text, marginBottom: 2 }}>{b.title}</div>
                  <div style={{ fontSize: '0.72rem', color: C.muted }}>{b.author}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* WHY */}
      <div style={{ background: `linear-gradient(135deg,${C.purple},${C.blue})`, padding: '3rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>Warum BlätterTausch?</h2>
        <p style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 28, fontSize: '0.9rem' }}>Bücher lesen — nicht horten.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(1.5rem, 5vw, 3rem)', flexWrap: 'wrap' }}>
          {[
            { icon: '♻️', label: 'Nachhaltig', desc: 'Bücher bekommen ein zweites Leben' },
            { icon: '💸', label: 'Kostenlos', desc: 'Kein Kauf, nur Tausch' },
            { icon: '🤝', label: 'Community', desc: 'Leser helfen Lesern' },
          ].map(({ icon, label, desc }) => (
            <div key={label} style={{ color: '#fff', maxWidth: 160 }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>{icon}</div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: '0.8rem', opacity: 0.75 }}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 32 }}>
          <PrimaryBtn onClick={() => navigate('/explore')} style={{ background: '#fff', color: C.purple, padding: '0.85rem 2rem' }}>
            Jetzt Bücher entdecken →
          </PrimaryBtn>
        </div>
      </div>
    </div>
  )
}
