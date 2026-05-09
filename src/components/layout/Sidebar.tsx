'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PLAN_DEFAULTS, ModuleKey } from '@/lib/modules'

const NAV: { href: string; icon: string; label: string; exact?: boolean; root?: string; moduleKey?: ModuleKey }[] = [
  { href: '/dashboard',                  icon: '⚡', label: 'Inicio',     exact: true  },
  { href: '/dashboard/sitio/editor',     icon: '🌐', label: 'Editar Sitio', root: '/dashboard/sitio' },
  { href: '/dashboard/reservas',         icon: '📅', label: 'Reservas',   moduleKey: 'reservas' },
  { href: '/dashboard/clientes',         icon: '👥', label: 'Clientes',   moduleKey: 'clientes' },
  { href: '/dashboard/horarios',         icon: '🕐', label: 'Horarios',   moduleKey: 'horarios' },
  { href: '/dashboard/productos',        icon: '📦', label: 'Productos',  moduleKey: 'productos' },
  { href: '/dashboard/pedidos',          icon: '🛒', label: 'Pedidos',    moduleKey: 'productos' },
  { href: '/dashboard/metricas',          icon: '📊', label: 'Métricas',      moduleKey: 'metricas' },
  { href: '/dashboard/asistente',        icon: '🤖', label: 'Asistente IA'  },
  { href: '/dashboard/recordatorios',    icon: '🔔', label: 'Recordatorios', moduleKey: 'recordatorios' },
  { href: '/dashboard/settings',         icon: '⚙️', label: 'Ajustes'   },
]

interface Props {
  userEmail?: string
  plan?: string
  modules?: Record<string, boolean> | null
}

export default function Sidebar({ userEmail, plan = 'free', modules }: Props) {
  const path = usePathname()
  const activeModules = modules ?? PLAN_DEFAULTS[plan] ?? PLAN_DEFAULTS.free

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
          const active   = item.exact ? path === item.href : path.startsWith(item.root ?? item.href)
          const locked   = item.moduleKey ? !activeModules[item.moduleKey] : false
          const href     = locked ? '/dashboard/upgrade' : item.href

          return (
            <Link key={item.href} href={href}
                  title={locked ? `Módulo bloqueado — mejora tu plan` : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '0.625rem 0.875rem', borderRadius: 10,
                    textDecoration: 'none', transition: 'all 0.15s',
                    background: active ? 'rgba(99,102,241,0.12)' : 'transparent',
                    color: locked ? 'var(--text-muted)' : active ? 'var(--accent-light)' : 'var(--text-secondary)',
                    fontWeight: active ? 600 : 400, fontSize: '0.875rem',
                    borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                    opacity: locked ? 0.6 : 1,
                  }}>
              <span style={{ fontSize: '1rem' }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {locked && (
                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>🔒</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Upgrade banner */}
      <div style={{ padding: '0.875rem', margin: '0 0.75rem 0.875rem',
                     background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))',
                     border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12 }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-light)', marginBottom: 4, textTransform: 'capitalize' }}>
          Plan {plan}
        </p>
        <p style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
          {plan === 'free' ? 'Dominio propio, analíticas y más con Pro' : plan === 'pro' ? 'Dominio personalizado con Premium' : '¡Tienes todas las funcionalidades!'}
        </p>
        {plan !== 'premium' && (
          <Link href="/dashboard/upgrade"
                style={{ display: 'block', textAlign: 'center', padding: '0.5rem',
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
                          borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none',
                          boxShadow: '0 4px 12px rgba(99,102,241,0.35)' }}>
            {plan === 'free' ? 'Mejorar a Pro →' : 'Mejorar a Premium →'}
          </Link>
        )}
      </div>
    </aside>
  )
}
