'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MODULES_CONFIG, PLAN_DEFAULTS, ModuleKey } from '@/lib/modules'

interface Business {
  id: string
  name: string
  category: string
  slug: string
  is_published: boolean
  email: string
  plan: string
  modules: Record<ModuleKey, boolean>
}

interface Props {
  businesses: Business[]
}

const PLAN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  free:    { bg: 'rgba(99,102,241,0.1)',  text: '#a5b4fc', border: 'rgba(99,102,241,0.25)' },
  pro:     { bg: 'rgba(139,92,246,0.1)',  text: '#c4b5fd', border: 'rgba(139,92,246,0.25)' },
  premium: { bg: 'rgba(245,158,11,0.1)',  text: '#fcd34d', border: 'rgba(245,158,11,0.25)' },
}

export default function ConfigClient({ businesses }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [localModules, setLocalModules] = useState<Record<string, Record<ModuleKey, boolean>>>(
    Object.fromEntries(businesses.map(b => [b.id, { ...b.modules }]))
  )
  const [localPlans, setLocalPlans] = useState<Record<string, string>>(
    Object.fromEntries(businesses.map(b => [b.id, b.plan]))
  )

  function setLoad(key: string, val: boolean) {
    setLoading(prev => ({ ...prev, [key]: val }))
  }

  async function changePlan(bizId: string, plan: string) {
    setLoad(`plan-${bizId}`, true)
    const res = await fetch('/api/admin/set-plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: bizId, plan }),
    })
    if (res.ok) {
      setLocalPlans(prev => ({ ...prev, [bizId]: plan }))
      // Resetear módulos al default del plan
      setLocalModules(prev => ({ ...prev, [bizId]: { ...PLAN_DEFAULTS[plan] } }))
      router.refresh()
    }
    setLoad(`plan-${bizId}`, false)
  }

  async function toggleModule(bizId: string, key: ModuleKey, enabled: boolean) {
    setLoad(`mod-${bizId}-${key}`, true)
    const res = await fetch('/api/admin/toggle-module', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: bizId, module_key: key, enabled }),
    })
    if (res.ok) {
      setLocalModules(prev => ({
        ...prev,
        [bizId]: { ...prev[bizId], [key]: enabled },
      }))
    }
    setLoad(`mod-${bizId}-${key}`, false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {businesses.length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Sin clientes registrados aún
        </div>
      )}

      {businesses.map(biz => {
        const plan = localPlans[biz.id] ?? biz.plan
        const modules = localModules[biz.id] ?? biz.modules
        const pc = PLAN_COLORS[plan] ?? PLAN_COLORS.free
        const isExpanded = expanded === biz.id

        return (
          <div key={biz.id} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.15s' }}>
            {/* Header fila */}
            <div
              onClick={() => setExpanded(isExpanded ? null : biz.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '1rem 1.25rem', cursor: 'pointer' }}
            >
              {/* Info negocio */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{biz.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{biz.category}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.6 }}>· {biz.email}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', color: biz.is_published ? '#6ee7b7' : 'var(--text-muted)' }}>
                    {biz.is_published ? '● Publicado' : '○ Borrador'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>· /{biz.slug}</span>
                </div>
              </div>

              {/* Plan selector */}
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                {(['free', 'pro', 'premium'] as const).map(p => {
                  const c = PLAN_COLORS[p]
                  const isActive = plan === p
                  return (
                    <button key={p} onClick={() => changePlan(biz.id, p)}
                      disabled={loading[`plan-${biz.id}`]}
                      style={{
                        padding: '4px 10px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer',
                        border: `1px solid ${isActive ? c.border : 'var(--border)'}`,
                        background: isActive ? c.bg : 'transparent',
                        color: isActive ? c.text : 'var(--text-muted)',
                        transition: 'all 0.15s',
                        opacity: loading[`plan-${biz.id}`] ? 0.5 : 1,
                      }}>
                      {p}
                    </button>
                  )
                })}
              </div>

              {/* Toggle expandir */}
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', flexShrink: 0, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
            </div>

            {/* Módulos expandidos */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid var(--border)', padding: '1rem 1.25rem', background: 'var(--bg-surface)' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Módulos activos
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                  {MODULES_CONFIG.map(mod => {
                    const key = mod.key as ModuleKey
                    const enabled = modules[key] ?? false
                    const isLoading = loading[`mod-${biz.id}-${key}`]

                    return (
                      <button key={key}
                        onClick={() => toggleModule(biz.id, key, !enabled)}
                        disabled={isLoading}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '0.625rem 0.875rem', borderRadius: 10, cursor: 'pointer',
                          border: `1px solid ${enabled ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
                          background: enabled ? 'rgba(99,102,241,0.08)' : 'var(--bg-elevated)',
                          transition: 'all 0.15s', opacity: isLoading ? 0.5 : 1,
                        }}>
                        <span style={{ fontSize: '0.9rem' }}>{mod.icon}</span>
                        <span style={{ fontSize: '0.8rem', color: enabled ? 'var(--accent-light)' : 'var(--text-muted)', fontWeight: enabled ? 500 : 400 }}>
                          {mod.label}
                        </span>
                        <span style={{ marginLeft: 'auto', width: 10, height: 10, borderRadius: '50%', background: enabled ? '#22c55e' : 'var(--border)', flexShrink: 0 }} />
                      </button>
                    )
                  })}
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 10 }}>
                  Los cambios se guardan inmediatamente
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
