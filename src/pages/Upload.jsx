import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, Check, ChevronLeft, X, Camera, Search, Loader } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { C, Card, PrimaryBtn } from '../components/UI'

const CONDITIONS = ['Wie neu', 'Sehr gut', 'Gut', 'Akzeptabel']
const CATEGORIES = ['Roman', 'Sachbuch', 'Schulbuch', 'Studium / Fachbuch', 'Krimi / Thriller', 'Fantasy / SciFi', 'Kinder / Jugend', 'Ratgeber', 'Sonstiges']

// ── HTML Entities dekodieren (Fix für "&#152;" etc.) ──────────
function decodeHtmlEntities(str) {
  if (!str) return ''
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  // Zusätzlich unsichtbare Unicode-Zeichen entfernen
  return txt.value.replace(/[\u0080-\u009F]/g, '').trim()
}

// ── Kategorie aus Subjects ableiten ───────────────────────────
function detectCategory(subjectStr) {
  const s = (subjectStr || '').toLowerCase()
  if (s.includes('kinder') || s.includes('jugend') || s.includes('children')) return 'Kinder / Jugend'
  if (s.includes('krimi') || s.includes('crime') || s.includes('thriller') || s.includes('mystery') || s.includes('spionage')) return 'Krimi / Thriller'
  if (s.includes('fantasy') || s.includes('science fiction') || s.includes('sci-fi') || s.includes('scifi')) return 'Fantasy / SciFi'
  if (s.includes('schul') || s.includes('lehrbuch') || s.includes('school') || s.includes('studium')) return 'Schulbuch'
  if (s.includes('sachbuch') || s.includes('nonfiction') || s.includes('non-fiction') || s.includes('ratgeber')) return 'Sachbuch'
  if (s.includes('roman') || s.includes('fiction') || s.includes('novel') || s.includes('belletristik') || s.includes('erzähl')) return 'Roman'
  return 'Roman'
}

// ── ISBN Lookup: Open Library + DNB ──────────────────────────
async function lookupISBNData(isbn) {
  const clean = isbn.replace(/[-\s]/g, '')
  let result = null

  // 1. Open Library (gut für englische Bücher + hat oft Beschreibungen)
  try {
    const res = await fetch(`https://openlibrary.org/api/books?bibkeys=ISBN:${clean}&format=json&jscmd=data`)
    const data = await res.json()
    const book = data[`ISBN:${clean}`]
    if (book?.title) {
      const desc = typeof book.notes === 'string' ? book.notes : (book.notes?.value || '')
      result = {
        title: decodeHtmlEntities(book.title),
        author: decodeHtmlEntities(book.authors?.[0]?.name || ''),
        description: decodeHtmlEntities(desc),
        category: detectCategory(book.subjects?.map(s => s.name || s).join(' ') || ''),
        source: 'openlibrary',
      }
    }
  } catch (e) {}

  // 2. DNB — Deutsche Nationalbibliothek (für deutsche Bücher)
  try {
    const res = await fetch(
      `https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&query=isbn%3D${clean}&recordSchema=MARC21-xml&maximumRecords=1`
    )
    const xml = await res.text()
    const numRecords = xml.match(/numberOfRecords>(\d+)</)

    if (numRecords && parseInt(numRecords[1]) > 0) {
      // Titel (245a = Haupttitel, 245b = Untertitel)
      const t245a = xml.match(/tag="245"[^>]*>[\s\S]{0,500}?subfield code="a">([^<]+)</)
      const t245b = xml.match(/tag="245"[^>]*>[\s\S]{0,500}?subfield code="b">([^<]+)</)

      if (t245a?.[1]) {
        // Autor (100a = Haupteintrag Personenname)
        const t100 = xml.match(/tag="100"[^>]*>[\s\S]{0,500}?subfield code="a">([^<]+)</)
        const t700 = xml.match(/tag="700"[^>]*>[\s\S]{0,500}?subfield code="a">([^<]+)</)
        let rawAuthor = t100?.[1] || t700?.[1] || ''
        // "Nachname, Vorname" → "Vorname Nachname"
        if (rawAuthor.includes(',')) {
          const parts = rawAuthor.split(',')
          rawAuthor = (parts[1]?.trim() + ' ' + parts[0]?.trim()).trim()
        }

        // Beschreibung: 520 = Abstract, sonst 500 = Allgemeine Notiz
        const t520 = xml.match(/tag="520"[^>]*>[\s\S]{0,500}?subfield code="a">([^<]+)</)
        const t500 = xml.match(/tag="500"[^>]*>[\s\S]{0,500}?subfield code="a">([^<]+)</)

        // Kategorie: aus 653 Keywords ableiten
        const t653all = [...xml.matchAll(/tag="653"[^>]*>[\s\S]{0,300}?subfield code="a">([^<]+)</g)].map(m => m[1]).join(' ')

        // Untertitel anhängen wenn vorhanden
        let fullTitle = decodeHtmlEntities(t245a[1])
        if (t245b?.[1]) {
          const subtitle = decodeHtmlEntities(t245b[1])
          // Nur anhängen wenn Untertitel kein "limitierte Auflage" etc. ist
          if (!subtitle.toLowerCase().includes('auflage') && !subtitle.toLowerCase().includes('ausg')) {
            fullTitle = fullTitle + ' – ' + subtitle
          }
        }

        const dnbResult = {
          title: fullTitle,
          author: decodeHtmlEntities(rawAuthor),
          description: decodeHtmlEntities(t520?.[1] || t500?.[1] || ''),
          category: detectCategory(t653all),
          source: 'dnb',
        }

        // DNB bevorzugen wenn kein Open Library Ergebnis, oder wenn DNB deutschen Titel hat
        if (!result) {
          result = dnbResult
        } else {
          // Open Library hatte englischen Titel? DNB überschreibt mit deutschem
          result.title = dnbResult.title || result.title
          result.author = dnbResult.author || result.author
          result.category = dnbResult.category || result.category
          // Beschreibung: nehme was vorhanden ist
          if (!result.description && dnbResult.description) result.description = dnbResult.description
        }
      }
    }
  } catch (e) {}

  // 3. Falls immer noch keine Beschreibung: Open Library Work-Seite versuchen
  if (result && !result.description) {
    try {
      const workRes = await fetch(`https://openlibrary.org/search.json?isbn=${clean}&fields=key,description,first_sentence`)
      const workData = await workRes.json()
      const doc = workData.docs?.[0]
      const desc = doc?.description?.value || doc?.description || doc?.first_sentence?.value || ''
      if (desc) result.description = decodeHtmlEntities(desc)
    } catch (e) {}
  }

  return result
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

// ── Kamera Scanner Modal ───────────────────────────────────────
function ScannerModal({ onDetected, onClose }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [status, setStatus] = useState('starting') // starting | scanning | error
  const [errorMsg, setErrorMsg] = useState('')
  const intervalRef = useRef(null)

  useEffect(() => {
    startScanner()
    return () => stopScanner()
  }, [])

  const stopScanner = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // BarcodeDetector API (Chrome Android + neuere Browser)
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a'] })
        setStatus('scanning')
        intervalRef.current = setInterval(async () => {
          if (!videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes.length > 0) {
              stopScanner()
              onDetected(codes[0].rawValue)
            }
          } catch (e) {}
        }, 400)
      } else {
        setStatus('error')
        setErrorMsg('Live-Scanner wird auf diesem Gerät nicht unterstützt. Nutze den "Foto"-Button unten oder gib die ISBN manuell ein.')
      }
    } catch (e) {
      setStatus('error')
      setErrorMsg('Kamera-Zugriff verweigert oder nicht verfügbar. Bitte ISBN manuell eingeben.')
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#000', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.85)', flexShrink: 0 }}>
        <span style={{ color: '#fff', fontWeight: 700 }}>Barcode scannen</span>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <X size={18} color="#fff" />
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

        {/* Scan Rahmen */}
        {status === 'scanning' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
            <div style={{ position: 'relative', width: 280, height: 130, zIndex: 1 }}>
              <div style={{ position: 'absolute', inset: 0, border: '3px solid #C8843A', borderRadius: 12 }} />
              {/* Scan-Linie Animation */}
              <div style={{ position: 'absolute', left: 4, right: 4, height: 2, background: 'rgba(200,132,58,0.9)', animation: 'scanLine 2s ease-in-out infinite' }} />
            </div>
          </div>
        )}

        {status === 'error' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.9)', borderRadius: 16, padding: '1.5rem', textAlign: 'center', maxWidth: 320 }}>
              <div style={{ fontSize: '2rem', marginBottom: 10 }}>📷</div>
              <p style={{ color: '#fff', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 16 }}>{errorMsg}</p>
              <button onClick={onClose} style={{ padding: '0.65rem 1.5rem', background: C.purple, border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
                Schließen
              </button>
            </div>
          </div>
        )}

        {status === 'starting' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}>
            <div style={{ textAlign: 'center' }}>
              <Loader size={32} color="#C8843A" style={{ animation: 'spin 0.8s linear infinite', marginBottom: 12 }} />
              <p style={{ color: '#fff', fontSize: '0.85rem' }}>Kamera wird gestartet...</p>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: '0.85rem 1.5rem', background: 'rgba(0,0,0,0.85)', textAlign: 'center', color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem', flexShrink: 0 }}>
        Halte die Kamera ruhig über den Barcode auf der Buchseite
      </div>
      <style>{`@keyframes scanLine { 0%,100% { top: 10%; opacity: 0.6 } 50% { top: 80%; opacity: 1 } }`}</style>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────
export default function UploadPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const photoScanRef = useRef(null)

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

  const fillFromResult = (result) => {
    if (result.title) setTitle(result.title)
    if (result.author) setAuthor(result.author)
    if (result.description) setDescription(result.description)
    if (result.category) setCategory(result.category)
    setIsbnSuccess(true)
  }

  const handleISBNLookup = async (isbnValue) => {
    const clean = (isbnValue || isbn).replace(/[-\s]/g, '')
    if (clean.length < 10) { setIsbnError('ISBN muss mindestens 10 Zeichen haben.'); return }

    setIsbnLoading(true)
    setIsbnError('')
    setIsbnSuccess(false)

    const result = await lookupISBNData(clean)

    if (!result) {
      setIsbnError('Buch nicht gefunden. Bitte Titel und Autor manuell eingeben.')
    } else {
      fillFromResult(result)
    }
    setIsbnLoading(false)
  }

  // Foto-Scan für iPhone: Foto aufnehmen → Barcode aus Bild lesen
  const handlePhotoScan = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setIsbnLoading(true)
    setIsbnError('')

    try {
      // Dynamisch laden — funktioniert auf allen Browsern inkl. Safari iOS
      const { BrowserMultiFormatReader, NotFoundException } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      const imgUrl = URL.createObjectURL(file)
      const img = new Image()
      img.src = imgUrl
      await new Promise(r => { img.onload = r; img.onerror = r })

      try {
        const result = await reader.decodeFromImageElement(img)
        URL.revokeObjectURL(imgUrl)
        if (result?.text) {
          const scanned = result.text.replace(/[-\s]/g, '')
          setIsbn(scanned)
          await handleISBNLookup(scanned)
          return
        }
      } catch (e) {
        URL.revokeObjectURL(imgUrl)
      }
      setIsbnError('Kein Barcode erkannt. Bitte ISBN manuell eingeben.')
    } catch (e) {
      setIsbnError('Scanner konnte nicht geladen werden. Bitte ISBN manuell eingeben.')
    }
    setIsbnLoading(false)
    if (photoScanRef.current) photoScanRef.current.value = ''
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
            Scanne den Barcode auf der Rückseite — Titel, Autor & Kategorie werden automatisch ausgefüllt.
          </p>

          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {/* Live-Scanner Button (Chrome/Android) */}
            <button
              onClick={() => setShowScanner(true)}
              disabled={isbnLoading}
              title="Live-Kamera Scanner"
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
                placeholder="ISBN eingeben (z.B. 9783442480098)"
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

          {/* Foto-Scan für iPhone (Fallback) */}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.75rem', color: C.muted, padding: '0.4rem 0.8rem', border: `1px solid ${C.border}`, borderRadius: 8, background: C.cream }}>
            <input ref={photoScanRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoScan} style={{ display: 'none' }} />
            📸 Barcode-Foto aufnehmen (iPhone)
          </label>

          {/* Feedback */}
          {isbnError && (
            <div style={{ marginTop: 10, padding: '0.5rem 0.75rem', background: '#FEE2E2', borderRadius: 8, fontSize: '0.78rem', color: '#991B1B', lineHeight: 1.5 }}>
              ⚠️ {isbnError}
            </div>
          )}
          {isbnSuccess && (
            <div style={{ marginTop: 10, padding: '0.5rem 0.75rem', background: '#D1FAE5', borderRadius: 8, fontSize: '0.78rem', color: '#065F46', display: 'flex', alignItems: 'center', gap: 6 }}>
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
