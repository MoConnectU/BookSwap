import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Check, ChevronLeft, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, Card, PrimaryBtn, Input } from '../components/UI'

const CONDITIONS = ['Wie neu', 'Sehr gut', 'Gut', 'Akzeptabel']
const CATEGORIES = ['Roman', 'Sachbuch', 'Schulbuch', 'Studium / Fachbuch', 'Krimi / Thriller', 'Fantasy / SciFi', 'Kinder / Jugend', 'Ratgeber', 'Sonstiges']

// ── Foto-Slot Komponente ───────────────────────────────────────
function PhotoSlot({ label, preview, onSelect, onRemove }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: '0.78rem', fontWeight: 600, color: C.muted, marginBottom: 6 }}>{label}</p>
      <label style={{ display: 'block', cursor: 'pointer', position: 'relative' }}>
        <input
          type="file"
          accept="image/*"
          onChange={onSelect}
          style={{ display: 'none' }}
        />
        {preview ? (
          <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', height: 160 }}>
            <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {/* Overlay beim Hover */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Upload size={20} color="#fff" />
              <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600 }}>Austauschen</span>
            </div>
            {/* X-Button */}
            <button
              onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove() }}
              style={{
                position: 'absolute', top: 6, right: 6,
                width: 26, height: 26, borderRadius: '50%',
                background: 'rgba(0,0,0,0.6)', border: 'none',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={13} color="#fff" />
            </button>
          </div>
        ) : (
          <div style={{
            border: `2px dashed ${C.purpleMid}`,
            borderRadius: 14, height: 160,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 8,
            background: C.purpleLight,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: `linear-gradient(135deg,${C.bark},${C.purple})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Upload size={20} color="#fff" />
            </div>
            <p style={{ fontWeight: 700, color: C.purple, fontSize: '0.82rem', margin: 0 }}>Foto hochladen</p>
            <p style={{ fontSize: '0.72rem', color: C.muted, margin: 0 }}>JPG / PNG · max. 5 MB</p>
          </div>
        )}
      </label>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function UploadPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [isbn, setIsbn] = useState('')
  const [category, setCategory] = useState('Roman')
  const [condition, setCondition] = useState('Sehr gut')
  const [description, setDescription] = useState('')

  // Bild 1
  const [coverFile1, setCoverFile1] = useState(null)
  const [coverPreview1, setCoverPreview1] = useState(null)
  // Bild 2
  const [coverFile2, setCoverFile2] = useState(null)
  const [coverPreview2, setCoverPreview2] = useState(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePhoto1 = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCoverFile1(file)
    setCoverPreview1(URL.createObjectURL(file))
  }

  const handlePhoto2 = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCoverFile2(file)
    setCoverPreview2(URL.createObjectURL(file))
  }

  const uploadImage = async (file, userId) => {
    const ext = file.name.split('.').pop()
    const filename = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error: uploadError } = await supabase.storage.from('book-covers').upload(filename, file)
    if (uploadError) return null
    const { data } = supabase.storage.from('book-covers').getPublicUrl(filename)
    return data.publicUrl
  }

  const handleSubmit = async () => {
    if (!title.trim() || !author.trim()) { setError('Titel und Autor sind Pflichtfelder.'); return }
    if (!user) { setError('Bitte zuerst anmelden.'); return }
    setLoading(true)
    setError('')

    let cover_url = null
    let cover_url_2 = null

    if (coverFile1) cover_url = await uploadImage(coverFile1, user.id)
    if (coverFile2) cover_url_2 = await uploadImage(coverFile2, user.id)

    const { error: insertError } = await supabase.from('books').insert({
      user_id: user.id,
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim() || null,
      category,
      condition,
      description: description.trim() || null,
      cover_url,
      cover_url_2,
      is_available: true,
    })

    setLoading(false)
    if (insertError) { setError('Fehler beim Speichern: ' + insertError.message); return }
    navigate('/profile')
  }

  const inputStyle = {
    width: '100%', padding: '0.75rem 1rem',
    border: `1.5px solid ${C.border}`, borderRadius: 10,
    outline: 'none', fontSize: '0.9rem', color: C.text, background: C.bg,
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 60, zIndex: 50 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={C.muted} />
        </button>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text }}>Buch einstellen</span>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '1.5rem' }}>

        {/* Foto-Upload — 2 Slots nebeneinander */}
        <Card style={{ padding: '1.25rem', marginBottom: 14 }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text, marginBottom: 4 }}>
            Fotos <span style={{ color: C.muted, fontWeight: 400, fontSize: '0.82rem' }}>(optional, max. 2)</span>
          </h3>
          <p style={{ fontSize: '0.78rem', color: C.muted, marginBottom: 14 }}>
            Tipp: Vorderseite + Rückseite des Buchcovers
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <PhotoSlot
              label="Foto 1 — Vorderseite"
              preview={coverPreview1}
              onSelect={handlePhoto1}
              onRemove={() => { setCoverFile1(null); setCoverPreview1(null) }}
            />
            <PhotoSlot
              label="Foto 2 — Rückseite"
              preview={coverPreview2}
              onSelect={handlePhoto2}
              onRemove={() => { setCoverFile2(null); setCoverPreview2(null) }}
            />
          </div>
        </Card>

        {/* Buchinformationen */}
        <Card style={{ padding: '1.5rem', marginBottom: 14 }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text, marginBottom: 14 }}>Buchinformationen</h3>
          <Input label="Titel *" value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Harry Potter" />
          <Input label="Autor *" value={author} onChange={e => setAuthor(e.target.value)} placeholder="z.B. J.K. Rowling" />
          <Input label="ISBN (optional)" value={isbn} onChange={e => setIsbn(e.target.value)} placeholder="978-3-..." />
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.text, marginBottom: 5 }}>Kategorie</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </Card>

        {/* Zustand */}
        <Card style={{ padding: '1.5rem', marginBottom: 14 }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text, marginBottom: 12 }}>Zustand</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {CONDITIONS.map(c => (
              <button key={c} onClick={() => setCondition(c)} style={{
                padding: '0.6rem 0.3rem', borderRadius: 10,
                border: `2px solid ${condition === c ? C.purple : C.border}`,
                background: condition === c ? C.purpleLight : 'transparent',
                color: condition === c ? C.purple : C.muted,
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
              }}>
                {c}
              </button>
            ))}
          </div>
        </Card>

        {/* Beschreibung */}
        <Card style={{ padding: '1.5rem', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text, marginBottom: 10 }}>
            Kurzbeschreibung <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span>
          </h3>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Worum geht es? Was hat dir gefallen?"
            style={{ ...inputStyle, height: 90, resize: 'vertical' }}
          />
        </Card>

        {error && (
          <div style={{ background: C.errorLight, color: C.error, padding: '0.65rem 1rem', borderRadius: 8, fontSize: '0.82rem', marginBottom: 14 }}>
            {error}
          </div>
        )}

        <PrimaryBtn onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '1rem', borderRadius: 14, fontSize: '0.95rem' }} icon={loading ? null : Check}>
          {loading ? 'Wird gespeichert...' : 'Buch einstellen'}
        </PrimaryBtn>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
