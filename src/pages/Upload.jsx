import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Check, ChevronLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, Card, PrimaryBtn, Input } from '../components/UI'

const CONDITIONS = ['Wie neu', 'Sehr gut', 'Gut', 'Akzeptabel']
const CATEGORIES = ['Roman', 'Sachbuch', 'Schulbuch', 'Studium / Fachbuch', 'Krimi / Thriller', 'Fantasy / SciFi', 'Kinder / Jugend', 'Ratgeber']

export default function UploadPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [isbn, setIsbn] = useState('')
  const [category, setCategory] = useState('Roman')
  const [condition, setCondition] = useState('Sehr gut')
  const [description, setDescription] = useState('')
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async () => {
    if (!title || !author) { setError('Titel und Autor sind Pflichtfelder.'); return }
    if (!user) { setError('Bitte zuerst anmelden.'); return }
    setLoading(true)
    setError('')

    let cover_url = null

    // Upload photo if provided
    if (coverFile) {
      const ext = coverFile.name.split('.').pop()
      const filename = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('book-covers').upload(filename, coverFile)
      if (!uploadError) {
        const { data } = supabase.storage.from('book-covers').getPublicUrl(filename)
        cover_url = data.publicUrl
      }
    }

    // Insert book
    const { error: insertError } = await supabase.from('books').insert({
      user_id: user.id,
      title, author, isbn: isbn || null,
      category, condition, description: description || null,
      cover_url, is_available: true
    })

    setLoading(false)
    if (insertError) { setError('Fehler beim Speichern: ' + insertError.message); return }
    navigate('/profile')
  }

  const inputStyle = { width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${C.border}`, borderRadius: 10, outline: 'none', fontSize: '0.9rem', color: C.text, background: C.bg }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={C.muted} />
        </button>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text }}>Buch einstellen</span>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '1.5rem' }}>

        {/* Photo upload */}
        <label style={{ display: 'block', marginBottom: 20, cursor: 'pointer' }}>
          <input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
          {coverPreview ? (
            <div style={{ borderRadius: 16, overflow: 'hidden', height: 200, background: `url(${coverPreview}) center/cover` }} />
          ) : (
            <div style={{ border: `2px dashed ${C.purpleMid}`, borderRadius: 16, padding: '2.5rem', textAlign: 'center', background: C.purpleLight }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg,${C.purple},${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Upload size={22} color="#fff" />
              </div>
              <p style={{ fontWeight: 700, color: C.purple, marginBottom: 4 }}>Buchfoto hochladen</p>
              <p style={{ fontSize: '0.8rem', color: C.muted }}>JPG oder PNG · max. 10 MB</p>
            </div>
          )}
        </label>

        <Card style={{ padding: '1.5rem', marginBottom: 14 }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text, marginBottom: 14 }}>Buchinformationen</h3>
          <Input label="Titel *" value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Harry Potter" />
          <Input label="Autor *" value={author} onChange={e => setAuthor(e.target.value)} placeholder="z.B. J.K. Rowling" />
          <Input label="ISBN (optional)" value={isbn} onChange={e => setIsbn(e.target.value)} placeholder="978-3-..." />
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>Kategorie</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </Card>

        <Card style={{ padding: '1.5rem', marginBottom: 14 }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text, marginBottom: 12 }}>Zustand</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {CONDITIONS.map(c => (
              <button key={c} onClick={() => setCondition(c)} style={{ padding: '0.6rem 0.3rem', borderRadius: 10, border: `2px solid ${condition === c ? C.purple : C.border}`, background: condition === c ? C.purpleLight : 'transparent', color: condition === c ? C.purple : C.muted, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                {c}
              </button>
            ))}
          </div>
        </Card>

        <Card style={{ padding: '1.5rem', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text, marginBottom: 10 }}>
            Kurzbeschreibung <span style={{ color: C.muted, fontWeight: 400 }}>(optional)</span>
          </h3>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Worum geht es? Was hat dir gefallen?" style={{ ...inputStyle, height: 90, resize: 'vertical' }} />
        </Card>

        {error && (
          <div style={{ background: '#FEE2E2', color: '#EF4444', padding: '0.65rem 1rem', borderRadius: 8, fontSize: '0.82rem', marginBottom: 14 }}>
            {error}
          </div>
        )}

        <PrimaryBtn onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '1rem', borderRadius: 14, fontSize: '0.95rem' }} icon={loading ? null : Check}>
          {loading ? 'Wird gespeichert...' : 'Buch veröffentlichen'}
        </PrimaryBtn>
      </div>
    </div>
  )
}
