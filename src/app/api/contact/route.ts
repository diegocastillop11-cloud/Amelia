import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const { slug, senderName, senderEmail, message } = await req.json()

  if (!slug || !senderName || !message)
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Obtener negocio + email del owner
  const { data: biz } = await supabase
    .from('businesses')
    .select('name, owners(email)')
    .eq('slug', slug)
    .single()

  if (!biz) return NextResponse.json({ error: 'Negocio no encontrado' }, { status: 404 })

  const ownerEmail = Array.isArray(biz.owners)
    ? (biz.owners[0] as { email: string })?.email
    : (biz.owners as { email: string } | null)?.email

  if (!ownerEmail) return NextResponse.json({ error: 'Sin email de destino' }, { status: 400 })

  const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Nuevo mensaje</title></head>
<body style="margin:0;padding:0;background:#0f0f13;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f13;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#1a1a24;border-radius:16px;border:1px solid rgba(255,255,255,0.08);overflow:hidden;">
        <tr><td style="padding:28px 32px 24px;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="font-size:18px;font-weight:800;background:linear-gradient(135deg,#a5b4fc,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">Amelia</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 6px;font-size:13px;color:#8b8fa8;">Nuevo mensaje desde tu sitio</p>
          <h1 style="margin:0 0 24px;font-size:20px;font-weight:700;color:#f1f1f5;">${biz.name}</h1>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;margin-bottom:24px;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">De</p>
              <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#f1f1f5;">${senderName}${senderEmail ? ` · <a href="mailto:${senderEmail}" style="color:#a5b4fc;text-decoration:none;">${senderEmail}</a>` : ''}</p>
              <p style="margin:0 0 4px;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Mensaje</p>
              <p style="margin:0;font-size:15px;color:#e2e8f0;line-height:1.7;white-space:pre-wrap;">${message.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</p>
            </td></tr>
          </table>
          ${senderEmail ? `<a href="mailto:${senderEmail}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:white;font-size:14px;font-weight:700;text-decoration:none;border-radius:10px;">Responder →</a>` : ''}
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="margin:0;font-size:12px;color:#6b7280;">Mensaje recibido desde tu sitio web en Amelia</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  await resend.emails.send({
    from: 'Amelia <onboarding@resend.dev>',
    to: ownerEmail,
    replyTo: senderEmail || undefined,
    subject: `Nuevo mensaje de ${senderName} — ${biz.name}`,
    html,
  })

  return NextResponse.json({ success: true })
}
