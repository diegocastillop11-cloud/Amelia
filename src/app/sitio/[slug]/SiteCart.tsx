'use client'

import { useEffect, useState, useCallback } from 'react'

interface CartItem {
  id: string; name: string; price: number
  promo_price?: number; qty: number; image?: string | null
}
interface CheckoutState { name: string; phone: string; email: string; note: string }
interface DeliveryInfo { distanceKm: number; cost: number }

export interface DeliverySettings {
  enabled: boolean; price_per_km: number; origin_address: string
}

interface Props {
  slug: string; color: string; businessId: string
  deliverySettings?: DeliverySettings
}

export default function SiteCart({ slug, color, deliverySettings }: Props) {
  const [cart,         setCart]         = useState<CartItem[]>([])
  const [open,         setOpen]         = useState(false)
  const [checkout,     setCheckout]     = useState(false)
  const [form,         setForm]         = useState<CheckoutState>({ name:'', phone:'', email:'', note:'' })
  const [sending,      setSending]      = useState(false)
  const [done,         setDone]         = useState(false)
  const [err,          setErr]          = useState('')
  // Delivery
  const [deliveryType, setDeliveryType] = useState<'pickup'|'delivery'>('pickup')
  const [address,      setAddress]      = useState('')
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null)
  const [calcLoading,  setCalcLoading]  = useState(false)
  const [calcErr,      setCalcErr]      = useState('')

  const deliveryEnabled = !!(deliverySettings?.enabled && deliverySettings?.origin_address)

  useEffect(() => {
    const KEY = `ac-${slug}`
    try { setCart(JSON.parse(localStorage.getItem(KEY) || '[]')) } catch {}
    const handler = (e: Event) => setCart((e as CustomEvent<CartItem[]>).detail)
    window.addEventListener('amelia-cart-update', handler)
    return () => window.removeEventListener('amelia-cart-update', handler)
  }, [slug])

  const productTotal = cart.reduce((s, i) => s + (i.promo_price ?? i.price) * i.qty, 0)
  const deliveryCost = deliveryType === 'delivery' ? (deliveryInfo?.cost ?? 0) : 0
  const total        = productTotal + deliveryCost
  const count        = cart.reduce((s, i) => s + i.qty, 0)

  const updateQty = useCallback((id: string, delta: number) => {
    const KEY = `ac-${slug}`
    setCart(prev => {
      const next = prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0)
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
      window.dispatchEvent(new CustomEvent('amelia-cart-update', { detail: next }))
      return next
    })
  }, [slug])

  const clear = useCallback(() => {
    try { localStorage.removeItem(`ac-${slug}`) } catch {}
    setCart([])
  }, [slug])

  const calcDelivery = async () => {
    if (!address.trim()) { setCalcErr('Ingresa tu dirección'); return }
    if (!deliverySettings?.origin_address) return
    setCalcLoading(true); setCalcErr(''); setDeliveryInfo(null)
    try {
      const r = await fetch(
        `/api/geocode?origin=${encodeURIComponent(deliverySettings.origin_address)}&destination=${encodeURIComponent(address)}&pricePerKm=${deliverySettings.price_per_km ?? 1000}`
      )
      const d = await r.json()
      if (!r.ok) { setCalcErr(d.error ?? 'No se pudo calcular'); }
      else setDeliveryInfo({ distanceKm: d.distanceKm, cost: d.cost })
    } catch { setCalcErr('Error de conexión') }
    setCalcLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setErr('El nombre es requerido'); return }
    if (deliveryType === 'delivery' && !deliveryInfo) { setErr('Calcula el costo de despacho primero'); return }
    setSending(true); setErr('')
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug, clientName: form.name.trim(),
          clientPhone: form.phone.trim() || null,
          clientEmail: form.email.trim() || null,
          clientNote: form.note.trim() || null,
          items: cart,
          deliveryType,
          deliveryAddress:    deliveryType === 'delivery' ? address.trim() : null,
          deliveryDistanceKm: deliveryType === 'delivery' ? deliveryInfo?.distanceKm : null,
          deliveryCost:       deliveryType === 'delivery' ? deliveryInfo?.cost : 0,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDone(true); clear()
        setForm({ name:'', phone:'', email:'', note:'' })
        setDeliveryInfo(null); setAddress('')
      } else {
        setErr('Error al enviar el pedido.')
      }
    } catch { setErr('Error de conexión.') }
    setSending(false)
  }

  if (count === 0 && !open) return null

  const bg = '#1a1a24'; const border = 'rgba(255,255,255,0.08)'; const fg = '#f1f1f5'; const muted = '#8b8fa8'
  const inputStyle: React.CSSProperties = {
    width:'100%', padding:'10px 12px', borderRadius:8, border:`1.5px solid ${border}`,
    background:'rgba(255,255,255,0.05)', color:fg, fontSize:13,
    fontFamily:'inherit', outline:'none', boxSizing:'border-box',
  }
  const labelStyle: React.CSSProperties = {
    display:'block', fontSize:11, fontWeight:700, color:muted,
    textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:5,
  }

  return (
    <>
      {/* Botón flotante */}
      <button onClick={() => { setOpen(true); setCheckout(false); setDone(false) }}
        style={{ position:'fixed', bottom:'1.5rem', left:'1.5rem', zIndex:9990,
                  width:56, height:56, borderRadius:'50%', border:'none',
                  background:color, color:'white', cursor:'pointer',
                  boxShadow:`0 6px 24px ${color}55`, display:'flex',
                  alignItems:'center', justifyContent:'center', fontSize:'1.375rem',
                  transition:'transform 0.15s' }}
        onMouseOver={e=>(e.currentTarget.style.transform='scale(1.08)')}
        onMouseOut={e=>(e.currentTarget.style.transform='')}>
        🛒
        {count > 0 && (
          <span style={{ position:'absolute', top:-4, right:-4, background:'#ef4444',
                          color:'white', fontSize:11, fontWeight:800,
                          width:20, height:20, borderRadius:'50%',
                          display:'flex', alignItems:'center', justifyContent:'center',
                          border:'2px solid white' }}>{count}</span>
        )}
      </button>

      {/* Backdrop */}
      {open && <div onClick={()=>setOpen(false)}
        style={{ position:'fixed', inset:0, zIndex:9991, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)' }} />}

      {/* Drawer */}
      <div style={{ position:'fixed', top:0, right:0, bottom:0, zIndex:9992,
                     width:'100%', maxWidth:420, background:bg, borderLeft:`1px solid ${border}`,
                     display:'flex', flexDirection:'column',
                     transform: open ? 'translateX(0)' : 'translateX(100%)',
                     transition:'transform 0.3s cubic-bezier(0.32,0,0.15,1)',
                     boxShadow: open ? '-20px 0 60px rgba(0,0,0,0.4)' : 'none' }}>

        {/* Header */}
        <div style={{ padding:'1.25rem 1.5rem', borderBottom:`1px solid ${border}`,
                       display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ margin:0, fontWeight:700, fontSize:'1rem', color:fg }}>
              {done ? '¡Pedido enviado!' : checkout ? 'Finalizar pedido' : 'Mi carrito'}
            </p>
            {!done && !checkout && count > 0 && (
              <p style={{ margin:0, fontSize:12, color:muted }}>{count} {count===1?'producto':'productos'}</p>
            )}
          </div>
          <button onClick={()=>setOpen(false)}
            style={{ background:'rgba(255,255,255,0.06)', border:`1px solid ${border}`, color:fg,
                      width:32, height:32, borderRadius:'50%', cursor:'pointer', fontSize:14,
                      display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'1.25rem 1.5rem' }}>

          {/* Éxito */}
          {done && (
            <div style={{ textAlign:'center', padding:'2rem 0' }}>
              <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>✅</div>
              <p style={{ fontWeight:700, color:fg, margin:'0 0 0.5rem', fontSize:'1.125rem' }}>¡Pedido recibido!</p>
              <p style={{ color:muted, fontSize:'0.9375rem', lineHeight:1.6, margin:'0 0 1.5rem' }}>
                El negocio revisará tu pedido. Si dejaste tu email, recibirás los datos de pago cuando sea confirmado.
              </p>
              <button onClick={()=>{ setOpen(false); setDone(false); setCheckout(false) }}
                style={{ background:color, color:'white', border:'none', padding:'10px 28px',
                          borderRadius:10, fontWeight:700, cursor:'pointer', fontSize:14, fontFamily:'inherit' }}>
                Cerrar
              </button>
            </div>
          )}

          {/* Vacío */}
          {!done && cart.length === 0 && (
            <div style={{ textAlign:'center', padding:'3rem 0', color:muted }}>
              <p style={{ fontSize:'2rem', marginBottom:'0.75rem' }}>🛒</p>
              <p style={{ margin:0 }}>Tu carrito está vacío</p>
            </div>
          )}

          {/* Items */}
          {!done && !checkout && cart.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {cart.map(item => (
                <div key={item.id} style={{ display:'flex', gap:12, padding:'12px 0', borderBottom:`1px solid ${border}` }}>
                  {item.image
                    ? <img src={item.image} alt={item.name} style={{ width:56, height:56, borderRadius:8, objectFit:'cover', flexShrink:0 }} />
                    : <div style={{ width:56, height:56, borderRadius:8, background:`${color}18`, flexShrink:0,
                                     display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.25rem' }}>📦</div>
                  }
                  <div style={{ flex:1 }}>
                    <p style={{ margin:'0 0 2px', fontWeight:600, fontSize:'0.875rem', color:fg }}>{item.name}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      {item.promo_price != null && item.promo_price !== item.price && (
                        <span style={{ fontSize:12, color:muted, textDecoration:'line-through' }}>
                          ${item.price.toLocaleString('es-CL')}
                        </span>
                      )}
                      <span style={{ fontSize:'0.875rem', fontWeight:700, color: item.promo_price != null ? '#6ee7b7' : color }}>
                        ${(item.promo_price ?? item.price).toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                    <button onClick={()=>updateQty(item.id,-1)} style={{ width:26, height:26, borderRadius:'50%', border:`1px solid ${border}`, background:'rgba(255,255,255,0.04)', color:fg, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                    <span style={{ fontSize:13, fontWeight:700, color:fg, minWidth:16, textAlign:'center' }}>{item.qty}</span>
                    <button onClick={()=>updateQty(item.id,1)} style={{ width:26, height:26, borderRadius:'50%', border:`1px solid ${border}`, background:'rgba(255,255,255,0.04)', color:fg, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Checkout */}
          {!done && checkout && (
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>

              {/* Tipo de entrega */}
              {deliveryEnabled && (
                <div>
                  <label style={labelStyle}>Tipo de entrega</label>
                  <div style={{ display:'flex', gap:8 }}>
                    {(['pickup','delivery'] as const).map(t => (
                      <button key={t} type="button" onClick={()=>{ setDeliveryType(t); setDeliveryInfo(null); setCalcErr('') }}
                        style={{ flex:1, padding:'10px 8px', borderRadius:8, border:`1.5px solid ${deliveryType===t ? color : border}`,
                                  background: deliveryType===t ? `${color}18` : 'rgba(255,255,255,0.03)',
                                  color: deliveryType===t ? fg : muted, fontFamily:'inherit', cursor:'pointer',
                                  fontSize:12, fontWeight:600, transition:'all 0.15s' }}>
                        {t==='pickup' ? '🏪 Retiro en local' : '🚚 Despacho'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dirección de despacho */}
              {deliveryType === 'delivery' && deliveryEnabled && (
                <div style={{ padding:14, borderRadius:10, background:'rgba(99,102,241,0.06)', border:`1px solid rgba(99,102,241,0.2)` }}>
                  <label style={labelStyle}>Dirección de despacho</label>
                  <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                    <input value={address} onChange={e=>{ setAddress(e.target.value); setDeliveryInfo(null) }}
                           placeholder="Ej: Av. Providencia 1234, Santiago"
                           style={{ ...inputStyle, flex:1 }} />
                    <button type="button" onClick={calcDelivery} disabled={calcLoading || !address.trim()}
                      style={{ padding:'10px 14px', borderRadius:8, border:'none', background:color,
                                color:'white', fontWeight:700, cursor:'pointer', fontSize:12,
                                fontFamily:'inherit', opacity: (!address.trim()||calcLoading) ? 0.6 : 1, whiteSpace:'nowrap' }}>
                      {calcLoading ? '...' : 'Calcular'}
                    </button>
                  </div>
                  {calcErr && <p style={{ margin:0, fontSize:12, color:'#f87171' }}>{calcErr}</p>}
                  {deliveryInfo && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px',
                                   borderRadius:8, background:'rgba(110,231,183,0.08)', border:'1px solid rgba(110,231,183,0.2)' }}>
                      <span style={{ fontSize:'1rem' }}>🚚</span>
                      <div>
                        <p style={{ margin:0, fontSize:13, fontWeight:700, color:'#6ee7b7' }}>
                          ~{deliveryInfo.distanceKm} km · ${deliveryInfo.cost.toLocaleString('es-CL')} de despacho
                        </p>
                        <p style={{ margin:0, fontSize:11, color:muted }}>
                          ${(deliverySettings?.price_per_km ?? 1000).toLocaleString('es-CL')}/km · estimado por distancia
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Datos del cliente */}
              {[
                { key:'name',  label:'Nombre *',      ph:'Tu nombre',       type:'text',  required:true  },
                { key:'phone', label:'Teléfono',       ph:'+56 9 1234 5678', type:'tel',   required:false },
                { key:'email', label:'Email',          ph:'tu@email.com',    type:'email', required:false },
                { key:'note',  label:'Nota (opcional)',ph:'Instrucciones...',type:'text',  required:false },
              ].map(f => (
                <div key={f.key}>
                  <label style={labelStyle}>{f.label}</label>
                  {f.key === 'note'
                    ? <textarea value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))}
                                placeholder={f.ph} rows={2}
                                style={{ ...inputStyle, resize:'none' }} />
                    : <input type={f.type} required={f.required} placeholder={f.ph}
                              value={form[f.key as keyof CheckoutState]}
                              onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                              style={inputStyle} />
                  }
                </div>
              ))}

              {/* Resumen de costos */}
              {(deliveryCost > 0 || cart.reduce((s,i)=>s+i.price*i.qty,0) !== productTotal) && (
                <div style={{ padding:'12px 14px', borderRadius:8, background:'rgba(255,255,255,0.04)', border:`1px solid ${border}` }}>
                  {cart.reduce((s,i)=>s+i.price*i.qty,0) !== productTotal && (
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                      <span style={{ fontSize:12, color:muted }}>Descuento aplicado</span>
                      <span style={{ fontSize:12, color:'#6ee7b7', fontWeight:600 }}>
                        −${(cart.reduce((s,i)=>s+i.price*i.qty,0)-productTotal).toLocaleString('es-CL')}
                      </span>
                    </div>
                  )}
                  {deliveryCost > 0 && (
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                      <span style={{ fontSize:12, color:muted }}>Despacho (~{deliveryInfo?.distanceKm} km)</span>
                      <span style={{ fontSize:12, color:fg }}>+${deliveryCost.toLocaleString('es-CL')}</span>
                    </div>
                  )}
                  <div style={{ display:'flex', justifyContent:'space-between', paddingTop:8, borderTop:`1px solid ${border}` }}>
                    <span style={{ fontSize:14, fontWeight:700, color:fg }}>Total a pagar</span>
                    <span style={{ fontSize:14, fontWeight:800, color:'#a5b4fc' }}>${total.toLocaleString('es-CL')}</span>
                  </div>
                </div>
              )}

              {err && <p style={{ color:'#f87171', fontSize:13, margin:0 }}>{err}</p>}
              <button type="submit" disabled={sending}
                style={{ background:color, color:'white', border:'none', padding:'13px',
                          borderRadius:10, fontWeight:700, fontSize:15, cursor:'pointer',
                          fontFamily:'inherit', opacity: sending ? 0.7 : 1 }}>
                {sending ? 'Enviando...' : `Confirmar pedido · $${total.toLocaleString('es-CL')}`}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        {!done && cart.length > 0 && (
          <div style={{ padding:'1.25rem 1.5rem', borderTop:`1px solid ${border}` }}>
            {!checkout && (
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                <span style={{ color:muted, fontSize:14 }}>Subtotal</span>
                <span style={{ fontWeight:800, fontSize:'1.125rem', color:fg }}>${productTotal.toLocaleString('es-CL')}</span>
              </div>
            )}
            {!checkout
              ? <button onClick={()=>setCheckout(true)}
                  style={{ width:'100%', padding:'13px', borderRadius:10, border:'none',
                            background:color, color:'white', fontWeight:700, fontSize:15,
                            cursor:'pointer', fontFamily:'inherit' }}>
                  Finalizar pedido →
                </button>
              : <button onClick={()=>setCheckout(false)}
                  style={{ width:'100%', padding:'10px', borderRadius:10, border:`1px solid ${border}`,
                            background:'transparent', color:muted, fontWeight:600, fontSize:13,
                            cursor:'pointer', fontFamily:'inherit' }}>
                  ← Volver al carrito
                </button>
            }
          </div>
        )}
      </div>
    </>
  )
}
