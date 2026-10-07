'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function PersonalizacionClient({
  businessId, initialColor: _initialColor, initialLogo,
}: {
  businessId: string | null
  initialColor: string
  initialLogo: string | null
}) {
  const router = useRouter()
  const [logo, setLogo] = useState<string | null>(initialLogo)
  const logoRef = useRef<HTMLInputElement>(null)

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
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        El color y diseño del sitio web se configuran desde el <strong style={{ color: 'var(--accent-light)' }}>Editor visual</strong>.
      </p>

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
