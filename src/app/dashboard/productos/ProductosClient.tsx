'use client'

import { useState, useRef } from 'react'
import MapEmbed from '@/components/MapEmbed'
import { useRouter } from 'next/navigation'

interface Product {
  id: string; name: string; description: string | null
  price: number | null; image_url: string | null; created_at: string
  cost_price?: number | null; stock?: number | null; unit?: string | null
}
interface Promotion {
  id: string; name: string; type: 'percent' | 'fixed'; value: number
  applies_to: 'product' | 'all_products'; item_id: string | null; active: boolean
  start_at: string | null; end_at: string | null
}
interface PaymentInfo {
  bank_name?: string; account_type?: string; account_number?: string
  rut?: string; holder_name?: string
}
interface DeliverySettings {
  enabled?: boolean; price_per_km?: number; origin_address?: string
}
interface Props {
  products: Product[]; promotions: Promotion[]; businessId: string
  paymentInfo?: PaymentInfo; deliverySettings?: DeliverySettings
}

export default function ProductosClient({ products: init, promotions: initPromos, businessId, paymentInfo: initPayment, deliverySettings: initDelivery }: Props) {
  const router = useRouter()
  const [products,   setProducts]   = useState(init)
  const [promos,     setPromos]     = useState(initPromos)
  const [tab,        setTab]        = useState<'productos'|'promociones'|'config'>('productos')
  // Config: datos de pago + despacho
  const [payment,    setPayment]    = useState<PaymentInfo>(initPayment ?? {})
  const [delivery,   setDelivery]   = useState<DeliverySettings>(initDelivery ?? { enabled:false, price_per_km:1000, origin_address:'' })
  const [configSaving, setConfigSaving] = useState(false)
  const [configSaved,  setConfigSaved]  = useState(false)
  // Dirección origen: calle + comuna separadas
  const splitOrigin = (addr: string) => {
    const parts = addr.split(',').map(s => s.trim())
    if (parts.length >= 3) return { street: parts.slice(0, -2).join(', '), commune: parts[parts.length - 2], region: parts[parts.length - 1] }
    if (parts.length === 2) return { street: parts[0], commune: parts[1], region: '' }
    return { street: addr, commune: '', region: '' }
  }
  const { street: initStreet, commune: initCommune, region: initRegion } = splitOrigin(initDelivery?.origin_address ?? '')
  const [originStreet,  setOriginStreet]  = useState(initStreet)
  const [originCommune, setOriginCommune] = useState(initCommune)
  const [originRegion,  setOriginRegion]  = useState(initRegion)
  const [originCoords,  setOriginCoords]  = useState<{ lat: number; lng: number } | null>(null)
  const [originMapLoading, setOriginMapLoading] = useState(false)
  const [originMapErr,  setOriginMapErr]  = useState('')
  const originFull = [originStreet.trim(), originCommune.trim(), originRegion.trim()].filter(Boolean).join(', ')

  const previewOrigin = async () => {
    if (!originFull) return
    setOriginMapLoading(true); setOriginMapErr(''); setOriginCoords(null)
    const r = await fetch(`/api/geocode/preview?address=${encodeURIComponent(originFull)}`)
    const d = await r.json()
    setOriginMapLoading(false)
    if (!r.ok) setOriginMapErr(d.error ?? 'Dirección no encontrada')
    else setOriginCoords({ lat: d.lat, lng: d.lng })
  }

  // ── Nuevo producto ──────────────────────────────────────────────────────────
  const [showForm, setShowForm]     = useState(false)
  const [pName,    setPName]        = useState('')
  const [pDesc,    setPDesc]        = useState('')
  const [pPrice,   setPPrice]       = useState('')
  const [pCost,    setPCost]        = useState('')
  const [pStock,   setPStock]       = useState('')
  const [pUnit,    setPUnit]        = useState('unidad')
  const [pImg,     setPImg]         = useState<string | null>(null)
  const [imgUploading, setImgUploading] = useState(false)
  const [saving,   setSaving]       = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const uploadImg = async (file: File) => {
    setImgUploading(true)
    const fd = new FormData(); fd.append('file', file); fd.append('type', 'gallery')
    const r = await fetch('/api/upload-image', { method: 'POST', body: fd })
    const d = await r.json()
    setImgUploading(false)
    if (r.ok) setPImg(d.url)
  }

  const saveProduct = async () => {
    if (!pName.trim()) return
    setSaving(true)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { data, error } = await supabase.from('products').insert({
      business_id: businessId, name: pName.trim(),
      description: pDesc.trim() || null,
      price: pPrice ? parseFloat(pPrice) : null,
      cost_price: pCost ? parseFloat(pCost) : null,
      stock: pStock !== '' ? parseInt(pStock) : null,
      unit: pUnit || 'unidad',
      image_url: pImg,
    }).select().single()
    setSaving(false)
    if (!error && data) {
      setProducts(p => [data as Product, ...p])
      setPName(''); setPDesc(''); setPPrice(''); setPCost(''); setPStock(''); setPUnit('unidad'); setPImg(null); setShowForm(false)
    }
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('¿Eliminar este producto?')) return
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.from('products').delete().eq('id', id)
    setProducts(p => p.filter(x => x.id !== id))
  }

  const updateStock = async (id: string, delta: number) => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const prod = products.find(p => p.id === id)
    if (!prod) return
    const newStock = Math.max(0, (prod.stock ?? 0) + delta)
    await supabase.from('products').update({ stock: newStock }).eq('id', id)
    setProducts(p => p.map(x => x.id === id ? { ...x, stock: newStock } : x))
  }

  const setStockDirect = async (id: string, value: number) => {
    const v = Math.max(0, isNaN(value) ? 0 : value)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.from('products').update({ stock: v }).eq('id', id)
    setProducts(p => p.map(x => x.id === id ? { ...x, stock: v } : x))
  }

  // ── Nueva promoción ─────────────────────────────────────────────────────────
  const [showPromoForm, setShowPromoForm] = useState(false)
  const [prName,    setPrName]    = useState('')
  const [prType,    setPrType]    = useState<'percent' | 'fixed'>('percent')
  const [prValue,   setPrValue]   = useState('')
  const [prApplies, setPrApplies] = useState<'all_products' | 'product'>('all_products')
  const [prItem,    setPrItem]    = useState('')
  const [prEnd,     setPrEnd]     = useState('')
  const [promoSaving, setPromoSaving] = useState(false)

  const savePromo = async () => {
    if (!prName.trim() || !prValue) return
    setPromoSaving(true)
    const r = await fetch('/api/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: prName.trim(), type: prType, value: Number(prValue),
        applies_to: prApplies, item_id: prApplies === 'product' ? prItem : null,
        end_at: prEnd || null,
      }),
    })
    const data = await r.json()
    setPromoSaving(false)
    if (r.ok) {
      setPromos(p => [data, ...p])
      setPrName(''); setPrValue(''); setPrEnd(''); setShowPromoForm(false)
    }
  }

  const togglePromo = async (id: string, active: boolean) => {
    await fetch(`/api/promotions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !active }),
    })
    setPromos(p => p.map(x => x.id === id ? { ...x, active: !active } : x))
  }

  const deletePromo = async (id: string) => {
    if (!confirm('¿Eliminar esta promoción?')) return
    await fetch(`/api/promotions/${id}`, { method: 'DELETE' })
    setPromos(p => p.filter(x => x.id !== id))
  }

  const saveConfig = async () => {
    setConfigSaving(true)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.from('businesses').update({
      payment_info:      payment,
      delivery_settings: delivery,
    }).eq('id', businessId)
    setConfigSaving(false)
    setConfigSaved(true)
    setTimeout(() => setConfigSaved(false), 2500)
  }

  const S: React.CSSProperties = { color: 'var(--text-muted)', fontSize: '0.75rem',
    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'block' }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 className="text-2xl font-semibold" style={{ color:'var(--text-primary)' }}>Productos</h1>
          <p className="text-sm mt-0.5" style={{ color:'var(--text-muted)' }}>
            {products.length} productos · {promos.filter(p=>p.active).length} promo{promos.filter(p=>p.active).length!==1?'s':''} activas
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, marginBottom:24, background:'var(--bg-elevated)',
                     borderRadius:10, padding:4, width:'fit-content' }}>
        {(['productos','promociones','config'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
                  style={{ padding:'7px 18px', borderRadius:8, border:'none', cursor:'pointer',
                            fontFamily:'inherit', fontSize:13, fontWeight:600, transition:'all 0.15s',
                            background: tab===t ? 'var(--accent)' : 'transparent',
                            color: tab===t ? 'white' : 'var(--text-muted)' }}>
            {t==='productos' ? '📦 Productos' : t==='promociones' ? '🏷️ Promociones' : '⚙️ Configuración'}
          </button>
        ))}
      </div>

      {/* ═══ TAB PRODUCTOS ═══ */}
      {tab === 'productos' && (
        <div>
          <button onClick={() => setShowForm(v => !v)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8,
                            border:'1.5px dashed rgba(99,102,241,0.4)', background:'rgba(99,102,241,0.04)',
                            color:'var(--accent-light)', fontWeight:600, fontSize:13,
                            cursor:'pointer', fontFamily:'inherit', marginBottom:16, transition:'all 0.15s' }}>
            {showForm ? '− Cancelar' : '+ Agregar producto'}
          </button>

          {showForm && (
            <div className="card p-5 mb-4" style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={S}>Nombre *</label>
                  <input value={pName} onChange={e=>setPName(e.target.value)} placeholder="Ej: Torta de chocolate"
                         className="input-field" />
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={S}>Descripción</label>
                  <textarea value={pDesc} onChange={e=>setPDesc(e.target.value)} rows={2}
                             placeholder="Descripción breve..." className="input-field" style={{ resize:'none' }} />
                </div>
                <div>
                  <label style={S}>Precio venta (CLP)</label>
                  <input type="number" value={pPrice} onChange={e=>setPPrice(e.target.value)}
                         placeholder="0" min="0" className="input-field" />
                </div>
                <div>
                  <label style={S}>Precio costo (CLP)</label>
                  <input type="number" value={pCost} onChange={e=>setPCost(e.target.value)}
                         placeholder="0" min="0" className="input-field" />
                  {pPrice && pCost && parseFloat(pPrice) > 0 && (
                    <p style={{ margin:'4px 0 0', fontSize:11, color:'#6ee7b7' }}>
                      Margen: {Math.round((1 - parseFloat(pCost)/parseFloat(pPrice))*100)}%
                    </p>
                  )}
                </div>
                <div>
                  <label style={S}>Stock inicial</label>
                  <input type="number" value={pStock} onChange={e=>setPStock(e.target.value)}
                         placeholder="Sin límite" min="0" className="input-field" />
                </div>
                <div>
                  <label style={S}>Unidad de medida</label>
                  <select value={pUnit} onChange={e=>setPUnit(e.target.value)} className="input-field">
                    <option value="unidad">Unidad</option>
                    <option value="kg">Kilogramo (kg)</option>
                    <option value="g">Gramo (g)</option>
                    <option value="litro">Litro (L)</option>
                    <option value="ml">Mililitro (ml)</option>
                    <option value="docena">Docena</option>
                    <option value="caja">Caja</option>
                    <option value="paquete">Paquete</option>
                    <option value="metro">Metro</option>
                    <option value="hora">Hora</option>
                    <option value="porcion">Porción</option>
                  </select>
                </div>
                <div>
                  <label style={S}>Imagen</label>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }}
                         onChange={e => { const f=e.target.files?.[0]; if(f) uploadImg(f) }} />
                  {pImg
                    ? <div style={{ position:'relative', width:'100%', height:80, borderRadius:8, overflow:'hidden' }}>
                        <img src={pImg} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        <button onClick={()=>setPImg(null)}
                                style={{ position:'absolute', top:4, right:4, width:22, height:22, borderRadius:'50%',
                                          border:'none', background:'rgba(0,0,0,0.7)', color:'white',
                                          cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
                      </div>
                    : <button onClick={()=>fileRef.current?.click()} disabled={imgUploading}
                               style={{ width:'100%', padding:'11px', borderRadius:8, border:'1.5px dashed rgba(255,255,255,0.12)',
                                         background:'var(--bg-elevated)', color:'var(--text-muted)', cursor:'pointer',
                                         fontFamily:'inherit', fontSize:12 }}>
                        {imgUploading ? 'Subiendo...' : '📷 Subir imagen'}
                      </button>
                  }
                </div>
              </div>
              <button onClick={saveProduct} disabled={saving || !pName.trim()}
                      className="btn-primary" style={{ alignSelf:'flex-start' }}>
                {saving ? 'Guardando...' : 'Guardar producto'}
              </button>
            </div>
          )}

          {products.length === 0 && !showForm && (
            <div style={{ textAlign:'center', padding:'3rem 0', color:'var(--text-muted)' }}>
              <p style={{ fontSize:'2rem', marginBottom:8 }}>📦</p>
              <p>Sin productos aún. Agrega el primero.</p>
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {products.map(p => {
              const activePromo = promos.find(pr => pr.active && (pr.applies_to === 'all_products' || (pr.applies_to === 'product' && pr.item_id === p.id)))
              const margin = (p.price && p.cost_price && p.price > 0)
                ? Math.round((1 - p.cost_price / p.price) * 100) : null
              const stockColor = p.stock == null ? 'var(--text-muted)'
                : p.stock === 0 ? '#f87171' : p.stock <= 3 ? '#f59e0b' : '#6ee7b7'
              const unitLabel = p.unit && p.unit !== 'unidad' ? ` ${p.unit}` : ''
              return (
                <div key={p.id} className="card" style={{ overflow:'hidden' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px' }}>
                    {p.image_url
                      ? <img src={p.image_url} style={{ width:52, height:52, borderRadius:8, objectFit:'cover', flexShrink:0 }} />
                      : <div style={{ width:52, height:52, borderRadius:8, background:'rgba(99,102,241,0.1)',
                                       display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.25rem', flexShrink:0 }}>📦</div>
                    }
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:0, fontWeight:600, color:'var(--text-primary)', fontSize:14 }}>{p.name}</p>
                      {p.description && <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--text-muted)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{p.description}</p>}
                      <div style={{ display:'flex', gap:10, marginTop:4, flexWrap:'wrap', alignItems:'center' }}>
                        {p.price != null && (
                          <span style={{ fontWeight:700, color:'var(--accent-light)', fontSize:13 }}>
                            ${p.price.toLocaleString('es-CL')}
                          </span>
                        )}
                        {p.cost_price != null && (
                          <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                            costo ${p.cost_price.toLocaleString('es-CL')}{unitLabel ? ` / ${p.unit}` : ''}
                          </span>
                        )}
                        {margin !== null && (
                          <span style={{ fontSize:11, fontWeight:700, color:'#6ee7b7' }}>
                            {margin}% margen
                          </span>
                        )}
                        {activePromo && (
                          <span style={{ fontSize:11, fontWeight:700, background:'rgba(239,68,68,0.15)',
                                          color:'#f87171', padding:'1px 7px', borderRadius:20 }}>
                            {activePromo.type==='percent' ? `−${activePromo.value}%` : `−$${activePromo.value.toLocaleString('es-CL')}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, flexShrink:0 }}>
                      {/* Stock control */}
                      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <span style={{ fontSize:11, color:'var(--text-muted)', marginRight:2 }}>
                          Stock{unitLabel}:
                        </span>
                        <button onClick={()=>updateStock(p.id, -1)} disabled={p.stock === 0}
                                style={{ width:22, height:22, borderRadius:5, border:'1px solid var(--border)',
                                          background:'var(--bg-elevated)', color:'var(--text-muted)',
                                          cursor: p.stock === 0 ? 'not-allowed' : 'pointer',
                                          fontSize:13, lineHeight:1, fontFamily:'inherit' }}>−</button>
                        <input
                          type="number" min="0"
                          value={p.stock ?? ''}
                          placeholder="∞"
                          onChange={e => setProducts(prev => prev.map(x => x.id === p.id ? { ...x, stock: e.target.value === '' ? null : parseInt(e.target.value) } : x))}
                          onBlur={e => {
                            if (e.target.value === '') return
                            setStockDirect(p.id, parseInt(e.target.value))
                          }}
                          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                          style={{ width:48, height:22, borderRadius:5, border:`1px solid var(--border)`,
                                    background:'var(--bg-elevated)', color:stockColor,
                                    fontSize:13, fontWeight:700, textAlign:'center',
                                    fontFamily:'inherit', outline:'none', padding:0 }}
                        />
                        <button onClick={()=>updateStock(p.id, 1)}
                                style={{ width:22, height:22, borderRadius:5, border:'1px solid var(--border)',
                                          background:'var(--bg-elevated)', color:'var(--text-muted)',
                                          cursor:'pointer', fontSize:13, lineHeight:1, fontFamily:'inherit' }}>+</button>
                      </div>
                      <button onClick={()=>deleteProduct(p.id)}
                              style={{ padding:'4px 10px', borderRadius:6, border:'1px solid rgba(239,68,68,0.3)',
                                        background:'rgba(239,68,68,0.08)', color:'#f87171',
                                        cursor:'pointer', fontSize:11, fontFamily:'inherit' }}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══ TAB PROMOCIONES ═══ */}
      {tab === 'promociones' && (
        <div>
          <button onClick={() => setShowPromoForm(v => !v)}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:8,
                            border:'1.5px dashed rgba(99,102,241,0.4)', background:'rgba(99,102,241,0.04)',
                            color:'var(--accent-light)', fontWeight:600, fontSize:13,
                            cursor:'pointer', fontFamily:'inherit', marginBottom:16 }}>
            {showPromoForm ? '− Cancelar' : '+ Crear promoción'}
          </button>

          {showPromoForm && (
            <div className="card p-5 mb-4" style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={S}>Nombre de la promoción</label>
                  <input value={prName} onChange={e=>setPrName(e.target.value)}
                         placeholder="Ej: Descuento de verano" className="input-field" />
                </div>
                <div>
                  <label style={S}>Tipo de descuento</label>
                  <select value={prType} onChange={e=>setPrType(e.target.value as 'percent'|'fixed')}
                          className="input-field">
                    <option value="percent">Porcentaje (%)</option>
                    <option value="fixed">Monto fijo (CLP)</option>
                  </select>
                </div>
                <div>
                  <label style={S}>{prType === 'percent' ? 'Descuento (%)' : 'Descuento ($)'}</label>
                  <input type="number" value={prValue} onChange={e=>setPrValue(e.target.value)}
                         placeholder={prType==='percent' ? '20' : '5000'} min="0" className="input-field" />
                </div>
                <div>
                  <label style={S}>Aplica a</label>
                  <select value={prApplies} onChange={e=>setPrApplies(e.target.value as typeof prApplies)}
                          className="input-field">
                    <option value="all_products">Todos los productos</option>
                    <option value="product">Un producto específico</option>
                  </select>
                </div>
                {prApplies === 'product' && (
                  <div>
                    <label style={S}>Producto</label>
                    <select value={prItem} onChange={e=>setPrItem(e.target.value)} className="input-field">
                      <option value="">Seleccionar...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={S}>Válida hasta (opcional)</label>
                  <input type="date" value={prEnd} onChange={e=>setPrEnd(e.target.value)} className="input-field" />
                </div>
              </div>
              <button onClick={savePromo} disabled={promoSaving || !prName.trim() || !prValue}
                      className="btn-primary" style={{ alignSelf:'flex-start' }}>
                {promoSaving ? 'Guardando...' : 'Crear promoción'}
              </button>
            </div>
          )}

          {promos.length === 0 && !showPromoForm && (
            <div style={{ textAlign:'center', padding:'3rem 0', color:'var(--text-muted)' }}>
              <p style={{ fontSize:'2rem', marginBottom:8 }}>🏷️</p>
              <p>Sin promociones. Crea una para atraer más clientes.</p>
            </div>
          )}

          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {promos.map(pr => (
              <div key={pr.id} className="card" style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px' }}>
                <div style={{ width:42, height:42, borderRadius:10, background: pr.active ? 'rgba(239,68,68,0.12)' : 'var(--bg-elevated)',
                               display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.25rem', flexShrink:0 }}>
                  🏷️
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontWeight:600, color:'var(--text-primary)', fontSize:14 }}>{pr.name}</p>
                  <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--text-muted)' }}>
                    {pr.type==='percent' ? `${pr.value}% de descuento` : `$${pr.value.toLocaleString('es-CL')} de descuento`}
                    {' · '}
                    {pr.applies_to==='all_products' ? 'Todos los productos' : (products.find(p=>p.id===pr.item_id)?.name ?? 'Producto específico')}
                    {pr.end_at ? ` · Hasta ${new Date(pr.end_at).toLocaleDateString('es-CL')}` : ''}
                  </p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div onClick={()=>togglePromo(pr.id, pr.active)}
                       style={{ width:38, height:22, borderRadius:11, position:'relative', cursor:'pointer',
                                 background: pr.active ? '#6366f1' : 'rgba(255,255,255,0.1)', transition:'background 0.2s' }}>
                    <div style={{ width:16, height:16, background:'white', borderRadius:8, position:'absolute',
                                   top:3, transition:'left 0.2s', left: pr.active ? 19 : 3 }} />
                  </div>
                  <button onClick={()=>deletePromo(pr.id)}
                          style={{ padding:'4px 10px', borderRadius:6, border:'1px solid rgba(239,68,68,0.3)',
                                    background:'rgba(239,68,68,0.08)', color:'#f87171',
                                    cursor:'pointer', fontSize:11, fontFamily:'inherit' }}>
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ TAB CONFIGURACIÓN ═══ */}
      {tab === 'config' && (
        <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

          {/* Datos de transferencia */}
          <div className="card p-5">
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
              <span style={{ fontSize:'1.25rem' }}>🏦</span>
              <div>
                <p style={{ margin:0, fontWeight:700, color:'var(--text-primary)', fontSize:14 }}>Datos de transferencia</p>
                <p style={{ margin:0, fontSize:12, color:'var(--text-muted)' }}>Se envían al cliente cuando confirmas su pedido</p>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label style={S}>Banco</label>
                <input value={payment.bank_name??''} onChange={e=>setPayment(p=>({...p,bank_name:e.target.value}))}
                       placeholder="Ej: BancoEstado" className="input-field" />
              </div>
              <div>
                <label style={S}>Tipo de cuenta</label>
                <select value={payment.account_type??''} onChange={e=>setPayment(p=>({...p,account_type:e.target.value}))}
                        className="input-field">
                  <option value="">Seleccionar...</option>
                  <option>Cuenta Corriente</option>
                  <option>Cuenta Vista</option>
                  <option>Cuenta RUT</option>
                  <option>Chequera Electrónica</option>
                </select>
              </div>
              <div>
                <label style={S}>Número de cuenta</label>
                <input value={payment.account_number??''} onChange={e=>setPayment(p=>({...p,account_number:e.target.value}))}
                       placeholder="12345678" className="input-field" />
              </div>
              <div>
                <label style={S}>RUT</label>
                <input value={payment.rut??''} onChange={e=>setPayment(p=>({...p,rut:e.target.value}))}
                       placeholder="12.345.678-9" className="input-field" />
              </div>
              <div style={{ gridColumn:'1/-1' }}>
                <label style={S}>Nombre del titular</label>
                <input value={payment.holder_name??''} onChange={e=>setPayment(p=>({...p,holder_name:e.target.value}))}
                       placeholder="Juan Pérez" className="input-field" />
              </div>
            </div>
          </div>

          {/* Configuración de despacho */}
          <div className="card p-5">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:'1.25rem' }}>🚚</span>
                <div>
                  <p style={{ margin:0, fontWeight:700, color:'var(--text-primary)', fontSize:14 }}>Despacho a domicilio</p>
                  <p style={{ margin:0, fontSize:12, color:'var(--text-muted)' }}>Los clientes podrán pedir despacho al hacer su pedido</p>
                </div>
              </div>
              <div onClick={()=>setDelivery(d=>({...d,enabled:!d.enabled}))}
                   style={{ width:42, height:24, borderRadius:12, position:'relative', cursor:'pointer',
                             background: delivery.enabled ? 'var(--accent)' : 'rgba(255,255,255,0.1)', transition:'background 0.2s' }}>
                <div style={{ width:18, height:18, background:'white', borderRadius:9, position:'absolute',
                               top:3, transition:'left 0.2s', left: delivery.enabled ? 21 : 3 }} />
              </div>
            </div>

            {delivery.enabled && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                {/* Calle */}
                <div>
                  <label style={S}>Calle y número de tu local</label>
                  <input value={originStreet}
                         onChange={e=>{ setOriginStreet(e.target.value); setOriginCoords(null); setDelivery(d=>({...d,origin_address:[e.target.value.trim(),originCommune.trim(),originRegion.trim()].filter(Boolean).join(', ')})) }}
                         placeholder="Ej: Grumete Briceño 0380" className="input-field" />
                </div>
                {/* Comuna + botón mapa */}
                <div>
                  <label style={S}>Comuna</label>
                  <div style={{ display:'flex', gap:8 }}>
                    <input value={originCommune}
                           onChange={e=>{ setOriginCommune(e.target.value); setOriginCoords(null); setDelivery(d=>({...d,origin_address:[originStreet.trim(),e.target.value.trim(),originRegion.trim()].filter(Boolean).join(', ')})) }}
                           placeholder="Ej: La Florida" className="input-field" style={{ flex:1 }} />
                    <button type="button" onClick={previewOrigin}
                            disabled={originMapLoading || !originStreet.trim() || !originCommune.trim() || !originRegion.trim()}
                            className="btn-secondary"
                            style={{ whiteSpace:'nowrap', flexShrink:0, padding:'0 14px' }}>
                      {originMapLoading ? '...' : '🗺 Ver'}
                    </button>
                  </div>
                </div>
                {/* Región */}
                <div style={{ gridColumn:'1/-1' }}>
                  <label style={S}>Región</label>
                  <select value={originRegion}
                          onChange={e=>{ setOriginRegion(e.target.value); setOriginCoords(null); setDelivery(d=>({...d,origin_address:[originStreet.trim(),originCommune.trim(),e.target.value.trim()].filter(Boolean).join(', ')})) }}
                          className="input-field" style={{ cursor:'pointer' }}>
                    <option value="">Selecciona región</option>
                    {['Arica y Parinacota','Tarapacá','Antofagasta','Atacama','Coquimbo',
                      'Valparaíso','Metropolitana de Santiago','O\'Higgins','Maule',
                      'Ñuble','Biobío','La Araucanía','Los Ríos','Los Lagos',
                      'Aysén','Magallanes'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                {/* Error mapa */}
                {originMapErr && (
                  <div style={{ gridColumn:'1/-1', fontSize:12, color:'#f87171' }}>{originMapErr}</div>
                )}
                {/* Mapa OSM */}
                {originCoords && (
                  <div style={{ gridColumn:'1/-1', borderRadius:10, overflow:'hidden',
                                 border:'1px solid var(--border)' }}>
                    <p style={{ margin:0, padding:'6px 12px', fontSize:11, fontWeight:700,
                                 color:'var(--text-muted)', background:'var(--bg-elevated)',
                                 textTransform:'uppercase', letterSpacing:'0.06em' }}>
                      📍 Confirma que el punto es correcto
                    </p>
                    <MapEmbed lat={originCoords.lat} lng={originCoords.lng} height={220} />
                  </div>
                )}
                {/* Precio por km */}
                <div>
                  <label style={S}>Precio por km ($)</label>
                  <input type="number" min="0" value={delivery.price_per_km??1000}
                         onChange={e=>setDelivery(d=>({...d,price_per_km:Number(e.target.value)}))}
                         className="input-field" />
                </div>
                <div style={{ display:'flex', alignItems:'center', padding:'10px 14px', borderRadius:8,
                               background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.15)' }}>
                  <p style={{ margin:0, fontSize:12, color:'var(--text-muted)', lineHeight:1.5 }}>
                    Ejemplo: 5 km × ${(delivery.price_per_km??1000).toLocaleString('es-CL')} = <strong style={{ color:'var(--accent-light)' }}>${((delivery.price_per_km??1000)*5).toLocaleString('es-CL')}</strong> de despacho
                  </p>
                </div>
              </div>
            )}
          </div>

          <button onClick={saveConfig} disabled={configSaving}
                  className="btn-primary" style={{ alignSelf:'flex-start' }}>
            {configSaving ? 'Guardando...' : configSaved ? '✓ Guardado' : 'Guardar configuración'}
          </button>
        </div>
      )}
    </div>
  )
}
