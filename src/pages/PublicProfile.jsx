import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, MapPin, Star, ArrowLeftRight, BookOpen } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, Card, Avatar, Badge, CondBadge, PrimaryBtn, Spinner } from '../components/UI'

const COLORS = [
  'linear-gradient(135deg,#7C3AED,#A78BFA)',
  'linear-gradient(135deg,#2563EB,#60A5FA)',
  'linear-gradient(135deg,#0F766E,#34D399)',
  'linear-gradient(135deg,#D97706,#FCD34D)',
]

export default function PublicProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [books, setBooks] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [id])

  const fetchProfile = async () => {
    setLoading(true)
    const [{ data: p }, { data: b }, { data: r }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('books').select('*').eq('user_id', id).eq('is_available', true).order('created_at', { ascending: false }),
      supabase.from('reviews').select('*, profiles!reviewer_id(name, avatar_url)').eq('reviewed_id', id).order('created_at', { ascending: false }).limit(5)
    ])
    setProfile(p)
    setBooks(b || [])
    setReviews(r || [])
    setLoading(false)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Spinner size={36} /></div>
  if (!profile) return <div style={{ padding: '2rem', textAlign: 'center', color: C.muted }}>Nutzer nicht gefunden.</div>

  const isOwnProfile = user?.id === id

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={C.muted} />
        </button>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text }}>Profil</span>
      </div>

      {/* Profile header */}
      <div style={{ background: `linear-gradient(135deg,${C.purple},${C.blue})`, padding: '2.5rem 1.5rem 3.5rem' }}>
        <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', gap: 16, alignItems: 'center' }}>
          <Avatar letter={profile.name || '?'} size={80} src={profile.avatar_url} />
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff' }}>{profile.name || 'Nutzer'}</h1>
            {profile.city && (
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.85rem', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={13} /> {profile.city}
              </p>
            )}
            <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
              {[[books.length,'Bücher'],[profile.trades_count||0,'Tausche'],[profile.rating?profile.rating.toFixed(1)+'★':'5.0★','Bewertung']].map(([n,l]) => (
                <div key={l}>
                  <div style={{ fontWeight: 900, fontSize: '1.1rem', color: '#fff' }}>{n}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.65, color: '#fff' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 700, margin: '-20px auto 0', padding: '0 1.5rem 3rem', position: 'relative' }}>

        {/* Books */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: C.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} color={C.purple} /> Verfügbare Bücher ({books.length})
          </h2>
          {books.length === 0 ? (
            <Card style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: C.muted, fontSize: '0.85rem' }}>Keine Bücher verfügbar</p>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: '1rem' }}>
              {books.map((b, i) => (
                <Card key={b.id} onClick={() => navigate(`/book/${b.id}`)}>
                  <div style={{ height: 110, background: b.cover_url ? `url(${b.cover_url}) center/cover` : COLORS[i % COLORS.length], display: 'flex', alignItems: 'flex-end', padding: '0 0.6rem 0.6rem' }}>
                    {!b.cover_url && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{b.title}</span>}
                  </div>
                  <div style={{ padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: C.text, marginBottom: 2 }}>{b.title}</div>
                    <div style={{ fontSize: '0.7rem', color: C.muted, marginBottom: 6 }}>{b.author}</div>
                    <CondBadge cond={b.condition} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Reviews */}
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: C.text, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Star size={18} color={C.warning} fill={C.warning} /> Bewertungen ({reviews.length})
          </h2>
          {reviews.length === 0 ? (
            <Card style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: C.muted, fontSize: '0.85rem' }}>Noch keine Bewertungen</p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reviews.map(r => (
                <Card key={r.id} style={{ padding: '1.2rem' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <Avatar letter={r.profiles?.name || '?'} size={36} src={r.profiles?.avatar_url} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: C.text }}>{r.profiles?.name}</span>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={13} color={C.warning} fill={s <= r.rating ? C.warning : 'transparent'} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p style={{ fontSize: '0.85rem', color: C.muted, lineHeight: 1.5 }}>{r.comment}</p>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
