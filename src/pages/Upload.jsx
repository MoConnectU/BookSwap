import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Check, ChevronLeft, X, Camera, Search, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, Card, PrimaryBtn } from '../components/UI'

const CONDITIONS = ['Wie neu', 'Sehr gut', 'Gut', 'Akzeptabel']
const CATEGORIES = ['Roman', 'Sachbuch', 'Schulbuch', 'Studium / Fachbuch', 'Krimi / Thriller', 'Fantasy / SciFi', 'Kinder / Jugend', 'Ratgeber', 'Sonstiges']

// ── QuaggaJS über CDN laden (kein npm nötig) ──────────────────
function loadQuagga() {
  return new Promise((resolve, reject) => {
    if (window.Quagga) { resolve(window.Quagga); return }
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/quagga@0.12.1/dist/quagga.min.js'
    script.onload = () => resolve(window.Quagga)
    script.onerror = reject
    document.head.appendChild(script)
  })
}

// ── HTML Entities dekodieren ──────────────────────────────────
function decodeHtml(str) {
  if (!str) return ''
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  return txt.value.replace(/[\u0080-\u009F]/g, '').trim()
}

// ── Kategorie erkennen ────────────────────────────────────────
function detectCategory(subjectStr, titleStr) {
  const s = ((subjectStr || '') + ' ' + (titleStr || '')).toLowerCase()
  if (s.includes('kinder') || s.includes('jugend') || s.includes('children')) return 'Kinder / Jugend'
  if (s.includes('krimi') || s.includes('thriller') || s.includes('crime') || s.includes('spionage')) return 'Krimi / Thriller'
  if (s.includes('fantasy') || s.includes('science fiction') || s.includes('sci-fi')) return 'Fantasy / SciFi'
  if (s.includes('schul') || s.includes('lehrbuch') || s.includes('studium')) return 'Schulbuch'
  if (s.includes('ratgeber') || s.includes('sorge') || s.includes('erfolg') || s.includes('gesundheit') ||
      s.includes('kochen') || s.includes('rezept') || s.includes('selbst') || s.includes('leben') ||
      s.includes('nonfiction') || s.includes('sachbuch') || s.includes('wissen')) return 'Ratgeber'
  if (s.includes('sachbuch') || s.includes('biografi') || s.includes('geschichte') || s.includes('politik')) return 'Sachbuch'
  return 'Roman'
}

// ── ISBN Lookup: Open Library + DNB ──────────────────────────
async function lookupISBN(isbn) {
  const clean = isbn.replace(/[-\s]/g, '')
  let result = null

  // 1. Open Library
  try {
    const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${clean}&format=json&jscmd=data`)
    const data = await res.json()
    const book = data[`ISBN:${clean}`]
    if (book?.title) {
      result = {
        title: decodeHtml(book.title),
        author: decodeHtml(book.authors?.[0]?.name || ''),
        description: decodeHtml(typeof book.notes === 'string' ? book.notes : book.notes?.value || ''),
        category: detectCategory(book.subjects?.map(s => s.name || s).join(' ') || '', book.title),
      }
    }
  } catch (e) {}

  // 2. DNB — Deutsche Nationalbibliothek
  try {
    const res = await fetch(`https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&query=isbn%3D${clean}&recordSchema=MARC21-xml&maximumRecords=1`)
    const xml = await res.text()
    const numRecords = parseInt(xml.match(/numberOfRecords>(\d+)</)?.[1] || '0')
    if (numRecords > 0) {
      const t245a = xml.match(/tag="245"[^>]*>[\s\S]{0,500}?subfield code="a">([^<]+)</)
      const t245b = xml.match(/tag="245"[^>]*>[\s\S]{0,500}?subfield code="b">([^<]+)</)
      const t100 = xml.match(/tag="100"[^>]*>[\s\S]{0,500}?subfield code="a">([^<]+)</)
      const t700 = xml.match(/tag="700"[^>]*>[\s\S]{0,500}?subfield code="a">([^<]+)</)
      const t520 = xml.match(/tag="520"[^>]*>[\s\S]{0,500}?subfield code="a">([^<]+)</)
      const t500 = xml.match(/tag="500"[^>]*>[\s\S]{0,500}?subfield code="a">([^<]+)</)
      const t653arr = [...xml.matchAll(/tag="653"[^>]*>[\s\S]{0,300}?subfield code="a">([^<]+)</g)].map(m => m[1])
      const t653 = t653arr.join(' ')
      const meaningfulKeywords = t653arr.filter(k => !k.startsWith('(') && k.length > 3 && k.length < 50).slice(0, 8)

      if (t245a?.[1]) {
        let author = t100?.[1] || t700?.[1] || ''
        if (author.includes(',')) {
          const p = author.split(',')
          author = (p[1]?.trim() + ' ' + p[0]?.trim()).trim()
        }
        let title = decodeHtml(t245a[1])
        if (t245b?.[1]) {
          const sub = decodeHtml(t245b[1])
          if (!sub.toLowerCase().includes('auflage') && !sub.toLowerCase().includes('ausg')) {
            title = title + ' – ' + sub
          }
        }
        // Beschreibung: 520 > 500 > Keywords als Fallback
        let dnbDesc = decodeHtml(t520?.[1] || t500?.[1] || '')
        if (!dnbDesc && meaningfulKeywords.length > 0) {
          dnbDesc = meaningfulKeywords.join(' · ')
        }
        const dnb = {
          title,
          author: decodeHtml(author),
          description: dnbDesc,
          category: detectCategory(t653, t245a?.[1]),
        }
        if (!result) {
          result = dnb
        } else {
          result.title = dnb.title || result.title
          result.author = dnb.author || result.author
          result.category = dnb.category || result.category
          if (!result.description) result.description = dnb.description
        }
      }
    }
  } catch (e) {}

  // 3. Beschreibung Fallback via Open Library Search
  if (result && !result.description) {
    try {
      const r = await fetch(`https://openlibrary.org/search.json?isbn=${clean}&fields=description,first_sentence`)
      const d = await r.json()
      const doc = d.docs?.[0]
      const desc = doc?.description?.value || doc?.description || doc?.first_sentence?.value || ''
      if (desc) result.description = decodeHtml(desc)
    } catch (e) {}
  }

  return result
}

// ── Barcode Scanner Modal (QuaggaJS — iPhone + Android) ───────
function ScannerModal({ onDetected, onClose }) {
  const containerRef = useRef(null)
  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const detectedRef = useRef(false)

  useEffect(() => {
    let quagga = null
    let mounted = true

    const start = async () => {
      try {
        quagga = await loadQuagga()
        if (!mounted || !containerRef.current) return

        quagga.init({
          inputStream: {
            type: 'LiveStream',
            target: containerRef.current,
            constraints: {
              facingMode: 'environment',
              width: { min: 640, ideal: 1280 },
              height: { min: 480, ideal: 720 },
            },
          },
          decoder: {
            readers: ['ean_reader', 'ean_8_reader', 'upc_reader'],
          },
          locate: true,
          numOfWorkers: 2,
          frequency: 10,
        }, (err) => {
          if (err) {
            setStatus('error')
            setErrorMsg('Kamera konnte nicht gestartet werden. Bitte ISBN manuell eingeben.')
            return
          }
          if (!mounted) return
          quagga.start()
          setStatus('scanning')
        })

        quagga.onDetected((data) => {
          if (detectedRef.current) return
          const code = data?.codeResult?.code
          if (code && (code.length === 13 || code.length === 12 || code.length === 8)) {
            detectedRef.current = true
            quagga.stop()
            onDetected(code)
          }
        })
      } catch (e) {
        if (mounted) {
          setStatus('error')
          setErrorMsg('Scanner konnte nicht geladen werden. Bitte ISBN manuell eingeben.')
        }
      }
    }

    start()

    return () => {
      mounted = false
      if (quagga && status === 'scanning') {
        try { quagga.stop() } catch (e) {}
      }
    }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#000', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.85)', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>Barcode scannen</span>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} color="#fff" />
        </button>
      </div>

      {/* Kamera-View */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* QuaggaJS rendert hier das Video */}
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

        {/* Scan-Rahmen Overlay */}
        {status === 'scanning' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <div style={{ position: 'relative', width: 280, height: 130 }}>
              {/* Dunkles Overlay außerhalb des Rahmens */}
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: -1 }} />
              {/* Rahmen */}
              <div style={{ position: 'absolute', inset: 0, border: '3px solid #C8843A', borderRadius: 12, boxShadow: '0 0 0 2000px rgba(0,0,0,0.5)' }} />
              {/* Scan-Linie */}
              <div style={{ position: 'absolute', left: 4, right: 4, height: 2, background: 'rgba(200,132,58,0.9)', animation: 'scanLine 2s ease-in-out infinite' }} />
            </div>
          </div>
        )}

        {/* Loading */}
        {status === 'loading' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', gap: 12 }}>
            <Loader size={32} color="#C8843A" style={{ animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: '#fff', fontSize: '0.85rem' }}>Kamera wird gestartet...</p>
          </div>
        )}

        {/* Fehler */}
        {status === 'error' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', background: 'rgba(0,0,0,0.85)' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: '1.5rem', textAlign: 'center', maxWidth: 300 }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>📷</div>
              <p style={{ color: '#fff', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 16 }}>{errorMsg}</p>
              <button onClick={onClose} style={{ padding: '0.65rem 1.5rem', background: C.purple, border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                Schließen
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '0.85rem 1.5rem', background: 'rgba(0,0,0,0.85)', textAlign: 'center', color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem', flexShrink: 0 }}>
        Halte die Kamera ruhig über den <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Barcode auf der Rückseite</strong> des Buches
      </div>

      <style>{`
        @keyframes scanLine { 0%,100% { top: 8%; opacity: 0.6 } 50% { top: 82%; opacity: 1 } }
        #interactive.quagga-loading video { width: 100% !important; height: 100% !important; object-fit: cover !important; }
        .drawingBuffer { display: none; }
      `}</style>
    </div>
  )
}

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

  const [coverFile1, setCoverFile1] = useState(null)
  const [coverPreview1, setCoverPreview1] = useState(null)
  const [coverFile2, setCoverFile2] = useState(null)
  const [coverPreview2, setCoverPreview2] = useState(null)

  const [loading, setLoading] = useState(false)
  const [isbnLoading, setIsbnLoading] = useState(false)
  const [isbnError, setIsbnError] = useState('')
  const [isbnSuccess, setIsbnSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showScanner, setShowScanner] = useState(false)

  const handleISBNLookup = async (isbnValue) => {
    const clean = (isbnValue || isbn).replace(/[-\s]/g, '')
    if (clean.length < 10) { setIsbnError('ISBN muss mindestens 10 Zeichen haben.'); return }

    setIsbnLoading(true)
    setIsbnError('')
    setIsbnSuccess(false)

    const result = await lookupISBN(clean)

    if (!result) {
      setIsbnError('Buch nicht gefunden. Bitte Titel und Autor manuell eingeben.')
    } else {
      if (result.title) setTitle(result.title)
      if (result.author) setAuthor(result.author)
      if (result.description) setDescription(result.description)
      if (result.category) setCategory(result.category)
      setIsbnSuccess(true)
    }
    setIsbnLoading(false)
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
      {showScanner && (
        <ScannerModal
          onDetected={async (scanned) => {
            setShowScanner(false)
            setIsbn(scanned)
            await handleISBNLookup(scanned)
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

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
            Scanne den <strong>Barcode auf der Rückseite</strong> des Buches — oder gib die 13-stellige ISBN-Nummer darunter ein.
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Kamera-Button */}
            <button
              onClick={() => setShowScanner(true)}
              disabled={isbnLoading}
              title="Barcode scannen"
              style={{ width: 48, height: 48, borderRadius: 12, background: isbnLoading ? C.border : `linear-gradient(135deg,${C.bark},${C.purple})`, border: 'none', cursor: isbnLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: isbnLoading ? 'none' : '0 4px 12px rgba(61,43,31,0.25)' }}
            >
              {isbnLoading ? <Loader size={20} color={C.muted} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Camera size={20} color="#fff" />}
            </button>

            {/* ISBN Eingabefeld */}
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                value={isbn}
                onChange={e => { setIsbn(e.target.value); setIsbnError(''); setIsbnSuccess(false) }}
                onKeyDown={e => { if (e.key === 'Enter') handleISBNLookup(isbn) }}
                placeholder="z.B. 9783426573969"
                style={{ ...inputStyle, paddingRight: isbn.length >= 10 ? '3rem' : '1rem' }}
              />
              {isbn.length >= 10 && !isbnLoading && (
                <button onClick={() => handleISBNLookup(isbn)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: 8, background: C.purple, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

          {isbnError && (
            <div style={{ marginTop: 10, padding: '0.5rem 0.75rem', background: '#FEE2E2', borderRadius: 8, fontSize: '0.78rem', color: '#991B1B', lineHeight: 1.5 }}>
              ⚠️ {isbnError}
            </div>
          )}
          {isbnSuccess && (
            <div style={{ marginTop: 10, padding: '0.5rem 0.75rem', background: '#D1FAE5', borderRadius: 8, fontSize: '0.78rem', color: '#065F46', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={14} /> Buch gefunden! Titel & Autor ausgefüllt — bitte Kategorie und Beschreibung prüfen.
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

