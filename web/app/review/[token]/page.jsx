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
  { d: 'M244 66.9996C244 70.9841 240.77 74.2141 236.786 74.2141C232.801 74.2141 229.571 70.9841 229.571 66.9996V7.25649C229.571 3.27203 232.801 0.0419922 236.786 0.0419922C240.77 0.0419922 244 3.27203 244 7.25649V66.9996Z', fill: '#ffffff' },
  { d: 'M201.135 59.7378C200.606 60.3394 200.885 61.2802 201.681 61.374C202.24 61.4071 202.8 61.4236 203.36 61.4236C204.759 61.4236 206.106 61.2419 207.4 60.8786C208.694 60.5152 209.901 60.0032 211.02 59.3426C212.175 58.649 213.189 57.8232 214.063 56.8653C215.382 55.429 217.724 54.9781 219.138 56.3201L222.66 59.6624C225 61.8826 225.356 65.5721 222.93 67.6972C222.673 67.9224 222.411 68.1434 222.144 68.3602C220.43 69.7806 218.558 70.9862 216.529 71.9771C214.536 72.9681 212.419 73.7113 210.181 74.2068C207.977 74.7353 205.703 74.9995 203.36 74.9995C199.407 74.9995 195.682 74.3059 192.184 72.9185C188.721 71.5312 185.678 69.5989 183.054 67.1215C180.466 64.6442 178.419 61.7044 176.915 58.3021C175.411 54.8668 174.659 51.1013 174.659 47.0054C174.659 42.8104 175.411 38.9787 176.915 35.5104C178.419 32.0421 180.466 29.0858 183.054 26.6415C185.678 24.1971 188.721 22.2978 192.184 20.9435C195.682 19.5893 199.407 18.9121 203.36 18.9121C205.703 18.9121 207.995 19.1764 210.233 19.7049C212.472 20.2334 214.588 20.9931 216.582 21.984C218.611 22.975 220.5 24.1971 222.249 25.6505C225.273 28.1066 225.027 32.5493 222.455 35.4759L201.135 59.7378ZM206.07 34.7328C206.694 33.9512 206.349 32.7851 205.354 32.6862C204.724 32.6202 204.059 32.5871 203.36 32.5871C201.401 32.5871 199.547 32.934 197.798 33.6276C196.084 34.2883 194.58 35.2462 193.286 36.5014C192.026 37.7566 191.03 39.276 190.295 41.0597C189.56 42.8104 189.193 44.7923 189.193 47.0054C189.193 47.5008 189.211 48.0624 189.246 48.69C189.316 49.3176 189.403 49.9617 189.508 50.6223C189.648 51.2499 189.805 51.861 189.98 52.4556C190.217 53.2611 191.218 53.3445 191.742 52.6882L206.07 34.7328Z', fill: '#ffffff' },
  { d: 'M89.0218 70.1721C89.0218 72.3813 87.2309 74.1721 85.0218 74.1721H78.5928C76.3836 74.1721 74.5928 72.3813 74.5928 70.1721V4C74.5928 1.79086 76.3836 0 78.5928 0H85.0218C87.2309 0 89.0218 1.79086 89.0218 4V35.7441C89.0218 39.483 93.6948 41.1779 96.0917 38.3083L109.177 22.6419C109.937 21.7321 111.062 21.2062 112.247 21.2062H118.249C121.651 21.2062 123.5 25.183 121.307 27.7842L110.072 41.1132C108.968 42.4231 108.821 44.2909 109.706 45.7577L123.191 68.1055C124.8 70.7714 122.88 74.1721 119.766 74.1721H112.66C111.245 74.1721 109.935 73.4247 109.216 72.2066L100.152 56.8638C99.4324 55.6457 98.1228 54.8983 96.708 54.8983H93.0218C90.8126 54.8983 89.0218 56.6891 89.0218 58.8983V67.3842V70.1721Z', fill: '#ffffff' },
  { d: 'M142.115 70.1721C142.115 72.3813 140.325 74.1721 138.115 74.1721H131.686C129.477 74.1721 127.686 72.3813 127.686 70.1721V4C127.686 1.79086 129.477 0 131.686 0H138.115C140.325 0 142.115 1.79086 142.115 4V35.7441C142.115 39.483 146.789 41.1779 149.185 38.3083L162.271 22.6419C163.031 21.7321 164.156 21.2062 165.341 21.2062H171.343C174.744 21.2062 176.594 25.183 174.401 27.7842L163.166 41.1132C162.062 42.4231 161.914 44.2909 162.8 45.7577L176.285 68.1055C177.894 70.7714 175.974 74.1721 172.86 74.1721H165.753C164.338 74.1721 163.029 73.4247 162.309 72.2066L153.246 56.8638C152.526 55.6457 151.217 54.8983 149.802 54.8983H146.115C143.906 54.8983 142.115 56.6891 142.115 58.8983V67.3842V70.1721Z', fill: '#ffffff' },
  { d: 'M69.5811 66.958C69.5811 70.9424 66.351 74.1725 62.3666 74.1725C58.3821 74.1725 55.1521 70.9424 55.1521 66.958V28.3219C55.1521 24.3375 58.3821 21.1074 62.3666 21.1074C66.351 21.1074 69.5811 24.3375 69.5811 28.3219V66.958Z', fill: '#ffffff' },
  { d: 'M14.3241 70.1719C14.3241 72.3811 12.5332 74.1719 10.3241 74.1719H4C1.79086 74.1719 0 72.3811 0 70.1719V23.5118C0 22.1836 1.07669 21.1069 2.40486 21.1069C3.07907 21.1069 3.72232 21.3899 4.17783 21.887L5.56891 23.4049C7.02735 24.9964 9.47054 25.11 11.3058 23.9736C12.774 23.0644 14.3397 22.307 16.0031 21.7015C18.9413 20.6114 22.002 20.0664 25.1851 20.0664C28.6131 20.0664 31.8487 20.694 34.8919 21.9492C37.9351 23.1714 40.5936 24.8725 42.8672 27.0526C45.1409 29.1996 46.9248 31.7265 48.2191 34.6333C49.5483 37.507 50.2129 40.5789 50.2129 43.8491V70.1719C50.2129 72.3811 48.422 74.1719 46.2129 74.1719H39.8888C37.6797 74.1719 35.8888 72.3811 35.8888 70.1719V43.8491C35.8888 42.4617 35.609 41.157 35.0493 39.9348C34.4897 38.6796 33.7201 37.5896 32.7407 36.6647C31.7613 35.7398 30.6244 35.0131 29.3302 34.4846C28.036 33.9561 26.6543 33.6919 25.1851 33.6919C23.681 33.6919 22.2644 33.9561 20.9352 34.4846C19.6059 35.0131 18.4516 35.7398 17.4722 36.6647C16.4928 37.5896 15.7232 38.6796 15.1636 39.9348C14.6039 41.157 14.3241 42.4617 14.3241 43.8491V70.1719Z', fill: '#ffffff' },
  { d: 'M71.2605 13.466C71.7852 12.3108 72.0475 11.068 72.0475 9.73772C72.0475 8.44244 71.7852 7.21718 71.2605 6.06193C70.7708 4.87167 70.0887 3.85645 69.2142 3.01627C68.3397 2.14109 67.3078 1.45844 66.1185 0.968334C64.9642 0.443221 63.7224 0.180664 62.3932 0.180664C61.064 0.180664 59.8047 0.443221 58.6154 0.968334C57.4611 1.45844 56.4467 2.14109 55.5722 3.01627C54.7327 3.85645 54.0506 4.87167 53.5259 6.06193C53.0362 7.21718 52.7914 8.44244 52.7914 9.73772C52.7914 11.068 53.0362 12.3108 53.5259 13.466C54.0506 14.6213 54.7327 15.6365 55.5722 16.5117C56.4467 17.3519 57.4611 18.0345 58.6154 18.5596C59.8047 19.0497 61.064 19.2948 62.3932 19.2948C63.7224 19.2948 64.9642 19.0497 66.1185 18.5596C67.3078 18.0345 68.3397 17.3519 69.2142 16.5117C70.0887 15.6365 70.7708 14.6213 71.2605 13.466Z', fill: '#71b9a1' },
]

function Wordmark({ width = 105 }) {
  return (
    <svg viewBox="0 0 244 75" width={width} height={width * (75 / 244)} fill="none" style={{ display: 'block' }}>
      {WORDMARK.map((p, i) => (
        <path key={i} d={p.d} fill={p.fill} />
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

function Browser({ url, siteName, screenshot }) {
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
      {/* Toolbar (38.2px, #1b2723) */}
      <div style={{ height: 38.2, background: '#1b2723', display: 'flex', alignItems: 'center', paddingLeft: 11.8, gap: 14.6 }}>
        <div style={{ display: 'flex', gap: 7.3 }}>
          <span style={{ width: 10.9, height: 10.9, borderRadius: '50%', background: '#ff6058' }} />
          <span style={{ width: 10.9, height: 10.9, borderRadius: '50%', background: '#ffc130' }} />
          <span style={{ width: 10.9, height: 10.9, borderRadius: '50%', background: '#27ca40' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8.2, background: '#ddf3ec', height: 31, padding: '0 7.3px', borderRadius: '10px 10px 0 0', minWidth: 0, maxWidth: 260 }}>
          <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`} alt="" width={14.6} height={14.6} onError={e => e.target.style.display = 'none'} style={{ flexShrink: 0 }} />
          <span style={{ color: '#1b2723', fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{site}</span>
          <svg width="9" height="9" viewBox="0 0 10 10" style={{ flexShrink: 0 }}><path d="M9.778 0.229C9.482 -0.066 9.004 -0.066 8.709 0.229L5 3.931L1.291 0.222C0.995 -0.074 0.518 -0.074 0.222 0.222C-0.074 0.518 -0.074 0.995 0.222 1.291L3.931 5L0.222 8.708C-0.074 9.004 -0.074 9.482 0.222 9.778C0.518 10.074 0.995 10.074 1.291 9.778L5 6.069L8.708 9.778C9.004 10.074 9.482 10.074 9.778 9.778C10.074 9.482 10.074 9.004 9.778 8.708L6.069 5L9.778 1.291C10.066 1.003 10.066 0.518 9.778 0.229Z" fill="#1b2723" /></svg>
        </div>
      </div>
      {/* URL bar (34.6px, #ddf3ec) */}
      <div style={{ height: 34.6, background: '#ddf3ec', display: 'flex', alignItems: 'center', paddingLeft: 10.9, gap: 20 }}>
        <svg width="12.7" height="10.9" viewBox="0 0 18 17.53"><path d="M16.845 7.615H3.942l5.637-5.637c0.45 -0.45 0.45 -1.19 0 -1.64 -0.45 -0.45 -1.178 -0.45 -1.629 0L0.338 7.95c-0.45 0.45 -0.45 1.179 0 1.629l7.612 7.612c0.451 0.451 1.179 0.451 1.63 0 0.45 -0.45 0.45 -1.178 0 -1.629L3.942 9.926h12.903c0.635 0 1.155 -0.52 1.155 -1.155 0 -0.636 -0.52 -1.156 -1.155 -1.156Z" fill="#1b2723" /></svg>
        <svg width="12.7" height="10.9" viewBox="0 0 18 17.54"><path d="M1.155 9.926h12.903l-5.637 5.637c-0.45 0.45 -0.45 1.189 0 1.64 0.45 0.45 1.178 0.45 1.629 0l7.612 -7.612c0.45 -0.45 0.45 -1.179 0 -1.629L8.05 0.338c-0.45 -0.45 -1.179 -0.45 -1.629 0 -0.45 0.45 -0.45 1.179 0 1.629l5.636 5.648H1.155C0.52 7.615 0 8.135 0 8.77c0 0.636 0.52 1.156 1.155 1.156Z" fill="#a1bfb5" /></svg>
        <svg width="12.7" height="10.9" viewBox="0 0 18 18"><path d="M18 6.497V1.207c0 -0.45 -0.54 -0.67 -0.85 -0.35l-1.78 1.78C13.557 0.827 10.977 -0.213 8.157 0.037c-4.19 0.38 -7.64 3.75 -8.1 7.94C-0.543 13.397 3.687 17.997 8.997 17.997c4.59 0 8.38 -3.44 8.93 -7.88 0.07 -0.6 -0.4 -1.12 -1 -1.12 -0.5 0 -0.92 0.37 -0.98 0.86 -0.43 3.49 -3.44 6.19 -7.05 6.14 -3.71 -0.05 -6.84 -3.18 -6.9 -6.9 -0.06 -3.9 3.11 -7.1 7 -7.1 1.93 0 3.68 0.79 4.95 2.05L11.857 6.137c-0.32 0.32 -0.1 0.86 0.35 0.86h5.29c0.28 0 0.5 -0.22 0.5 -0.5Z" fill="#a1bfb5" /></svg>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7.3, background: '#1b2723', height: 25.5, borderRadius: 18, paddingLeft: 10.9, paddingRight: 15.6, flex: 1, minWidth: 0, marginRight: 10.4 }}>
          <svg width="9.1" height="10.9" viewBox="0 0 16 21" style={{ flexShrink: 0 }}><path d="M14 7h-1V5c0-2.76-2.24-5-5-5S3 2.24 3 5v2H2C0.9 7 0 7.9 0 9v10c0 1.1 0.9 2 2 2h12c1.1 0 2-0.9 2-2V9c0-1.1-0.9-2-2-2ZM8 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2ZM6 7V5c0-1.1.9-2 2-2s2 .9 2 2v2H6Z" fill="#ddf3ec" /></svg>
          <span style={{ color: '#ddf3ec', fontSize: 17, fontFamily: 'Roboto, sans-serif', letterSpacing: '0.25px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {host}
            <span style={{ opacity: 0.7 }}>{path}</span>
          </span>
        </div>
        <svg width="10.9" height="10.9" viewBox="0 0 4.5 4.5" style={{ flexShrink: 0 }}><circle cx="2.25" cy="0.75" r="0.75" fill="#5f6368" /><circle cx="2.25" cy="2.25" r="0.75" fill="#5f6368" /><circle cx="2.25" cy="3.75" r="0.75" fill="#5f6368" /></svg>
        <svg width="10.9" height="10.9" viewBox="0 0 4.5 4.5" style={{ flexShrink: 0 }}><circle cx="2.25" cy="0.75" r="0.75" fill="#5f6368" /><circle cx="2.25" cy="2.25" r="0.75" fill="#5f6368" /><circle cx="2.25" cy="3.75" r="0.75" fill="#5f6368" /></svg>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#71b9a1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 10.4 }}>
          <svg width="10" height="11.8" viewBox="0 0 448 512"><path d="M224 256c33.9 0 65.5 -13.5 89.5 -37.5S352 161.9 352 128s-13.5 -65.5 -37.5 -89.5S257.9 0 224 0S158.5 13.5 134.5 37.5S96 94.1 96 128s13.5 65.5 37.5 89.5S190.1 256 224 256Zm-45.7 48C79.8 304 0 383.8 0 482.3C0 498.7 13.3 512 29.7 512h388.6c16.4 0 29.7 -13.3 29.7 -29.7C448 383.8 368.2 304 269.7 304h-91.4Z" fill="#ddf3ec" /></svg>
        </div>
      </div>
      {/* Website body */}
      <div style={{ height: 939.2, background: 'linear-gradient(160deg, #1b2723 0%, #101715 60%, #0c120f 100%)', position: 'relative', overflow: 'hidden' }}>
        {screenshot ? (
          <img
            src={screenshot}
            alt=""
            onError={e => e.target.style.display = 'none'}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
          />
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
            <img src={`https://www.google.com/s2/favicons?domain=${host}&sz=128`} alt="" width={33.6} height={33.6} onError={e => e.target.style.display = 'none'} style={{ borderRadius: 10, opacity: 0.9 }} />
            <span style={{ color: '#82b0a0', fontSize: 18, fontFamily: 'Roboto, sans-serif' }}>{display}</span>
            <span style={{ color: '#82b0a033', fontSize: 14 }}>Your site, ready for review</span>
          </div>
        )}
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
              <Browser url={pageUrl} siteName={siteName} screenshot={review?.screenshot_url} />

              {/* Feedback panel (413 wide, r24, gap 14, pad [28,17,31,17]) */}
              <div style={{ width: 413, flexShrink: 0, background: '#82b0a033', borderRadius: 24, padding: '28px 16.8px 31px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8.4 }}>
                  <Avatar src={sender.avatar_url} name={sender.name} size={25} />
                  <span style={{ color: '#ffffff', fontSize: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>{sender.name}</span>
                  <span style={{ color: '#ffffff', fontSize: 20, lineHeight: 1.3 }}>left feedback for you on this website.</span>
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
