'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface Booking {
  id: string; service_name: string; client_name: string
  client_phone: string; client_email: string | null
  booking_date: string; booking_time: string; duration_min: number
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  notes: string | null; created_at: string
}

interface ClientProfile {
  client_name: string; client_phone: string | null
  notes: string | null; allergies: string | null; preferences: string | null
  last_service: string | null; updated_at: string
}

interface ClientHistory {
  id: string; service_name: string; service_date: string; notes: string | null
}

const STATUS = {
  confirmed: { bg: 'rgba(99,102,241,0.15)',  color: '#a5b4fc', label: 'Confirmada' },
  completed: { bg: 'rgba(16,185,129,0.15)',  color: '#6ee7b7', label: 'Completada' },
  cancelled: { bg: 'rgba(239,68,68,0.12)',   color: '#fca5a5', label: 'Cancelada'  },
  no_show:   { bg: 'rgba(245,158,11,0.15)',  color: '#fcd34d', label: 'No asistió' },
}
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_S = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

export default function ReservasClient({ businessId }: { businessId: string }) {
  const [bookings,   setBookings]   = useState<Booking[]>([])
  const [loading,    setLoading]    = useState(true)
  const [view,       setView]       = useState<'lista'|'calendario'>('lista')
  const [filter,     setFilter]     = useState<'all'|'confirmed'|'completed'|'cancelled'>('all')
  const [selected,   setSelected]   = useState<Booking | null>(null)
  const [today]  = useState(() => new Date())
  const [month,      setMonth]      = useState(today.getMonth())
  const [year,       setYear]       = useState(today.getFullYear())
  // Notificaciones
  const [newCount,   setNewCount]   = useState(0)
  const [toasts,     setToasts]     = useState<{id:string;name:string;service:string}[]>([])
  const lastCount    = useRef(0)
  const pollTimer    = useRef<ReturnType<typeof setInterval>|null>(null)
  // Panel cliente
  const [profile,    setProfile]    = useState<ClientProfile | null>(null)
  const [history,    setHistory]    = useState<ClientHistory[]>([])
  const [editNotes,  setEditNotes]  = useState('')
  const [editAllerg, setEditAllerg] = useState('')
  const [editPref,   setEditPref]   = useState('')
  const [savingNotes,setSavingNotes]= useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [historyNote,setHistoryNote]= useState('')

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const from = new Date(year, month, 1).toISOString().slice(0,10)
    const to   = new Date(year, month+1, 0).toISOString().slice(0,10)
    const r    = await fetch(`/api/bookings?business_id=${businessId}&from=${from}&to=${to}`)
    const d    = await r.json()
    const newBookings: Booking[] = d.bookings ?? []

    // Detectar nuevas reservas (polling)
    if (silent && newBookings.length > lastCount.current) {
      const diff = newBookings.length - lastCount.current
      const newest = newBookings.slice(0, diff)
      setNewCount(prev => prev + diff)
      newest.forEach(b => {
        setToasts(prev => [...prev, { id: b.id, name: b.client_name, service: b.service_name }])
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== b.id)), 6000)
      })
    }
    lastCount.current = newBookings.length
    setBookings(newBookings)
    if (!silent) setLoading(false)
  }, [businessId, month, year])

  useEffect(() => { load() }, [load])

  // Polling cada 30s para notificaciones
  useEffect(() => {
    pollTimer.current = setInterval(() => load(true), 30000)
    return () => { if (pollTimer.current) clearInterval(pollTimer.current) }
  }, [load])

  // Cargar perfil del cliente cuando se selecciona una reserva con email
  useEffect(() => {
    if (selected?.client_email) {
      setProfile(null); setHistory([])
      fetch(`/api/client-notes?business_id=${businessId}&email=${encodeURIComponent(selected.client_email)}`)
        .then(r => r.json())
        .then(d => {
          setProfile(d.profile)
          setHistory(d.history ?? [])
          setEditNotes(d.profile?.notes ?? '')
          setEditAllerg(d.profile?.allergies ?? '')
          setEditPref(d.profile?.preferences ?? '')
        })
    } else {
      setProfile(null); setHistory([])
    }
  }, [selected, businessId])

  const saveNotes = async () => {
    if (!selected?.client_email) return
    setSavingNotes(true)
    await fetch('/api/client-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id:  businessId,
        client_email: selected.client_email,
        client_name:  selected.client_name,
        client_phone: selected.client_phone,
        notes:        editNotes,
        allergies:    editAllerg,
        preferences:  editPref,
        last_service: selected.service_name,
      }),
    })
    setNotesSaved(true); setSavingNotes(false)
    setTimeout(() => setNotesSaved(false), 2000)
  }

  const addHistoryEntry = async () => {
    if (!selected?.client_email || !historyNote.trim()) return
    await fetch('/api/client-notes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        business_id:  businessId,
        client_email: selected.client_email,
        booking_id:   selected.id,
        service_name: selected.service_name,
        service_date: selected.booking_date,
        notes:        historyNote,
      }),
    })
    setHistory(prev => [{ id: Date.now().toString(), service_name: selected.service_name,
      service_date: selected.booking_date, notes: historyNote }, ...prev])
    setHistoryNote('')
  }

  const updateStatus = async (id: string, status: string) => {
    await fetch('/api/bookings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ booking_id: id, status }),
    })
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: status as Booking['status'] } : b))
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status: status as Booking['status'] } : null)
  }

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const firstDay    = new Date(year, month, 1).getDay()
  const calCells    = Array.from({ length: Math.ceil((firstDay+daysInMonth)/7)*7 }, (_,i) => {
    const d = i - firstDay + 1; return d >= 1 && d <= daysInMonth ? d : null
  })
  const byDay = bookings.reduce((acc, b) => {
    const d = parseInt(b.booking_date.slice(8)); if (!acc[d]) acc[d] = []; acc[d].push(b); return acc
  }, {} as Record<number, Booking[]>)

  return (
    <div>
      {/* ── Toasts de nueva reserva ─────────────────────────── */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: 'var(--bg-surface)', border: '1px solid rgba(99,102,241,0.4)',
            borderRadius: 14, padding: '14px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', gap: 12, minWidth: 300,
            animation: 'slideInRight 0.3s ease-out',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(99,102,241,0.2)',
                           display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔔</div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                ¡Nueva reserva!
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>
                {t.name} · {t.service}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => { if (month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1) }}
                  className="btn-ghost text-sm py-1.5 px-3">←</button>
          <span className="font-semibold" style={{ color:'var(--text-primary)', minWidth:140, textAlign:'center', display:'block' }}>
            {MONTHS[month]} {year}
          </span>
          <button onClick={() => { if (month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1) }}
                  className="btn-ghost text-sm py-1.5 px-3">→</button>
        </div>
        <div className="flex items-center gap-2">
          {newCount > 0 && (
            <span onClick={() => setNewCount(0)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer"
                  style={{ background:'rgba(99,102,241,0.15)', color:'var(--accent-light)' }}>
              🔔 {newCount} nueva{newCount>1?'s':''}
            </span>
          )}
          <div className="flex rounded-lg overflow-hidden" style={{ background:'var(--bg-elevated)' }}>
            {(['lista','calendario'] as const).map(v=>(
              <button key={v} onClick={()=>setView(v)}
                      className="px-3 py-1.5 text-xs font-semibold transition-all capitalize"
                      style={{ background:view===v?'rgba(99,102,241,0.25)':'transparent',
                                color:view===v?'var(--accent-light)':'var(--text-muted)' }}>
                {v==='lista'?'☰ Lista':'📅 Calendario'}
              </button>
            ))}
          </div>
          <select value={filter} onChange={e=>setFilter(e.target.value as typeof filter)}
                  className="input-field py-1.5 px-3 text-xs" style={{ width:'auto' }}>
            <option value="all">Todas</option>
            <option value="confirmed">Confirmadas</option>
            <option value="completed">Completadas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor:'var(--accent)' }}/>
        </div>
      ) : (
        <>
          {/* LISTA */}
          {view==='lista'&&(
            <div className="space-y-2">
              {filtered.length===0?(
                <div className="card p-12 text-center">
                  <p className="text-3xl mb-3">📅</p>
                  <p className="font-medium" style={{ color:'var(--text-primary)' }}>Sin reservas este mes</p>
                  <p className="text-sm mt-1" style={{ color:'var(--text-muted)' }}>Las reservas aparecerán aquí automáticamente</p>
                </div>
              ):filtered.map(b=>{
                const st=STATUS[b.status]
                const dateObj=new Date(b.booking_date+'T12:00:00')
                const isNew=b.created_at&&(Date.now()-new Date(b.created_at).getTime())<86400000
                return(
                  <div key={b.id} className="card p-4 flex items-center gap-4 flex-wrap"
                       style={{ cursor:'pointer', borderColor: isNew ? 'rgba(99,102,241,0.35)' : undefined }}
                       onClick={()=>setSelected(b)}>
                    <div className="text-center shrink-0 w-12">
                      <p className="text-xs uppercase" style={{ color:'var(--text-muted)' }}>{DAYS_S[dateObj.getDay()]}</p>
                      <p className="text-xl font-bold" style={{ color:'var(--text-primary)' }}>{dateObj.getDate()}</p>
                    </div>
                    <div style={{ width:1, height:40, background:'var(--border)' }}/>
                    <div className="shrink-0 text-center">
                      <p className="font-mono text-base font-semibold" style={{ color:'var(--accent-light)' }}>{b.booking_time.slice(0,5)}</p>
                      <p className="text-xs" style={{ color:'var(--text-muted)' }}>{b.duration_min}min</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate" style={{ color:'var(--text-primary)' }}>{b.client_name}</p>
                        {isNew && (
                          <span style={{
                            fontSize:9, fontWeight:800, padding:'2px 7px', borderRadius:20,
                            background:'rgba(99,102,241,0.2)', color:'var(--accent-light)',
                            border:'1px solid rgba(99,102,241,0.35)', letterSpacing:'0.08em',
                            flexShrink:0,
                          }}>NUEVA</span>
                        )}
                      </div>
                      <p className="text-xs truncate" style={{ color:'var(--text-secondary)' }}>
                        {b.service_name} · {b.client_phone}
                        {b.client_email && <> · {b.client_email}</>}
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                          style={{ background:st.bg, color:st.color }}>{st.label}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* CALENDARIO */}
          {view==='calendario'&&(
            <div className="card overflow-hidden">
              <div className="grid grid-cols-7" style={{ borderBottom:'1px solid var(--border)' }}>
                {DAYS_S.map(d=><div key={d} className="py-2 text-center text-xs font-semibold" style={{ color:'var(--text-muted)' }}>{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {calCells.map((day,i)=>{
                  const db=day?(byDay[day]??[]):[]
                  const isT=day&&today.getDate()===day&&today.getMonth()===month&&today.getFullYear()===year
                  return(
                    <div key={i} style={{ minHeight:80, padding:6, borderRight:(i+1)%7!==0?'1px solid var(--border)':'none', borderBottom:i<calCells.length-7?'1px solid var(--border)':'none', background:!day?'rgba(0,0,0,0.02)':'transparent' }}>
                      {day&&(
                        <>
                          <p className="text-xs font-semibold mb-1" style={{ color:isT?'var(--accent-light)':'var(--text-muted)', background:isT?'rgba(99,102,241,0.15)':'transparent', width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>{day}</p>
                          {db.slice(0,3).map(b=>(
                            <div key={b.id} onClick={()=>setSelected(b)} className="text-xs px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer" style={{ background:STATUS[b.status].bg, color:STATUS[b.status].color }}>
                              {b.booking_time.slice(0,5)} {b.client_name.split(' ')[0]}
                            </div>
                          ))}
                          {db.length>3&&<p className="text-xs" style={{ color:'var(--text-muted)' }}>+{db.length-3}</p>}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── MODAL DETALLE + NOTAS CLIENTE ─────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background:'rgba(0,0,0,0.6)', backdropFilter:'blur(4px)' }}
             onClick={()=>setSelected(null)}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden"
               style={{ background:'var(--bg-surface)', border:'1px solid var(--border)', maxHeight:'90vh', overflowY:'auto' }}
               onClick={e=>e.stopPropagation()}>

            {/* Header modal */}
            <div className="p-6 flex items-start justify-between" style={{ borderBottom:'1px solid var(--border)' }}>
              <div>
                <h3 className="text-lg font-semibold" style={{ color:'var(--text-primary)' }}>{selected.client_name}</h3>
                <p className="text-sm" style={{ color:'var(--text-muted)' }}>{selected.service_name} · {selected.booking_date} {selected.booking_time.slice(0,5)}</p>
              </div>
              <button onClick={()=>setSelected(null)} className="btn-ghost py-1 px-2 text-xl">×</button>
            </div>

            <div className="p-6 space-y-5">
              {/* Info básica */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon:'📱', label:'Teléfono', value:selected.client_phone },
                  { icon:'✉️', label:'Email', value:selected.client_email??'—' },
                  { icon:'⏱', label:'Duración', value:`${selected.duration_min} min` },
                  { icon:'📅', label:'Estado', value:STATUS[selected.status].label },
                ].map((item,i)=>(
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-sm shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-xs" style={{ color:'var(--text-muted)' }}>{item.label}</p>
                      <p className="text-sm font-medium" style={{ color:'var(--text-secondary)' }}>{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Acciones de estado */}
              <div className="flex gap-2 flex-wrap">
                {selected.status==='confirmed'&&(
                  <>
                    <button onClick={()=>updateStatus(selected.id,'completed')} className="btn-primary text-sm py-2 flex-1">✓ Completada</button>
                    <button onClick={()=>updateStatus(selected.id,'no_show')} className="btn-ghost text-sm py-2">No asistió</button>
                    <button onClick={()=>updateStatus(selected.id,'cancelled')} className="text-sm py-2 px-3 rounded-xl" style={{ background:'rgba(239,68,68,0.1)', color:'#fca5a5', border:'none', cursor:'pointer' }}>Cancelar</button>
                  </>
                )}
                {selected.status!=='confirmed'&&(
                  <button onClick={()=>updateStatus(selected.id,'confirmed')} className="btn-ghost text-sm py-2 flex-1">↩ Restaurar</button>
                )}
              </div>

              {/* ── Perfil del cliente ──────────────────────── */}
              {selected.client_email && (
                <div style={{ borderTop:'1px solid var(--border)', paddingTop: 20 }}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold" style={{ color:'var(--text-primary)' }}>
                      👤 Perfil del cliente
                      {history.length > 0 && (
                        <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full"
                              style={{ background:'rgba(99,102,241,0.15)', color:'var(--accent-light)' }}>
                          {history.length} visita{history.length>1?'s':''}
                        </span>
                      )}
                    </h4>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color:'var(--text-muted)' }}>
                        📝 Notas del servicio
                      </label>
                      <textarea value={editNotes} onChange={e=>setEditNotes(e.target.value)} rows={3}
                                placeholder="Ej: Le encantó el corte clásico con tijera, prefiere sin máquina..."
                                className="input-field resize-none text-sm w-full"/>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color:'var(--text-muted)' }}>
                        ⚠️ Alergias / condiciones
                      </label>
                      <textarea value={editAllerg} onChange={e=>setEditAllerg(e.target.value)} rows={2}
                                placeholder="Ej: Alérgico al amoniaco, psoriasis en cuero cabelludo..."
                                className="input-field resize-none text-sm w-full"/>
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block" style={{ color:'var(--text-muted)' }}>
                        💡 Preferencias
                      </label>
                      <textarea value={editPref} onChange={e=>setEditPref(e.target.value)} rows={2}
                                placeholder="Ej: Le gusta la música clásica, no quiere hablar mucho..."
                                className="input-field resize-none text-sm w-full"/>
                    </div>
                    <button onClick={saveNotes} disabled={savingNotes}
                            className="btn-primary text-sm py-2 w-full">
                      {savingNotes ? 'Guardando...' : notesSaved ? '✓ Guardado' : '💾 Guardar notas'}
                    </button>
                  </div>

                  {/* Historial de visitas */}
                  {history.length > 0 && (
                    <div className="mt-4">
                      <h5 className="text-xs font-semibold mb-2" style={{ color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                        Historial de visitas
                      </h5>
                      <div className="space-y-2">
                        {history.map(h=>(
                          <div key={h.id} className="rounded-xl p-3" style={{ background:'var(--bg-elevated)' }}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold" style={{ color:'var(--text-secondary)' }}>{h.service_name}</span>
                              <span className="text-xs mono" style={{ color:'var(--text-muted)' }}>{h.service_date}</span>
                            </div>
                            {h.notes && <p className="text-xs" style={{ color:'var(--text-muted)' }}>{h.notes}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Agregar nota al historial */}
                  <div className="mt-3 flex gap-2">
                    <input value={historyNote} onChange={e=>setHistoryNote(e.target.value)}
                           placeholder="Ej: Corte navaja lateral, muy contento..."
                           className="input-field text-sm flex-1 py-2"/>
                    <button onClick={addHistoryEntry} disabled={!historyNote.trim()}
                            className="btn-ghost text-sm py-2 px-3">+ Agregar</button>
                  </div>
                </div>
              )}

              {!selected.client_email && (
                <div className="mt-2 p-3 rounded-xl text-xs" style={{ background:'rgba(245,158,11,0.08)', color:'#fcd34d' }}>
                  💡 El cliente no proporcionó email — las notas requieren email para identificar al cliente.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
