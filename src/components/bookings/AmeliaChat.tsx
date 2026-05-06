'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Message { role: 'user' | 'assistant'; content: string }
interface Service  { name: string; price: string; description?: string }
interface BookingData {
  service: string; date: string; time: string
  name: string; phone: string; email: string | null; notes?: string
}

interface Props {
  businessId:   string
  businessName: string
  services:     Service[]
  color:        string
  // Si viene de un clic en servicio o en botón CTA
  initialService?: string
  autoOpen?:       boolean
}

export default function AmeliaChat({
  businessId, businessName, services, color, initialService, autoOpen
}: Props) {
  const [open,     setOpen]     = useState(autoOpen ?? false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [booked,   setBooked]   = useState(false)
  const [lastBooking, setLastBooking] = useState<BookingData | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)
  const initialized = useRef(false)

  // Inicializar chat
  const initChat = useCallback(() => {
    if (initialized.current) return
    initialized.current = true
    const welcomeMsg = initialService
      ? `¡Hola! Soy Amelia, la asistente de **${businessName}** ✨\n\nVeo que te interesa el servicio de **${initialService}**. ¿Te gustaría agendar una hora para eso?`
      : `¡Hola! Soy Amelia, la asistente de **${businessName}** ✨\n\n¿En qué puedo ayudarte hoy?`
    setMessages([{ role: 'assistant', content: welcomeMsg }])
    // Si viene de un servicio, disparar automáticamente
    if (initialService) {
      setTimeout(() => sendMsg(`Quiero agendar el servicio de ${initialService}`, [{ role: 'assistant', content: welcomeMsg }]), 800)
    }
  }, [businessName, initialService])

  useEffect(() => {
    if (open && !initialized.current) {
      initChat()
      setTimeout(() => inputRef.current?.focus(), 400)
    }
  }, [open, initChat])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMsg = async (text: string, currentMessages?: Message[]) => {
    const msg = text.trim()
    if (!msg) return
    setInput('')
    setLoading(true)

    const msgs = currentMessages ?? messages
    const userMsg: Message = { role: 'user', content: msg }
    const newMessages = [...msgs, userMsg]
    setMessages(newMessages)

    try {
      const r = await fetch('/api/amelia-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          business_id:   businessId,
          business_name: businessName,
          services,
        }),
      })
      const data = await r.json()
      const assistantMsg: Message = { role: 'assistant', content: data.text }
      setMessages(prev => [...prev, assistantMsg])

      // Auto-plantilla cuando Amelia pide los datos de contacto
      const askingForData = /nombre|teléfono|correo/i.test(data.text) && !data.bookingData
      if (askingForData) {
        const tpl = 'Horario: \nNombre: \nTeléfono: \nCorreo: '
        setInput(tpl)
        setTimeout(() => {
          const el = inputRef.current
          if (el) { autoResize(el); el.focus(); el.setSelectionRange(9, 9) }
        }, 80)
      }

      // Confirmar reserva si la IA detectó datos completos
      if (data.bookingData) {
        const bd: BookingData = data.bookingData
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            business_id:  businessId,
            service_name: bd.service,
            client_name:  bd.name,
            client_phone: bd.phone,
            client_email: bd.email ?? null,
            booking_date: bd.date,
            booking_time: bd.time,
            notes:        bd.notes ?? null,
          }),
        })
        const bookRes = await res.json()
        if (bookRes.success) {
          setBooked(true)
          setLastBooking(bd)
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `✅ **¡Reserva confirmada!**\n\n📅 ${bd.date} a las ${bd.time}\n💇 ${bd.service}\n👤 ${bd.name} · ${bd.phone}\n\n¡Te esperamos! Si necesitas cambiar algo, contáctanos directamente.`,
          }])
        } else {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `⚠️ ${bookRes.error ?? 'No se pudo confirmar la reserva. Por favor elige otro horario.'}`,
          }])
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Lo siento, hubo un error. Intenta de nuevo.' }])
    } finally {
      setLoading(false)
    }
  }

  const send = () => { if (!loading && input.trim()) sendMsg(input) }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // Auto-resize textarea
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  // Render texto con **negrita** y saltos de línea
  const fmt = (text: string) =>
    text.split('\n').map((line, i, arr) => {
      const parts = line.split(/\*\*([^*]+)\*\*/)
      return (
        <span key={i}>
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
          {i < arr.length - 1 && <br />}
        </span>
      )
    })

  return (
    <>
      {/* ── Botón flotante ────────────────────────────── */}
      {!open && (
        <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 1000 }}>
          <button onClick={() => setOpen(true)} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: `linear-gradient(135deg, ${color}, ${color}cc)`,
            border: 'none', borderRadius: 50, cursor: 'pointer',
            padding: '14px 22px 14px 16px',
            boxShadow: `0 8px 32px ${color}55`,
            animation: 'pulse-btn 3s infinite',
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
            }}>✨</div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ margin: 0, color: 'white', fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                Reservar con Amelia
              </p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>
                Chat · Respuesta inmediata
              </p>
            </div>
          </button>
        </div>
      )}

      {/* ── Ventana de chat ───────────────────────────── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 420, height: 620, maxHeight: 'calc(100vh - 40px)',
          borderRadius: 24, overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.06)',
          display: 'flex', flexDirection: 'column',
          background: '#ffffff',
          animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        }}>

          {/* ── Header ──────────────────────────────── */}
          <div style={{
            background: `linear-gradient(135deg, ${color} 0%, ${color}ee 100%)`,
            padding: '16px 18px', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: '2px solid rgba(255,255,255,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, flexShrink: 0,
            }}>✨</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 800, color: 'white', fontSize: 15 }}>Amelia</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>
                Asistente de {businessName}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#86efac',
                             boxShadow: '0 0 6px #86efac' }} />
              <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>En línea</span>
            </div>
            <button onClick={() => setOpen(false)} style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
              cursor: 'pointer', fontSize: 18, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}>
              ×
            </button>
          </div>

          {/* ── Mensajes ────────────────────────────── */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '18px 16px',
            display: 'flex', flexDirection: 'column', gap: 12,
            background: '#f8f9fb',
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-end', gap: 8,
              }}>
                {m.role === 'assistant' && (
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: `${color}15`, border: `1.5px solid ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, flexShrink: 0,
                  }}>✨</div>
                )}
                <div style={{
                  maxWidth: '78%',
                  background: m.role === 'user'
                    ? `linear-gradient(135deg, ${color}, ${color}dd)`
                    : 'white',
                  color: m.role === 'user' ? 'white' : '#1f2937',
                  padding: '11px 15px',
                  borderRadius: m.role === 'user'
                    ? '20px 20px 4px 20px'
                    : '20px 20px 20px 4px',
                  fontSize: 14, lineHeight: 1.6,
                  boxShadow: m.role === 'user'
                    ? `0 4px 16px ${color}35`
                    : '0 2px 8px rgba(0,0,0,0.06)',
                }}>
                  {fmt(m.content)}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${color}15`,
                               border: `1.5px solid ${color}30`, display: 'flex', alignItems: 'center',
                               justifyContent: 'center', fontSize: 14 }}>✨</div>
                <div style={{ background: 'white', padding: '12px 16px', borderRadius: '20px 20px 20px 4px',
                               boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', gap: 4, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%', background: '#9ca3af',
                      animation: `bounce ${0.6 + i * 0.15}s ease-in-out infinite alternate`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Servicios como botones rápidos — solo al inicio */}
            {messages.length === 1 && !loading && !initialService && services.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <p style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>
                  ¿Qué servicio te interesa?
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {services.slice(0, 6).map(s => (
                    <button key={s.name}
                            onClick={() => sendMsg(`Quiero agendar: ${s.name}`)}
                            style={{
                              fontSize: 12, padding: '7px 13px', borderRadius: 50,
                              border: `1.5px solid ${color}30`,
                              background: `${color}08`, color,
                              cursor: 'pointer', fontFamily: 'inherit',
                              transition: 'all 0.15s', lineHeight: 1.3,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = `${color}18`; e.currentTarget.style.borderColor = color }}
                            onMouseLeave={e => { e.currentTarget.style.background = `${color}08`; e.currentTarget.style.borderColor = `${color}30` }}>
                      {s.name}{s.price ? ` · ${s.price}` : ''}
                    </button>
                  ))}
                  <button onClick={() => sendMsg('¿Cuáles son los horarios disponibles?')}
                          style={{
                            fontSize: 12, padding: '7px 13px', borderRadius: 50,
                            border: '1.5px solid #e5e7eb', background: '#f9fafb', color: '#6b7280',
                            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                          }}>
                    🕐 Ver horarios
                  </button>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── Input ───────────────────────────────── */}
          {!booked ? (
            <div style={{
              padding: '10px 14px', background: 'white',
              borderTop: '1px solid #f0f0f0', flexShrink: 0,
              display: 'flex', gap: 9, alignItems: 'flex-end',
            }}>
              <textarea
                ref={inputRef}
                value={input}
                rows={1}
                onChange={e => { setInput(e.target.value); autoResize(e.target) }}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu mensaje… (Enter para enviar)"
                disabled={loading}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: 18,
                  border: '1.5px solid #e5e7eb', outline: 'none',
                  fontSize: 14, fontFamily: 'inherit', lineHeight: 1.5,
                  background: '#f9fafb', color: '#111827',
                  resize: 'none', overflow: 'hidden', minHeight: 42, maxHeight: 120,
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = color)}
                onBlur={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
              />
              <button onClick={send} disabled={loading || !input.trim()}
                      style={{
                        width: 40, height: 40, borderRadius: '50%', border: 'none',
                        cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                        background: input.trim() && !loading
                          ? `linear-gradient(135deg, ${color}, ${color}cc)`
                          : '#e5e7eb',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s', flexShrink: 0, marginBottom: 1,
                        boxShadow: input.trim() && !loading ? `0 4px 14px ${color}40` : 'none',
                      }}>
                <svg width="17" height="17" fill="none" viewBox="0 0 24 24"
                     stroke={input.trim() && !loading ? 'white' : '#9ca3af'} strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
                </svg>
              </button>
            </div>
          ) : (
            <div style={{
              padding: '14px 18px', background: '#f0fdf4',
              borderTop: '1px solid #bbf7d0', flexShrink: 0, textAlign: 'center',
            }}>
              <p style={{ margin: 0, fontSize: 13, color: '#15803d', fontWeight: 600 }}>
                ✅ ¡Reserva confirmada! Te esperamos 🎉
              </p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse-btn {
          0%, 100% { box-shadow: 0 8px 32px ${color}55; }
          50% { box-shadow: 0 8px 48px ${color}80; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes bounce {
          from { transform: translateY(0); }
          to   { transform: translateY(-5px); }
        }
      `}</style>
    </>
  )
}
