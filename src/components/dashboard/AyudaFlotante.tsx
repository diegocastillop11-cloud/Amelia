'use client'

import Link from 'next/link'
import { useState } from 'react'

const PREGUNTAS = [
  { q: '¿Cómo cambio los textos o el color de mi sitio?', a: 'En el menú toca «Mi sitio web». Allí vas paso a paso: tu negocio, el estilo, los textos y la publicación.' },
  { q: '¿Cómo publico mi sitio?', a: 'Entra a «Mi sitio web», avanza hasta el paso 4 y toca el botón grande «Publicar mi sitio».' },
  { q: '¿Cómo comparto mi sitio con mis clientes?', a: 'En «Inicio», cuando tu sitio esté publicado, toca «Copiar enlace» y pégalo en WhatsApp, Instagram o donde quieras.' },
  { q: '¿Dónde veo las citas que me piden?', a: 'En el menú, toca «Mis citas». Allí aparecen todas las reservas de tus clientes.' },
  { q: '¿Dónde están las demás herramientas?', a: 'Al final del menú toca «➕ Más herramientas». Allí están productos, pedidos, horarios, WhatsApp y más.' },
]

export default function AyudaFlotante() {
  const [abierto, setAbierto] = useState(false)
  const [sel, setSel] = useState<number | null>(null)

  return (
    <>
      {abierto && (
        <div role="dialog" aria-label="Ayuda" style={{
          position: 'fixed', right: 20, bottom: 84, width: 'min(380px, calc(100vw - 40px))', maxHeight: '70vh', overflowY: 'auto',
          background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 18, padding: '1.25rem',
          boxShadow: '0 16px 48px rgba(0,0,0,0.25)', zIndex: 60,
        }}>
          <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>¿En qué te ayudamos?</p>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', marginBottom: 14 }}>Toca tu pregunta para ver la respuesta.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {PREGUNTAS.map((p, i) => (
              <div key={p.q} style={{ border: '1.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <button onClick={() => setSel(sel === i ? null : i)} style={{
                  width: '100%', textAlign: 'left', padding: '0.75rem 0.875rem', background: sel === i ? 'var(--accent-glow)' : 'transparent',
                  border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)',
                }}>{p.q}</button>
                {sel === i && <p style={{ padding: '0.25rem 0.875rem 0.875rem', fontSize: '0.9375rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>{p.a}</p>}
              </div>
            ))}
          </div>
          <Link href="/dashboard/asistente" onClick={() => setAbierto(false)} className="btn-primary"
                style={{ width: '100%', marginTop: 16, fontSize: '1.0625rem', padding: '0.875rem', textDecoration: 'none' }}>
            🤖 Preguntarle a Amelia
          </Link>
        </div>
      )}
      <button onClick={() => setAbierto(!abierto)} aria-label="Abrir ayuda" className="btn-primary" style={{
        position: 'fixed', right: 20, bottom: 20, zIndex: 60, borderRadius: 999, padding: '0.875rem 1.375rem',
        fontSize: '1.0625rem', boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
      }}>
        {abierto ? '✕ Cerrar' : '💬 ¿Necesitas ayuda?'}
      </button>
    </>
  )
}
