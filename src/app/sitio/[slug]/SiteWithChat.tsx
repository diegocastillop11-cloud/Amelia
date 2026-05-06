'use client'

import { useEffect, useState } from 'react'
import AmeliaChat from '@/components/bookings/AmeliaChat'

interface Props {
  businessId:   string
  businessName: string
  color:        string
  services:     { name: string; price: string; description: string }[]
  hasBookings:  boolean
}

export default function SiteWithChat({ businessId, businessName, color, services, hasBookings }: Props) {
  const [initialService, setInitialService] = useState<string | undefined>()
  const [chatOpen, setChatOpen] = useState(false)
  const [key, setKey] = useState(0)

  useEffect(() => {
    if (!hasBookings) return
    // Exponer función global para que el HTML del SiteRenderer pueda disparar el chat
    ;(window as unknown as Record<string, unknown>).__ameliaOpen = (service?: string) => {
      setInitialService(service ?? undefined)
      setChatOpen(true)
      setKey(k => k + 1) // re-mount para resetear si cambia el servicio
    }
    return () => {
      delete (window as unknown as Record<string, unknown>).__ameliaOpen
    }
  }, [hasBookings])

  if (!hasBookings) return null

  return (
    <AmeliaChat
      key={key}
      businessId={businessId}
      businessName={businessName}
      services={services}
      color={color}
      initialService={initialService}
      autoOpen={chatOpen}
    />
  )
}
