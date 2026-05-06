'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/dashboard',                  icon: '⚡', label: 'Inicio',    exact: true  },
  { href: '/dashboard/sitio/editor',     icon: '🌐', label: 'Mi Sitio',  root: '/dashboard/sitio' },
  { href: '/dashboard/reservas',         icon: '📅', label: 'Reservas'  },
  { href: '/dashboard/clientes',         icon: '👥', label: 'Clientes'  },
  { href: '/dashboard/horarios',         icon: '🕐', label: 'Horarios'  },
  { href: '/dashboard/productos',        icon: '📦', label: 'Productos' },
  { href: '/dashboard/plantillas',       icon: '🎨', label: 'Plantillas'},
  { href: '/dashboard/settings',         icon: '⚙️', label: 'Ajustes'  },
]

export default function Sidebar({ userEmail }: { userEmail?: string }) {
  const path = usePathname()

  return (
    <aside style={{ width: 220, background: 'var(--bg-surface)', borderRight: '1px solid var(--border)',
                     display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh',
                     position: 'sticky', top: 0 }}>
      {/* Logo */}
      <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '1.25rem', fontWeight: 800,
                        background: 'linear-gradient(135deg, #a5b4fc, #8b5cf6)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Amelia
        </span>
        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>
          Constructor web con IA
        </p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0.75rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(item => {
          const active = item.exact
            ? path === item.href
            : path.startsWith((item as { root?: string }).root ?? item.href)
          return (
            <Link key={item.href} href={item.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '0.625rem 0.875rem', borderRadius: 10,
                    textDecoration: 'none', transition: 'all 0.15s',
                    background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                    color: active ? 'var(--accent-light)' : 'var(--text-secondary)',
                    fontWeight: active ? 600 : 400, fontSize: '0.875rem',
                    borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                  }}>
              <span style={{ fontSize: '1rem' }}>{item.icon}</span>
              {item.label}
              {item.href === '/dashboard/reservas' && (
                <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, padding: '2px 6px',
                                borderRadius: 20, background: 'rgba(99,102,241,0.15)', color: 'var(--accent-light)' }}>
                  NUEVO
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Upgrade banner */}
      <div style={{ padding: '0.875rem', margin: '0 0.75rem 0.875rem',
                     background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
                     border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12 }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-light)', marginBottom: 4 }}>
          Plan Free
        </p>
        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
          Dominio propio, analíticas y más con Pro
        </p>
        <Link href="/dashboard/upgrade"
              style={{ display: 'block', textAlign: 'center', padding: '0.5rem',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
                        borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none',
                        boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>
          Mejorar a Pro →
        </Link>
      </div>
    </aside>
  )
}
