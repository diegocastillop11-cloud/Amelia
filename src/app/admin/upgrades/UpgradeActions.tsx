'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  requestId: string
  businessId: string | null
  plan: string
}

export default function UpgradeActions({ requestId, businessId, plan }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function aprobar() {
    if (!businessId) return
    setLoading(true)
    const res = await fetch('/api/admin/set-plan', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ business_id: businessId, plan, upgrade_request_id: requestId }),
    })
    if (res.ok) router.refresh()
    setLoading(false)
  }

  if (!businessId) return null

  return (
    <button
      onClick={aprobar}
      disabled={loading}
      className="text-xs font-bold px-3 py-1.5 rounded-lg transition-opacity"
      style={{
        background: '#6366f1', color: 'white', border: 'none',
        cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1,
        fontFamily: 'inherit',
      }}>
      {loading ? 'Aprobando...' : `✓ Aprobar ${plan.toUpperCase()}`}
    </button>
  )
}
