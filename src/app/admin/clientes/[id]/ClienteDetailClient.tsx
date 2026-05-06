'use client'

import { useState } from 'react'
import Link from 'next/link'

const PLAN_COLORS: Record<string, string> = {
  free: '#6b7280', pro: '#6366f1', premium: '#f59e0b',
}

interface Props {
  business: {
    id: string; name: string; slug: string; category: string
    is_published: boolean; primary_color: string | null; created_at: string
    owners: { id: string; full_name: string | null; email: string } | null
  }
  license: { plan: string; expires_at: string | null } | null
  upgradeRequest: { id: string; requested_plan: string; status: string; created_at: string } | null
  totalBookings: number
  totalClients: number
}

export default function ClienteDetailClient({ business, license, upgradeRequest, totalBookings, totalClients }: Props) {
  const [plan, setPlan]           = useState(license?.plan ?? 'free')
  const [published, setPublished] = useState(business.is_published)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  async function actualizarPlan(nuevoPlan: string) {
    setSaving(true); setMsg(null)
    const res = await fetch('/api/admin/set-plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: business.id,
        plan: nuevoPlan,
        upgrade_request_id: upgradeRequest?.requested_plan === nuevoPlan ? upgradeRequest.id : undefined,
      }),
    })
    if (res.ok) {
      setPlan(nuevoPlan)
      setMsg({ type: 'ok', text: `Plan actualizado a ${nuevoPlan.toUpperCase()}` })
    } else {
      setMsg({ type: 'err', text: 'Error al actualizar el plan' })
    }
    setSaving(false)
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

  const color = business.primary_color ?? '#6366f1'
  const planColor = PLAN_COLORS[plan] ?? '#6b7280'

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

        {/* Stats rápidas */}
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
            <span className="text-xs font-bold px-3 py-1 rounded-full capitalize"
                  style={{ background: `${planColor}18`, color: planColor, border: `1px solid ${planColor}30` }}>
              {plan}
            </span>
          </div>

          {upgradeRequest && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm"
                 style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <p style={{ color: '#fcd34d' }}>
                🔔 Solicitó upgrade a <strong>{upgradeRequest.requested_plan.toUpperCase()}</strong>
              </p>
              <button
                onClick={() => actualizarPlan(upgradeRequest.requested_plan)}
                disabled={saving}
                className="mt-2 text-xs font-bold px-3 py-1.5 rounded-lg"
                style={{ background: '#f59e0b', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Aprobar upgrade →
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {(['free', 'pro', 'premium'] as const).map(p => (
              <button
                key={p}
                onClick={() => actualizarPlan(p)}
                disabled={saving || plan === p}
                className="py-2.5 rounded-xl text-sm font-bold capitalize transition-all"
                style={{
                  background: plan === p ? `${PLAN_COLORS[p]}20` : 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${plan === p ? `${PLAN_COLORS[p]}60` : 'rgba(255,255,255,0.08)'}`,
                  color: plan === p ? PLAN_COLORS[p] : 'var(--text-muted)',
                  cursor: plan === p ? 'default' : 'pointer',
                  fontFamily: 'inherit',
                }}>
                {p}
              </button>
            ))}
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Cambia el plan del cliente directamente. Se aplica de inmediato.
          </p>
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
