'use client'

import { useState } from 'react'

type Result = { sent: number; failed: number; total: number; message?: string } | null

function TriggerCard({
  icon, title, description, schedule, onRun,
}: {
  icon: string; title: string; description: string; schedule: string
  onRun: () => Promise<Result>
}) {
  const [loading, setLoading]   = useState(false)
  const [result,  setResult]    = useState<Result>(null)
  const [error,   setError]     = useState<string | null>(null)

  async function run() {
    setLoading(true); setResult(null); setError(null)
    try {
      const r = await onRun()
      setResult(r)
    } catch {
      setError('Error al ejecutar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: '1.25rem' }}>{icon}</span>
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {description}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>🕐 Automático:</span>
            <span className="mono text-xs" style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              padding: '1px 8px', borderRadius: 6, color: 'var(--text-secondary)',
            }}>
              {schedule}
            </span>
          </div>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="btn-primary text-sm shrink-0"
          style={{ fontFamily: 'inherit', opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}>
          {loading ? 'Enviando...' : '▶ Ejecutar ahora'}
        </button>
      </div>

      {result && (
        <div className="px-4 py-3 rounded-xl text-sm mt-2"
             style={{ background: 'rgba(110,231,183,0.08)', border: '1px solid rgba(110,231,183,0.2)' }}>
          {result.message ? (
            <p style={{ color: '#6ee7b7' }}>✓ {result.message}</p>
          ) : (
            <p style={{ color: '#6ee7b7' }}>
              ✓ {result.sent} email{result.sent !== 1 ? 's' : ''} enviado{result.sent !== 1 ? 's' : ''}
              {result.failed > 0 && (
                <span style={{ color: '#fcd34d' }}> · {result.failed} fallido{result.failed !== 1 ? 's' : ''}</span>
              )}
              <span style={{ color: 'rgba(110,231,183,0.6)' }}> (de {result.total} elegibles)</span>
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="alert-error text-sm mt-2">{error}</div>
      )}
    </div>
  )
}

async function triggerCron(type: 'recordatorios' | 'reactivacion'): Promise<Result> {
  const res = await fetch('/api/admin/trigger-cron', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type }),
  })
  if (!res.ok) throw new Error()
  return res.json()
}

export default function RecordatoriosPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <p className="text-sm mb-0.5" style={{ color: 'var(--text-muted)' }}>Comunicaciones</p>
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Recordatorios</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Los emails se envían automáticamente según el horario programado. Usa el botón para probar manualmente.
        </p>
      </div>

      <div className="space-y-4">
        <TriggerCard
          icon="📅"
          title="Recordatorio de citas"
          description="Envía un email a cada cliente con cita confirmada para mañana, recordándole el servicio, fecha y hora."
          schedule="Todos los días a las 11:00"
          onRun={() => triggerCron('recordatorios')}
        />

        <TriggerCard
          icon="💤"
          title="Reactivación de clientes"
          description="Envía un email a clientes que no han tenido cita en más de 30 días, invitándolos a agendar de nuevo."
          schedule="Todos los lunes a las 10:00"
          onRun={() => triggerCron('reactivacion')}
        />
      </div>

      <div className="mt-6 px-4 py-3 rounded-xl text-xs"
           style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                    color: 'var(--text-muted)', lineHeight: 1.7 }}>
        <strong style={{ color: 'var(--text-secondary)' }}>ℹ️ Nota:</strong> Solo se envían emails a negocios
        que tienen el módulo <strong>Recordatorios</strong> activado en su plan. Los clientes sin email
        registrado se omiten automáticamente.
      </div>
    </div>
  )
}
