import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM   = 'Amelia <onboarding@resend.dev>'

// ─── Templates ───────────────────────────────────────────────────────────────

function baseLayout(content: string, businessName: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${businessName}</title></head>
<body style="margin:0;padding:0;background:#0f0f13;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f13;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#1a1a24;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:28px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:20px;font-weight:800;background:linear-gradient(135deg,#a5b4fc,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">
            Amelia
          </span>
        </td></tr>
        <!-- Content -->
        <tr><td style="padding:32px;">${content}</td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="margin:0;font-size:12px;color:#6b7280;">
            Este email fue enviado por ${businessName} a través de Amelia.<br>
            Si no esperabas este mensaje puedes ignorarlo.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function recordatorioHtml(params: {
  clientName: string; businessName: string; serviceName: string
  date: string; time: string
}) {
  const content = `
    <p style="margin:0 0 6px;font-size:13px;color:#8b8fa8;">Recordatorio de cita</p>
    <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#f1f1f5;">
      Hola ${params.clientName} 👋
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#a0a4b8;line-height:1.6;">
      Te recordamos que mañana tienes una cita en <strong style="color:#f1f1f5;">${params.businessName}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;margin-bottom:28px;">
      <tr>
        <td style="padding:20px 24px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <span style="font-size:13px;color:#6b7280;">Servicio</span>
                <span style="float:right;font-size:13px;font-weight:600;color:#f1f1f5;">${params.serviceName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <span style="font-size:13px;color:#6b7280;">Fecha</span>
                <span style="float:right;font-size:13px;font-weight:600;color:#f1f1f5;">${params.date}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;">
                <span style="font-size:13px;color:#6b7280;">Hora</span>
                <span style="float:right;font-size:13px;font-weight:600;color:#a5b4fc;">${params.time}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:14px;color:#6b7280;">
      Si necesitas cancelar o reagendar, contáctanos directamente.
    </p>`
  return baseLayout(content, params.businessName)
}

function reactivacionHtml(params: {
  clientName: string; businessName: string; lastVisit: string; bookingUrl: string
}) {
  const content = `
    <p style="margin:0 0 6px;font-size:13px;color:#8b8fa8;">Te extrañamos</p>
    <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#f1f1f5;">
      ¡Hola ${params.clientName}! 👋
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#a0a4b8;line-height:1.6;">
      Ha pasado un tiempo desde tu última visita a <strong style="color:#f1f1f5;">${params.businessName}</strong>.
      Tu última cita fue el <strong style="color:#f1f1f5;">${params.lastVisit}</strong>.
    </p>
    <p style="margin:0 0 28px;font-size:15px;color:#a0a4b8;line-height:1.6;">
      Nos encantaría verte de nuevo. Agenda tu próxima cita cuando quieras, es rápido y fácil.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td align="center">
          <a href="${params.bookingUrl}"
             style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;font-size:15px;font-weight:700;text-decoration:none;border-radius:10px;box-shadow:0 4px 16px rgba(99,102,241,0.35);">
            Agendar cita →
          </a>
        </td>
      </tr>
    </table>`
  return baseLayout(content, params.businessName)
}

interface OrderItem { name: string; qty: number; price: number; promo_price?: number }

function orderHtml(p: {
  businessName: string; clientName: string; clientPhone?: string | null
  clientEmail?: string | null; clientNote?: string | null
  items: OrderItem[]; subtotal: number; discount: number; total: number
  deliveryCost?: number; deliveryAddress?: string | null; deliveryDistanceKm?: number | null
}) {
  const rows = p.items.map(i => {
    const unit = i.promo_price ?? i.price
    return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
        <span style="font-size:13px;color:#f1f1f5;">${i.name}</span>
        <span style="font-size:12px;color:#6b7280;"> ×${i.qty}</span>
      </td>
      <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05);text-align:right;font-size:13px;font-weight:600;color:#a5b4fc;">
        $${(unit * i.qty).toLocaleString('es-CL')}
      </td></tr>`
  }).join('')

  const content = `
    <p style="margin:0 0 6px;font-size:13px;color:#8b8fa8;">Nuevo pedido recibido</p>
    <h1 style="margin:0 0 24px;font-size:20px;font-weight:700;color:#f1f1f5;">${p.businessName}</h1>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;margin-bottom:20px;">
      <tr><td style="padding:18px 24px;">
        <p style="margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Cliente</p>
        <p style="margin:0 0 10px;font-size:15px;font-weight:600;color:#f1f1f5;">${p.clientName}</p>
        ${p.clientPhone ? `<p style="margin:0 0 4px;font-size:13px;color:#a0a4b8;">📞 ${p.clientPhone}</p>` : ''}
        ${p.clientEmail ? `<p style="margin:0 0 4px;font-size:13px;color:#a0a4b8;">✉️ <a href="mailto:${p.clientEmail}" style="color:#a5b4fc;">${p.clientEmail}</a></p>` : ''}
        ${p.clientNote ? `<p style="margin:10px 0 0;font-size:13px;color:#a0a4b8;font-style:italic;">"${p.clientNote}"</p>` : ''}
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">${rows}</table>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border-radius:10px;">
      <tr><td style="padding:14px 18px;">
        ${p.discount > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:13px;color:#6b7280;">Subtotal</span>
            <span style="font-size:13px;color:#a0a4b8;">$${p.subtotal.toLocaleString('es-CL')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.08);">
            <span style="font-size:13px;color:#6ee7b7;">Descuento</span>
            <span style="font-size:13px;color:#6ee7b7;">−$${p.discount.toLocaleString('es-CL')}</span>
          </div>` : ''}
        ${(p.deliveryCost ?? 0) > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
            <span style="font-size:13px;color:#6b7280;">Despacho${p.deliveryDistanceKm ? ` (~${p.deliveryDistanceKm} km)` : ''}</span>
            <span style="font-size:13px;color:#a0a4b8;">$${(p.deliveryCost!).toLocaleString('es-CL')}</span>
          </div>` : ''}
        ${p.deliveryAddress ? `
          <div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
            <span style="font-size:12px;color:#6b7280;">📍 ${p.deliveryAddress}</span>
          </div>` : ''}
        <div style="display:flex;justify-content:space-between;${(p.discount??0)>0||((p.deliveryCost??0)>0)?'padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);':''}">
          <span style="font-size:15px;font-weight:700;color:#f1f1f5;">Total</span>
          <span style="font-size:15px;font-weight:700;color:#a5b4fc;">$${p.total.toLocaleString('es-CL')}</span>
        </div>
      </td></tr>
    </table>`
  return baseLayout(content, p.businessName)
}

interface PaymentInfo {
  bank_name?: string; account_type?: string; account_number?: string
  rut?: string; holder_name?: string
}

function orderConfirmedHtml(p: {
  businessName: string; clientName: string
  items: OrderItem[]; subtotal: number; discount: number
  deliveryCost: number; total: number
  deliveryAddress?: string | null; deliveryDistanceKm?: number | null
  paymentInfo: PaymentInfo
}) {
  const rows = p.items.map(i => {
    const unit = i.promo_price ?? i.price
    return `<tr>
      <td style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px;color:#f1f1f5;">
        ${i.name} <span style="color:#6b7280;">×${i.qty}</span>
      </td>
      <td style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.05);text-align:right;font-size:13px;font-weight:600;color:#a5b4fc;">
        $${(unit * i.qty).toLocaleString('es-CL')}
      </td></tr>`
  }).join('')

  const hasPayment = p.paymentInfo.account_number || p.paymentInfo.bank_name
  const pi = p.paymentInfo

  const content = `
    <p style="margin:0 0 6px;font-size:13px;color:#8b8fa8;">Pedido confirmado</p>
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#f1f1f5;">¡Hola ${p.clientName}! 🎉</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#a0a4b8;line-height:1.6;">
      Tu pedido en <strong style="color:#f1f1f5;">${p.businessName}</strong> fue confirmado.
      ${hasPayment ? 'Para completarlo, realiza la transferencia con los datos a continuación.' : ''}
    </p>

    ${hasPayment ? `
    <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Datos de transferencia</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.25);border-radius:12px;margin-bottom:20px;">
      <tr><td style="padding:18px 24px;">
        ${[
          ['Banco',        pi.bank_name],
          ['Tipo',         pi.account_type],
          ['N° de cuenta', pi.account_number],
          ['RUT',          pi.rut],
          ['Titular',      pi.holder_name],
        ].filter(r => r[1]).map(r => `
          <div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
            <span style="font-size:13px;color:#6b7280;">${r[0]}</span>
            <span style="font-size:13px;font-weight:700;color:#f1f1f5;">${r[1]}</span>
          </div>`).join('')}
        <div style="display:flex;justify-content:space-between;padding:10px 0 0;">
          <span style="font-size:14px;font-weight:700;color:#6b7280;">Monto a transferir</span>
          <span style="font-size:16px;font-weight:800;color:#a5b4fc;">$${p.total.toLocaleString('es-CL')}</span>
        </div>
      </td></tr>
    </table>` : ''}

    <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em;">Resumen del pedido</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">${rows}</table>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.04);border-radius:10px;">
      <tr><td style="padding:14px 18px;">
        ${p.discount > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:13px;color:#6b7280;">Subtotal productos</span>
            <span style="font-size:13px;color:#a0a4b8;">$${p.subtotal.toLocaleString('es-CL')}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:13px;color:#6ee7b7;">Descuento</span>
            <span style="font-size:13px;color:#6ee7b7;">−$${p.discount.toLocaleString('es-CL')}</span>
          </div>` : ''}
        ${p.deliveryCost > 0 ? `
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:13px;color:#6b7280;">Despacho${p.deliveryDistanceKm ? ` (~${p.deliveryDistanceKm} km)` : ''}</span>
            <span style="font-size:13px;color:#a0a4b8;">$${p.deliveryCost.toLocaleString('es-CL')}</span>
          </div>` : ''}
        ${p.deliveryAddress ? `
          <div style="padding:8px 0;border-top:1px solid rgba(255,255,255,0.06);">
            <span style="font-size:12px;color:#6b7280;">📍 Dirección de despacho: </span>
            <span style="font-size:12px;color:#a0a4b8;">${p.deliveryAddress}</span>
          </div>` : ''}
        <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid rgba(255,255,255,0.08);">
          <span style="font-size:15px;font-weight:700;color:#f1f1f5;">Total</span>
          <span style="font-size:15px;font-weight:700;color:#a5b4fc;">$${p.total.toLocaleString('es-CL')}</span>
        </div>
      </td></tr>
    </table>

    ${hasPayment ? `<p style="margin:20px 0 0;font-size:13px;color:#6b7280;text-align:center;">
      Una vez recibida la transferencia, tu pedido será procesado. ¡Gracias!
    </p>` : ''}`

  return baseLayout(content, p.businessName)
}

export async function sendOrderConfirmed(params: {
  to: string; businessName: string; clientName: string
  items: OrderItem[]; subtotal: number; discount: number
  deliveryCost: number; total: number
  deliveryAddress?: string | null; deliveryDistanceKm?: number | null
  paymentInfo: PaymentInfo
}) {
  return resend.emails.send({
    from: FROM, to: params.to,
    subject: `Pedido confirmado — ${params.businessName}`,
    html: orderConfirmedHtml(params),
  })
}

export async function sendOrder(params: {
  to: string; replyTo?: string; businessName: string
  clientName: string; clientPhone?: string | null; clientEmail?: string | null; clientNote?: string | null
  items: OrderItem[]; subtotal: number; discount: number; total: number
  deliveryCost?: number; deliveryAddress?: string | null; deliveryDistanceKm?: number | null
}) {
  return resend.emails.send({
    from: FROM, to: params.to, replyTo: params.replyTo || undefined,
    subject: `Nuevo pedido de ${params.clientName} — ${params.businessName}`,
    html: orderHtml(params),
  })
}

// ─── Funciones de envío ───────────────────────────────────────────────────────

export async function sendRecordatorio(params: {
  to: string
  clientName: string
  businessName: string
  serviceName: string
  date: string
  time: string
}) {
  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `Recordatorio: ${params.serviceName} mañana a las ${params.time} — ${params.businessName}`,
    html: recordatorioHtml(params),
  })
}

export async function sendReactivacion(params: {
  to: string
  clientName: string
  businessName: string
  lastVisit: string
  bookingUrl: string
}) {
  return resend.emails.send({
    from: FROM,
    to: params.to,
    subject: `¡Te extrañamos, ${params.clientName}! Agenda tu próxima cita en ${params.businessName}`,
    html: reactivacionHtml(params),
  })
}
