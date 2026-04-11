import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Check, ChevronLeft, X, Camera, Search, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, Card, PrimaryBtn, Input } from '../components/UI'

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

// ── ISBN Kamera Scanner ────────────────────────────────────────
function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(true)

  useEffect(() => {
    let interval = null

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }

        // BarcodeDetector API (verfügbar in Chrome/Android)
        if ('BarcodeDetector' in window) {
          const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8'] })
          interval = setInterval(async () => {
            if (!videoRef.current || !scanning) return
            try {
              const barcodes = await detector.detect(videoRef.current)
              if (barcodes.length > 0) {
                const isbn = barcodes[0].rawValue.replace(/-/g, '')
                stopCamera()
                onDetected(isbn)
              }
            } catch (e) {}
          }, 500)
        } else {
          setError('Kamera-Scanner wird auf diesem Gerät nicht unterstützt. Bitte ISBN manuell eingeben.')
        }
      } catch (e) {
        setError('Kamera-Zugriff verweigert. Bitte Berechtigung erteilen oder ISBN manuell eingeben.')
      }
    }

    const stopCamera = () => {
      if (interval) clearInterval(interval)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      setScanning(false)
    }

    startCamera()
    return () => stopCamera()
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#000', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.8)' }}>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>Barcode scannen</span>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} color="#fff" />
        </button>
      </div>

      {/* Camera */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

        {/* Scan-Rahmen */}
        {!error && (
          <div style={{ position: 'absolute', width: 260, height: 120, border: '3px solid #C8843A', borderRadius: 12, boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}>
            {/* Ecken */}
            {[['0 auto auto 0', '-3px auto auto -3px'], ['0 0 auto auto', '-3px -3px auto auto'], ['auto auto 0 0', 'auto auto -3px -3px'], ['auto 0 0 auto', 'auto -3px -3px auto']].map(([b, pos], i) => (
              <div key={i} style={{ position: 'absolute', width: 20, height: 20, border: `3px solid #C8843A`, borderRadius: 2, [['borderRight', 'borderLeft', 'borderRight', 'borderLeft'][i]]: 'none', [['borderBottom', 'borderBottom', 'borderTop', 'borderTop'][i]]: 'none', top: pos.split(' ')[0] === 'auto' ? 'auto' : pos.split(' ')[0], right: pos.split(' ')[1] === 'auto' ? 'auto' : pos.split(' ')[1], bottom: pos.split(' ')[2] === 'auto' ? 'auto' : pos.split(' ')[2], left: pos.split(' ')[3] === 'auto' ? 'auto' : pos.split(' ')[3] }} />
            ))}
            <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 2, background: 'rgba(200,132,58,0.7)', animation: 'scanLine 2s ease-in-out infinite' }} />
          </div>
        )}

        {error && (
          <div style={{ position: 'absolute', padding: '1.5rem', background: 'rgba(0,0,0,0.85)', borderRadius: 16, margin: '1rem', textAlign: 'center' }}>
            <p style={{ color: '#fff', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 12 }}>{error}</p>
            <button onClick={onClose} style={{ padding: '0.6rem 1.5rem', background: C.purple, border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
              Manuell eingeben
            </button>
          </div>
        )}
      </div>

      <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.8)', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem' }}>
        Halte die Kamera über den Barcode auf der Rückseite des Buches
      </div>

      <style>{`@keyframes scanLine { 0%,100% { transform: translateY(-30px); opacity: 0.5; } 50% { transform: translateY(30px); opacity: 1; } }`}</style>
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

  // ── ISBN Lookup via Open Library API ──────────────────────
  const lookupISBN = async (isbnValue) => {
    const clean = isbnValue.replace(/[-\s]/g, '')
    if (clean.length < 10) {
      setIsbnError('ISBN muss mindestens 10 Zeichen haben.')
      return
    }

    setIsbnLoading(true)
    setIsbnError('')
    setIsbnSuccess(false)

    try {
      const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${clean}&format=json&jscmd=data`)
      const data = await res.json()
      const book = data[`ISBN:${clean}`]

      if (!book) {
        setIsbnError('Buch nicht gefunden. Bitte manuell eingeben.')
        setIsbnLoading(false)
        return
      }

      // Felder automatisch ausfüllen
      if (book.title) setTitle(book.title)
      if (book.authors?.[0]?.name) setAuthor(book.authors[0].name)
      if (book.notes) setDescription(typeof book.notes === 'string' ? book.notes : book.notes?.value || '')

      // Kategorie aus Subjects ableiten
      if (book.subjects?.length > 0) {
        const subjectStr = book.subjects.map(s => s.name || s).join(' ').toLowerCase()
        if (subjectStr.includes('kinder') || subjectStr.includes('jugend') || subjectStr.includes('children')) setCategory('Kinder / Jugend')
        else if (subjectStr.includes('krimi') || subjectStr.includes('crime') || subjectStr.includes('thriller') || subjectStr.includes('mystery')) setCategory('Krimi / Thriller')
        else if (subjectStr.includes('fantasy') || subjectStr.includes('science fiction') || subjectStr.includes('sci-fi')) setCategory('Fantasy / SciFi')
        else if (subjectStr.includes('school') || subjectStr.includes('schul') || subjectStr.includes('lehrbuch')) setCategory('Schulbuch')
        else if (subjectStr.includes('roman') || subjectStr.includes('fiction') || subjectStr.includes('novel')) setCategory('Roman')
        else if (subjectStr.includes('sachbuch') || subjectStr.includes('nonfiction') || subjectStr.includes('non-fiction')) setCategory('Sachbuch')
      }

      setIsbnSuccess(true)
    } catch (e) {
      setIsbnError('Fehler beim Abrufen. Bitte manuell eingeben.')
    }

    setIsbnLoading(false)
  }

  const handleScanDetected = (scannedIsbn) => {
    setShowScanner(false)
    setIsbn(scannedIsbn)
    lookupISBN(scannedIsbn)
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

    let cover_url = null
    let cover_url_2 = null
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
      {showScanner && <BarcodeScanner onDetected={handleScanDetected} onClose={() => setShowScanner(false)} />}

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
            Scanne den Barcode auf der Rückseite des Buches — Titel, Autor & Kategorie werden automatisch ausgefüllt.
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Kamera-Button */}
            <button
              onClick={() => setShowScanner(true)}
              style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg,${C.bark},${C.purple})`, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(61,43,31,0.25)' }}
              title="Kamera-Scanner öffnen"
            >
              <Camera size={20} color="#fff" />
            </button>

            {/* ISBN Eingabefeld */}
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                value={isbn}
                onChange={e => { setIsbn(e.target.value); setIsbnError(''); setIsbnSuccess(false) }}
                onKeyDown={e => { if (e.key === 'Enter') lookupISBN(isbn) }}
                placeholder="ISBN eingeben (z.B. 9783442480098)"
                style={{ ...inputStyle, paddingRight: '3rem' }}
              />
              {isbn.length >= 10 && (
                <button
                  onClick={() => lookupISBN(isbn)}
                  disabled={isbnLoading}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32, borderRadius: 8, background: C.purple, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {isbnLoading ? <Loader size={14} color="#fff" style={{ animation: 'spin 0.8s linear infinite' }} /> : <Search size={14} color="#fff" />}
                </button>
              )}
            </div>
          </div>

          {/* Feedback */}
          {isbnError && (
            <div style={{ marginTop: 8, padding: '0.5rem 0.75rem', background: '#FEE2E2', borderRadius: 8, fontSize: '0.78rem', color: '#991B1B' }}>
              ⚠️ {isbnError}
            </div>
          )}
          {isbnSuccess && (
            <div style={{ marginTop: 8, padding: '0.5rem 0.75rem', background: '#D1FAE5', borderRadius: 8, fontSize: '0.78rem', color: '#065F46', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Check size={14} /> Buch gefunden! Felder wurden ausgefüllt — bitte prüfen und ergänzen.
            </div>
          )}
        </Card>

        {/* ── Fotos ── */}
        <Card style={{ padding: '1.25rem', marginBottom: 14 }}>
          <h3 style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text, marginBottom: 4 }}>
            Fotos <span style={{ color: C.muted, fontWeight: 400, fontSize: '0.82rem' }}>(optional, max. 2)</span>
          </h3>
          <p style={{ fontSize: '0.78rem', color: C.muted, marginBottom: 14, lineHeight: 1.5 }}>
            📸 Mach eigene Fotos von deinem Buch — Vorder- und Rückseite
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
          <div style={{ marginBottom: 12 }}>
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

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
