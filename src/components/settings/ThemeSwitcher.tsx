'use client'

import { useEffect, useState } from 'react'

const TEMAS = [
  {
    id: 'dark',
    label: 'Oscuro',
    desc: 'El clásico, suave para los ojos de noche',
    preview: ['#13131f', '#1a1a2e', '#6366f1'],
  },
  {
    id: 'light',
    label: 'Claro',
    desc: 'Fondo blanco, ideal para trabajar de día',
    preview: ['#f4f4f8', '#ffffff', '#6366f1'],
  },
  {
    id: 'midnight',
    label: 'Midnight',
    desc: 'Negro puro, máximo contraste',
    preview: ['#050510', '#0d0d22', '#818cf8'],
  },
]

export default function ThemeSwitcher() {
  const [active, setActive] = useState('dark')

  useEffect(() => {
    const saved = localStorage.getItem('amelia-theme') ?? 'dark'
    setActive(saved)
    applyTheme(saved)
  }, [])

  function applyTheme(theme: string) {
    if (theme === 'dark') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
    localStorage.setItem('amelia-theme', theme)
  }

  function select(id: string) {
    setActive(id)
    applyTheme(id)
  }

  return (
    <div>
      <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
        Tema del panel
      </h2>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 16 }}>
        El tema se guarda en tu navegador
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {TEMAS.map(t => (
          <button
            key={t.id}
            onClick={() => select(t.id)}
            style={{
              padding: '1rem',
              borderRadius: 14,
              border: active === t.id
                ? '2px solid var(--accent)'
                : '2px solid var(--border)',
              background: active === t.id ? 'var(--accent-glow)' : 'var(--bg-elevated)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
          >
            {/* Preview mini */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
              {t.preview.map((color, i) => (
                <div key={i} style={{
                  width: i === 0 ? 32 : i === 1 ? 20 : 12,
                  height: 28,
                  borderRadius: 6,
                  background: color,
                  border: '1px solid rgba(255,255,255,0.08)',
                }} />
              ))}
            </div>
            <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              {t.label}
            </p>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {t.desc}
            </p>
            {active === t.id && (
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-light)', fontWeight: 600 }}>Activo</span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
