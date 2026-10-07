'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { PLAN_DEFAULTS, ModuleKey } from '@/lib/modules'

type NavItem = { href: string; icon: string; label: string; more?: boolean; exact?: boolean; root?: string; moduleKey?: ModuleKey }

const BASE_NAV: NavItem[] = [
  { href: '/dashboard',                  icon: '🏠', label: 'Inicio',        exact: true },
  { href: '/dashboard/reservas',         icon: '📅', label: 'Mis citas',     moduleKey: 'reservas' },
  { href: '/dashboard/clientes',         icon: '👥', label: 'Mis clientes',  moduleKey: 'clientes' },
  { href: '/dashboard/settings',         icon: '⚙️', label: 'Configuración' },
  { href: '/dashboard/productos',        icon: '📦', label: 'Mis productos',        more: true, moduleKey: 'productos' },
  { href: '/dashboard/pedidos',          icon: '🛒', label: 'Pedidos recibidos',    more: true, moduleKey: 'productos' },
  { href: '/dashboard/horarios',         icon: '🕐', label: 'Mis horarios',         more: true, moduleKey: 'horarios' },
  { href: '/dashboard/recordatorios',    icon: '🔔', label: 'Recordatorios',        more: true, moduleKey: 'recordatorios' },
  { href: '/dashboard/whatsapp',         icon: '💬', label: 'Respuestas WhatsApp',  more: true },
  { href: '/dashboard/metricas',         icon: '📊', label: 'Mis resultados',       more: true, moduleKey: 'metricas' },
  { href: '/dashboard/marketing',        icon: '📣', label: 'Publicidad con IA',    more: true },
  { href: '/dashboard/asistente',        icon: '🤖', label: 'Pregúntale a Amelia',  more: true },
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

  const siteItem: NavItem = hasSite
    ? { href: '/dashboard/sitio/editor', icon: '🌐', label: 'Mi sitio web',       root: '/dashboard/sitio' }
    : { href: '/dashboard/sitio',        icon: '✨', label: 'Crear mi sitio web', root: '/dashboard/sitio' }

  const NAV = [BASE_NAV[0], siteItem, ...BASE_NAV.slice(1)]
  const principales = NAV.filter(i => !i.more)
  const extras      = NAV.filter(i => i.more)

  const isActive = (item: NavItem) => item.exact ? path === item.href : path.startsWith(item.root ?? item.href)
  const [abierto, setAbierto] = useState(false)
  const verExtras = abierto || extras.some(isActive)

  const renderItem = (item: NavItem) => {
    const active = isActive(item)
    const locked = item.moduleKey ? !activeModules[item.moduleKey] : false
    const href   = locked ? '/dashboard/upgrade' : item.href
    return (
      <Link key={item.href} href={href} className={`sb-link${active ? ' active' : ''}`}
            title={locked ? 'Disponible en un plan superior' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '0.75rem 0.875rem', borderRadius: 12,
              textDecoration: 'none', transition: 'all 0.15s',
              fontSize: '1rem', opacity: locked ? 0.6 : 1,
            }}>
        <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
        <span style={{ flex: 1 }}>{item.label}</span>
        {locked && <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>🔒</span>}
      </Link>
    )
  }

  return (
    <aside className="sb" style={{ width: 240,
                     display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100vh',
                     position: 'sticky', top: 0 }}>
      <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid var(--sb-border)' }}>
        <span style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--sb-title)', letterSpacing: '-0.02em' }}>
          Amelia
        </span>
        <p style={{ fontSize: '0.75rem', color: 'var(--sb-muted)', marginTop: 2 }}>
          Tu sitio web con IA
        </p>
      </div>

      <nav style={{ flex: 1, padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
        {principales.map(renderItem)}

        <button onClick={() => setAbierto(!verExtras)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 0.875rem', marginTop: 8,
                         borderRadius: 12, border: '1.5px dashed var(--sb-border)', background: 'transparent',
                         color: 'var(--sb-text)', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer',
                         fontFamily: 'inherit', textAlign: 'left' }}>
          <span style={{ fontSize: '1.25rem' }}>{verExtras ? '➖' : '➕'}</span>
          <span style={{ flex: 1 }}>{verExtras ? 'Menos herramientas' : 'Más herramientas'}</span>
        </button>

        {verExtras && <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>{extras.map(renderItem)}</div>}
      </nav>

      <div style={{ padding: '0.875rem', margin: '0 0.75rem 0.875rem',
                     background: 'var(--sb-card)',
                     border: '1px solid var(--sb-border)', borderRadius: 12 }}>
        <p style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--sb-title)', marginBottom: 4 }}>
          {plan === 'free' ? 'Plan gratuito' : `Plan ${plan}`}
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--sb-muted)', marginBottom: 10, lineHeight: 1.5 }}>
          {plan === 'free' ? 'Dominio propio, estadísticas y más con Pro' : plan === 'pro' ? 'Dominio personalizado con Premium' : '¡Tienes todas las funciones!'}
        </p>
        {plan !== 'premium' && (
          <Link href="/dashboard/upgrade"
                style={{ display: 'block', textAlign: 'center', padding: '0.625rem',
                          background: 'var(--sb-active-bg)', color: 'var(--sb-active-text)',
                          borderRadius: 10, fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none',
                          boxShadow: '0 4px 12px color-mix(in srgb, var(--accent) 35%, transparent)' }}>
            {plan === 'free' ? 'Mejorar a Pro →' : 'Mejorar a Premium →'}
          </Link>
        )}
      </div>
    </aside>
  )
}
