'use client'

import { useState, useEffect, useRef } from 'react'

interface WaConnection {
  phone_number_id:      string
  display_phone_number: string | null
  webhook_verified:     boolean
  is_active:            boolean
}

interface WaMessage {
  role:    'user' | 'assistant'
  content: string
  ts:      number
}

interface Conversation {
  id:              string
  customer_phone:  string
  customer_name:   string | null
  messages:        WaMessage[]
  last_message_at: string
}

export default function WhatsAppClient() {
  const [conn, setConn]             = useState<WaConnection | null>(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

  // Form setup
  const [phoneNumId, setPhoneNumId] = useState('')
  const [token, setToken]           = useState('')
  const [displayPhone, setDisplayPhone] = useState('')
  const [wabaId, setWabaId]         = useState('')

  // Conversations
  const [convs, setConvs]           = useState<Conversation[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null)
  const [loadingConvs, setLoadingConvs] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)

  // ── Cargar estado de conexión ──────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/whatsapp/connection')
      .then(r => r.json())
      .then(d => {
        setConn(d.connection)
        setLoading(false)
        if (d.connection) loadConversations()
      })
      .catch(() => setLoading(false))
  }, [])

  // Scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selectedConv])

  async function loadConversations() {
    setLoadingConvs(true)
    const res = await fetch('/api/whatsapp/conversations')
    const d   = await res.json()
    setConvs(d.conversations ?? [])
    setLoadingConvs(false)
  }

  // ── Guardar conexión ───────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!phoneNumId.trim() || !token.trim()) {
      setError('Phone Number ID y Access Token son requeridos.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/whatsapp/connection', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone_number_id:      phoneNumId.trim(),
        access_token:         token.trim(),
        display_phone_number: displayPhone.trim() || null,
        waba_id:              wabaId.trim() || null,
      }),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) { setError(d.error ?? 'Error al guardar'); return }
    setSuccess('¡Conexión guardada! Configura el webhook en Meta (ver instrucciones abajo).')
    // Recargar
    const r2 = await fetch('/api/whatsapp/connection')
    const d2 = await r2.json()
    setConn(d2.connection)
    loadConversations()
  }

  // ── Desconectar ────────────────────────────────────────────────────────────
  async function handleDisconnect() {
    if (!confirm('¿Desconectar WhatsApp? Se eliminará la configuración.')) return
    await fetch('/api/whatsapp/connection', { method: 'DELETE' })
    setConn(null)
    setConvs([])
    setSelectedConv(null)
    setPhoneNumId('')
    setToken('')
    setDisplayPhone('')
    setWabaId('')
  }

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/whatsapp/webhook`
    : '/api/whatsapp/webhook'

  if (loading) return (
    <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>Cargando...</div>
  )

  // ── Vista: conectado ───────────────────────────────────────────────────────
  if (conn) return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '1.75rem' }}>💬</span>
            <div>
              <h2 style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                WhatsApp Bot activo
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {conn.display_phone_number ?? conn.phone_number_id}
              </p>
            </div>
            <span style={{
              background: '#dcfce7', color: '#16a34a',
              borderRadius: '999px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: 600
            }}>● Conectado</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadConversations}
              className="btn-ghost"
              style={{ fontSize: '0.85rem' }}
            >
              🔄 Actualizar
            </button>
            <button
              onClick={handleDisconnect}
              className="btn-ghost"
              style={{ fontSize: '0.85rem', color: '#ef4444' }}
            >
              Desconectar
            </button>
          </div>
        </div>
      </div>

      {/* Conversaciones */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loadingConvs ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Cargando conversaciones...
          </div>
        ) : convs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Aún no hay conversaciones. Cuando alguien te escriba por WhatsApp, aparecerá aquí.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: '500px' }}>
            {/* Lista de conversaciones */}
            <div style={{
              borderRight: '1px solid var(--border)',
              overflowY: 'auto',
            }}>
              {convs.map(c => {
                const last = c.messages[c.messages.length - 1]
                const active = selectedConv?.id === c.id
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedConv(c)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '0.875rem 1rem',
                      borderBottom: '1px solid var(--border)',
                      background: active ? 'var(--bg-elevated)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <p style={{
                        fontWeight: 600, fontSize: '0.875rem',
                        color: 'var(--text-primary)', marginBottom: '2px'
                      }}>
                        {c.customer_name ?? c.customer_phone}
                      </p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: '6px' }}>
                        {new Date(c.last_message_at).toLocaleDateString('es-CL', {
                          day: '2-digit', month: '2-digit'
                        })}
                      </span>
                    </div>
                    {c.customer_name && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                        {c.customer_phone}
                      </p>
                    )}
                    {last && (
                      <p style={{
                        fontSize: '0.8rem', color: 'var(--text-secondary)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        maxWidth: '200px'
                      }}>
                        {last.role === 'assistant' ? '🤖 ' : ''}{last.content}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Vista de mensajes */}
            {selectedConv ? (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Header del chat */}
                <div style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                }}>
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {selectedConv.customer_name ?? selectedConv.customer_phone}
                  </p>
                  {selectedConv.customer_name && (
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {selectedConv.customer_phone}
                    </p>
                  )}
                </div>
                {/* Mensajes */}
                <div style={{
                  flex: 1, overflowY: 'auto', padding: '1rem',
                  display: 'flex', flexDirection: 'column', gap: '0.5rem',
                  background: 'var(--bg-base)',
                }}>
                  {selectedConv.messages.map((m, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: m.role === 'assistant' ? 'flex-end' : 'flex-start',
                    }}>
                      <div style={{
                        maxWidth: '70%',
                        background: m.role === 'assistant' ? 'var(--accent)' : 'var(--bg-elevated)',
                        color: m.role === 'assistant' ? 'white' : 'var(--text-primary)',
                        borderRadius: m.role === 'assistant'
                          ? '12px 12px 2px 12px'
                          : '12px 12px 12px 2px',
                        padding: '0.5rem 0.875rem',
                        fontSize: '0.875rem',
                        lineHeight: 1.5,
                      }}>
                        {m.content}
                        <div style={{
                          fontSize: '0.65rem',
                          opacity: 0.7,
                          marginTop: '2px',
                          textAlign: 'right'
                        }}>
                          {new Date(m.ts).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={bottomRef} />
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-muted)', fontSize: '0.9rem'
              }}>
                Selecciona una conversación
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instrucciones webhook */}
      <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
          📋 Configuración del Webhook
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
          Para recibir mensajes, configura esto en tu app de Meta:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', width: '110px', flexShrink: 0 }}>URL del webhook:</span>
            <code style={{
              background: 'var(--bg-elevated)', padding: '3px 8px',
              borderRadius: '4px', fontSize: '0.8rem', wordBreak: 'break-all'
            }}>{webhookUrl}</code>
            <button
              onClick={() => navigator.clipboard.writeText(webhookUrl)}
              className="btn-ghost"
              style={{ fontSize: '0.75rem', padding: '2px 8px' }}
            >
              Copiar
            </button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-muted)', width: '110px', flexShrink: 0 }}>Verify token:</span>
            <code style={{
              background: 'var(--bg-elevated)', padding: '3px 8px',
              borderRadius: '4px', fontSize: '0.8rem'
            }}>
              El valor de <strong>WHATSAPP_VERIFY_TOKEN</strong> en tu .env
            </code>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--text-muted)', width: '110px', flexShrink: 0 }}>Suscripciones:</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Activa <strong>messages</strong> en los campos del webhook
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Vista: no conectado — formulario de setup ──────────────────────────────
  return (
    <div className="space-y-6" style={{ maxWidth: '600px' }}>
      <div className="card" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontWeight: 700, fontSize: '1.15rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>
          💬 Conectar WhatsApp Bot
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Conecta tu número de WhatsApp Business para que Amelia responda automáticamente a tus clientes.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Phone Number ID <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              className="input-field"
              value={phoneNumId}
              onChange={e => setPhoneNumId(e.target.value)}
              placeholder="123456789012345"
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
              En Meta for Developers → WhatsApp → API Setup → Phone Number ID
            </p>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Access Token <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              className="input-field"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="EAAxxxxxx..."
              rows={3}
              style={{ fontFamily: 'monospace', fontSize: '0.8rem', resize: 'vertical' }}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
              Token temporal (24h) o token permanente de System User
            </p>
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Número de teléfono (opcional)
            </label>
            <input
              className="input-field"
              value={displayPhone}
              onChange={e => setDisplayPhone(e.target.value)}
              placeholder="+56912345678"
            />
          </div>

          <div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              WhatsApp Business Account ID (opcional)
            </label>
            <input
              className="input-field"
              value={wabaId}
              onChange={e => setWabaId(e.target.value)}
              placeholder="123456789012345"
            />
          </div>

          {error   && <div className="alert-error">{error}</div>}
          {success && (
            <div style={{
              background: '#dcfce7', color: '#15803d', border: '1px solid #86efac',
              borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.875rem'
            }}>
              {success}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%' }}>
            {saving ? 'Guardando...' : 'Conectar WhatsApp'}
          </button>
        </form>
      </div>

      {/* Guía rápida */}
      <div className="card" style={{ padding: '1.5rem' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
          📖 Cómo obtener tus credenciales
        </h3>
        <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <li>Ve a <strong>developers.facebook.com</strong> → tu app → WhatsApp → API Setup</li>
          <li>Copia el <strong>Phone Number ID</strong> y el <strong>Temporary access token</strong></li>
          <li>Pégalos arriba y guarda</li>
          <li>
            Configura el webhook en Meta con:<br/>
            <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
              URL: {typeof window !== 'undefined' ? window.location.origin : ''}/api/whatsapp/webhook
            </span>
          </li>
          <li>Activa el campo <strong>messages</strong> en las suscripciones del webhook</li>
          <li>¡Listo! Amelia responderá automáticamente usando el contexto de tu negocio</li>
        </ol>
        <div style={{
          marginTop: '1rem', padding: '0.75rem', borderRadius: '8px',
          background: 'var(--bg-elevated)', fontSize: '0.8rem', color: 'var(--text-muted)'
        }}>
          💡 El token temporal dura 24h. Para producción, crea un <strong>System User</strong> en
          Meta Business Suite y genera un token permanente.
        </div>
      </div>
    </div>
  )
}
