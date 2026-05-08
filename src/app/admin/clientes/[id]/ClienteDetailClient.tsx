'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MODULES_CONFIG, PLAN_DEFAULTS, ModuleKey } from '@/lib/modules'

const PLAN_COLORS: Record<string, string> = {
  free: '#6b7280', pro: '#6366f1', premium: '#f59e0b',
}

interface Props {
  business: {
    id: string; name: string; slug: string; category: string
    is_published: boolean; primary_color: string | null; created_at: string
    owners: { id: string; full_name: string | null; email: string } | null
  }
  license: { plan: string; expires_at: string | null; modules: Record<string, boolean> | null } | null
  upgradeRequest: { id: string; requested_plan: string; status: string; created_at: string } | null
  totalBookings: number
  totalClients: number
}

export default function ClienteDetailClient({ business, license, upgradeRequest, totalBookings, totalClients }: Props) {
  const [plan, setPlan]               = useState(license?.plan ?? 'free')
  const [pendingPlan, setPendingPlan] = useState<string | null>(null)
  const [modules, setModules]         = useState<Record<string, boolean>>(
    license?.modules ?? PLAN_DEFAULTS[license?.plan ?? 'free']
  )
  const [published, setPublished] = useState(business.is_published)
  const [saving, setSaving]       = useState(false)
  const [togglingMod, setTogglingMod] = useState<string | null>(null)
  const [msg, setMsg]             = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const displayPlan = pendingPlan ?? plan

  async function guardarPlan() {
    if (!pendingPlan) return
    setSaving(true); setMsg(null)
    const res = await fetch('/api/admin/set-plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: business.id,
        plan: pendingPlan,
        upgrade_request_id: upgradeRequest?.requested_plan === pendingPlan ? upgradeRequest.id : undefined,
      }),
    })
    if (res.ok) {
      setPlan(pendingPlan)
      setModules(PLAN_DEFAULTS[pendingPlan])
      setPendingPlan(null)
      setMsg({ type: 'ok', text: `Plan actualizado a ${pendingPlan.toUpperCase()}` })
    } else {
      setMsg({ type: 'err', text: 'Error al actualizar el plan' })
    }
    setSaving(false)
  }

  async function toggleModule(key: ModuleKey, value: boolean) {
    setTogglingMod(key)
    const res = await fetch('/api/admin/toggle-module', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: business.id, module_key: key, enabled: value }),
    })
    if (res.ok) {
      setModules(prev => ({ ...prev, [key]: value }))
    } else {
      setMsg({ type: 'err', text: 'Error al cambiar módulo' })
    }
    setTogglingMod(null)
  }

  async function togglePublish() {
    setSaving(true); setMsg(null)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { error } = await supabase.from('businesses')
      .update({ is_published: !published }).eq('id', business.id)
    if (!error) {
      setPublished(p => !p)
      setMsg({ type: 'ok', text: published ? 'Sitio despublicado' : 'Sitio publicado' })
    } else {
      setMsg({ type: 'err', text: 'Error al cambiar estado' })
    }
    setSaving(false)
  }

  const planColor = PLAN_COLORS[displayPlan] ?? '#6b7280'

  return (
    <div className="p-8 max-w-3xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <Link href="/admin/clientes" className="text-xs mb-2 inline-flex items-center gap-1"
                style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
            ← Volver a clientes
          </Link>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            {business.name}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {business.category} · <span className="mono">/sitio/{business.slug}</span>
          </p>
        </div>
        {published && (
          <a href={`/sitio/${business.slug}`} target="_blank"
             className="btn-ghost text-sm" style={{ textDecoration: 'none' }}>
            Ver sitio ↗
          </a>
        )}
      </div>

      {msg && (
        <div className="mb-5 px-4 py-3 rounded-xl text-sm font-medium"
             style={{
               background: msg.type === 'ok' ? 'rgba(110,231,183,0.1)' : 'rgba(248,113,113,0.1)',
               border: `1px solid ${msg.type === 'ok' ? 'rgba(110,231,183,0.25)' : 'rgba(248,113,113,0.25)'}`,
               color: msg.type === 'ok' ? '#6ee7b7' : '#f87171',
             }}>
          {msg.text}
        </div>
      )}

      <div className="space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Citas totales', value: totalBookings, icon: '📅' },
            { label: 'Clientes', value: totalClients, icon: '👥' },
            { label: 'Estado sitio', value: published ? 'Publicado' : 'Borrador', icon: '🌐',
              color: published ? '#6ee7b7' : '#fcd34d' },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <p className="text-lg mb-1">{s.icon}</p>
              <p className="text-xl font-semibold" style={{ color: (s as {color?:string}).color ?? 'var(--text-primary)' }}>
                {s.value}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Plan */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>Plan de acceso</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {pendingPlan && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {plan} → <strong style={{ color: PLAN_COLORS[pendingPlan] }}>{pendingPlan}</strong>
                </span>
              )}
              <span className="text-xs font-bold px-3 py-1 rounded-full capitalize"
                    style={{ background: `${planColor}18`, color: planColor, border: `1px solid ${planColor}30` }}>
                {displayPlan}
              </span>
            </div>
          </div>

          {upgradeRequest && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm"
                 style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <p style={{ color: '#fcd34d' }}>
                🔔 Solicitó upgrade a <strong>{upgradeRequest.requested_plan.toUpperCase()}</strong>
              </p>
              <button
                onClick={() => setPendingPlan(upgradeRequest.requested_plan)}
                className="mt-2 text-xs font-bold px-3 py-1.5 rounded-lg"
                style={{ background: '#f59e0b', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Seleccionar {upgradeRequest.requested_plan.toUpperCase()} →
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 mb-3">
            {(['free', 'pro', 'premium'] as const).map(p => {
              const isActive  = displayPlan === p
              const isSaved   = plan === p
              return (
                <button
                  key={p}
                  onClick={() => setPendingPlan(p === plan ? null : p)}
                  disabled={saving}
                  className="py-2.5 rounded-xl text-sm font-bold capitalize transition-all"
                  style={{
                    background: isActive ? `${PLAN_COLORS[p]}20` : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${isActive ? `${PLAN_COLORS[p]}60` : 'rgba(255,255,255,0.08)'}`,
                    color: isActive ? PLAN_COLORS[p] : 'var(--text-muted)',
                    cursor: 'pointer', fontFamily: 'inherit',
                    outline: isActive && !isSaved ? `2px dashed ${PLAN_COLORS[p]}60` : 'none',
                    outlineOffset: 2,
                  }}>
                  {p}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {pendingPlan
                ? 'Cambio pendiente — confirma para aplicar.'
                : 'Al cambiar el plan se resetean los módulos a los valores por defecto.'}
            </p>
            {pendingPlan && (
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button
                  onClick={() => setPendingPlan(null)}
                  disabled={saving}
                  style={{
                    padding: '0.375rem 0.75rem', borderRadius: 8, fontSize: '0.8125rem',
                    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-muted)',
                  }}>
                  Cancelar
                </button>
                <button
                  onClick={guardarPlan}
                  disabled={saving}
                  style={{
                    padding: '0.375rem 0.875rem', borderRadius: 8, fontSize: '0.8125rem',
                    fontWeight: 700, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit',
                    background: PLAN_COLORS[pendingPlan], color: 'white', border: 'none',
                    opacity: saving ? 0.7 : 1,
                  }}>
                  {saving ? 'Guardando...' : `Guardar → ${pendingPlan.toUpperCase()}`}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Módulos */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
            Módulos activos
          </h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
            Activa o desactiva funcionalidades individualmente para este cliente.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {MODULES_CONFIG.map(m => {
              const active = modules[m.key] ?? false
              const toggling = togglingMod === m.key
              return (
                <button
                  key={m.key}
                  onClick={() => toggleModule(m.key, !active)}
                  disabled={toggling}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '0.75rem 1rem', borderRadius: 12, cursor: 'pointer',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                    background: active ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.02)',
                    border: `1.5px solid ${active ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.06)'}`,
                    opacity: toggling ? 0.6 : 1,
                  }}>
                  <span style={{ fontSize: '1rem' }}>{m.icon}</span>
                  <span style={{
                    flex: 1, fontSize: '0.8125rem', fontWeight: 500, textAlign: 'left',
                    color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}>
                    {m.label}
                  </span>
                  <span style={{
                    fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px',
                    borderRadius: 20,
                    background: active ? 'rgba(110,231,183,0.12)' : 'rgba(255,255,255,0.05)',
                    color: active ? '#6ee7b7' : 'var(--text-muted)',
                    border: `1px solid ${active ? 'rgba(110,231,183,0.25)' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                    {active ? 'ON' : 'OFF'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Info del negocio */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
            Información del negocio
          </h2>
          <dl className="space-y-3">
            {[
              ['Propietario', business.owners?.full_name ?? '—'],
              ['Email', business.owners?.email ?? '—'],
              ['Rubro', business.category],
              ['URL', `/sitio/${business.slug}`],
              ['Registro', new Date(business.created_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between items-center py-2"
                   style={{ borderBottom: '1px solid var(--border)' }}>
                <dt className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</dt>
                <dd className="text-sm font-medium mono" style={{ color: 'var(--text-primary)' }}>{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Guía dominio — solo premium */}
        {plan === 'premium' && (
          <DominioPasos slug={business.slug} />
        )}

        {/* Acciones */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>Acciones</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={togglePublish}
              disabled={saving}
              className="btn-secondary text-sm"
              style={{ fontFamily: 'inherit' }}>
              {published ? '⬇ Despublicar sitio' : '🌐 Publicar sitio'}
            </button>
            <a href={`/sitio/${business.slug}`} target="_blank"
               className="btn-ghost text-sm" style={{ textDecoration: 'none' }}>
              Ver sitio público ↗
            </a>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Guía paso a paso: dominio personalizado ─────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button onClick={copy}
      style={{
        marginLeft: 8, padding: '2px 10px', borderRadius: 6, fontSize: '0.6875rem',
        fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        background: copied ? 'rgba(110,231,183,0.15)' : 'rgba(255,255,255,0.06)',
        border: `1px solid ${copied ? 'rgba(110,231,183,0.3)' : 'rgba(255,255,255,0.1)'}`,
        color: copied ? '#6ee7b7' : 'var(--text-muted)',
        transition: 'all 0.2s',
      }}>
      {copied ? '✓' : 'Copiar'}
    </button>
  )
}

const PASOS = [
  {
    num: 1,
    titulo: 'Comprar el dominio',
    desc: 'Para dominios .cl usa NIC Chile (nic.cl). Para .com, Namecheap o Cloudflare Registrar son los más baratos. Registra el dominio a nombre del cliente o a nombre tuyo si lo vas a gestionar.',
    links: [
      { label: 'NIC Chile (.cl)', url: 'https://www.nic.cl' },
      { label: 'Namecheap (.com)', url: 'https://www.namecheap.com' },
      { label: 'Cloudflare Registrar', url: 'https://www.cloudflare.com/products/registrar/' },
    ],
  },
  {
    num: 2,
    titulo: 'Agregar el dominio en Vercel',
    desc: 'Ve a tu proyecto en Vercel → Settings → Domains → Add. Escribe el dominio (ej: www.tucliente.cl) y haz click en Add. Vercel te mostrará los registros DNS que debes configurar.',
    links: [
      { label: 'Abrir Vercel Dashboard', url: 'https://vercel.com/dashboard' },
    ],
  },
  {
    num: 3,
    titulo: 'Configurar DNS',
    desc: 'En el panel DNS del registrador, crea estos registros según lo que indica Vercel:',
    dns: [
      { tipo: 'CNAME', nombre: 'www', valor: 'cname.vercel-dns.com' },
      { tipo: 'A', nombre: '@', valor: '76.76.21.21' },
    ],
  },
  {
    num: 4,
    titulo: 'Esperar propagación',
    desc: 'Los cambios de DNS pueden tardar entre 5 minutos y 48 horas. En la práctica, con Cloudflare o NIC Chile suele ser menos de 30 minutos. Puedes verificar el estado directamente en Vercel → Domains.',
  },
  {
    num: 5,
    titulo: 'Verificar y avisar al cliente',
    desc: 'Cuando Vercel muestre el dominio en verde (Valid), el sitio ya está activo en el dominio personalizado. Avisa al cliente y comparte la URL.',
  },
]

function DominioPasos({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="card p-6"
         style={{ border: '1.5px solid rgba(245,158,11,0.25)', background: 'rgba(245,158,11,0.04)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1rem' }}>🌐</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#fcd34d' }}>
            Guía: Configurar dominio personalizado
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ marginTop: '1.25rem' }}>
          <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>
            Sitio actual: <span className="mono">/sitio/{slug}</span> — sigue estos pasos para conectar un dominio propio.
          </p>

          <div className="space-y-5">
            {PASOS.map(paso => (
              <div key={paso.num} style={{ display: 'flex', gap: 14 }}>
                {/* Número */}
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(245,158,11,0.15)', border: '1.5px solid rgba(245,158,11,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 800, color: '#fcd34d',
                }}>
                  {paso.num}
                </div>

                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                    {paso.titulo}
                  </p>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {paso.desc}
                  </p>

                  {/* DNS records */}
                  {paso.dns && (
                    <div style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden',
                                   border: '1px solid rgba(255,255,255,0.08)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                            {['Tipo', 'Nombre', 'Valor'].map(h => (
                              <th key={h} style={{ padding: '6px 12px', textAlign: 'left',
                                                    color: 'var(--text-muted)', fontWeight: 600,
                                                    fontSize: '0.6875rem', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {paso.dns.map((row, i) => (
                            <tr key={i} style={{ borderBottom: i < paso.dns!.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                              <td style={{ padding: '7px 12px' }}>
                                <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '2px 7px',
                                               borderRadius: 6, background: 'rgba(99,102,241,0.15)',
                                               color: '#a5b4fc' }}>
                                  {row.tipo}
                                </span>
                              </td>
                              <td style={{ padding: '7px 12px', color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                {row.nombre}
                              </td>
                              <td style={{ padding: '7px 12px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                {row.valor}
                                <CopyBtn text={row.valor} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Links */}
                  {paso.links && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {paso.links.map(l => (
                        <a key={l.url} href={l.url} target="_blank" rel="noopener"
                           style={{
                             fontSize: '0.75rem', padding: '3px 10px', borderRadius: 8,
                             background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                             color: 'var(--text-secondary)', textDecoration: 'none',
                           }}>
                          {l.label} ↗
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
