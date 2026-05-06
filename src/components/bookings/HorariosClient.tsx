'use client'

import { useState, useEffect } from 'react'

interface Schedule {
  day_of_week: number
  is_open: boolean
  open_time: string
  close_time: string
  slot_duration: number
}

const DAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
const DURATIONS = [15,20,30,45,60,90,120]

export default function HorariosClient({ businessId }: { businessId: string }) {
  const [schedules, setSchedules] = useState<Schedule[]>(
    Array.from({length: 7}, (_, i) => ({
      day_of_week: i,
      is_open: i >= 1 && i <= 5,
      open_time: '09:00',
      close_time: '18:00',
      slot_duration: 60,
    }))
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/schedules?business_id=${businessId}`)
      .then(r => r.json())
      .then(d => {
        if (d.schedules?.length > 0) {
          const map = new Map(d.schedules.map((s: Schedule) => [s.day_of_week, s]))
          setSchedules(prev => prev.map(s => (map.get(s.day_of_week) as Schedule) ?? s))
        }
      })
      .finally(() => setLoading(false))
  }, [businessId])

  const update = (i: number, patch: Partial<Schedule>) => {
    setSchedules(prev => prev.map((s, idx) => idx === i ? { ...s, ...patch } : s))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const r = await fetch('/api/schedules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: businessId, schedules }),
    })
    if (r.ok) setSaved(true)
    setSaving(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--accent)' }} />
    </div>
  )

  return (
    <div className="space-y-3">
      {schedules.map((s, i) => (
        <div key={i} className="card p-4"
             style={{ opacity: s.is_open ? 1 : 0.5, transition: 'opacity 0.2s' }}>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Toggle abierto/cerrado */}
            <div className="flex items-center gap-3 w-36">
              <div onClick={() => update(i, { is_open: !s.is_open })}
                   className="shrink-0"
                   style={{ width: 38, height: 22, borderRadius: 11, position: 'relative',
                             cursor: 'pointer', background: s.is_open ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                             transition: 'background 0.2s' }}>
                <div style={{ width: 16, height: 16, background: 'white', borderRadius: '50%',
                               position: 'absolute', top: 3, transition: 'left 0.2s',
                               left: s.is_open ? 19 : 3 }} />
              </div>
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {DAYS[i]}
              </span>
            </div>

            {s.is_open ? (
              <>
                {/* Hora apertura */}
                <div className="flex items-center gap-2">
                  <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Abre</label>
                  <input type="time" value={s.open_time}
                         onChange={e => update(i, { open_time: e.target.value })}
                         className="input-field py-1.5 px-2 text-sm w-28" />
                </div>

                {/* Hora cierre */}
                <div className="flex items-center gap-2">
                  <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Cierra</label>
                  <input type="time" value={s.close_time}
                         onChange={e => update(i, { close_time: e.target.value })}
                         className="input-field py-1.5 px-2 text-sm w-28" />
                </div>

                {/* Duración del turno */}
                <div className="flex items-center gap-2">
                  <label className="text-xs" style={{ color: 'var(--text-muted)' }}>Turno</label>
                  <select value={s.slot_duration}
                          onChange={e => update(i, { slot_duration: Number(e.target.value) })}
                          className="input-field py-1.5 px-2 text-sm"
                          style={{ width: 100 }}>
                    {DURATIONS.map(d => (
                      <option key={d} value={d}>{d} min</option>
                    ))}
                  </select>
                </div>

                {/* Preview de slots */}
                <div className="flex-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {(() => {
                    const [oh, om] = s.open_time.split(':').map(Number)
                    const [ch, cm] = s.close_time.split(':').map(Number)
                    const total = (ch*60+cm - oh*60-om)
                    const slots = Math.floor(total / s.slot_duration)
                    return `${slots} turnos disponibles`
                  })()}
                </div>
              </>
            ) : (
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Cerrado</span>
            )}
          </div>
        </div>
      ))}

      <div className="flex items-center justify-between pt-2">
        {saved && (
          <span className="text-sm flex items-center gap-2" style={{ color: '#10b981' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
            Horarios guardados
          </span>
        )}
        <div className="flex-1"/>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? 'Guardando...' : 'Guardar horarios'}
        </button>
      </div>
    </div>
  )
}
