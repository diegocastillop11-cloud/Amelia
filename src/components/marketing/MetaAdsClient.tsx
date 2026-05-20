'use client'

import { useState, useEffect } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface AdAccount { id: string; name: string; account_id: string; currency: string; account_status: number }
interface Page      { id: string; name: string; category: string }
interface Campaign  {
  id: string; name: string; status: string; objective: string
  daily_budget: string; created_time: string
  insights?: { data: { spend: string; impressions: string; clicks: string; reach: string }[] }
}

interface ProgressStep {
  key:    string
  label:  string
  done:   boolean
  active: boolean
  error:  boolean
}

const STEP_KEYS = ['copy', 'image', 'upload', 'campaign', 'adset', 'creative', 'ad']
const STEP_INIT: ProgressStep[] = STEP_KEYS.map(k => ({ key: k, label: '...', done: false, active: false, error: false }))

const OBJECTIVES = [
  { value: 'OUTCOME_TRAFFIC',    label: '🌐 Tráfico al sitio web'      },
  { value: 'OUTCOME_AWARENESS',  label: '👁 Reconocimiento de marca'   },
  { value: 'OUTCOME_ENGAGEMENT', label: '💬 Interacción'               },
  { value: 'OUTCOME_LEADS',      label: '🎯 Clientes potenciales'      },
  { value: 'OUTCOME_SALES',      label: '🛒 Ventas'                    },
]

const OBJ_ICON:  Record<string, string> = {
  OUTCOME_TRAFFIC: '🌐', OUTCOME_AWARENESS: '👁',
  OUTCOME_ENGAGEMENT: '💬', OUTCOME_LEADS: '🎯', OUTCOME_SALES: '🛒',
}
const OBJ_SHORT: Record<string, string> = {
  OUTCOME_TRAFFIC: 'Tráfico', OUTCOME_AWARENESS: 'Alcance',
  OUTCOME_ENGAGEMENT: 'Engagement', OUTCOME_LEADS: 'Leads', OUTCOME_SALES: 'Ventas',
}

// Monedas sin decimales (no requieren * 100)
const ZERO_DECIMAL = ['CLP','JPY','KRW','VND','IDR','HUF','TWD','BIF','DJF','GNF','ISK','KMF','MGA','PYG','RWF','UGX','XAF','XOF','XPF']

interface Props {
  initialConnected:   boolean
  initialAdAccountId: string | null
  initialPageId:      string | null
  initialCurrency:    string
  metaParam:          string | null
}

// ── Componente ─────────────────────────────────────────────────────────────────
export default function MetaAdsClient({ initialConnected, initialAdAccountId, initialPageId, initialCurrency, metaParam }: Props) {
  const [connected,  setConnected]  = useState(initialConnected)
  const [accountId,  setAccountId]  = useState<string | null>(initialAdAccountId)
  const [pageId,     setPageId]     = useState<string | null>(initialPageId)
  const [currency,   setCurrency]   = useState(initialCurrency)
  const [accounts,   setAccounts]   = useState<AdAccount[]>([])
  const [pages,      setPages]      = useState<Page[]>([])
  const [campaigns,  setCampaigns]  = useState<Campaign[]>([])
  const [loading,    setLoading]    = useState(false)
  const [toast,      setToast]      = useState<{ msg: string; type: 'ok' | 'error' } | null>(null)

  // Modal
  const [showModal,   setShowModal]   = useState(false)
  const [objective,   setObjective]   = useState('OUTCOME_TRAFFIC')
  const [budget,      setBudget]      = useState('10')
  const [ageMin,      setAgeMin]      = useState('18')
  const [ageMax,      setAgeMax]      = useState('55')
  const [creating,    setCreating]    = useState(false)
  const [steps,       setSteps]       = useState<ProgressStep[]>(STEP_INIT)
  const [previewImg,  setPreviewImg]  = useState<string | null>(null)
  const [modalError,  setModalError]  = useState<string | null>(null)
  const [checkpoint,  setCheckpoint]  = useState<{
    copy?:      Record<string, string>
    imageUrl?:  string
    imageHash?: string
  }>({})

  const isZeroDecimal = ZERO_DECIMAL.includes(currency.toUpperCase())
  const defaultBudget = isZeroDecimal ? '5000' : '10'
  const [togglingId,  setTogglingId]  = useState<string | null>(null)
  const abortRef = { current: null as AbortController | null }

  const notify = (msg: string, type: 'ok' | 'error' = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 5000)
  }

  useEffect(() => {
    if (metaParam === 'connected') { setConnected(true); notify('✅ Meta Ads conectado correctamente') }
    if (metaParam === 'error')     notify('Error al conectar con Meta. Intenta de nuevo.', 'error')
  }, [metaParam])

  useEffect(() => {
    if (connected && !accountId) loadAccounts()
    if (connected && accountId && !pageId) loadPages()
    if (connected && accountId && pageId)  loadCampaigns()
  }, [connected])

  // ── API helpers ──────────────────────────────────────────────────────────────
  const loadAccounts = async () => {
    setLoading(true)
    try {
      const json = await fetch('/api/meta/accounts').then(r => r.json())
      setAccounts(json.data ?? [])
    } catch { notify('Error al cargar cuentas', 'error') }
    setLoading(false)
  }

  const selectAccount = async (id: string, acctCurrency: string) => {
    setLoading(true)
    await fetch('/api/meta/accounts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad_account_id: id, currency: acctCurrency }),
    })
    setCurrency(acctCurrency)
    setAccountId(id)
    await loadPagesInner()
    setLoading(false)
  }

  const loadPages = async () => {
    setLoading(true)
    await loadPagesInner()
    setLoading(false)
  }

  const loadPagesInner = async () => {
    try {
      const json = await fetch('/api/meta/pages').then(r => r.json())
      setPages(json.data ?? [])
    } catch { notify('Error al cargar páginas', 'error') }
  }

  const selectPage = async (id: string, name: string) => {
    setLoading(true)
    await fetch('/api/meta/pages', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_id: id, page_name: name }),
    })
    setPageId(id)
    await loadCampaignsInner()
    setLoading(false)
  }

  const loadCampaigns = async () => {
    setLoading(true)
    await loadCampaignsInner()
    setLoading(false)
  }

  const loadCampaignsInner = async () => {
    try {
      const json = await fetch('/api/meta/campaigns').then(r => r.json())
      setCampaigns(json.campaigns ?? [])
    } catch { notify('Error al cargar campañas', 'error') }
  }

  const cancelCreation = () => {
    abortRef.current?.abort()
    setCreating(false)
    setSteps(STEP_INIT)
    setPreviewImg(null)
    setModalError(null)
    setCheckpoint({})
  }

  const retryFromCheckpoint = () => {
    setModalError(null)
    setSteps(STEP_INIT.map(s => ({
      ...s,
      done:   ['copy','image','upload'].includes(s.key) && !!checkpoint.imageHash,
      active: s.key === 'campaign' && !!checkpoint.imageHash,
      label:  ['copy','image','upload'].includes(s.key) && !!checkpoint.imageHash ? '✓ Reutilizado' : '...',
    })))
    runCampaign(checkpoint.copy, checkpoint.imageHash, checkpoint.imageUrl)
  }

  const runCampaign = async (
    savedCopy?: Record<string, string>,
    savedImageHash?: string,
    savedImageUrl?: string,
  ) => {
    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch('/api/meta/full-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          objective, daily_budget: Number(budget),
          age_min: Number(ageMin), age_max: Number(ageMax),
          saved_copy:       savedCopy       ?? undefined,
          saved_image_hash: savedImageHash  ?? undefined,
          saved_image_url:  savedImageUrl   ?? undefined,
        }),
        signal: abort.signal,
      })

      if (!res.body) throw new Error('Sin respuesta del servidor')
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text  = decoder.decode(value)
        const lines = text.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          let data: {
            step: string; label: string; done?: boolean; skipped?: boolean
            imageUrl?: string; imageHash?: string
            copyData?: Record<string, string>
            message?: string
          }
          try { data = JSON.parse(line.slice(6)) } catch { continue }

          if (data.step === 'error') {
            setModalError(data.message ?? 'Error desconocido')
            setSteps(prev => prev.map(s => s.active ? { ...s, active: false, error: true, label: 'Falló' } : s))
            return
          }

          // Guardar checkpoints a medida que llegan
          if (data.step === 'copy'   && data.done && data.copyData)  setCheckpoint(p => ({ ...p, copy: data.copyData }))
          if (data.step === 'image'  && data.done && data.imageUrl)  { setPreviewImg(data.imageUrl); setCheckpoint(p => ({ ...p, imageUrl: data.imageUrl })) }
          if (data.step === 'upload' && data.done && data.imageHash) setCheckpoint(p => ({ ...p, imageHash: data.imageHash }))

          if (data.step === 'done') {
            setSteps(prev => prev.map(s => ({ ...s, done: true, active: false })))
            setTimeout(async () => {
              setShowModal(false)
              setCreating(false)
              setModalError(null)
              setCheckpoint({})
              notify('✅ Campaña completa creada en Meta Ads (en pausa — revísala antes de activar)')
              await loadCampaignsInner()
            }, 1500)
            return
          }

          const nextKey = STEP_KEYS[STEP_KEYS.indexOf(data.step) + 1]
          setSteps(prev => prev.map(s => {
            if (s.key === data.step) return { ...s, label: data.label, done: !!data.done, active: !data.done }
            if (s.key === nextKey && data.done) return { ...s, active: true }
            return s
          }))
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      setModalError(String(err))
      setSteps(prev => prev.map(s => s.active ? { ...s, active: false, error: true, label: 'Falló' } : s))
    }
  }

  const createFullCampaign = () => {
    setCreating(true)
    setPreviewImg(null)
    setModalError(null)
    setCheckpoint({})
    setSteps(STEP_INIT.map(s => ({ ...s, active: s.key === 'copy' })))
    runCampaign()
  }

  const deleteCampaign = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar la campaña "${name}"? Esta acción no se puede deshacer.`)) return
    try {
      const res = await fetch(`/api/meta/campaigns/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setCampaigns(prev => prev.filter(c => c.id !== id))
      notify('🗑 Campaña eliminada')
    } catch { notify('Error al eliminar la campaña', 'error') }
  }

  const toggleStatus = async (id: string, current: string) => {
    const next = current === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
    setTogglingId(id)
    try {
      const res = await fetch(`/api/meta/campaigns/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      })
      if (!res.ok) throw new Error()
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: next } : c))
      notify(next === 'ACTIVE' ? '▶️ Campaña activada' : '⏸ Campaña pausada')
    } catch { notify('Error al cambiar estado', 'error') }
    setTogglingId(null)
  }

  const disconnect = async () => {
    if (!confirm('¿Desconectar Meta Ads?')) return
    await fetch('/api/meta/disconnect', { method: 'POST' })
    setConnected(false); setAccountId(null); setPageId(null); setCampaigns([])
    notify('Meta Ads desconectado')
  }

  const openModal = () => {
    setPreviewImg(null)
    setSteps(STEP_INIT)
    setModalError(null)
    setCreating(false)
    setObjective('OUTCOME_TRAFFIC')
    setBudget(defaultBudget)
    setAgeMin('18')
    setAgeMax('55')
    setShowModal(true)
  }

  // ── Vistas de configuración ──────────────────────────────────────────────────

  if (!connected) return (
    <div style={{ padding: '2rem 1.75rem' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center', paddingTop: '2rem' }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg,#1877f2,#0a5cc7)',
                       display: 'flex', alignItems: 'center', justifyContent: 'center',
                       fontSize: 28, margin: '0 auto 1.25rem' }}>📢</div>
        <h2 style={{ margin: '0 0 0.5rem', fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-primary)' }}>
          Conecta Meta Ads
        </h2>
        <p style={{ margin: '0 0 1.75rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Crea campañas completas en Facebook e Instagram — con imagen generada por IA, copy persuasivo y segmentación automática.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: '2rem', textAlign: 'left' }}>
          {[
            ['🤖', 'Claude genera el copy, FLUX genera la imagen'],
            ['🎯', 'Segmentación automática para Chile'],
            ['⏸',  'Todo parte en pausa — activas cuando quieras'],
            ['📊', 'Métricas de reach, clics y gasto en tiempo real'],
          ].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', gap: 10, alignItems: 'flex-start',
                                      background: 'var(--bg-elevated)', borderRadius: 10,
                                      padding: '10px 14px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{text}</span>
            </div>
          ))}
        </div>
        <a href="/api/meta/auth"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '13px 28px',
                    background: '#1877f2', color: 'white', borderRadius: 12, fontWeight: 700,
                    fontSize: '0.9375rem', textDecoration: 'none',
                    boxShadow: '0 4px 16px rgba(24,119,242,0.35)' }}>
          <FbIcon /> Conectar con Facebook
        </a>
        <p style={{ marginTop: '1rem', fontSize: 12, color: 'var(--text-muted)' }}>
          Requiere Meta Business Manager + Página de Facebook
        </p>
      </div>
    </div>
  )

  // Seleccionar cuenta
  if (!accountId) return (
    <SetupStep title="Selecciona tu cuenta publicitaria" subtitle="Conectado ✓" loading={loading} toast={toast} onDisconnect={disconnect}>
      {accounts.length === 0
        ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>No se encontraron cuentas activas.</p>
        : accounts.map(acc => (
          <PickCard key={acc.id} title={acc.name} sub={`${acc.id} · ${acc.currency}`}
            active={acc.account_status === 1} onClick={() => selectAccount(acc.id, acc.currency)} disabled={loading} />
        ))
      }
    </SetupStep>
  )

  // Seleccionar página
  if (!pageId) return (
    <SetupStep title="Selecciona tu Página de Facebook" subtitle="Necesaria para crear anuncios" loading={loading} toast={toast} onDisconnect={disconnect}>
      {pages.length === 0
        ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ padding: '1.25rem', background: 'var(--bg-elevated)', borderRadius: 12,
                           border: '1px solid var(--border)', textAlign: 'center' }}>
              <p style={{ margin: '0 0 8px', color: 'var(--text-muted)', fontSize: 13 }}>
                No se encontraron páginas de Facebook en esta cuenta.
              </p>
              <a href="https://www.facebook.com/pages/create" target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, color: '#1877f2', fontWeight: 600 }}>
                Crear una página →
              </a>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(245,158,11,0.08)', borderRadius: 12,
                           border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <strong style={{ color: '#f59e0b' }}>¿Ya tienes una página?</strong><br/>
              Durante el flujo de conexión con Facebook, Meta te pide seleccionar qué páginas compartir con Amelia.
              Desconecta y vuelve a conectar — en la pantalla de permisos de Meta, asegúrate de <strong>seleccionar tu página</strong> explícitamente.
            </div>
          </div>
        )
        : pages.map(p => (
          <PickCard key={p.id} title={p.name} sub={p.category}
            active onClick={() => selectPage(p.id, p.name)} disabled={loading} />
        ))
      }
    </SetupStep>
  )

  // ── Vista principal: campañas ────────────────────────────────────────────────
  return (
    <div style={{ padding: '1.5rem 1.75rem', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Barra superior */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>● Conectado</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{accountId}</span>
          <button onClick={disconnect}
            style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none',
                      cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
            Desconectar
          </button>
        </div>
        <button onClick={openModal}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px',
                    background: 'linear-gradient(135deg,#1877f2,#0a5cc7)', color: 'white',
                    border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700,
                    fontSize: '0.875rem', fontFamily: 'inherit',
                    boxShadow: '0 4px 12px rgba(24,119,242,0.3)' }}>
          ✨ Nueva campaña
        </button>
      </div>

      {/* Lista de campañas */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>Cargando campañas...</div>
      ) : campaigns.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)',
                       background: 'var(--bg-elevated)', borderRadius: 14, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <p style={{ margin: '0 0 4px', fontWeight: 600, color: 'var(--text-secondary)' }}>Sin campañas aún</p>
          <p style={{ margin: 0, fontSize: 13 }}>Crea tu primera campaña completa con IA.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {campaigns.map(c => {
            const ins      = c.insights?.data?.[0]
            const isActive = c.status === 'ACTIVE'
            const toggling = togglingId === c.id
            return (
              <div key={c.id}
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 14,
                          padding: '14px 16px', borderLeft: `3px solid ${isActive ? '#10b981' : 'rgba(255,255,255,0.08)'}` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                                      background: isActive ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                                      color: isActive ? '#10b981' : 'var(--text-muted)' }}>
                        {isActive ? '▶ ACTIVA' : '⏸ PAUSADA'}
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {OBJ_ICON[c.objective] ?? '🎯'} {OBJ_SHORT[c.objective] ?? c.objective}
                      </span>
                    </div>
                    <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{c.name}</p>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {[
                        ['Presupuesto', c.daily_budget ? `$${(Number(c.daily_budget)/100).toFixed(0)}/día` : '—'],
                        ['Alcance',     ins?.reach   ? Number(ins.reach).toLocaleString('es-CL')   : '—'],
                        ['Clics',       ins?.clicks  ? Number(ins.clicks).toLocaleString('es-CL')  : '—'],
                        ['Gasto',       ins?.spend   ? `$${Number(ins.spend).toFixed(2)}`          : '$0.00'],
                      ].map(([label, val]) => (
                        <div key={label}>
                          <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{val}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => toggleStatus(c.id, c.status)} disabled={toggling}
                      style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: toggling ? 'not-allowed' : 'pointer',
                                fontWeight: 600, fontSize: 12, fontFamily: 'inherit',
                                background: isActive ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.12)',
                                color: isActive ? '#ef4444' : '#10b981', opacity: toggling ? 0.5 : 1 }}>
                      {toggling ? '...' : isActive ? '⏸ Pausar' : '▶ Activar'}
                    </button>
                    <a
                      href={`https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${accountId?.replace('act_', '')}&selected_campaign_ids=${c.id}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border)',
                                fontWeight: 600, fontSize: 12, fontFamily: 'inherit', textAlign: 'center',
                                background: 'none', color: 'var(--text-muted)', textDecoration: 'none',
                                display: 'block' }}>
                      Ver en Meta →
                    </a>
                    <button onClick={() => deleteCampaign(c.id, c.name)}
                      style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.25)',
                                fontWeight: 600, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer',
                                background: 'rgba(239,68,68,0.06)', color: '#ef4444' }}>
                      🗑 Eliminar
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal creación completa ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1000,
                       display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget && !creating) setShowModal(false) }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border)',
                         width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--text-primary)' }}>
                Crear campaña completa con IA
              </h3>
              {!creating && (
                <button onClick={() => setShowModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20,
                            color: 'var(--text-muted)', fontFamily: 'inherit' }}>×</button>
              )}
            </div>

            {/* ── Formulario (solo si no está creando) ── */}
            {!creating ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: '1rem' }}>
                  <label style={{ display: 'block' }}>
                    <span style={labelStyle}>Objetivo</span>
                    <select value={objective} onChange={e => setObjective(e.target.value)} style={selectStyle}>
                      {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </label>
                  <label style={{ display: 'block' }}>
                    <span style={labelStyle}>Presupuesto diario ({currency})</span>
                    <input type="number" min={isZeroDecimal ? 500 : 1} value={budget}
                      onChange={e => setBudget(e.target.value)} style={inputStyle}
                      placeholder={defaultBudget} />
                  </label>
                  <label style={{ display: 'block' }}>
                    <span style={labelStyle}>Edad mínima</span>
                    <input type="number" min="13" max="65" value={ageMin}
                      onChange={e => setAgeMin(e.target.value)} style={inputStyle} />
                  </label>
                  <label style={{ display: 'block' }}>
                    <span style={labelStyle}>Edad máxima</span>
                    <input type="number" min="13" max="65" value={ageMax}
                      onChange={e => setAgeMax(e.target.value)} style={inputStyle} />
                  </label>
                </div>

                <div style={{ background: 'rgba(24,119,242,0.08)', border: '1px solid rgba(24,119,242,0.2)',
                               borderRadius: 10, padding: '10px 14px', marginBottom: '1.25rem', fontSize: 12,
                               color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <strong style={{ color: '#60a5fa' }}>¿Qué va a pasar?</strong><br/>
                  Claude genera el copy · FLUX genera la imagen · Todo se sube a Meta Ads en pausa (~10 seg)
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowModal(false)}
                    style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)',
                              border: '1px solid var(--border)', borderRadius: 10,
                              color: 'var(--text-secondary)', fontWeight: 600,
                              cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem' }}>
                    Cancelar
                  </button>
                  <button onClick={createFullCampaign}
                    style={{ flex: 2, padding: '10px', background: 'linear-gradient(135deg,#1877f2,#0a5cc7)',
                              color: 'white', border: 'none', borderRadius: 10,
                              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.875rem',
                              boxShadow: '0 4px 12px rgba(24,119,242,0.3)' }}>
                    🚀 Crear campaña completa
                  </button>
                </div>
              </>
            ) : (
              /* ── Progreso ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Preview imagen */}
                {previewImg && (
                  <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewImg} alt="Imagen generada" style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover' }} />
                  </div>
                )}

                {/* Pasos */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {steps.map(s => (
                    <div key={s.key}
                      style={{ display: 'flex', alignItems: 'center', gap: 10,
                                padding: '10px 14px', borderRadius: 10,
                                background: s.error ? 'rgba(239,68,68,0.08)' : s.done ? 'rgba(16,185,129,0.08)' : s.active ? 'rgba(24,119,242,0.08)' : 'var(--bg-elevated)',
                                border: `1px solid ${s.error ? 'rgba(239,68,68,0.2)' : s.done ? 'rgba(16,185,129,0.2)' : s.active ? 'rgba(24,119,242,0.2)' : 'var(--border)'}`,
                                opacity: !s.done && !s.active && !s.error ? 0.4 : 1,
                                transition: 'all 0.3s' }}>
                      <span style={{ fontSize: 16, flexShrink: 0, width: 20, textAlign: 'center' }}>
                        {s.error ? '❌' : s.done ? '✅' : s.active ? '⏳' : '○'}
                      </span>
                      <span style={{ fontSize: 13, color: s.done ? '#10b981' : s.error ? '#ef4444' : 'var(--text-secondary)', fontWeight: s.active ? 600 : 400 }}>
                        {s.label === '...' ? stepDefaultLabel(s.key) : s.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Error visible dentro del modal */}
                {modalError ? (
                  <div style={{ borderRadius: 12, border: '1.5px solid rgba(239,68,68,0.4)',
                                 background: 'rgba(239,68,68,0.06)', overflow: 'hidden' }}>
                    <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.15)',
                                   borderBottom: '1px solid rgba(239,68,68,0.2)',
                                   display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>❌</span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#ef4444' }}>
                        Falló la creación de campaña
                      </span>
                    </div>
                    <div style={{ padding: '12px 14px' }}>
                      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600,
                                   color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Detalle del error:
                      </p>
                      <pre style={{ margin: 0, fontSize: 12, color: '#fca5a5', lineHeight: 1.6,
                                     whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                                     fontFamily: 'monospace', maxHeight: 180, overflowY: 'auto' }}>
                        {modalError}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                    No cierres esta ventana...
                  </p>
                )}

                {/* Botones de acción */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {modalError && checkpoint.imageHash && (
                    <button onClick={retryFromCheckpoint}
                      style={{ padding: '10px', borderRadius: 10, fontWeight: 700, cursor: 'pointer',
                                fontFamily: 'inherit', fontSize: '0.875rem', border: 'none',
                                background: 'linear-gradient(135deg,#1877f2,#0a5cc7)', color: 'white',
                                boxShadow: '0 4px 12px rgba(24,119,242,0.3)' }}>
                      ▶ Continuar desde donde falló
                    </button>
                  )}
                  <button onClick={cancelCreation}
                    style={{ padding: '10px', borderRadius: 10, fontWeight: 600, cursor: 'pointer',
                              fontFamily: 'inherit', fontSize: '0.875rem', border: 'none',
                              background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                    {modalError ? '← Volver a configurar' : '✕ Cancelar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-componentes ────────────────────────────────────────────────────────────

function SetupStep({ title, subtitle, loading, toast, onDisconnect, children }: {
  title: string; subtitle: string; loading: boolean
  toast: { msg: string; type: 'ok' | 'error' } | null
  onDisconnect: () => void
  children: React.ReactNode
}) {
  return (
    <div style={{ padding: '2rem 1.75rem' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</p>
            </div>
          </div>
          <button onClick={onDisconnect}
            style={{ fontSize: 12, color: 'var(--text-muted)', background: 'none', border: '1px solid var(--border)',
                      cursor: 'pointer', padding: '5px 10px', borderRadius: 8, fontFamily: 'inherit' }}>
            Desconectar
          </button>
        </div>
        {loading
          ? <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>Cargando...</p>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
        }
      </div>
    </div>
  )
}

function PickCard({ title, sub, active, onClick, disabled }: {
  title: string; sub: string; active: boolean; onClick: () => void; disabled: boolean
}) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', background: 'var(--bg-elevated)', borderRadius: 12,
                border: '1.5px solid var(--border)', cursor: disabled ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', textAlign: 'left', transition: 'border-color 0.15s' }}
      onMouseOver={e => { if (!disabled) e.currentTarget.style.borderColor = '#1877f2' }}
      onMouseOut={e  => { e.currentTarget.style.borderColor = 'var(--border)' }}>
      <div>
        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{title}</p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>{sub}</p>
      </div>
      <span style={{ fontSize: 16, color: active ? '#10b981' : '#f59e0b' }}>{active ? '●' : '○'}</span>
    </button>
  )
}

function Toast({ msg, type }: { msg: string; type: 'ok' | 'error' }) {
  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 18px',
                   borderRadius: 12, fontWeight: 600, fontSize: 13,
                   background: type === 'ok' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                   border: `1px solid ${type === 'ok' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                   color: type === 'ok' ? '#10b981' : '#ef4444',
                   boxShadow: '0 4px 20px rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)',
                   animation: 'slideIn 0.2s ease' }}>
      {msg}
      <style>{`@keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
    </div>
  )
}

function FbIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  )
}

function stepDefaultLabel(key: string): string {
  const map: Record<string, string> = {
    copy:     'Generar copy con IA',
    image:    'Generar imagen con FLUX',
    upload:   'Subir imagen a Meta',
    campaign: 'Crear campaña',
    adset:    'Crear segmentación',
    creative: 'Crear anuncio creativo',
    ad:       'Crear anuncio final',
  }
  return map[key] ?? key
}

// ── Estilos inline compartidos ─────────────────────────────────────────────────
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--text-secondary)', marginBottom: 6,
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: 'var(--bg-elevated)',
  border: '1.5px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)',
  fontSize: '0.875rem', fontFamily: 'inherit', boxSizing: 'border-box',
}
const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer',
}
