'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  action?: string
}

const QUICK_ACTIONS = [
  { id: 'instagram', icon: '📸', label: 'Post Instagram',      color: '#e1306c',
    prompt: 'Crea 3 posts listos para Instagram para esta semana. Incluye el texto completo, hashtags relevantes y una descripción de la imagen o video ideal para cada uno.' },
  { id: 'plan',      icon: '📅', label: 'Plan mensual',        color: '#6366f1',
    prompt: 'Crea un plan de marketing completo para este mes. Organízalo por semanas, con ideas de contenido, promociones sugeridas y acciones concretas para atraer más clientes.' },
  { id: 'reactivar', icon: '🔁', label: 'Reactivar clientes',  color: '#f59e0b',
    prompt: 'Tengo clientes que llevan más de 90 días sin volver. Crea una estrategia con 3 acciones concretas y un mensaje de WhatsApp listo para enviarles.' },
  { id: 'promo',     icon: '🎯', label: 'Idea de promoción',   color: '#10b981',
    prompt: 'Propón 3 ideas de promociones creativas y rentables para este negocio. Para cada una indica: nombre, descripción, cómo comunicarla y duración sugerida.' },
  { id: 'whatsapp',  icon: '💬', label: 'Mensajes WhatsApp',   color: '#25d366',
    prompt: 'Crea 3 mensajes de WhatsApp listos para usar: uno para clientes nuevos, uno para clientes frecuentes y uno para anunciar una oferta especial.' },
  { id: 'descripcion', icon: '✍️', label: 'Mejorar descripción', color: '#8b5cf6',
    prompt: 'Reescribe la descripción del negocio para que sea más atractiva y persuasiva. Debe destacar el valor diferencial y motivar a los clientes a agendar o comprar.' },
]

// ── Markdown renderer limpio ────────────────────────────────────────────────
function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

function renderMarkdown(text: string): string {
  const lines = text.split('\n')
  let html = ''
  let listType: 'ul' | 'ol' | null = null

  const closeList = () => {
    if (listType) { html += listType === 'ul' ? '</ul>' : '</ol>'; listType = null }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trim = line.trim()

    if (!trim) { closeList(); html += '<div style="height:0.5rem"></div>'; continue }

    if (trim.startsWith('### ')) {
      closeList()
      html += `<h3 style="font-size:0.9375rem;font-weight:700;color:var(--text-primary);margin:1.25rem 0 0.375rem;padding-top:0.75rem;border-top:1px solid var(--border)">${formatInline(trim.slice(4))}</h3>`
    } else if (trim.startsWith('## ')) {
      closeList()
      html += `<h2 style="font-size:1.0625rem;font-weight:800;color:var(--text-primary);margin:1.5rem 0 0.5rem;padding-top:1rem;border-top:1px solid var(--border)">${formatInline(trim.slice(3))}</h2>`
    } else if (trim.startsWith('# ')) {
      closeList()
      html += `<h1 style="font-size:1.125rem;font-weight:800;color:var(--text-primary);margin:0 0 0.75rem">${formatInline(trim.slice(2))}</h1>`
    } else if (trim.startsWith('---') || trim.startsWith('___')) {
      closeList()
      html += `<hr style="border:none;border-top:1px solid var(--border);margin:1rem 0"/>`
    } else if (trim.startsWith('- ') || trim.startsWith('* ')) {
      if (listType !== 'ul') { closeList(); html += '<ul style="list-style:none;margin:0.5rem 0;padding:0;display:flex;flex-direction:column;gap:6px">'; listType = 'ul' }
      html += `<li style="display:flex;gap:8px;align-items:flex-start"><span style="color:var(--accent);margin-top:2px;flex-shrink:0">▸</span><span>${formatInline(trim.slice(2))}</span></li>`
    } else if (/^\d+\./.test(trim)) {
      const num = trim.match(/^(\d+)\./)?.[1] ?? ''
      const rest = trim.replace(/^\d+\.\s*/, '')
      if (listType !== 'ol') { closeList(); html += '<ol style="list-style:none;margin:0.5rem 0;padding:0;display:flex;flex-direction:column;gap:8px;counter-reset:item">'; listType = 'ol' }
      html += `<li style="display:flex;gap:10px;align-items:flex-start"><span style="background:var(--accent);color:white;font-size:11px;font-weight:700;min-width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-top:2px;flex-shrink:0">${num}</span><span>${formatInline(rest)}</span></li>`
    } else if (trim.startsWith('✅') || trim.startsWith('☑') || trim.startsWith('✓')) {
      if (listType !== 'ul') { closeList(); html += '<ul style="list-style:none;margin:0.5rem 0;padding:0;display:flex;flex-direction:column;gap:6px">'; listType = 'ul' }
      html += `<li style="display:flex;gap:8px;align-items:flex-start"><span style="color:#10b981;flex-shrink:0">${trim[0]}</span><span>${formatInline(trim.slice(1).trim())}</span></li>`
    } else {
      closeList()
      html += `<p style="margin:0.25rem 0;line-height:1.7;color:var(--text-secondary)">${formatInline(trim)}</p>`
    }
  }
  closeList()
  return html
}

// ── PDF ──────────────────────────────────────────────────────────────────────
function renderForPrint(text: string): string {
  const lines = text.split('\n')
  let html = ''
  let listType: 'ul' | 'ol' | null = null

  const closeList = () => {
    if (listType) { html += listType === 'ul' ? '</ul>' : '</ol>'; listType = null }
  }

  for (const line of lines) {
    const trim = line.trim()
    if (!trim) { closeList(); html += '<br/>'; continue }
    if (trim.startsWith('### ')) { closeList(); html += `<h3>${trim.slice(4)}</h3>`; continue }
    if (trim.startsWith('## '))  { closeList(); html += `<h2>${trim.slice(3)}</h2>`; continue }
    if (trim.startsWith('# '))   { closeList(); html += `<h1>${trim.slice(2)}</h1>`; continue }
    if (trim.startsWith('---'))  { closeList(); html += '<hr/>'; continue }
    if (trim.startsWith('- ') || trim.startsWith('* ')) {
      if (listType !== 'ul') { closeList(); html += '<ul>'; listType = 'ul' }
      html += `<li>${trim.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</li>`
      continue
    }
    if (/^\d+\./.test(trim)) {
      if (listType !== 'ol') { closeList(); html += '<ol>'; listType = 'ol' }
      html += `<li>${trim.replace(/^\d+\.\s*/, '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</li>`
      continue
    }
    closeList()
    html += `<p>${trim.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')}</p>`
  }
  closeList()
  return html
}

function downloadPdf(content: string, businessName: string, action?: string) {
  const title = action ?? 'Marketing'
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${businessName} — ${title}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; max-width: 720px; margin: 40px auto;
           color: #111; line-height: 1.7; font-size: 14px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 17px; margin: 24px 0 8px; border-top: 2px solid #e5e7eb; padding-top: 16px; }
    h3 { font-size: 15px; margin: 18px 0 6px; color: #374151; }
    p  { margin: 6px 0; color: #374151; }
    ul, ol { padding-left: 1.5rem; margin: 8px 0; }
    li { margin: 5px 0; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 16px 0; }
    strong { color: #111; }
    code { background: #f3f4f6; padding: 2px 5px; border-radius: 3px; font-size: 13px; }
    .header { border-bottom: 2px solid #111; padding-bottom: 12px; margin-bottom: 24px; }
    .header h1 { color: #111; }
    .meta { font-size: 12px; color: #6b7280; margin-top: 4px; }
    @media print {
      body { margin: 20px; }
      @page { margin: 1.5cm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${businessName}</h1>
    <p class="meta">${title} · Generado por Amelia · ${new Date().toLocaleDateString('es-CL', { day:'numeric', month:'long', year:'numeric' })}</p>
  </div>
  ${renderForPrint(content)}
  <script>setTimeout(()=>{window.print();},300);<\/script>
</body>
</html>`)
  win.document.close()
}

// ── Componente ────────────────────────────────────────────────────────────────
interface Props { businessName: string; businessCategory: string }

export default function MarketingClient({ businessName, businessCategory }: Props) {
  const [messages,   setMessages]   = useState<Message[]>([])
  const [input,      setInput]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [streaming,  setStreaming]  = useState(false)
  const [copied,     setCopied]     = useState<number | null>(null)
  const scrollRef    = useRef<HTMLDivElement>(null)
  const userScrolled = useRef(false)

  // Detectar si el usuario scrolleó hacia arriba manualmente
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      userScrolled.current = el.scrollHeight - el.scrollTop - el.clientHeight > 80
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Auto-scroll solo si el usuario no ha scrolleado arriba
  useEffect(() => {
    const el = scrollRef.current
    if (!el || userScrolled.current) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  const send = async (text: string, action?: string) => {
    if (!text.trim() || loading) return
    // Al enviar: reset scroll y bajar al fondo siempre
    userScrolled.current = false
    setMessages(prev => [...prev, { role: 'user', content: text, action }, { role: 'assistant', content: '' }])
    setInput('')
    setLoading(true)
    setStreaming(true)
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }, 30)
    try {
      const res = await fetch('/api/ai/marketing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, action }),
      })
      if (!res.ok || !res.body) throw new Error('Error')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: full } : m))
      }
    } catch {
      setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: 'Error al conectar. Intenta de nuevo.' } : m))
    }
    setStreaming(false)
    setLoading(false)
  }

  const copy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopied(idx); setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg-base)' }}>

      {/* Header */}
      <div style={{ padding:'1.25rem 1.75rem', borderBottom:'1px solid var(--border)',
                     background:'var(--bg-surface)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:38, height:38, borderRadius:10,
                         background:'linear-gradient(135deg, #10b981, #059669)',
                         display:'flex', alignItems:'center', justifyContent:'center',
                         fontSize:'1.125rem', flexShrink:0 }}>📣</div>
          <div>
            <p style={{ margin:0, fontWeight:800, fontSize:'1rem', color:'var(--text-primary)' }}>Agente de Marketing</p>
            <p style={{ margin:0, fontSize:12, color:'var(--text-muted)' }}>{businessName} · {businessCategory}</p>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div style={{ padding:'0.875rem 1.75rem', borderBottom:'1px solid var(--border)',
                     background:'var(--bg-surface)', flexShrink:0 }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {QUICK_ACTIONS.map(a => (
            <button key={a.id} onClick={() => send(a.prompt, a.label)} disabled={loading}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 13px', borderRadius:20,
                        border:`1.5px solid ${a.color}35`, background:`${a.color}12`,
                        color:a.color, fontSize:12, fontWeight:600,
                        cursor:loading?'not-allowed':'pointer', opacity:loading?0.5:1,
                        fontFamily:'inherit', transition:'all 0.15s', whiteSpace:'nowrap' }}
              onMouseOver={e=>{ if(!loading) e.currentTarget.style.background=`${a.color}22` }}
              onMouseOut={e=>{ e.currentTarget.style.background=`${a.color}12` }}>
              {a.icon} {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mensajes */}
      <div ref={scrollRef} style={{ flex:1, overflowY:'auto', padding:'1.5rem 1.75rem',
                                     display:'flex', flexDirection:'column', gap:20,
                                     scrollbarWidth:'thin', scrollbarColor:'rgba(255,255,255,0.1) transparent' }}>

        {messages.length === 0 && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center',
                         justifyContent:'center', textAlign:'center', padding:'3rem 0', color:'var(--text-muted)' }}>
            <div style={{ fontSize:'3rem', marginBottom:'1rem' }}>📣</div>
            <p style={{ margin:'0 0 0.5rem', fontWeight:700, fontSize:'1.125rem', color:'var(--text-secondary)' }}>
              Tu agente de marketing está listo
            </p>
            <p style={{ margin:0, fontSize:'0.9375rem', maxWidth:380, lineHeight:1.6 }}>
              Usa las acciones rápidas o escribe lo que necesitas — posts, planes, ideas de campaña, mensajes para clientes.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} style={{ display:'flex', flexDirection:'column',
                                   alignItems:msg.role==='user'?'flex-end':'flex-start', gap:6 }}>
            {msg.role==='user' && msg.action && (
              <span style={{ fontSize:11, color:'var(--text-muted)', marginRight:4 }}>⚡ {msg.action}</span>
            )}

            <div style={{
              maxWidth:'92%',
              padding: msg.role==='user' ? '10px 14px' : '16px 18px',
              borderRadius: msg.role==='user' ? '16px 16px 4px 16px' : '4px 16px 16px 16px',
              background: msg.role==='user' ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--bg-elevated)',
              border: msg.role==='assistant' ? '1px solid var(--border)' : 'none',
              fontSize:'0.9rem', lineHeight:1.7,
            }}>
              {msg.role==='assistant' && msg.content==='' ? (
                <span style={{ display:'flex', gap:4, alignItems:'center', color:'var(--text-muted)' }}>
                  <span style={{ animation:'pulse 1s infinite' }}>●</span>
                  <span style={{ animation:'pulse 1s 0.2s infinite' }}>●</span>
                  <span style={{ animation:'pulse 1s 0.4s infinite' }}>●</span>
                </span>
              ) : msg.role==='assistant' && streaming && idx === messages.length - 1 ? (
                // Durante streaming: texto crudo con cursor parpadeante
                <p style={{ margin:0, whiteSpace:'pre-wrap', lineHeight:1.75,
                              color:'var(--text-secondary)', fontFamily:'inherit' }}>
                  {msg.content}
                  <span style={{ display:'inline-block', width:2, height:'1em', background:'var(--accent)',
                                   marginLeft:2, verticalAlign:'text-bottom', animation:'blink 1s step-end infinite' }} />
                </p>
              ) : msg.role==='assistant' ? (
                <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
              ) : (
                <p style={{ margin:0, color:'white', fontWeight:500 }}>{msg.content}</p>
              )}
            </div>

            {/* Acciones de respuesta */}
            {msg.role==='assistant' && msg.content && (
              <div style={{ display:'flex', gap:8, marginLeft:4 }}>
                <button onClick={() => copy(msg.content, idx)}
                  style={{ fontSize:11, color:copied===idx?'#10b981':'var(--text-muted)',
                            background:'none', border:'none', cursor:'pointer',
                            fontFamily:'inherit', display:'flex', alignItems:'center', gap:4, padding:'2px 4px' }}>
                  {copied===idx ? '✓ Copiado' : '⎘ Copiar'}
                </button>
                <button onClick={() => downloadPdf(msg.content, businessName, msg.action ?? messages[idx-1]?.action)}
                  style={{ fontSize:11, color:'var(--text-muted)', background:'none', border:'none',
                            cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4, padding:'2px 4px' }}>
                  ↓ Descargar PDF
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ padding:'1rem 1.75rem', borderTop:'1px solid var(--border)',
                     background:'var(--bg-surface)', flexShrink:0 }}>
        <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
          <textarea value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(input) } }}
            placeholder="Pide lo que necesitas — post, campaña, análisis... (Enter para enviar)"
            rows={1}
            style={{ flex:1, resize:'none', background:'var(--bg-elevated)',
                      border:'1.5px solid var(--border)', color:'var(--text-primary)',
                      borderRadius:12, padding:'10px 14px', fontSize:'0.875rem',
                      fontFamily:'inherit', outline:'none', lineHeight:1.5,
                      maxHeight:120, overflowY:'auto', scrollbarWidth:'thin' }}
            onFocus={e=>{ e.target.style.borderColor='#10b981'; e.target.style.boxShadow='0 0 0 3px rgba(16,185,129,0.1)' }}
            onBlur={e=>{ e.target.style.borderColor='var(--border)'; e.target.style.boxShadow='none' }}
            onInput={e=>{ const t=e.currentTarget; t.style.height='auto'; t.style.height=Math.min(t.scrollHeight,120)+'px' }}
          />
          <button onClick={()=>send(input)} disabled={loading||!input.trim()}
            style={{ width:40, height:40, borderRadius:10, border:'none', flexShrink:0,
                      background:loading||!input.trim()?'rgba(255,255,255,0.07)':'linear-gradient(135deg,#10b981,#059669)',
                      color:loading||!input.trim()?'var(--text-muted)':'white',
                      cursor:loading||!input.trim()?'not-allowed':'pointer',
                      fontSize:'1.125rem', display:'flex', alignItems:'center', justifyContent:'center',
                      transition:'all 0.15s' }}>
            {loading ? '⏳' : '↑'}
          </button>
        </div>
        <p style={{ margin:'6px 0 0', fontSize:11, color:'var(--text-muted)', textAlign:'center' }}>
          El agente conoce tu negocio, clientes y servicios en tiempo real
        </p>
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:0.3}50%{opacity:1}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
      `}</style>
    </div>
  )
}
