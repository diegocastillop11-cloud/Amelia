'use client'

import { useEffect, useState } from 'react'
import AmeliaChat from '@/components/bookings/AmeliaChat'

interface Props {
  businessId:   string
  businessName: string
  color:        string
  services:     { name: string; price: string; description: string }[]
  hasBookings:  boolean
  isPremium?:   boolean
}

export default function SiteWithChat({ businessId, businessName, color, services, hasBookings, isPremium }: Props) {
  const [initialService, setInitialService] = useState<string | undefined>()
  const [chatOpen, setChatOpen] = useState(false)
  const [key, setKey] = useState(0)

  const shouldShow = hasBookings || isPremium

  useEffect(() => {
    if (!shouldShow) return

    // Exponer función global para SiteRenderer estándar
    ;(window as unknown as Record<string, unknown>).__ameliaOpen = (service?: string) => {
      setInitialService(service ?? undefined)
      setChatOpen(true)
      setKey(k => k + 1)
    }

    // Escuchar postMessage desde el iframe premium
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'amelia-open') {
        setInitialService(e.data.service ?? undefined)
        setChatOpen(true)
        setKey(k => k + 1)
      }
    }
    window.addEventListener('message', handleMessage)

    return () => {
      delete (window as unknown as Record<string, unknown>).__ameliaOpen
      window.removeEventListener('message', handleMessage)
    }
  }, [shouldShow])

  if (!shouldShow) return null

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
