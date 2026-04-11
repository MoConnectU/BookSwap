import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { C } from '../components/UI'

export default function Datenschutz() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 60, zIndex: 50 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: '50%', background: C.bg, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft size={20} color={C.muted} />
        </button>
        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text }}>Datenschutzerklärung</span>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem 1.5rem' }}>

        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, color: C.bark, marginBottom: 8 }}>Datenschutzerklärung</h1>
        <p style={{ fontSize: '0.85rem', color: C.muted, marginBottom: 28 }}>
          Wir nehmen den Schutz deiner persönlichen Daten sehr ernst. Diese Datenschutzerklärung informiert dich darüber, welche Daten wir erheben, wie wir sie verwenden und welche Rechte du hast.
        </p>

        <Section title="1. Verantwortlicher">
          <p>M. B.</p>
          <p>Klarastr., 53123 Bonn</p>
          <p>E-Mail: <a href="mailto:hemmito12@gmail.com" style={{ color: C.purple }}>hemmito12@gmail.com</a></p>
        </Section>

        <Section title="2. Welche Daten wir erheben">
          <p style={{ lineHeight: 1.7, color: C.muted, fontSize: '0.9rem' }}>
            Bei der Nutzung von BlätterTausch erheben wir folgende Daten:
          </p>
          <ul style={{ paddingLeft: 20, color: C.muted, fontSize: '0.9rem', lineHeight: 1.9, marginTop: 8 }}>
            <li><strong style={{ color: C.text }}>Kontodaten:</strong> E-Mail-Adresse, Name (bei der Registrierung)</li>
            <li><strong style={{ color: C.text }}>Profildaten:</strong> Profilbild, Stadt (freiwillig)</li>
            <li><strong style={{ color: C.text }}>Buchdaten:</strong> Titel, Autor, Buchfotos, Zustand, Beschreibung</li>
            <li><strong style={{ color: C.text }}>Kommunikation:</strong> Nachrichten im Chat zwischen Nutzern</li>
            <li><strong style={{ color: C.text }}>Transaktionsdaten:</strong> Tausch-Anfragen, Bewertungen</li>
            <li><strong style={{ color: C.text }}>Technische Daten:</strong> Session-Cookies für die Anmeldung (technisch notwendig)</li>
          </ul>
        </Section>

        <Section title="3. Zweck der Datenverarbeitung">
          <p style={{ lineHeight: 1.7, color: C.muted, fontSize: '0.9rem' }}>
            Wir verarbeiten deine Daten ausschließlich zur Bereitstellung des Dienstes:
          </p>
          <ul style={{ paddingLeft: 20, color: C.muted, fontSize: '0.9rem', lineHeight: 1.9, marginTop: 8 }}>
            <li>Erstellung und Verwaltung deines Nutzerkontos</li>
            <li>Vermittlung von Bücher-Tausch-Angeboten zwischen Nutzern</li>
            <li>Versand von E-Mail-Benachrichtigungen bei neuen Anfragen und Nachrichten</li>
            <li>Bewertungssystem nach abgeschlossenen Tauschen</li>
          </ul>
        </Section>

        <Section title="4. Rechtsgrundlage (DSGVO)">
          <p style={{ lineHeight: 1.7, color: C.muted, fontSize: '0.9rem' }}>
            Die Verarbeitung deiner Daten erfolgt auf Basis von:
          </p>
          <ul style={{ paddingLeft: 20, color: C.muted, fontSize: '0.9rem', lineHeight: 1.9, marginTop: 8 }}>
            <li><strong style={{ color: C.text }}>Art. 6 Abs. 1 lit. b DSGVO</strong> — Vertragserfüllung: Daten die zur Nutzung des Dienstes notwendig sind</li>
            <li><strong style={{ color: C.text }}>Art. 6 Abs. 1 lit. f DSGVO</strong> — Berechtigte Interessen: Sicherheit und Betrieb der Plattform</li>
            <li><strong style={{ color: C.text }}>Art. 6 Abs. 1 lit. a DSGVO</strong> — Einwilligung: bei freiwilligen Angaben wie Profilbild und Stadt</li>
          </ul>
        </Section>

        <Section title="5. Dienstleister & Datenübermittlung">
          <p style={{ lineHeight: 1.7, color: C.muted, fontSize: '0.9rem', marginBottom: 10 }}>
            Wir setzen folgende externe Dienstleister ein:
          </p>

          <div style={{ background: C.cream, borderRadius: 12, padding: '1rem', marginBottom: 10 }}>
            <p style={{ fontWeight: 700, color: C.bark, fontSize: '0.9rem', marginBottom: 4 }}>Supabase (Datenbank & Authentifizierung)</p>
            <p style={{ fontSize: '0.82rem', color: C.muted, lineHeight: 1.6 }}>
              Anbieter: Supabase Inc., San Francisco, USA<br />
              Server-Standort: AWS Frankfurt (EU-West)<br />
              Zweck: Speicherung von Nutzerkonten, Büchern, Nachrichten und Bildern<br />
              Datenschutz: <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer" style={{ color: C.purple }}>supabase.com/privacy</a>
            </p>
          </div>

          <div style={{ background: C.cream, borderRadius: 12, padding: '1rem' }}>
            <p style={{ fontWeight: 700, color: C.bark, fontSize: '0.9rem', marginBottom: 4 }}>Resend (E-Mail-Versand)</p>
            <p style={{ fontSize: '0.82rem', color: C.muted, lineHeight: 1.6 }}>
              Anbieter: Resend Inc., USA<br />
              Zweck: Versand von Benachrichtigungs-E-Mails<br />
              Es werden nur E-Mail-Adresse und relevante Inhaltsdaten übermittelt.<br />
              Datenschutz: <a href="https://resend.com/privacy" target="_blank" rel="noreferrer" style={{ color: C.purple }}>resend.com/privacy</a>
            </p>
          </div>
        </Section>

        <Section title="6. Cookies">
          <p style={{ lineHeight: 1.7, color: C.muted, fontSize: '0.9rem' }}>
            BlätterTausch verwendet ausschließlich <strong style={{ color: C.text }}>technisch notwendige Cookies</strong> für die Anmeldung und Session-Verwaltung (Supabase Auth). Diese Cookies sind für den Betrieb der Plattform erforderlich und können nicht deaktiviert werden.
          </p>
          <p style={{ lineHeight: 1.7, color: C.muted, fontSize: '0.9rem', marginTop: 8 }}>
            Wir verwenden <strong style={{ color: C.text }}>keine</strong> Tracking-Cookies, Analytics-Dienste (z.B. Google Analytics) oder Werbecookies. Daher ist kein Cookie-Banner erforderlich.
          </p>
        </Section>

        <Section title="7. Speicherdauer">
          <p style={{ lineHeight: 1.7, color: C.muted, fontSize: '0.9rem' }}>
            Deine Daten werden so lange gespeichert, wie dein Konto aktiv ist. Du kannst dein Konto und alle damit verbundenen Daten jederzeit löschen lassen (siehe Rechte unten). Nachrichten und Tausch-Verläufe werden nach Abschluss des Tauschs für 12 Monate aufbewahrt.
          </p>
        </Section>

        <Section title="8. Deine Rechte (DSGVO)">
          <p style={{ lineHeight: 1.7, color: C.muted, fontSize: '0.9rem', marginBottom: 8 }}>
            Du hast folgende Rechte bezüglich deiner personenbezogenen Daten:
          </p>
          <ul style={{ paddingLeft: 20, color: C.muted, fontSize: '0.9rem', lineHeight: 1.9 }}>
            <li><strong style={{ color: C.text }}>Auskunft</strong> (Art. 15 DSGVO): Welche Daten wir über dich gespeichert haben</li>
            <li><strong style={{ color: C.text }}>Berichtigung</strong> (Art. 16 DSGVO): Korrektur falscher Daten</li>
            <li><strong style={{ color: C.text }}>Löschung</strong> (Art. 17 DSGVO): Löschung deiner Daten ("Recht auf Vergessenwerden")</li>
            <li><strong style={{ color: C.text }}>Einschränkung</strong> (Art. 18 DSGVO): Einschränkung der Verarbeitung</li>
            <li><strong style={{ color: C.text }}>Widerspruch</strong> (Art. 21 DSGVO): Widerspruch gegen die Verarbeitung</li>
            <li><strong style={{ color: C.text }}>Datenübertragbarkeit</strong> (Art. 20 DSGVO): Daten in maschinenlesbarem Format erhalten</li>
          </ul>
          <p style={{ lineHeight: 1.7, color: C.muted, fontSize: '0.9rem', marginTop: 12 }}>
            Zur Ausübung deiner Rechte wende dich an: <a href="mailto:hemmito12@gmail.com" style={{ color: C.purple }}>hemmito12@gmail.com</a>
          </p>
          <p style={{ lineHeight: 1.7, color: C.muted, fontSize: '0.9rem', marginTop: 8 }}>
            Du hast außerdem das Recht, dich bei der zuständigen Aufsichtsbehörde zu beschweren:<br />
            <strong style={{ color: C.text }}>Landesbeauftragte für Datenschutz und Informationsfreiheit NRW</strong><br />
            <a href="https://www.ldi.nrw.de" target="_blank" rel="noreferrer" style={{ color: C.purple }}>www.ldi.nrw.de</a>
          </p>
        </Section>

        <Section title="9. Datensicherheit">
          <p style={{ lineHeight: 1.7, color: C.muted, fontSize: '0.9rem' }}>
            Die Übertragung deiner Daten erfolgt verschlüsselt über HTTPS. Passwörter werden niemals im Klartext gespeichert. Wir nutzen die Sicherheitsinfrastruktur von Supabase, die dem Stand der Technik entspricht und auf AWS Frankfurt (EU) betrieben wird.
          </p>
        </Section>

        <p style={{ fontSize: '0.78rem', color: C.dust, marginTop: 32, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
          Stand: {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })} · Diese Datenschutzerklärung kann bei Änderungen des Dienstes aktualisiert werden.
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
