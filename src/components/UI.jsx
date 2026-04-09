// ── Design tokens ──────────────────────────────────────────
export const C = {
  purple: '#7C3AED',
  purpleLight: '#EDE9FE',
  purpleMid: '#A78BFA',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
  white: '#FFFFFF',
  bg: '#F8F7FF',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  muted: '#6B7280',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  error: '#EF4444',
  errorLight: '#FEE2E2',
}

// ── Avatar ──────────────────────────────────────────────────
export const Avatar = ({ letter, size = 36, src }) => {
  if (src) return (
    <img src={src} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
  )
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: `linear-gradient(135deg, ${C.purple}, ${C.blue})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: size * 0.38, color: '#fff', flexShrink: 0 }}>
      {letter?.charAt(0).toUpperCase()}
    </div>
  )
}

// ── Badge ───────────────────────────────────────────────────
export const Badge = ({ children, color = C.purple, bg = C.purpleLight }) => (
  <span style={{ padding: '0.2rem 0.65rem', borderRadius: 100, background: bg, color, fontSize: '0.72rem', fontWeight: 600, display: 'inline-block', whiteSpace: 'nowrap' }}>
    {children}
  </span>
)

export const condColor = (c) => c === 'Wie neu' ? C.success : c === 'Sehr gut' ? C.blue : C.warning
export const CondBadge = ({ cond }) => <Badge color={condColor(cond)} bg={condColor(cond) + '22'}>{cond}</Badge>

// ── Card ────────────────────────────────────────────────────
export const Card = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', transition: 'all 0.2s', cursor: onClick ? 'pointer' : 'default', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', ...style }}>
    {children}
  </div>
)

// ── Buttons ─────────────────────────────────────────────────
export const PrimaryBtn = ({ children, onClick, style = {}, icon: Icon, disabled, type = 'button' }) => (
  <button type={type} onClick={onClick} disabled={disabled} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '0.75rem 1.5rem', background: disabled ? C.border : `linear-gradient(135deg, ${C.purple}, ${C.blue})`, color: disabled ? C.muted : '#fff', border: 'none', borderRadius: 12, fontWeight: 600, fontSize: '0.92rem', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.18s', boxShadow: disabled ? 'none' : '0 4px 14px rgba(124,58,237,0.3)', ...style }}>
    {Icon && <Icon size={16} />}{children}
  </button>
)

export const GhostBtn = ({ children, onClick, style = {}, icon: Icon }) => (
  <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '0.65rem 1.2rem', background: 'transparent', color: C.muted, border: `1.5px solid ${C.border}`, borderRadius: 12, fontWeight: 500, fontSize: '0.88rem', cursor: 'pointer', transition: 'all 0.18s', ...style }}>
    {Icon && <Icon size={15} />}{children}
  </button>
)

// ── Toast ───────────────────────────────────────────────────
export const Toast = ({ msg, type = 'info' }) => (
  <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: type === 'error' ? C.error : C.text, color: '#fff', padding: '0.7rem 1.5rem', borderRadius: 100, fontSize: '0.85rem', zIndex: 999, whiteSpace: 'nowrap', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', animation: 'fadeUp 0.3s ease' }}>
    {msg}
  </div>
)

// ── Spinner ─────────────────────────────────────────────────
export const Spinner = ({ size = 24 }) => (
  <div style={{ width: size, height: size, border: `3px solid ${C.purpleLight}`, borderTop: `3px solid ${C.purple}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
)

// ── Input ───────────────────────────────────────────────────
export const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>}
    <input {...props} style={{ width: '100%', padding: '0.75rem 1rem', border: `1.5px solid ${C.border}`, borderRadius: 10, outline: 'none', fontSize: '0.9rem', color: '#111827', background: C.bg, transition: 'border-color 0.18s', ...props.style }} />
  </div>
)

// ── Google / Apple Icons ────────────────────────────────────
export const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)
