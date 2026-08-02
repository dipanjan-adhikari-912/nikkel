'use client'

import { useEffect, useState } from 'react'

const SEVERITY = {
  low: { label: 'Low Priority', bars: 1 },
  medium: { label: 'Medium Priority', bars: 2 },
  high: { label: 'High Priority', bars: 3 },
}

// Exact proportions from the pencil `review_page` design (frame P5XGFV, 2400×1505)
const DESIGN_W = 2400

function timeAgo(iso) {
  if (!iso) return ''
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'Just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min${m === 1 ? '' : 's'} ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Avatar({ src, name, size = 25 }) {
  const initials = (name || '?')
    .split(/\s+/)
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  if (src) {
    return <img src={src} width={size} height={size} style={{ borderRadius: 8, objectFit: 'cover', background: '#d9d9d9', flexShrink: 0 }} alt="" />
  }
  return (
    <div style={{ width: size, height: size, borderRadius: 8, background: '#d9d9d9', color: '#101715', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: size * 0.4, flexShrink: 0 }}>
      {initials}
    </div>
  )
}

const WORDMARK = [
  { d: 'M21.651018 86.604065L0 86.604065L0 1.6654627L5.2343121 1.6654627L12.37201 9.9134693C15.861551 6.7411594 19.800503 4.3090544 24.188866 2.6171558C28.6301 0.87238526 33.256386 0 38.067722 0C43.249161 0 48.139809 1.0045648 52.739658 3.0136945C57.339508 4.9699526 61.357773 7.692852 64.794441 11.182393C68.23111 14.619062 70.927567 18.663757 72.883827 23.316479C74.89296 27.916328 75.897522 32.833412 75.897522 38.067722L75.897522 86.604065L54.246506 86.604065L54.246506 38.067722C54.246506 35.847107 53.823532 33.758667 52.977581 31.802408C52.13163 29.793278 50.968452 28.048508 49.488041 26.568096C48.007629 25.087685 46.289291 23.924505 44.333035 23.078556C42.376778 22.232607 40.288338 21.809631 38.067722 21.809631C35.794235 21.809631 33.652924 22.232607 31.643795 23.078556C29.634665 23.924505 27.889894 25.087685 26.409483 26.568096C24.929071 28.048508 23.76589 29.793278 22.919941 31.802408C22.073992 33.758667 21.651018 35.847107 21.651018 38.067722L21.651018 86.604065Z', x: 0, y: 20.067, w: 50.213, h: 54.106, vbW: 75.89752197265625, vbH: 86.60406494140625, fill: '#ffffff' },
  { d: 'M21.809633 84.938614L0 84.938614L0 0L21.809633 0L21.809633 84.938614Z', x: 55.152, y: 21.107, w: 14.429, h: 53.065, vbW: 21.809633255004883, vbH: 84.93861389160156, fill: '#ffffff' },
  { d: 'M21.809633 112.02214L0 112.02214L0 0L21.809633 0L21.809633 70.640549L54.087891 32.027702L78.990524 32.027702L50.836273 65.402367L78.990524 112.02214L54.087891 112.02214L36.878109 82.912842L21.809633 82.912842L21.809633 101.77028L21.809633 112.02214Z', x: 74.593, y: 0, w: 52.259, h: 74.172, vbW: 78.99052429199219, vbH: 112.02214050292969, fill: '#ffffff' },
  { d: 'M21.809633 118.72372L0 118.72372L0 0L21.809633 0L21.809633 74.866531L54.087891 33.943722L78.990524 33.943722L50.836273 69.314987L78.990524 118.72372L54.087891 118.72372L36.878109 87.873001L21.809633 87.873001L21.809633 107.85856L21.809633 118.72372Z', x: 127.686, y: 0, w: 52.259, h: 74.172, vbW: 78.99052429199219, vbH: 118.72371673583984, fill: '#ffffff' },
  { d: 'M5.6601562 9.9609375C5.7851562 10 5.9101562 10.027344 6.0351562 10.042969C6.1601562 10.050781 6.2851562 10.054688 6.4101562 10.054688C6.7226562 10.054688 7.0234375 10.011719 7.3125 9.9257812C7.6015625 9.8398438 7.8710938 9.71875 8.1210938 9.5625C8.3789062 9.3984375 8.6054688 9.203125 8.8007812 8.9765625C9.0039062 8.7421875 9.1679688 8.484375 9.2929688 8.203125L11.636719 10.558594C11.339844 10.980469 10.996094 11.359375 10.605469 11.695312C10.222656 12.03125 9.8046875 12.316406 9.3515625 12.550781C8.90625 12.785156 8.4335938 12.960938 7.9335938 13.078125C7.4414062 13.203125 6.9335938 13.265625 6.4101562 13.265625C5.5273438 13.265625 4.6953125 13.101562 3.9140625 12.773438C3.140625 12.445312 2.4609375 11.988281 1.875 11.402344C1.296875 10.816406 0.83984375 10.121094 0.50390625 9.3164062C0.16796875 8.5039062 0 7.6132812 0 6.6445312C0 5.6523438 0.16796875 4.7460938 0.50390625 3.9257812C0.83984375 3.1054688 1.296875 2.40625 1.875 1.828125C2.4609375 1.25 3.140625 0.80078125 3.9140625 0.48046875C4.6953125 0.16015625 5.5273438 0 6.4101562 0C6.9335938 0 7.4453125 0.0625 7.9453125 0.1875C8.4453125 0.3125 8.9179688 0.4921875 9.3632812 0.7265625C9.8164062 0.9609375 10.238281 1.25 10.628906 1.59375C11.019531 1.9296875 11.363281 2.3085938 11.660156 2.7304688L5.6601562 9.9609375ZM7.3007812 3.3632812C7.1523438 3.3085938 7.0039062 3.2734375 6.8554688 3.2578125C6.7148438 3.2421875 6.5664062 3.234375 6.4101562 3.234375C5.9726562 3.234375 5.5585938 3.3164062 5.1679688 3.4804688C4.7851562 3.6367188 4.4492188 3.8632812 4.1601562 4.1601562C3.8789062 4.4570312 3.65625 4.8164062 3.4921875 5.2382812C3.328125 5.6523438 3.2460938 6.1210938 3.2460938 6.6445312C3.2460938 6.7617188 3.25 6.8945312 3.2578125 7.0429688C3.2734375 7.1914062 3.2929688 7.34375 3.3164062 7.5C3.3476562 7.6484375 3.3828125 7.7929688 3.421875 7.9335938C3.4609375 8.0742188 3.5117188 8.1992188 3.5742188 8.3085938L7.3007812 3.3632812Z', x: 174.659, y: 18.913, w: 52.207, h: 56.087, vbW: 11.66015625, vbH: 13.265625, fill: '#ffffff' },
  { d: 'M3.2226562 17.542969L0 17.542969L0 0L3.2226562 0L3.2226562 17.542969Z', x: 229.571, y: 0.042, w: 14.429, h: 74.172, vbW: 3.22265625, vbH: 17.54296875, fill: '#ffffff' },
  { d: 'M27.91633 20.064863C28.709408 18.320093 29.105947 16.443142 29.105947 14.434013C29.105947 12.477756 28.709408 10.62724 27.91633 8.8824692C27.176125 7.0848265 26.145124 5.5515437 24.823328 4.2826195C23.501532 2.9608235 21.941813 1.9298229 20.144171 1.1896172C18.399401 0.39653951 16.522449 0 14.51332 0C12.50419 0 10.600803 0.39653951 8.8031607 1.1896172C7.0583901 1.9298229 5.5251069 2.9608235 4.203311 4.2826195C2.9343867 5.5515437 1.9033862 7.0848265 1.1103086 8.8824692C0.37010288 10.62724 0 12.477756 0 14.434013C0 16.443142 0.37010288 18.320093 1.1103086 20.064863C1.9033862 21.809633 2.9343867 23.342918 4.203311 24.664715C5.5251069 25.93364 7.0583901 26.96464 8.8031607 27.757717C10.600803 28.497923 12.50419 28.868025 14.51332 28.868025C16.522449 28.868025 18.399401 28.497923 20.144171 27.757717C21.941813 26.96464 23.501532 25.93364 24.823328 24.664715C26.145124 23.342918 27.176125 21.809633 27.91633 20.064863Z', x: 52.791, y: 0.18, w: 19.256, h: 19.114, vbW: 29.105947494506836, vbH: 28.868024826049805, fill: '#71b9a1' },
]

function Wordmark({ width = 105 }) {
  return (
    <svg viewBox="0 0 244 75" width={width} height={width * (75 / 244)} fill="none" style={{ display: 'block' }}>
      {WORDMARK.map((p, i) => (
        <path key={i} d={p.d} fill={p.fill} transform={`translate(${p.x} ${p.y}) scale(${p.w / p.vbW} ${p.h / p.vbH})`} />
      ))}
    </svg>
  )
}

function SeverityBadge({ severity }) {
  const cfg = SEVERITY[severity] || SEVERITY.medium
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5.6, background: '#82b0a033', borderRadius: 4, padding: '8px 5.6px', width: 'fit-content' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1.4, height: 19, justifyContent: 'flex-end' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 8.4, height: 4.2, background: i < cfg.bars ? '#ddf3ec' : '#82b0a033' }} />
        ))}
      </div>
      <span style={{ color: '#ddf3ec', fontSize: 16, lineHeight: '22px' }}>{cfg.label}</span>
    </div>
  )
}

function CommentCard({ nikkel, sender }) {
  const tag = nikkel.tag || (nikkel.element_text ? 'element' : null)
  const elementText = (nikkel.element_text || '').slice(0, 80)
  return (
    <div style={{ background: '#82b0a033', borderRadius: 12, padding: '11.2px 16.8px', display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8.4, minWidth: 0 }}>
          <Avatar src={sender?.avatar_url} name={sender?.name} size={25} />
          <span style={{ color: '#94c3b3', fontSize: 18, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {sender?.name || 'Guest'}
          </span>
        </div>
        <span style={{ color: '#94c3b3', fontSize: 14, flexShrink: 0 }}>{timeAgo(nikkel.created_at)}</span>
      </div>
      {tag && (
        <div style={{ color: '#71b9a1', fontFamily: 'Inconsolata, monospace', fontSize: 16 }}>
          &lt;{tag}&gt;
        </div>
      )}
      {elementText && (
        <div style={{ color: '#ffffff', fontFamily: 'Inconsolata, monospace', fontSize: 18, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {elementText}
        </div>
      )}
      {nikkel.comment && (
        <p style={{ margin: 0, color: '#ffffff', fontSize: 18, lineHeight: 1.35, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {nikkel.comment}
        </p>
      )}
      <SeverityBadge severity={nikkel.severity} />
    </div>
  )
}

function Browser({ url, siteName }) {
  let host = ''
  let path = ''
  try {
    const u = new URL(url)
    host = u.hostname
    path = u.pathname + u.search
  } catch {}
  const display = host || url || 'yourwebsite.com'
  const site = siteName || host || 'Your Website'
  return (
    <div style={{ width: 1446, height: 1012, background: '#82b0a033', borderRadius: 24, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.35)', flexShrink: 0 }}>
      {/* Toolbar (29.4px, #1b2723) */}
      <div style={{ height: 29.4, background: '#1b2723', display: 'flex', alignItems: 'center', paddingLeft: 9.1, gap: 11.2 }}>
        <div style={{ display: 'flex', gap: 5.6 }}>
          <span style={{ width: 8.4, height: 8.4, borderRadius: '50%', background: '#ff6058' }} />
          <span style={{ width: 8.4, height: 8.4, borderRadius: '50%', background: '#ffc130' }} />
          <span style={{ width: 8.4, height: 8.4, borderRadius: '50%', background: '#27ca40' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6.3, background: '#ddf3ec', height: 23.8, padding: '0 5.6px', borderRadius: '8px 8px 0 0', minWidth: 0, maxWidth: 200 }}>
          <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`} alt="" width={11.2} height={11.2} onError={e => e.target.style.display = 'none'} style={{ flexShrink: 0 }} />
          <span style={{ color: '#1b2723', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{site}</span>
          <svg width="7" height="7" viewBox="0 0 10 10" style={{ flexShrink: 0 }}><path d="M9.778 0.229C9.482 -0.066 9.004 -0.066 8.709 0.229L5 3.931L1.291 0.222C0.995 -0.074 0.518 -0.074 0.222 0.222C-0.074 0.518 -0.074 0.995 0.222 1.291L3.931 5L0.222 8.708C-0.074 9.004 -0.074 9.482 0.222 9.778C0.518 10.074 0.995 10.074 1.291 9.778L5 6.069L8.708 9.778C9.004 10.074 9.482 10.074 9.778 9.778C10.074 9.482 10.074 9.004 9.778 8.708L6.069 5L9.778 1.291C10.066 1.003 10.066 0.518 9.778 0.229Z" fill="#1b2723" /></svg>
        </div>
      </div>
      {/* URL bar (26.6px, #ddf3ec) */}
      <div style={{ height: 26.6, background: '#ddf3ec', display: 'flex', alignItems: 'center', paddingLeft: 8.4, gap: 15.4 }}>
        <svg width="9.8" height="8.4" viewBox="0 0 18 17.53"><path d="M16.845 7.615H3.942l5.637-5.637c0.45 -0.45 0.45 -1.19 0 -1.64 -0.45 -0.45 -1.178 -0.45 -1.629 0L0.338 7.95c-0.45 0.45 -0.45 1.179 0 1.629l7.612 7.612c0.451 0.451 1.179 0.451 1.63 0 0.45 -0.45 0.45 -1.178 0 -1.629L3.942 9.926h12.903c0.635 0 1.155 -0.52 1.155 -1.155 0 -0.636 -0.52 -1.156 -1.155 -1.156Z" fill="#1b2723" /></svg>
        <svg width="9.8" height="8.4" viewBox="0 0 18 17.54"><path d="M1.155 9.926h12.903l-5.637 5.637c-0.45 0.45 -0.45 1.189 0 1.64 0.45 0.45 1.178 0.45 1.629 0l7.612 -7.612c0.45 -0.45 0.45 -1.179 0 -1.629L8.05 0.338c-0.45 -0.45 -1.179 -0.45 -1.629 0 -0.45 0.45 -0.45 1.179 0 1.629l5.636 5.648H1.155C0.52 7.615 0 8.135 0 8.77c0 0.636 0.52 1.156 1.155 1.156Z" fill="#a1bfb5" /></svg>
        <svg width="9.8" height="8.4" viewBox="0 0 18 18"><path d="M18 6.497V1.207c0 -0.45 -0.54 -0.67 -0.85 -0.35l-1.78 1.78C13.557 0.827 10.977 -0.213 8.157 0.037c-4.19 0.38 -7.64 3.75 -8.1 7.94C-0.543 13.397 3.687 17.997 8.997 17.997c4.59 0 8.38 -3.44 8.93 -7.88 0.07 -0.6 -0.4 -1.12 -1 -1.12 -0.5 0 -0.92 0.37 -0.98 0.86 -0.43 3.49 -3.44 6.19 -7.05 6.14 -3.71 -0.05 -6.84 -3.18 -6.9 -6.9 -0.06 -3.9 3.11 -7.1 7 -7.1 1.93 0 3.68 0.79 4.95 2.05L11.857 6.137c-0.32 0.32 -0.1 0.86 0.35 0.86h5.29c0.28 0 0.5 -0.22 0.5 -0.5Z" fill="#a1bfb5" /></svg>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5.6, background: '#1b2723', height: 19.6, borderRadius: 14, paddingLeft: 8.4, paddingRight: 12, flex: 1, minWidth: 0, marginRight: 8 }}>
          <svg width="7" height="8.4" viewBox="0 0 16 21" style={{ flexShrink: 0 }}><path d="M14 7h-1V5c0-2.76-2.24-5-5-5S3 2.24 3 5v2H2C0.9 7 0 7.9 0 9v10c0 1.1 0.9 2 2 2h12c1.1 0 2-0.9 2-2V9c0-1.1-0.9-2-2-2ZM8 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2ZM6 7V5c0-1.1.9-2 2-2s2 .9 2 2v2H6Z" fill="#ddf3ec" /></svg>
          <span style={{ color: '#ddf3ec', fontSize: 13, fontFamily: 'Roboto, sans-serif', letterSpacing: '0.25px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {host}
            <span style={{ opacity: 0.7 }}>{path}</span>
          </span>
        </div>
        <svg width="8.4" height="8.4" viewBox="0 0 4.5 4.5" style={{ flexShrink: 0 }}><circle cx="2.25" cy="0.75" r="0.75" fill="#5f6368" /><circle cx="2.25" cy="2.25" r="0.75" fill="#5f6368" /><circle cx="2.25" cy="3.75" r="0.75" fill="#5f6368" /></svg>
        <svg width="8.4" height="8.4" viewBox="0 0 4.5 4.5" style={{ flexShrink: 0 }}><circle cx="2.25" cy="0.75" r="0.75" fill="#5f6368" /><circle cx="2.25" cy="2.25" r="0.75" fill="#5f6368" /><circle cx="2.25" cy="3.75" r="0.75" fill="#5f6368" /></svg>
        <div style={{ width: 15.4, height: 15.4, borderRadius: '50%', background: '#71b9a1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 8 }}>
          <svg width="7.7" height="9.1" viewBox="0 0 448 512"><path d="M224 256c33.9 0 65.5 -13.5 89.5 -37.5S352 161.9 352 128s-13.5 -65.5 -37.5 -89.5S257.9 0 224 0S158.5 13.5 134.5 37.5S96 94.1 96 128s13.5 65.5 37.5 89.5S190.1 256 224 256Zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512h388.6c16.4 0 29.7 -13.3 29.7 -29.7C448 383.8 368.2 304 269.7 304h-91.4Z" fill="#ddf3ec" /></svg>
        </div>
      </div>
      {/* Website body */}
      <div style={{ height: 956, background: 'linear-gradient(160deg, #1b2723 0%, #101715 60%, #0c120f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=128`} alt="" width={33.6} height={33.6} onError={e => e.target.style.display = 'none'} style={{ borderRadius: 10, opacity: 0.9 }} />
        <span style={{ color: '#82b0a0', fontSize: 18, fontFamily: 'Roboto, sans-serif' }}>{display}</span>
        <span style={{ color: '#82b0a033', fontSize: 14 }}>Your site, ready for review</span>
      </div>
    </div>
  )
}

function Shell({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#101715', color: '#ffffff', fontFamily: '"Instrument Sans", system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8, position: 'relative' }}>
      <div style={{ position: 'absolute', top: -160, left: -180, width: 700, height: 560, background: '#aef0da33', filter: 'blur(160px)', pointerEvents: 'none' }} />
      {children}
    </div>
  )
}

function Icon({ children }) {
  return <div style={{ fontSize: 36, marginBottom: 8 }}>{children}</div>
}

function Title({ children }) {
  return <h2 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>{children}</h2>
}

function Text({ children, style }) {
  return <p style={{ color: '#94c3b3', fontSize: 14, margin: 0, textAlign: 'center', ...style }}>{children}</p>
}

export default function ReviewPage({ params }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [extensionState, setExtensionState] = useState(null) // null=checking, true=installed, false=not installed
  const [opening, setOpening] = useState(false)
  const [openingError, setOpeningError] = useState(null)
  const [scale, setScale] = useState(0.8)

  useEffect(() => {
    function updateScale() {
      const fit = (window.innerWidth - 48) / DESIGN_W
      setScale(Math.min(1, Math.max(0.4, fit)))
    }
    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  useEffect(() => {
    if (document.documentElement.dataset.nikkelInstalled) {
      setExtensionState(true)
      return
    }

    function onReady() { setExtensionState(true) }
    document.addEventListener('nikkel:extension-ready', onReady)

    const observer = new MutationObserver(() => {
      if (document.documentElement.dataset.nikkelInstalled) {
        setExtensionState(true)
        observer.disconnect()
        clearTimeout(timer)
        document.removeEventListener('nikkel:extension-ready', onReady)
      }
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-nikkel-installed'] })

    const timer = setTimeout(() => {
      observer.disconnect()
      document.removeEventListener('nikkel:extension-ready', onReady)
      setExtensionState(false)
    }, 300)

    return () => {
      observer.disconnect()
      clearTimeout(timer)
      document.removeEventListener('nikkel:extension-ready', onReady)
    }
  }, [])

  useEffect(() => {
    function resultHandler(event) {
      if (event.data?.type === 'LOAD_REVIEW_RESULT') {
        setOpening(false)
        if (!event.data?.payload?.ok) setOpeningError(event.data?.payload?.error || 'Failed to open review')
      }
    }
    window.addEventListener('message', resultHandler)
    return () => window.removeEventListener('message', resultHandler)
  }, [])

  const handleOpenReview = () => {
    setOpening(true); setOpeningError(null)
    window.postMessage({ action: 'LOAD_REVIEW', reviewToken: params.token }, '*')
  }

  useEffect(() => {
    fetch(`/api/board/${params.token}`)
      .then(r => {
        if (r.status === 404) throw new Error('not-found')
        if (!r.ok) throw new Error('server-error')
        return r.json()
      })
      .then(d => setData(d))
      .catch(err => {
        if (err.message === 'not-found') setError('not-found')
        else if (err.message === 'server-error') setError('server-error')
        else setError('network')
      })
  }, [params.token])

  if (error === 'not-found') {
    return <Shell><Icon>🔗</Icon><Title>Review not found</Title><Text>This link may be invalid or the review was removed.</Text></Shell>
  }

  if (error === 'server-error') {
    return <Shell><Icon>⚠️</Icon><Title>Something went wrong</Title><Text>The server encountered an error. Please try again later.</Text></Shell>
  }

  if (error === 'network') {
    return <Shell><Icon>🌐</Icon><Title>Connection error</Title><Text>Could not reach the server. Check your internet connection and try again.</Text></Shell>
  }

  if (!data) {
    return (
      <Shell>
        <div style={{ width: 28, height: 28, border: '2px solid #1b2723', borderTopColor: '#71b9a1', borderRadius: '50%', animation: 'nikkel-spin 0.6s linear infinite' }} />
        <Title>Loading review...</Title>
      </Shell>
    )
  }

  const { review, project, nikkels, owner } = data
  const sender = { name: owner?.name || owner?.email || 'Guest', avatar_url: owner?.avatar_url || null }
  const pageUrl = project.url || project.base_url || ''
  const siteName = project.title || project.name || ''

  return (
    <div style={{ minHeight: '100vh', background: '#101715', color: '#ffffff', fontFamily: '"Instrument Sans", system-ui, sans-serif', display: 'flex', justifyContent: 'center', overflowX: 'hidden', padding: '48px 24px' }}>
      <style>{`@keyframes nikkel-spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ width: DESIGN_W * scale, height: 'auto', position: 'relative' }}>
        <div style={{ width: DESIGN_W, position: 'absolute', top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {/* Decorative blurred blob */}
          <div style={{ position: 'absolute', left: -362, top: 145, width: 1889, height: 1406, background: '#aef0da33', filter: 'blur(218.75px)', pointerEvents: 'none' }} />

          {/* Content (1905 wide, centered in the 2400 design) */}
          <div style={{ paddingLeft: 247.5 }}>
            {/* Header: wordmark 105 + tagline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, paddingTop: 33.6 }}>
              <Wordmark width={105} />
              <span style={{ color: '#94c3b3', fontSize: 18 }}>feedback, without the friction.</span>
            </div>

            {/* Browser + feedback panel */}
            <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start', marginTop: 28 }}>
              <Browser url={pageUrl} siteName={siteName} />

              {/* Feedback panel (413 wide, r24, gap 14, pad [28,17,31,17]) */}
              <div style={{ width: 413, flexShrink: 0, background: '#82b0a033', borderRadius: 24, padding: '28px 16.8px 31px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8.4 }}>
                  <Avatar src={sender.avatar_url} name={sender.name} size={25} />
                  <span style={{ color: '#ffffff', fontSize: 20 }}>{sender.name}</span>
                </div>
                <div style={{ color: '#ffffff', fontSize: 20, lineHeight: 1.3 }}>
                  left feedback for you on this website.
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {(nikkels || []).map(nikkel => (
                    <CommentCard key={nikkel.id} nikkel={nikkel} sender={sender} />
                  ))}
                  {(nikkels || []).length === 0 && (
                    <div style={{ background: '#82b0a033', borderRadius: 12, padding: '20px', color: '#94c3b3', textAlign: 'center', fontSize: 17 }}>
                      No feedback yet on this site.
                    </div>
                  )}
                </div>

                {extensionState === true ? (
                  <button
                    onClick={handleOpenReview}
                    disabled={opening}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: opening ? '#5ea388' : '#71b9a1', borderRadius: 19.4, height: 47.6, border: 'none', cursor: opening ? 'default' : 'pointer', padding: '0 16px' }}
                  >
                    <span style={{ color: '#1b2723', fontSize: 22, fontWeight: 500 }}>
                      {opening ? 'Opening...' : 'Review Feedback'}
                    </span>
                    <svg width="21" height="21" viewBox="0 0 14 14" style={{ flexShrink: 0 }}><path d="M0 7h14M7 0l7 7-7 7" fill="none" stroke="#1b2723" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                ) : (
                  <a
                    href="/download"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, background: '#71b9a1', borderRadius: 19.4, height: 47.6, textDecoration: 'none', padding: '0 16px' }}
                  >
                    <span style={{ color: '#1b2723', fontSize: 22, fontWeight: 500 }}>
                      {extensionState === false ? 'Install Nikkel' : 'Review Feedback'}
                    </span>
                    <svg width="21" height="21" viewBox="0 0 14 14" style={{ flexShrink: 0 }}><path d="M0 7h14M7 0l7 7-7 7" fill="none" stroke="#1b2723" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </a>
                )}

                <div style={{ color: '#ffffff', fontSize: 17, textAlign: 'center', lineHeight: 1.4 }}>
                  View and reply to comments, collaborate, and fix issues together.
                </div>
              </div>
            </div>

            {openingError && (
              <p style={{ color: '#f87171', fontSize: 18, textAlign: 'center', margin: '12px 0 0' }}>{openingError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
