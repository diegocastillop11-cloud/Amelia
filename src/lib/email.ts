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
