'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PLAN_DEFAULTS, ModuleKey } from '@/lib/modules'

const BASE_NAV: { href: string; icon: string; label: string; exact?: boolean; root?: string; moduleKey?: ModuleKey }[] = [
  { href: '/dashboard',                  icon: '⚡', label: 'Inicio',     exact: true  },
  { href: '/dashboard/reservas',         icon: '📅', label: 'Agenda',     moduleKey: 'reservas' },
  { href: '/dashboard/clientes',         icon: '👥', label: 'Clientes',   moduleKey: 'clientes' },
  { href: '/dashboard/horarios',         icon: '🕐', label: 'Horarios',   moduleKey: 'horarios' },
  { href: '/dashboard/productos',        icon: '📦', label: 'Productos',  moduleKey: 'productos' },
  { href: '/dashboard/pedidos',          icon: '🛒', label: 'Pedidos',    moduleKey: 'productos' },
  { href: '/dashboard/metricas',          icon: '📊', label: 'Métricas',      moduleKey: 'metricas' },
  { href: '/dashboard/asistente',        icon: '🤖', label: 'Asistente IA'  },
  { href: '/dashboard/marketing',        icon: '📣', label: 'Marketing IA'   },
  { href: '/dashboard/whatsapp',         icon: '💬', label: 'WhatsApp Bot'   },
  { href: '/dashboard/recordatorios',    icon: '🔔', label: 'Recordatorios', moduleKey: 'recordatorios' },
  { href: '/dashboard/settings',         icon: '⚙️', label: 'Ajustes'   },
]

interface Props {
  userEmail?: string
  plan?: string
  modules?: Record<string, boolean> | null
  hasSite?: boolean
}

export default function Sidebar({ userEmail, plan = 'free', modules, hasSite = false }: Props) {
  const path = usePathname()
  const activeModules = modules ?? PLAN_DEFAULTS[plan] ?? PLAN_DEFAULTS.free

  const siteItem: { href: string; icon: string; label: string; exact?: boolean; root?: string; moduleKey?: ModuleKey } = hasSite
    ? { href: '/dashboard/sitio/editor', icon: '🌐', label: 'Editar Sitio', root: '/dashboard/sitio' }
    : { href: '/dashboard/sitio',        icon: '✨', label: 'Crear Sitio',  root: '/dashboard/sitio' }

  const NAV = [BASE_NAV[0], siteItem, ...BASE_NAV.slice(1)]

  return (
    <aside className="sb" style={{ width: 220,
                     display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh',
                     position: 'sticky', top: 0 }}>
      {/* Logo */}
      <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid var(--sb-border)' }}>
        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--sb-title)', letterSpacing: '-0.02em' }}>
          Amelia
        </span>
        <p style={{ fontSize: '0.6875rem', color: 'var(--sb-muted)', marginTop: 2 }}>
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
            <Link key={item.href} href={href} className={`sb-link${active ? ' active' : ''}`}
                  title={locked ? `Módulo bloqueado — mejora tu plan` : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '0.625rem 0.875rem', borderRadius: 10,
                    textDecoration: 'none', transition: 'all 0.15s',
                    fontSize: '0.875rem',
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
                     background: 'var(--sb-card)',
                     border: '1px solid var(--sb-border)', borderRadius: 12 }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--sb-title)', marginBottom: 4, textTransform: 'capitalize' }}>
          Plan {plan}
        </p>
        <p style={{ fontSize: '0.6875rem', color: 'var(--sb-muted)', marginBottom: 10, lineHeight: 1.5 }}>
          {plan === 'free' ? 'Dominio propio, analíticas y más con Pro' : plan === 'pro' ? 'Dominio personalizado con Premium' : '¡Tienes todas las funcionalidades!'}
        </p>
        {plan !== 'premium' && (
          <Link href="/dashboard/upgrade"
                style={{ display: 'block', textAlign: 'center', padding: '0.5rem',
                          background: 'var(--sb-active-bg)', color: 'var(--sb-active-text)',
                          borderRadius: 8, fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none',
                          boxShadow: '0 4px 12px color-mix(in srgb, var(--accent) 35%, transparent)' }}>
            {plan === 'free' ? 'Mejorar a Pro →' : 'Mejorar a Premium →'}
          </Link>
        )}
      </div>
    </aside>
  )
}
