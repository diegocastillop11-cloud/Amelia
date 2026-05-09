'use client'

import { useState, useRef, useEffect, useCallback, Fragment } from 'react'
import AmeliaAvatar from '@/components/AmeliaAvatar'

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Encabezados
    if (line.startsWith('### ')) {
      elements.push(<p key={i} style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', margin: '0.75rem 0 0.25rem' }}>{inlineFormat(line.slice(4))}</p>)
    } else if (line.startsWith('## ')) {
      elements.push(<p key={i} style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', margin: '0.85rem 0 0.3rem' }}>{inlineFormat(line.slice(3))}</p>)
    } else if (line.startsWith('# ')) {
      elements.push(<p key={i} style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', margin: '1rem 0 0.35rem' }}>{inlineFormat(line.slice(2))}</p>)
    // Lista con - o •
    } else if (/^[-•*]\s/.test(line)) {
      elements.push(
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 2 }}>
          <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}>•</span>
          <span>{inlineFormat(line.replace(/^[-•*]\s/, ''))}</span>
        </div>
      )
    // Línea horizontal
    } else if (/^[-=_]{3,}$/.test(line.trim())) {
      elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '0.5rem 0' }} />)
    // Línea vacía
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: '0.4rem' }} />)
    // Párrafo normal
    } else {
      elements.push(<span key={i} style={{ display: 'block' }}>{inlineFormat(line)}</span>)
    }
    i++
  }
  return <>{elements}</>
}

function inlineFormat(text: string): React.ReactNode {
  // Soporta **bold**, *italic*, `code`
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} style={{ fontWeight: 700 }}>{part.slice(2, -2)}</strong>
        if (part.startsWith('*') && part.endsWith('*'))
          return <em key={i}>{part.slice(1, -1)}</em>
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={i} style={{ background: 'rgba(99,102,241,0.15)', padding: '1px 5px', borderRadius: 4, fontSize: '0.8em', fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>
        return <Fragment key={i}>{part}</Fragment>
      })}
    </>
  )
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  businessName: string | null
  businessCategory: string | null
}

const SUGERENCIAS: Record<string, string[]> = {
  default: [
    '¿Cuál es mi resumen de ventas del mes?',
    '¿Qué productos tienen bajo stock?',
    '¿Cuáles son mis clientes más frecuentes?',
    'Dame ideas para una promoción este mes',
  ],
  Barbería: [
    '¿Cuántas citas tuve este mes?',
    '¿Qué servicio se reserva más?',
    'Dame ideas para atraer clientes nuevos',
    '¿Qué debo publicar en Instagram esta semana?',
  ],
  Pastelería: [
    '¿Cuál es mi producto más vendido?',
    '¿Tengo stock suficiente para el fin de semana?',
    'Ayúdame a redactar un post para Instagram',
    '¿Cuánto gané neto este mes?',
  ],
  Restaurante: [
    '¿Cuáles son los pedidos pendientes?',
    '¿Cuánto facturé este mes?',
    'Dame ideas para un menú de temporada',
    '¿Qué productos están por agotarse?',
  ],
}

function getSugerencias(category: string | null): string[] {
  if (!category) return SUGERENCIAS.default
  for (const key of Object.keys(SUGERENCIAS)) {
    if (key !== 'default' && category.toLowerCase().includes(key.toLowerCase())) {
      return SUGERENCIAS[key]
    }
  }
  return SUGERENCIAS.default
}

export default function AsistenteClient({ businessName, businessCategory }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sugerencias = getSugerencias(businessCategory)

  const scrollToBottomIfNear = useCallback(() => {
    const el = scrollAreaRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    // Solo auto-scroll si el usuario está a menos de 120px del fondo
    if (distanceFromBottom < 120) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  // Al enviar un mensaje propio, siempre bajar
  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }, [])

  useEffect(() => {
    scrollToBottomIfNear()
  }, [streamingText, scrollToBottomIfNear])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setStreamingText('')
    scrollToBottom()

    try {
      const res = await fetch('/api/ai/asistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.ok || !res.body) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Error al conectar con el asistente. Intenta de nuevo.' }])
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        full += chunk
        setStreamingText(full)
      }

      setMessages(prev => [...prev, { role: 'assistant', content: full }])
      setStreamingText('')
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Ocurrió un error. Intenta nuevamente.' }])
    } finally {
      setLoading(false)
      setTimeout(() => textareaRef.current?.focus(), 100)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const isEmpty = messages.length === 0 && !streamingText

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: 760, margin: '0 auto', width: '100%' }}>

      {/* Header */}
      <div style={{ padding: '1.5rem 1.5rem 1rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <AmeliaAvatar size={44} style={{ boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }} />
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Amel<span style={{ color: 'var(--accent-light)' }}>IA</span>
            </h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              {businessName ? `Asistente de ${businessName}` : 'Tu asistente personal de negocio'}
            </p>
          </div>
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: 20, padding: '4px 10px',
          }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 600 }}>En línea</span>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollAreaRef} style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Empty state */}
        {isEmpty && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24, padding: '2rem 0' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}><AmeliaAvatar size={64} style={{ boxShadow: '0 8px 24px rgba(99,102,241,0.4)' }} /></div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                ¿En qué te ayudo hoy?
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: 340, lineHeight: 1.6 }}>
                Tengo acceso a todos tus datos: ventas, productos, clientes y citas. Pregúntame lo que necesites.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, width: '100%', maxWidth: 520 }}>
              {sugerencias.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)}
                  style={{
                    padding: '0.75rem 1rem', borderRadius: 12, textAlign: 'left',
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', fontSize: '0.8125rem', cursor: 'pointer',
                    transition: 'all 0.15s', lineHeight: 1.4,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(99,102,241,0.08)'
                    e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--bg-surface)'
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            alignItems: 'flex-start', gap: 10,
          }}>
            {msg.role === 'assistant' && <AmeliaAvatar size={32} />}
            <div style={{
              maxWidth: '78%',
              padding: '0.75rem 1rem',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'var(--bg-surface)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
              color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
              fontSize: '0.875rem', lineHeight: 1.65,
              wordBreak: 'break-word',
            }}>
              {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
            </div>
          </div>
        ))}

        {/* Streaming bubble */}
        {streamingText && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <AmeliaAvatar size={32} />
            <div style={{
              maxWidth: '78%', padding: '0.75rem 1rem',
              borderRadius: '18px 18px 18px 4px',
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              color: 'var(--text-primary)', fontSize: '0.875rem', lineHeight: 1.65,
              wordBreak: 'break-word',
            }}>
              {renderMarkdown(streamingText)}
              <span style={{
                display: 'inline-block', width: 8, height: 14, marginLeft: 3,
                background: 'var(--accent)', borderRadius: 2,
                animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom',
              }} />
            </div>
          </div>
        )}

        {/* Loading dots */}
        {loading && !streamingText && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <AmeliaAvatar size={32} />
            <div style={{
              padding: '0.875rem 1.1rem', borderRadius: '18px 18px 18px 4px',
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              display: 'flex', gap: 5, alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'var(--text-muted)',
                  animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ padding: '1rem 1.5rem 1.25rem', borderTop: '1px solid var(--border)' }}>
        {messages.length > 0 && !loading && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {sugerencias.slice(0, 2).map((s, i) => (
              <button key={i} onClick={() => sendMessage(s)}
                style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem',
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)'
                  e.currentTarget.style.color = 'var(--accent-light)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.color = 'var(--text-muted)'
                }}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta... (Enter para enviar)"
            disabled={loading}
            rows={1}
            style={{
              flex: 1, resize: 'none', padding: '0.75rem 1rem',
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 14, color: 'var(--text-primary)', fontSize: '0.875rem',
              outline: 'none', lineHeight: 1.5, maxHeight: 140, overflowY: 'auto',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
            onInput={e => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 140)}px`
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: input.trim() && !loading
                ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                : 'var(--bg-elevated)',
              border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.1rem', transition: 'all 0.15s',
              boxShadow: input.trim() && !loading ? '0 4px 12px rgba(99,102,241,0.35)' : 'none',
              opacity: !input.trim() || loading ? 0.5 : 1,
            }}>
            ➤
          </button>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
          Shift+Enter para nueva línea · Los datos son de tu negocio en tiempo real
        </p>
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1 } 50% { opacity: 0 } }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0) }
          40% { transform: translateY(-6px) }
        }
      `}</style>
    </div>
  )
}
