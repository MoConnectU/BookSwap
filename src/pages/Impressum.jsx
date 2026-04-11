import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { C } from '../components/UI'

export default function Impressum() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 60, zIndex: 50 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={C.muted} />
        </button>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text }}>Impressum</span>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1.5rem' }}>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: C.bark, marginBottom: 24 }}>Impressum</h1>

        <Section title="Angaben gemäß § 5 TMG">
          <p>M. B.</p>
          <p>Klarastr.</p>
          <p>53123 Bonn</p>
        </Section>

        <Section title="Kontakt">
          <p>E-Mail: <a href="mailto:hemmito12@gmail.com" style={{ color: C.purple }}>hemmito12@gmail.com</a></p>
        </Section>

        <Section title="Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV">
          <p>M. B.</p>
          <p>Klarastr.</p>
          <p>53123 Bonn</p>
        </Section>

        <Section title="Haftungsausschluss">
          <Subtitle>Haftung für Inhalte</Subtitle>
          <p style={{ lineHeight: 1.7, color: C.muted, fontSize: '0.9rem' }}>
            Als Diensteanbieter sind wir gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
          </p>
          <Subtitle>Haftung für Links</Subtitle>
          <p style={{ lineHeight: 1.7, color: C.muted, fontSize: '0.9rem' }}>
            Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
          </p>
          <Subtitle>Urheberrecht</Subtitle>
          <p style={{ lineHeight: 1.7, color: C.muted, fontSize: '0.9rem' }}>
            Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
          </p>
        </Section>

        <p style={{ fontSize: '0.78rem', color: C.dust, marginTop: 32 }}>
          Stand: {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 800, color: C.bark, marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.9rem', color: C.text, lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  )
}

function Subtitle({ children }) {
  return <p style={{ fontWeight: 700, color: C.text, marginTop: 12, marginBottom: 4, fontSize: '0.9rem' }}>{children}</p>
}
