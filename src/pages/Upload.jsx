import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Check, ChevronLeft, X, Camera, Search, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, Card, PrimaryBtn } from '../components/UI'

const CONDITIONS = ['Wie neu', 'Sehr gut', 'Gut', 'Akzeptabel']
const CATEGORIES = ['Roman', 'Sachbuch', 'Schulbuch', 'Studium / Fachbuch', 'Krimi / Thriller', 'Fantasy / SciFi', 'Kinder / Jugend', 'Ratgeber', 'Sonstiges']

// ── Foto-Slot ─────────────────────────────────────────────────
function PhotoSlot({ label, preview, onSelect, onRemove }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: '0.78rem', fontWeight: 600, color: C.muted, marginBottom: 6 }}>{label}</p>
      <label style={{ display: 'block', cursor: 'pointer' }}>
        <input type="file" accept="image/*" onChange={onSelect} style={{ display: 'none' }} />
        {preview ? (
          <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', height: 160 }}>
            <img src={preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Upload size={18} color="#fff" />
              <span style={{ color: '#fff', fontSize: '0.72rem', fontWeight: 600 }}>Austauschen</span>
            </div>
            <button onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove() }}
              style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={13} color="#fff" />
            </button>
          </div>
        ) : (
          <div style={{ border: `2px dashed ${C.purpleMid}`, borderRadius: 14, height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: C.purpleLight }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(135deg,${C.bark},${C.purple})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={20} color="#fff" />
            </div>
            <p style={{ fontWeight: 700, color: C.purple, fontSize: '0.82rem', margin: 0 }}>Foto hochladen</p>
            <p style={{ fontSize: '0.7rem', color: C.muted, margin: 0 }}>Eigenes Foto vom Buch</p>
          </div>
        )}
      </label>
    </div>
  )
}

// ── ISBN Lookup — Open Library + DNB Fallback ─────────────────
async function lookupISBNData(isbn) {
  const clean = isbn.replace(/[-\s]/g, '')

  // 1. Open Library (gut für englische Bücher)
  try {
    const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${clean}&format=json&jscmd=data`)
    const data = await res.json()
    const book = data[`ISBN:${clean}`]
    if (book?.title) {
      return {
        title: book.title || '',
        author: book.authors?.[0]?.name || '',
        description: typeof book.notes === 'string' ? book.notes : (book.notes?.value || ''),
        category: detectCategory(book.subjects?.map(s => s.name || s).join(' ') || ''),
      }
    }
  } catch (e) {}

  // 2. Deutsche Nationalbibliothek (DNB) — für deutsche Bücher
  try {
    const res = await fetch(
      `https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&query=isbn%3D${clean}&recordSchema=MARC21-xml&maximumRecords=1`
    )
    const xml = await res.text()
    const numRecords = xml.match(/numberOfRecords>(\d+)</)
    if (numRecords && parseInt(numRecords[1]) > 0) {
      const titleMatch = xml.match(/tag="245"[^>]*>[\s\S]{0,500}?subfield code="a">([^<]+)</)
      const authorMatch = xml.match(/tag="100"[^>]*>[\s\S]{0,500}?subfield code="a">([^<]+)</)
      const author700 = xml.match(/tag="700"[^>]*>[\s\S]{0,500}?subfield code="a">([^<]+)</)
      const subjectMatch = xml.match(/tag="650"[^>]*>[\s\S]{0,500}?subfield code="a">([^<]+)</)
      const descMatch = xml.match(/tag="520"[^>]*>[\s\S]{0,500}?subfield code="a">([^<]+)</)

      if (titleMatch?.[1]) {
        // DNB gibt Autoren oft als "Nachname, Vorname" — umdrehen
        let rawAuthor = authorMatch?.[1] || author700?.[1] || ''
        if (rawAuthor.includes(',')) {
          const parts = rawAuthor.split(',')
          rawAuthor = (parts[1]?.trim() + ' ' + parts[0]?.trim()).trim()
        }
        return {
          title: titleMatch[1].trim(),
          author: rawAuthor,
          description: descMatch?.[1]?.trim() || '',
          category: detectCategory(subjectMatch?.[1] || ''),
        }
      }
    }
  } catch (e) {}

  return null
}

function detectCategory(subjectStr) {
  const s = subjectStr.toLowerCase()
  if (s.includes('kinder') || s.includes('jugend') || s.includes('children')) return 'Kinder / Jugend'
  if (s.includes('krimi') || s.includes('crime') || s.includes('thriller') || s.includes('mystery')) return 'Krimi / Thriller'
  if (s.includes('fantasy') || s.includes('science fiction') || s.includes('sci-fi')) return 'Fantasy / SciFi'
  if (s.includes('schul') || s.includes('lehrbuch') || s.includes('school')) return 'Schulbuch'
  if (s.includes('roman') || s.includes('fiction') || s.includes('novel') || s.includes('erzähl')) return 'Roman'
  if (s.includes('sachbuch') || s.includes('nonfiction') || s.includes('ratgeber')) return 'Sachbuch'
  return 'Roman'
}

// ── Main ──────────────────────────────────────────────────────
export default function UploadPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const scanInputRef = useRef(null)

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [isbn, setIsbn] = useState('')
  const [category, setCategory] = useState('Roman')
  const [condition, setCondition] = useState('Sehr gut')
  const [description, setDescription] = useState('')

  const [coverFile1, setCoverFile1] = useState(null)
  const [coverPreview1, setCoverPreview1] = useState(null)
  const [coverFile2, setCoverFile2] = useState(null)
  const [coverPreview2, setCoverPreview2] = useState(null)

  const [loading, setLoading] = useState(false)
  const [isbnLoading, setIsbnLoading] = useState(false)
  const [isbnError, setIsbnError] = useState('')
  const [isbnSuccess, setIsbnSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleISBNLookup = async (isbnValue) => {
    const clean = (isbnValue || isbn).replace(/[-\s]/g, '')
    if (clean.length < 10) { setIsbnError('ISBN muss mindestens 10 Zeichen haben.'); return }

    setIsbnLoading(true)
    setIsbnError('')
    setIsbnSuccess(false)

    const result = await lookupISBNData(clean)

    if (!result) {
      setIsbnError('Buch nicht gefunden. Bitte Titel und Autor manuell eingeben.')
      setIsbnLoading(false)
      return
    }

    if (result.title) setTitle(result.title)
    if (result.author) setAuthor(result.author)
    if (result.description) setDescription(result.description)
    if (result.category) setCategory(result.category)
    setIsbnSuccess(true)
    setIsbnLoading(false)
  }

  // ── iPhone/Android Kamera-Scan ────────────────────────────
  // Statt BarcodeDetector API (nicht auf Safari/iOS) nutzen wir
  // input[capture=environment] + ZXing WASM für Barcode-Erkennung
  const handleCameraCapture = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsbnLoading(true)
    setIsbnError('')

    try {
      // ZXing via CDN dynamisch laden
      const { BrowserMultiFormatReader } = await import('https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm')
      const reader = new BrowserMultiFormatReader()
      const img = document.createElement('img')
      const url = URL.createObjectURL(file)
      img.src = url

      await new Promise((resolve) => { img.onload = resolve })

      const result = await reader.decodeFromImageElement(img)
      URL.revokeObjectURL(url)

      if (result?.text) {
        const scannedIsbn = result.text.replace(/[-\s]/g, '')
        setIsbn(scannedIsbn)
        await handleISBNLookup(scannedIsbn)
      } else {
        setIsbnError('Kein Barcode erkannt. Bitte ISBN manuell eingeben.')
        setIsbnLoading(false)
      }
    } catch (err) {
      setIsbnError('Barcode nicht lesbar. Bitte ISBN manuell eingeben.')
      setIsbnLoading(false)
    }

    // Input zurücksetzen damit man erneut scannen kann
    if (scanInputRef.current) scanInputRef.current.value = ''
  }

  const uploadImage = async (file) => {
    const ext = file.name.split('.').pop()
    const filename = `${user.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('book-covers').upload(filename, file)
    if (error) return null
    const { data } = supabase.storage.from('book-covers').getPublicUrl(filename)
    return data.publicUrl
  }

  const handleSubmit = async () => {
    if (!title.trim() || !author.trim()) { setError('Titel und Autor sind Pflichtfelder.'); return }
    if (!user) { setError('Bitte zuerst anmelden.'); return }
    setLoading(true); setError('')

    let cover_url = null, cover_url_2 = null
    if (coverFile1) cover_url = await uploadImage(coverFile1)
    if (coverFile2) cover_url_2 = await uploadImage(coverFile2)

    const { error: insertError } = await supabase.from('books').insert({
      user_id: user.id,
      title: title.trim(), author: author.trim(),
      isbn: isbn.trim() || null, category, condition,
      description: description.trim() || null,
      cover_url, cover_url_2, is_available: true,
    })

    setLoading(false)
    if (insertError) { setError('Fehler beim Speichern: ' + insertError.message); return }
    navigate('/profile')
  }

  const inputStyle = { width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${C.border}`, borderRadius: 10, outline: 'none', fontSize: '0.9rem', color: C.text, background: C.bg }

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

        {/* ── ISBN Scanner ── */}
        <Card style={{ padding: '1.25rem', marginBottom: 14 }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text, marginBottom: 4 }}>
            📱 ISBN scannen oder eingeben
          </h3>
          <p style={{ fontSize: '0.78rem', color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
            Scanne den Barcode auf der Rückseite — Titel, Autor & Kategorie werden automatisch ausgefüllt.
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Kamera-Button — funktioniert auf iPhone UND Android */}
            <label style={{ flexShrink: 0, cursor: 'pointer' }}>
              <input
                ref={scanInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraCapture}
                style={{ display: 'none' }}
              />
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: isbnLoading ? C.border : `linear-gradient(135deg,${C.bark},${C.purple})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: isbnLoading ? 'none' : '0 4px 12px rgba(61,43,31,0.25)',
                cursor: isbnLoading ? 'not-allowed' : 'pointer',
              }}>
                {isbnLoading
                  ? <Loader size={20} color={C.muted} style={{ animation: 'spin 0.8s linear infinite' }} />
                  : <Camera size={20} color="#fff" />
                }
              </div>
            </label>

            {/* ISBN Eingabefeld */}
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                value={isbn}
                onChange={e => { setIsbn(e.target.value); setIsbnError(''); setIsbnSuccess(false) }}
                onKeyDown={e => { if (e.key === 'Enter') handleISBNLookup(isbn) }}
                placeholder="ISBN eingeben (z.B. 9783442480098)"
                style={{ ...inputStyle, paddingRight: isbn.length >= 10 ? '3rem' : '1rem' }}
              />
              {isbn.length >= 10 && !isbnLoading && (
                <button
                  onClick={() => handleISBNLookup(isbn)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: 8, background: C.purple, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Search size={14} color="#fff" />
                </button>
              )}
              {isbnLoading && (
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }}>
                  <Loader size={16} color={C.purple} style={{ animation: 'spin 0.8s linear infinite' }} />
                </div>
              )}
            </div>
          </div>

          {/* Feedback */}
          {isbnError && (
            <div style={{ marginTop: 8, padding: '0.5rem 0.75rem', background: '#FEE2E2', borderRadius: 8, fontSize: '0.78rem', color: '#991B1B', lineHeight: 1.5 }}>
              ⚠️ {isbnError}
            </div>
          )}
          {isbnSuccess && (
            <div style={{ marginTop: 8, padding: '0.5rem 0.75rem', background: '#D1FAE5', borderRadius: 8, fontSize: '0.78rem', color: '#065F46', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={14} /> Buch gefunden! Bitte Felder prüfen und Zustand auswählen.
            </div>
          )}
        </Card>

        {/* ── Fotos ── */}
        <Card style={{ padding: '1.25rem', marginBottom: 14 }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text, marginBottom: 4 }}>
            Fotos <span style={{ color: C.muted, fontWeight: 400, fontSize: '0.82rem' }}>(optional, max. 2)</span>
          </h3>
          <p style={{ fontSize: '0.78rem', color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
            📸 Mach eigene Fotos von deinem Buch — so sieht der andere den echten Zustand
          </p>
          <div style={{ display: 'flex', gap: 12 }}>
            <PhotoSlot label="Vorderseite" preview={coverPreview1}
              onSelect={e => { const f = e.target.files[0]; if (f) { setCoverFile1(f); setCoverPreview1(URL.createObjectURL(f)) } }}
              onRemove={() => { setCoverFile1(null); setCoverPreview1(null) }} />
            <PhotoSlot label="Rückseite" preview={coverPreview2}
              onSelect={e => { const f = e.target.files[0]; if (f) { setCoverFile2(f); setCoverPreview2(URL.createObjectURL(f)) } }}
              onRemove={() => { setCoverFile2(null); setCoverPreview2(null) }} />
          </div>
        </Card>

        {/* ── Buchinformationen ── */}
        <Card style={{ padding: '1.5rem', marginBottom: 14 }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text, marginBottom: 14 }}>Buchinformationen</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.text, marginBottom: 5 }}>Titel *</label>
            <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="z.B. Harry Potter" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.text, marginBottom: 5 }}>Autor *</label>
            <input style={inputStyle} value={author} onChange={e => setAuthor(e.target.value)} placeholder="z.B. J.K. Rowling" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: C.text, marginBottom: 5 }}>Kategorie</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        </Card>

        {/* ── Zustand ── */}
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

        {/* ── Beschreibung ── */}
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
          <div style={{ background: '#FEE2E2', color: '#EF4444', padding: '0.65rem 1rem', borderRadius: 8, fontSize: '0.82rem', marginBottom: 14 }}>
            {error}
          </div>
        )}

        <PrimaryBtn onClick={handleSubmit} disabled={loading} style={{ width: '100%', padding: '1rem', borderRadius: 14, fontSize: '0.95rem' }} icon={loading ? null : Check}>
          {loading ? 'Wird gespeichert...' : 'Buch einstellen'}
        </PrimaryBtn>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
