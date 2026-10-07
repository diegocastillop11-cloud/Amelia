'use client'

import { useEffect, useState } from 'react'

const TEMAS = [
  {
    id: 'flat',
    label: 'Flat',
    desc: 'Claro, azul y amigable',
    sidebar: '#ffffff',
    surface: '#ecf0f1',
    accent: '#3498db',
    text: '#2c3e50',
  },
  {
    id: 'dark',
    label: 'Oscuro',
    desc: 'Suave para los ojos de noche',
    sidebar: '#0f0f1a',
    surface: '#1a1a2e',
    accent: '#6366f1',
    text: '#e2e8f0',
  },
  {
    id: 'light',
    label: 'Claro',
    desc: 'Fondo blanco, ideal para el día',
    sidebar: '#eeeef5',
    surface: '#ffffff',
    accent: '#6366f1',
    text: '#1a1a2e',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    desc: 'Negro puro, máximo contraste',
    sidebar: '#080818',
    surface: '#0d0d22',
    accent: '#818cf8',
    text: '#dde1ff',
  },
  {
    id: 'warm',
    label: 'Cálido',
    desc: 'Tonos crema, elegante y suave',
    sidebar: '#f0ece4',
    surface: '#ffffff',
    accent: '#b45309',
    text: '#1c1207',
  },
  {
    id: 'forest',
    label: 'Bosque',
    desc: 'Verde oscuro, fresco y distinto',
    sidebar: '#0d2114',
    surface: '#122a19',
    accent: '#10b981',
    text: '#d1fae5',
  },
  {
    id: 'ocean',
    label: 'Océano',
    desc: 'Azul claro, profesional y limpio',
    sidebar: '#e0effc',
    surface: '#ffffff',
    accent: '#0284c7',
    text: '#0c2340',
  },
]

export default function ThemeSwitcher() {
  const [active, setActive] = useState('flat')

  useEffect(() => {
    const saved = localStorage.getItem('amelia-theme') ?? 'flat'
    setActive(saved)
    applyTheme(saved)
  }, [])

  function applyTheme(theme: string) {
    if (theme === 'flat') {
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
        Se guarda en tu navegador
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {TEMAS.map(t => {
          const isActive = active === t.id
          return (
            <button
              key={t.id}
              onClick={() => select(t.id)}
              style={{
                padding: '0.875rem',
                borderRadius: 14,
                border: isActive ? '2px solid var(--accent)' : '2px solid var(--border)',
                background: isActive ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              {/* Mini dashboard preview */}
              <div style={{
                display: 'flex',
                gap: 3,
                marginBottom: 10,
                borderRadius: 8,
                overflow: 'hidden',
                height: 44,
                border: `1px solid ${isActive ? t.accent + '40' : 'rgba(128,128,128,0.15)'}`,
              }}>
                {/* Sidebar */}
                <div style={{ width: 16, background: t.sidebar, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 3, padding: '4px 3px' }}>
                  {[1,2,3].map(i => (
                    <div key={i} style={{ height: 3, borderRadius: 2, background: i === 1 ? t.accent : t.text + '30' }} />
                  ))}
                </div>
                {/* Content */}
                <div style={{ flex: 1, background: t.surface, padding: '5px 4px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[40,25,25].map((w, i) => (
                      <div key={i} style={{ flex: w, height: 8, borderRadius: 3, background: i === 0 ? t.sidebar : t.text + '15' }} />
                    ))}
                  </div>
                  <div style={{ height: 16, borderRadius: 4, background: t.sidebar, opacity: 0.7 }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ width: 24, height: 7, borderRadius: 3, background: t.accent }} />
                  </div>
                </div>
              </div>

              <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                {t.label}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {t.desc}
              </p>
              {isActive && (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)' }} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-light)', fontWeight: 600 }}>Activo</span>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
