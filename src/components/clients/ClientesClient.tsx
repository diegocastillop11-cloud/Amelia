'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

interface Client {
  id: string
  email: string
  name: string
  phone: string | null
  notes: string | null
  last_visit: string | null
  total_visits: number
  created_at: string
}

function daysSince(date: string | null) {
  if (!date) return null
  return Math.floor((Date.now() - new Date(date).getTime()) / 86400000)
}

function formatDate(date: string | null) {
  if (!date) return '—'
  return new Date(date + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ClientesClient({
  clients, inactiveCount, businessId,
}: {
  clients: Client[]
  inactiveCount: number
  businessId: string
}) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const defaultTab = searchParams.get('tab') === 'inactivos' ? 'inactivos' : 'todos'

  const [tab, setTab] = useState(defaultTab)
  const [selected, setSelected] = useState<Client | null>(null)
  const [notes, setNotes]           = useState('')
  const [allergies, setAllergies]   = useState('')
  const [preferences, setPreferences] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [search, setSearch] = useState('')

  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)

  const filtered = clients.filter(c => {
    const matchTab = tab === 'inactivos'
      ? (!c.last_visit || c.last_visit < cutoff)
      : true
    const matchSearch = search
      ? c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase())
      : true
    return matchTab && matchSearch
  })

  const openClient = async (c: Client) => {
    setSelected(c); setNotesSaved(false)
    setNotes(''); setAllergies(''); setPreferences('')
    setLoadingBookings(true)
    const [bookingsRes, profileRes] = await Promise.all([
      fetch(`/api/clients/${c.id}/bookings?business_id=${businessId}`),
      fetch(`/api/client-notes?business_id=${businessId}&email=${encodeURIComponent(c.email)}`),
    ])
    const { bookings: bks } = await bookingsRes.json()
    const { profile } = await profileRes.json()
    setBookings(bks ?? [])
    setNotes(profile?.notes ?? '')
    setAllergies(profile?.allergies ?? '')
    setPreferences(profile?.preferences ?? '')
    setLoadingBookings(false)
  }

  const saveNotes = async () => {
    if (!selected) return
    setSavingNotes(true)
    await fetch('/api/client-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id: businessId,
        client_email: selected.email,
        client_name: selected.name,
        client_phone: selected.phone,
        notes, allergies, preferences,
      }),
    })
    setSavingNotes(false); setNotesSaved(true)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  return (
    <div className="flex gap-6" style={{ minHeight: 500 }}>

      {/* Lista */}
      <div className="flex-1 min-w-0">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 p-1 rounded-xl w-fit"
             style={{ background: 'var(--bg-elevated)' }}>
          {(['todos', 'inactivos'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
                    className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: tab === t ? 'var(--bg-surface)' : 'transparent',
                      color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
                      boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.2)' : 'none',
                    }}>
              {t === 'todos' ? `Todos (${clients.length})` : `Inactivos (${inactiveCount})`}
            </button>
          ))}
        </div>

        {/* Buscador */}
        <input value={search} onChange={e => setSearch(e.target.value)}
               placeholder="Buscar por nombre o email..."
               className="input-field mb-4" style={{ maxWidth: 320 }} />

        {/* Tabla */}
        {filtered.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
            {tab === 'inactivos' ? '🎉 Sin clientes inactivos' : 'Sin clientes aún'}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map(c => {
              const days = daysSince(c.last_visit)
              const inactive = days === null || days >= 30
              return (
                <button key={c.id} onClick={() => openClient(c)}
                        className="w-full text-left rounded-xl px-4 py-3 transition-all"
                        style={{
                          background: selected?.id === c.id ? 'rgba(99,102,241,0.1)' : 'var(--bg-surface)',
                          border: `1px solid ${selected?.id === c.id ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
                        }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold text-white"
                           style={{ background: 'var(--accent)' }}>
                        {c.name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {c.name}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                          {c.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs" style={{ color: inactive ? '#fcd34d' : '#6ee7b7' }}>
                        {days === null ? 'Sin visitas' : days === 0 ? 'Hoy' : `${days}d`}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {c.total_visits} visita{c.total_visits !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Panel detalle */}
      {selected && (
        <div className="w-80 shrink-0">
          <div className="card p-5 sticky top-4 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{selected.name}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{selected.email}</p>
                {selected.phone && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{selected.phone}</p>
                )}
              </div>
              <button onClick={() => setSelected(null)} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-elevated)' }}>
                <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {selected.total_visits}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Visitas</p>
              </div>
              <div className="rounded-lg p-3 text-center" style={{ background: 'var(--bg-elevated)' }}>
                <p className="text-sm font-semibold" style={{ color: daysSince(selected.last_visit) !== null && daysSince(selected.last_visit)! >= 30 ? '#fcd34d' : '#6ee7b7' }}>
                  {selected.last_visit ? formatDate(selected.last_visit) : '—'}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Última visita</p>
              </div>
            </div>

            {/* Perfil del cliente */}
            <div className="space-y-3">
              <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                Perfil del cliente
              </p>
              {[
                { label: '📝 Notas del servicio', value: notes, set: setNotes,
                  placeholder: 'Ej: prefiere tijera, sin máquina...' },
                { label: '⚠️ Alergias / condiciones', value: allergies, set: setAllergies,
                  placeholder: 'Ej: alérgico al amoniaco...' },
                { label: '💡 Preferencias', value: preferences, set: setPreferences,
                  placeholder: 'Ej: le gusta la música tranquila...' },
              ].map(({ label, value, set, placeholder }) => (
                <div key={label}>
                  <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <textarea value={value} onChange={e => set(e.target.value)}
                            rows={2} placeholder={placeholder}
                            className="input-field resize-none text-xs w-full" />
                </div>
              ))}
              <button onClick={saveNotes} disabled={savingNotes}
                      className="btn-primary w-full text-xs py-2">
                {savingNotes ? 'Guardando...' : notesSaved ? '✓ Guardado' : '💾 Guardar notas'}
              </button>
            </div>

            {/* Historial */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                Historial de citas
              </p>
              {loadingBookings ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cargando...</p>
              ) : bookings.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sin citas registradas</p>
              ) : (
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {bookings.map((b: BookingRow) => (
                    <div key={b.id} className="rounded-lg p-2.5"
                         style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                          {b.service_name}
                        </p>
                        <span className="text-xs px-1.5 py-0.5 rounded"
                              style={{
                                background: b.status === 'confirmed' ? 'rgba(16,185,129,0.1)' : b.status === 'cancelled' ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)',
                                color: b.status === 'confirmed' ? '#6ee7b7' : b.status === 'cancelled' ? '#fca5a5' : '#a5b4fc',
                              }}>
                          {b.status === 'confirmed' ? 'Confirmada' : b.status === 'cancelled' ? 'Cancelada' : 'Completada'}
                        </span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {formatDate(b.booking_date)} · {b.booking_time}
                      </p>
                      {b.notes && (
                        <p className="text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>
                          "{b.notes}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface BookingRow {
  id: string
  service_name: string
  booking_date: string
  booking_time: string
  status: string
  notes: string | null
}
