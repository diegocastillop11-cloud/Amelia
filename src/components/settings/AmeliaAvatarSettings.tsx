'use client'

import { useState, useRef, useEffect } from 'react'
import AmeliaAvatar from '@/components/AmeliaAvatar'

const PRESETS = [
  { id: 'default', label: 'Por defecto', url: null },
  { id: 'robot',   label: 'Robot',  emoji: '🤖', bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
  { id: 'star',    label: 'Estrella', emoji: '⭐', bg: 'linear-gradient(135deg,#f59e0b,#ef4444)' },
  { id: 'crystal', label: 'Cristal', emoji: '🔮', bg: 'linear-gradient(135deg,#06b6d4,#3b82f6)' },
  { id: 'flower',  label: 'Flor',   emoji: '🌸', bg: 'linear-gradient(135deg,#ec4899,#f43f5e)' },
  { id: 'sparkle', label: 'Mágica', emoji: '✨', bg: 'linear-gradient(135deg,#8b5cf6,#6366f1)' },
  { id: 'heart',   label: 'Corazón', emoji: '💜', bg: 'linear-gradient(135deg,#a855f7,#ec4899)' },
  { id: 'brain',   label: 'IA',     emoji: '🧠', bg: 'linear-gradient(135deg,#14b8a6,#06b6d4)' },
]

export default function AmeliaAvatarSettings() {
  const [current, setCurrent] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem('amelia-avatar')
    if (stored) setCurrent(stored)
  }, [])

  function applyAvatar(url: string | null) {
    if (url === null) {
      localStorage.removeItem('amelia-avatar')
      setCurrent(null)
    } else {
      localStorage.setItem('amelia-avatar', url)
      setCurrent(url)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    // Forzar re-render de otros componentes
    window.dispatchEvent(new StorageEvent('storage', { key: 'amelia-avatar', newValue: url }))
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'amelia-avatar')
      const res = await fetch('/api/upload-image', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Error al subir'); return }
      applyAvatar(data.url)
    } catch {
      setError('Error de conexión. Intenta nuevamente.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function generateEmojiAvatar(emoji: string, bg: string): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
      <defs><radialGradient id="g" cx="50%" cy="40%" r="60%">
        <stop offset="0%" stop-color="${bg.includes('#') ? bg.split('#')[1]?.split(',')[0] ? '#' + bg.split('#')[1].split(',')[0].split(')')[0] : '#6366f1' : '#6366f1'}"/>
        <stop offset="100%" stop-color="#4f46e5"/>
      </radialGradient></defs>
      <circle cx="50" cy="50" r="50" fill="url(#g)"/>
      <text x="50" y="65" text-anchor="middle" font-size="48">${emoji}</text>
    </svg>`
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
  }

  const previewUrl = current

  return (
    <div>
      <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
        Avatar de AmelIA
      </h2>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 20 }}>
        Personaliza cómo se ve AmelIA en el chat
      </p>

      {/* Preview grande */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
        <div style={{ position: 'relative' }}>
          <AmeliaAvatar size={80} src={previewUrl ?? undefined}
            style={{ boxShadow: '0 8px 24px rgba(99,102,241,0.35)', border: '3px solid rgba(99,102,241,0.3)' }} />
          {saved && (
            <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(34,197,94,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
              ✓
            </div>
          )}
        </div>
        <div>
          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            Amel<span style={{ color: 'var(--accent-light)' }}>IA</span>
          </p>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 10 }}>
            {current ? 'Avatar personalizado' : 'Avatar por defecto'}
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white',
              border: 'none', cursor: uploading ? 'wait' : 'pointer', opacity: uploading ? 0.7 : 1,
            }}>
            {uploading ? 'Subiendo...' : '📤 Subir imagen'}
          </button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload}
            style={{ display: 'none' }} />
        </div>
      </div>

      {error && (
        <p style={{ fontSize: '0.8rem', color: '#f87171', marginBottom: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </p>
      )}

      {/* Presets */}
      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        O elige un preset
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {PRESETS.map(p => {
          const isActive = p.id === 'default' ? !current : current?.includes('amelia-avatar') && false // solo para highlight
          return (
            <button key={p.id}
              onClick={() => {
                if (p.id === 'default') {
                  applyAvatar(null)
                } else if (p.emoji && p.bg) {
                  applyAvatar(generateEmojiAvatar(p.emoji, p.bg))
                }
              }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '10px 8px', borderRadius: 12, cursor: 'pointer',
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.background = 'rgba(99,102,241,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-elevated)' }}
            >
              {p.id === 'default' ? (
                <AmeliaAvatar size={40} src={undefined} />
              ) : (
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: p.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                  {p.emoji}
                </div>
              )}
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.label}</span>
            </button>
          )
        })}
      </div>

      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 14 }}>
        JPG, PNG o WebP · Máximo 5MB · El avatar se guarda en tu navegador
      </p>
    </div>
  )
}
