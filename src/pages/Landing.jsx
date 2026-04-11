import { useNavigate } from 'react-router-dom'
import { ArrowRight, Package } from 'lucide-react'
import { C, Card, PrimaryBtn, GhostBtn, CondBadge } from '../components/UI'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

function useCountUp(target, duration = 1200, start = false) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start || target === 0) { setValue(target); return }
    const startTime = performance.now()
    const animate = (now) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(animate)
      else setValue(target)
    }
    requestAnimationFrame(animate)
  }, [target, start, duration])
  return value
}

function AnimatedStat({ value, label, delay = 0 }) {
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

  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <div style={{ fontWeight: 900, fontSize: '1.6rem', color: C.purple, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>
        {typeof value === 'number' ? count : value}
      </div>
      <div style={{ fontSize: '0.75rem', color: C.muted, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

const STEPS = [
  { num: '01', emoji: '📚', title: 'Buch einstellen', desc: 'Foto, Titel & Zustand in 2 Minuten hochladen' },
  { num: '02', emoji: '🔍', title: 'Entdecken', desc: 'Stöbere durch alle Bücher & finde deinen Match' },
  { num: '03', emoji: '🤝', title: 'Anfragen', desc: 'Schick eine Anfrage mit dem Buch das du anbietest' },
  { num: '04', emoji: '💬', title: 'Versand klären', desc: 'Im Chat Adressen austauschen & wer zuerst schickt' },
  { num: '05', emoji: '⭐', title: 'Bewerten', desc: 'Tausch abschließen & den Partner bewerten' },
]

function HowItWorks() {
  const scrollRef = useRef(null)

  return (
    <div style={{ padding: '3.5rem 0 2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: 32, padding: '0 1.5rem' }}>
        <span style={{ display: 'inline-block', padding: '0.25rem 1rem', borderRadius: 100, background: C.purpleLight, color: C.purple, fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 12 }}>
          So funktioniert's
        </span>
        <h2 style={{ fontSize: 'clamp(1.4rem, 3vw, 1.9rem)', fontWeight: 900, color: C.text, letterSpacing: '-0.02em', margin: '0 0 8px' }}>
          In 5 Schritten zum Tausch
        </h2>
        <p style={{ color: C.muted, fontSize: '0.9rem', margin: 0 }}>
          Jeder zahlt seinen eigenen Versand — kein Geld, nur Bücher.
        </p>
      </div>

      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: 0,
          overflowX: 'auto',
          paddingLeft: 'max(1.5rem, calc((100vw - 900px) / 2))',
          paddingRight: 'max(1.5rem, calc((100vw - 900px) / 2))',
          paddingBottom: 8,
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {STEPS.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{
              width: 'clamp(200px, 22vw, 210px)',
              scrollSnapAlign: 'start',
              background: C.surface,
              border: `1.5px solid ${C.border}`,
              borderRadius: 20,
              padding: '1.75rem 1.25rem',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(61,43,31,0.07)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              flexShrink: 0,
            }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: C.dust, letterSpacing: '0.1em' }}>
                SCHRITT {step.num}
              </div>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: C.purpleLight,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem',
                boxShadow: '0 4px 12px rgba(200,132,58,0.15)',
                flexShrink: 0,
              }}>
                {step.emoji}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: C.bark, lineHeight: 1.2 }}>{step.title}</div>
              <div style={{ fontSize: '0.78rem', color: C.muted, lineHeight: 1.6 }}>{step.desc}</div>
            </div>

            {i < STEPS.length - 1 && (
              <div style={{
                width: 32, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: C.purple, fontSize: '1.1rem',
              }}>
                →
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 10, fontSize: '0.72rem', color: C.dust, padding: '0 1.5rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span>←</span>
          <span>wische um alle Schritte zu sehen</span>
          <span>→</span>
        </span>
      </div>

      <div style={{ maxWidth: 900, margin: '20px auto 0', padding: '0 1.5rem' }}>
        <div style={{ background: C.purpleLight, borderRadius: 14, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Package size={20} color={C.purple} style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: 700, color: C.bark, marginBottom: 2 }}>Wie läuft der Versand?</p>
            <p style={{ fontSize: '0.8rem', color: C.muted, lineHeight: 1.5 }}>
              Jeder schickt sein Buch auf eigene Kosten. Klärt im Chat Adressen & wer zuerst schickt. Büchersendung bei der Post kostet oft unter 2€.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const [recentBooks, setRecentBooks] = useState([])
  const [stats, setStats] = useState({ books: 0, trades: 0, users: 0 })

  const COLORS = [
    'linear-gradient(135deg,#3D2B1F,#C8843A)',
    'linear-gradient(135deg,#5C7A5E,#A8C5AB)',
    'linear-gradient(135deg,#8B6B4E,#C8A882)',
    'linear-gradient(135deg,#4A5E4C,#7A9E7E)',
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

      <div style={{ background: 'linear-gradient(160deg, #1A0F0A 0%, #3D2B1F 55%, #6B4226 100%)', padding: '3.5rem 1.5rem 5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 280, height: 280, borderRadius: '50%', background: 'rgba(200,132,58,0.18)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 200, height: 200, borderRadius: '50%', background: 'rgba(92,122,94,0.15)', filter: 'blur(50px)' }} />
        <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(200,132,58,0.35)', padding: '0.35rem 1rem', borderRadius: 100, fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500, marginBottom: 20 }}>
            📖 Kostenlos · Nachhaltig · Einfach
          </div>
          <h1 style={{ fontSize: 'clamp(2rem,6vw,3rem)', fontWeight: 900, color: '#fff', lineHeight: 1.1, marginBottom: 16, letterSpacing: '-0.02em' }}>
            Bücher tauschen,<br />
            <span style={{ color: C.purple }}>statt kaufen.</span>
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 28, maxWidth: 440, margin: '0 auto 28px' }}>
            Stell deine gelesenen Bücher ein und tausche sie direkt mit anderen Lesern — kostenlos, fair, nachhaltig.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <PrimaryBtn onClick={() => navigate('/explore')} style={{ background: C.purple, color: '#fff', boxShadow: '0 4px 20px rgba(200,132,58,0.4)', padding: '0.85rem 2rem', fontSize: '0.95rem' }}>
              Bücher entdecken →
            </PrimaryBtn>
            <GhostBtn onClick={() => navigate('/upload')} style={{ border: '1.5px solid rgba(255,255,255,0.3)', color: '#fff', borderRadius: 12, padding: '0.85rem 2rem', fontSize: '0.95rem' }}>
              Buch einstellen
            </GhostBtn>
          </div>
        </div>
      </div>

      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(1.5rem, 5vw, 4rem)', flexWrap: 'wrap' }}>
          <AnimatedStat value={stats.books} label="Bücher online" delay={0} />
          <AnimatedStat value={stats.trades} label="Tausche gemacht" delay={100} />
          <AnimatedStat value={stats.users} label="Aktive Leser" delay={200} />
          <AnimatedStat value="0€" label="Pro Tausch" delay={300} />
        </div>
      </div>

      <div style={{ background: C.bg, overflow: 'hidden' }}>
        <HowItWorks />
      </div>

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
                  <CondBadge cond={b.condition} />
                  {!b.cover_url && <span style={{ position: 'absolute', bottom: 8, left: 8, right: 8, fontSize: '0.75rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{b.title}</span>}
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

      <div style={{ background: `linear-gradient(135deg, ${C.bark}, #6B4226)`, padding: '3rem 1.5rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>Warum BlätterTausch?</h2>
        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 28, fontSize: '0.9rem' }}>Bücher lesen — nicht horten.</p>
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
          <PrimaryBtn onClick={() => navigate('/explore')} style={{ background: C.purple, color: '#fff', padding: '0.85rem 2rem', boxShadow: '0 4px 20px rgba(200,132,58,0.4)' }}>
            Jetzt Bücher entdecken →
          </PrimaryBtn>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateX(-50%) translateY(10px) } to { opacity:1; transform:translateX(-50%) translateY(0) } }
        div[style*="overflow-x: auto"]::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  )
}
