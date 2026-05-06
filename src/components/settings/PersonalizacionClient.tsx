'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const COLORS = ['#0ea5e9','#8b5cf6','#ec4899','#f97316','#22c55e','#ef4444','#14b8a6','#f59e0b','#6366f1','#1e40af']

export default function PersonalizacionClient({
  businessId, initialColor, initialLogo,
}: {
  businessId: string | null
  initialColor: string
  initialLogo: string | null
}) {
  const router = useRouter()
  const [color, setColor] = useState(initialColor)
  const [logo, setLogo] = useState<string | null>(initialLogo)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)

  const save = async (newColor: string, newLogo: string | null) => {
    if (!businessId) return
    setSaving(true); setSaved(false)
    await fetch('/api/save-site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: businessId, primary_color: newColor }),
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  const handleColor = (c: string) => { setColor(c); save(c, logo) }

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData(); fd.append('file', file); fd.append('type', 'logo')
    const r = await fetch('/api/upload-image', { method: 'POST', body: fd })
    const d = await r.json()
    if (!r.ok) { alert(d.error); return }
    setLogo(d.url)
    // También actualizar logo_url en businesses
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.from('businesses').update({ logo_url: d.url }).eq('id', businessId!)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
          Color principal
        </p>
        <div className="flex gap-3 flex-wrap">
          {COLORS.map(c => (
            <button key={c} onClick={() => handleColor(c)} disabled={saving}
                    style={{
                      width: 36, height: 36, borderRadius: 10, background: c, border: 'none',
                      cursor: 'pointer', outline: color === c ? '3px solid white' : 'none',
                      outlineOffset: 2, transform: color === c ? 'scale(1.2)' : 'scale(1)',
                      transition: 'all 0.15s', boxShadow: color === c ? `0 0 14px ${c}88` : 'none',
                    }} />
          ))}
        </div>
        {saved && <p className="text-xs mt-3" style={{ color: '#6ee7b7' }}>✓ Color guardado</p>}
        {saving && <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>Guardando...</p>}
      </div>

      <div className="card p-5">
        <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>Logo</p>
        <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
        <button onClick={() => logoRef.current?.click()}
                className="flex items-center gap-3 w-full p-3 rounded-xl transition-all"
                style={{ border: '2px dashed var(--border)', background: 'var(--bg-elevated)' }}>
          {logo
            ? <img src={logo} alt="" className="h-10 object-contain" />
            : <span className="text-2xl">🏷</span>}
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {logo ? 'Cambiar logo' : 'Subir logo'}
          </span>
        </button>
      </div>
    </div>
  )
}
