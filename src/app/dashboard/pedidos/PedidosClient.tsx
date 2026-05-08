'use client'

import { useState } from 'react'

interface OrderItem { name: string; qty: number; price: number; promo_price?: number }
interface Order {
  id: string; client_name: string; client_phone: string | null; client_email: string | null
  client_note: string | null; items: OrderItem[]; subtotal: number; discount: number
  total: number; status: 'pending' | 'confirmed' | 'completed' | 'cancelled'; created_at: string
  delivery_type?: string; delivery_address?: string | null
  delivery_distance_km?: number | null; delivery_cost?: number
}

const STATUS_LABEL: Record<Order['status'], string> = {
  pending:   'Pendiente',
  confirmed: 'Confirmado',
  completed: 'Completado',
  cancelled: 'Cancelado',
}
const STATUS_COLOR: Record<Order['status'], string> = {
  pending:   'rgba(245,158,11,0.15)',
  confirmed: 'rgba(99,102,241,0.15)',
  completed: 'rgba(110,231,183,0.15)',
  cancelled: 'rgba(239,68,68,0.1)',
}
const STATUS_TEXT: Record<Order['status'], string> = {
  pending:   '#f59e0b',
  confirmed: '#a5b4fc',
  completed: '#6ee7b7',
  cancelled: '#f87171',
}
const NEXT_STATUS: Record<Order['status'], Order['status'] | null> = {
  pending:   'confirmed',
  confirmed: 'completed',
  completed: null,
  cancelled: null,
}
const NEXT_LABEL: Record<Order['status'], string> = {
  pending:   'Confirmar',
  confirmed: 'Completar',
  completed: '',
  cancelled: '',
}

export default function PedidosClient({ orders: init }: { orders: Order[] }) {
  const [orders,     setOrders]     = useState(init)
  const [expanded,   setExpanded]   = useState<string | null>(null)
  const [updating,   setUpdating]   = useState<string | null>(null)
  const [filter,     setFilter]     = useState<Order['status'] | 'all'>('all')

  const updateStatus = async (id: string, status: Order['status']) => {
    setUpdating(id)
    const r = await fetch(`/api/orders/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setUpdating(null)
    if (r.ok) setOrders(p => p.map(o => o.id === id ? { ...o, status } : o))
  }

  const cancel = async (id: string) => {
    if (!confirm('¿Cancelar este pedido?')) return
    await updateStatus(id, 'cancelled')
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const counts = {
    all: orders.length,
    pending: orders.filter(o=>o.status==='pending').length,
    confirmed: orders.filter(o=>o.status==='confirmed').length,
    completed: orders.filter(o=>o.status==='completed').length,
    cancelled: orders.filter(o=>o.status==='cancelled').length,
  }

  return (
    <div className="p-8 max-w-3xl">
      <div style={{ marginBottom:28 }}>
        <h1 className="text-2xl font-semibold" style={{ color:'var(--text-primary)' }}>Pedidos</h1>
        <p className="text-sm mt-0.5" style={{ color:'var(--text-muted)' }}>
          {counts.pending} pendiente{counts.pending!==1?'s':''} · {orders.length} total
        </p>
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', gap:6, marginBottom:20, flexWrap:'wrap' }}>
        {(['all','pending','confirmed','completed','cancelled'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)}
                  style={{ padding:'5px 14px', borderRadius:20, border:'none', cursor:'pointer',
                            fontFamily:'inherit', fontSize:12, fontWeight:600, transition:'all 0.15s',
                            background: filter===s ? 'var(--accent)' : 'var(--bg-elevated)',
                            color: filter===s ? 'white' : 'var(--text-muted)' }}>
            {s==='all' ? 'Todos' : STATUS_LABEL[s]} {counts[s] > 0 && `(${counts[s]})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign:'center', padding:'3rem 0', color:'var(--text-muted)' }}>
          <p style={{ fontSize:'2rem', marginBottom:8 }}>🛒</p>
          <p>{filter==='all' ? 'Sin pedidos todavía.' : `Sin pedidos ${STATUS_LABEL[filter as Order['status']]?.toLowerCase()}s.`}</p>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {filtered.map(o => {
          const isOpen = expanded === o.id
          const next   = NEXT_STATUS[o.status]
          const d      = new Date(o.created_at)
          const MESES  = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
          const date   = `${d.getDate()} ${MESES[d.getMonth()]}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
          return (
            <div key={o.id} className="card" style={{ overflow:'hidden' }}>
              {/* Row principal */}
              <div onClick={() => setExpanded(isOpen ? null : o.id)}
                   style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', cursor:'pointer' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                    <p style={{ margin:0, fontWeight:700, color:'var(--text-primary)', fontSize:14 }}>{o.client_name}</p>
                    <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                                    background:STATUS_COLOR[o.status], color:STATUS_TEXT[o.status] }}>
                      {STATUS_LABEL[o.status]}
                    </span>
                  </div>
                  <p style={{ margin:0, fontSize:12, color:'var(--text-muted)' }}>
                    {o.items.length} {o.items.length===1?'producto':'productos'} · {date}
                  </p>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <p style={{ margin:0, fontWeight:800, color:'var(--text-primary)', fontSize:15 }}>
                    ${o.total.toLocaleString('es-CL')}
                  </p>
                  {o.discount > 0 && (
                    <p style={{ margin:0, fontSize:11, color:'#6ee7b7' }}>−${o.discount.toLocaleString('es-CL')} dto.</p>
                  )}
                </div>
                <span style={{ color:'var(--text-muted)', fontSize:12 }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {/* Detalle expandido */}
              {isOpen && (
                <div style={{ padding:'0 16px 16px', borderTop:'1px solid var(--border)' }}>
                  {/* Items */}
                  <div style={{ marginTop:14, marginBottom:14 }}>
                    {o.items.map((item, i) => (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between',
                                             padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                        <span style={{ fontSize:13, color:'var(--text-secondary)' }}>
                          {item.name} <span style={{ color:'var(--text-muted)' }}>×{item.qty}</span>
                        </span>
                        <span style={{ fontSize:13, fontWeight:600, color:'var(--accent-light)' }}>
                          ${((item.promo_price ?? item.price) * item.qty).toLocaleString('es-CL')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Despacho */}
                  {o.delivery_type === 'delivery' && o.delivery_address && (
                    <div style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'10px 12px',
                                   borderRadius:8, background:'rgba(99,102,241,0.06)',
                                   border:'1px solid rgba(99,102,241,0.15)', marginBottom:10 }}>
                      <span style={{ fontSize:'1rem', flexShrink:0 }}>🚚</span>
                      <div style={{ flex:1 }}>
                        <p style={{ margin:'0 0 2px', fontSize:12, fontWeight:700, color:'var(--text-secondary)' }}>
                          Despacho a domicilio
                          {o.delivery_distance_km ? ` · ~${o.delivery_distance_km} km` : ''}
                          {(o.delivery_cost ?? 0) > 0 ? ` · $${(o.delivery_cost!).toLocaleString('es-CL')}` : ''}
                        </p>
                        <p style={{ margin:0, fontSize:12, color:'var(--text-muted)' }}>{o.delivery_address}</p>
                      </div>
                    </div>
                  )}

                  {/* Info cliente */}
                  <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:14 }}>
                    {o.client_phone && (
                      <a href={`tel:${o.client_phone}`} style={{ display:'flex', alignItems:'center', gap:5,
                          padding:'5px 12px', borderRadius:20, background:'var(--bg-elevated)',
                          color:'var(--text-secondary)', textDecoration:'none', fontSize:12 }}>
                        📞 {o.client_phone}
                      </a>
                    )}
                    {o.client_email && (
                      <a href={`mailto:${o.client_email}`} style={{ display:'flex', alignItems:'center', gap:5,
                          padding:'5px 12px', borderRadius:20, background:'var(--bg-elevated)',
                          color:'var(--text-secondary)', textDecoration:'none', fontSize:12 }}>
                        ✉️ {o.client_email}
                      </a>
                    )}
                    {o.client_note && (
                      <span style={{ padding:'5px 12px', borderRadius:20, background:'rgba(99,102,241,0.08)',
                                      color:'var(--text-muted)', fontSize:12, fontStyle:'italic' }}>
                        "{o.client_note}"
                      </span>
                    )}
                  </div>

                  {/* Acciones */}
                  <div style={{ display:'flex', gap:8 }}>
                    {next && (
                      <button onClick={() => updateStatus(o.id, next)} disabled={updating === o.id}
                              className="btn-primary" style={{ fontSize:12, padding:'7px 16px' }}>
                        {updating===o.id ? '...' : `✓ ${NEXT_LABEL[o.status]}`}
                      </button>
                    )}
                    {o.status !== 'cancelled' && o.status !== 'completed' && (
                      <button onClick={() => cancel(o.id)} disabled={updating === o.id}
                              style={{ padding:'7px 16px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)',
                                        background:'rgba(239,68,68,0.08)', color:'#f87171', cursor:'pointer',
                                        fontSize:12, fontFamily:'inherit' }}>
                        Cancelar pedido
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
