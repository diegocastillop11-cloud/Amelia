'use client'

import { useEffect, useState } from 'react'

interface Props {
  size?: number
  className?: string
  style?: React.CSSProperties
  src?: string // override directo (para preview)
}

// Avatar SVG por defecto (rubia, ojos azules)
function DefaultSVG({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ borderRadius: '50%', flexShrink: 0 }}>
      <defs>
        <radialGradient id="bg" cx="50%" cy="40%" r="60%"><stop offset="0%" stopColor="#7c3aed"/><stop offset="100%" stopColor="#4f46e5"/></radialGradient>
        <radialGradient id="skin" cx="50%" cy="30%" r="70%"><stop offset="0%" stopColor="#fde8d0"/><stop offset="100%" stopColor="#f5c9a0"/></radialGradient>
        <radialGradient id="hair" cx="50%" cy="0%" r="80%"><stop offset="0%" stopColor="#ffd966"/><stop offset="60%" stopColor="#e6b84a"/><stop offset="100%" stopColor="#c9960e"/></radialGradient>
        <radialGradient id="eye" cx="50%" cy="30%" r="60%"><stop offset="0%" stopColor="#60c8f5"/><stop offset="100%" stopColor="#2196c4"/></radialGradient>
        <clipPath id="c"><circle cx="50" cy="50" r="50"/></clipPath>
      </defs>
      <g clipPath="url(#c)">
        <circle cx="50" cy="50" r="50" fill="url(#bg)"/>
        <ellipse cx="50" cy="105" rx="32" ry="20" fill="#5b21b6" opacity="0.9"/>
        <ellipse cx="50" cy="98" rx="22" ry="14" fill="#4c1d95"/>
        <rect x="43" y="72" width="14" height="14" rx="4" fill="url(#skin)"/>
        <ellipse cx="50" cy="46" rx="25" ry="27" fill="url(#hair)"/>
        <path d="M27 50 Q22 65 26 78 Q30 72 32 65 Q29 60 27 50Z" fill="url(#hair)"/>
        <path d="M73 50 Q78 65 74 78 Q70 72 68 65 Q71 60 73 50Z" fill="url(#hair)"/>
        <ellipse cx="50" cy="54" rx="20" ry="21" fill="url(#skin)"/>
        <path d="M30 45 Q32 32 50 30 Q68 32 70 45 Q65 38 50 37 Q35 38 30 45Z" fill="url(#hair)"/>
        <path d="M37 47 Q41 44 45 46" stroke="#c9960e" strokeWidth="1.8" strokeLinecap="round"/>
        <path d="M55 46 Q59 44 63 47" stroke="#c9960e" strokeWidth="1.8" strokeLinecap="round"/>
        <ellipse cx="41" cy="52" rx="5.5" ry="4" fill="white"/>
        <ellipse cx="59" cy="52" rx="5.5" ry="4" fill="white"/>
        <circle cx="41" cy="52" r="3.2" fill="url(#eye)"/>
        <circle cx="59" cy="52" r="3.2" fill="url(#eye)"/>
        <circle cx="41" cy="52" r="1.6" fill="#0d2a3d"/>
        <circle cx="59" cy="52" r="1.6" fill="#0d2a3d"/>
        <circle cx="42.5" cy="50.5" r="0.9" fill="white" opacity="0.9"/>
        <circle cx="60.5" cy="50.5" r="0.9" fill="white" opacity="0.9"/>
        <path d="M49 56 Q47 62 49 63 Q51 63 53 62 Q51 61 49 56Z" fill="#e8a882" opacity="0.5"/>
        <path d="M43 68 Q46 66 50 67 Q54 66 57 68 Q54 71 50 71 Q46 71 43 68Z" fill="#e8748a"/>
        <ellipse cx="35" cy="60" rx="5" ry="3" fill="#f4a0b0" opacity="0.35"/>
        <ellipse cx="65" cy="60" rx="5" ry="3" fill="#f4a0b0" opacity="0.35"/>
      </g>
    </svg>
  )
}

export default function AmeliaAvatar({ size = 44, className, style, src }: Props) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(src ?? null)

  useEffect(() => {
    if (src) { setAvatarUrl(src); return }
    const load = () => {
      const saved = localStorage.getItem('amelia-avatar')
      setAvatarUrl(saved ?? null)
    }
    load()
    window.addEventListener('storage', load)
    return () => window.removeEventListener('storage', load)
  }, [src])

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt="AmelIA"
        width={size}
        height={size}
        className={className}
        style={{ borderRadius: '50%', objectFit: 'cover', flexShrink: 0, ...style }}
      />
    )
  }

  return (
    <span className={className} style={style}>
      <DefaultSVG size={size} />
    </span>
  )
}
