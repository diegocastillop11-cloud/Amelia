const GRAPH = 'https://graph.facebook.com/v21.0'

export interface WaMessage {
  role:    'user' | 'assistant'
  content: string
  ts:      number
}

// ── Enviar mensaje de texto ────────────────────────────────────────────────────
export async function sendWhatsAppMessage(
  to:            string,
  text:          string,
  phoneNumberId: string,
  token:         string
) {
  const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  })
  if (!res.ok) throw new Error(`WhatsApp send error: ${await res.text()}`)
  return res.json()
}

// ── Marcar mensaje como leído ──────────────────────────────────────────────────
export async function markAsRead(
  messageId:     string,
  phoneNumberId: string,
  token:         string
) {
  await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status:            'read',
      message_id:        messageId,
    }),
  })
}

// ── Obtener perfil del contacto ────────────────────────────────────────────────
export async function getContactName(
  phone:         string,
  phoneNumberId: string,
  token:         string
): Promise<string | null> {
  try {
    const res = await fetch(
      `${GRAPH}/${phoneNumberId}/contacts?phone=${phone}&access_token=${token}`
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.data?.[0]?.profile?.name ?? null
  } catch { return null }
}
