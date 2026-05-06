import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getLocalNow() {
  const now = new Date()
  return {
    year: now.getFullYear(), month: now.getMonth(),
    day: now.getDate(), hour: now.getHours(),
    minute: now.getMinutes(), dow: now.getDay(),
  }
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

function addDays(y: number, m: number, d: number, n: number) {
  const dt = new Date(y, m, d + n)
  return { year: dt.getFullYear(), month: dt.getMonth(), day: dt.getDate(), dow: dt.getDay() }
}

function fmtLabel(y: number, m: number, d: number, dow: number) {
  const D = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const M = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${D[dow]} ${d}/${M[m]}`
}

// Retorna los offsets de días a mostrar:
// - Siempre: hoy hasta el sábado de esta semana
// - Si hoy es viernes o sábado: también lunes-sábado de la semana siguiente
function getOffsets(todayDow: number): number[] {
  const offsets: number[] = []
  // Días hasta el sábado de esta semana (incluyendo hoy)
  for (let i = 0; i <= 6; i++) {
    offsets.push(i)
    if ((todayDow + i) % 7 === 6) break // llegamos a sábado
  }
  // Si hoy es viernes(5) o sábado(6), agregar semana siguiente lun-sáb
  if (todayDow >= 5) {
    const nextMon = 8 - todayDow // días hasta el próximo lunes
    for (let i = nextMon; i < nextMon + 6; i++) offsets.push(i)
  }
  return offsets
}

export async function POST(req: Request) {
  try {
    const { messages, business_id, business_name, services } = await req.json()

    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const now        = getLocalNow()
    const todayStr   = toDateStr(now.year, now.month, now.day)
    const todayLabel = fmtLabel(now.year, now.month, now.day, now.dow)
    const nowMinutes = now.hour * 60 + now.minute
    const DAYS       = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']

    const { data: schedules } = await admin
      .from('schedules').select('*')
      .eq('business_id', business_id).eq('is_open', true).order('day_of_week')

    const horariosTexto = (schedules ?? []).map(s =>
      `${DAYS[s.day_of_week]}: ${s.open_time.slice(0,5)}-${s.close_time.slice(0,5)} (${s.slot_duration}min/turno)`
    ).join('\n')

    const offsets = getOffsets(now.dow)
    const lastDt  = addDays(now.year, now.month, now.day, offsets[offsets.length-1])
    const endStr  = toDateStr(lastDt.year, lastDt.month, lastDt.day)

    const { data: ocupadas } = await admin
      .from('bookings').select('booking_date, booking_time')
      .eq('business_id', business_id)
      .gte('booking_date', todayStr).lte('booking_date', endStr)
      .neq('status', 'cancelled')

    // Generar slots disponibles con filtro de hora pasada
    const slotsByDay: Record<string, { label: string; date: string; times: string[] }> = {}

    for (const offset of offsets) {
      const dt      = addDays(now.year, now.month, now.day, offset)
      const dateStr = toDateStr(dt.year, dt.month, dt.day)
      const label   = fmtLabel(dt.year, dt.month, dt.day, dt.dow)
      const sch     = schedules?.find(s => s.day_of_week === dt.dow)
      if (!sch) continue

      const [oh, om] = sch.open_time.split(':').map(Number)
      const [ch, cm] = sch.close_time.split(':').map(Number)
      let cur = oh * 60 + om
      const end = ch * 60 + cm

      while (cur + sch.slot_duration <= end) {
        const hh  = String(Math.floor(cur/60)).padStart(2,'0')
        const mm  = String(cur%60).padStart(2,'0')
        const tStr = `${hh}:${mm}`

        // ✅ Filtrar slots pasados de hoy (con 15min de margen)
        const isPast    = offset === 0 && cur <= nowMinutes + 15
        const isOcupado = (ocupadas ?? []).some(b =>
          b.booking_date === dateStr && b.booking_time.slice(0,5) === tStr
        )

        if (!isPast && !isOcupado) {
          if (!slotsByDay[dateStr]) slotsByDay[dateStr] = { label, date: dateStr, times: [] }
          slotsByDay[dateStr].times.push(tStr)
        }
        cur += sch.slot_duration
      }
    }

    const slotsTexto = Object.values(slotsByDay).length > 0
      ? Object.values(slotsByDay)
          .map(({ label, date, times }) => {
            const isToday = date === todayStr
            return `📅 **${isToday ? 'Hoy ' : ''}${label} (${date}):** ${times.join(', ')}`
          })
          .join('\n')
      : 'Sin disponibilidad esta semana.'

    const esViernesOSabado = now.dow >= 5
    const notaSemana = esViernesOSabado
      ? 'Hoy es ' + DAYS[now.dow] + ', por eso también mostramos disponibilidad de la próxima semana.'
      : 'Solo agendamos dentro de la semana actual. Los viernes se abre agenda para la siguiente semana.'

    const serviciosTexto = (services ?? []).map((s: { name: string; price: string }) =>
      `• ${s.name}${s.price ? ' — '+s.price : ''}`
    ).join('\n')

    const systemPrompt = `Eres Amelia, asistente de reservas de "${business_name}". Eres breve, clara y eficiente.

HOY: ${todayLabel} ${todayStr} · ${String(now.hour).padStart(2,'0')}:${String(now.minute).padStart(2,'0')} hrs
${notaSemana}

SERVICIOS:
${serviciosTexto || '(consultar al negocio)'}

DISPONIBILIDAD (slots libres confirmados):
${slotsTexto}

═══ FLUJO EN 2 PASOS — MUY IMPORTANTE ═══

PASO 1 — cuando el cliente indique servicio:
→ Muestra los horarios disponibles en formato compacto (ej: "Lun 10:00, 11:00 · Mar 09:00, 15:00")
→ En el MISMO mensaje pregunta: "¿Cuál horario prefieres? Escríbeme también tu nombre, teléfono y correo para confirmar."
→ TODO en un solo mensaje, máximo 5 líneas.

PASO 2 — cuando el cliente dé fecha+hora+nombre+teléfono+correo:
→ Confirma en 2 líneas y al FINAL incluye exactamente:
[RESERVA:{"service":"...","date":"YYYY-MM-DD","time":"HH:MM","name":"...","phone":"...","email":"..."}]

REGLAS:
- Solo ofrecer horarios que aparecen EXACTAMENTE en DISPONIBILIDAD
- Si pide algo no disponible, ofrecer el más cercano
- Si falta algún dato (nombre/teléfono/correo), pedir solo lo que falta, en 1 línea
- Sin correo: pedir uno básico, es necesario para guardar su historial
- Respuestas máximo 5 líneas — sin relleno ni frases de cortesía largas
- NO confirmar reserva sin tener los 3: nombre + teléfono + correo`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 700,
        system: systemPrompt,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role, content: m.content,
        })),
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''

    const match = text.match(/\[RESERVA:({.*?})\]/)
    let bookingData = null
    let displayText = text

    if (match) {
      try {
        bookingData = JSON.parse(match[1])
        displayText = text.replace(/\[RESERVA:.*?\]/, '').trim()
      } catch {}
    }

    return NextResponse.json({ text: displayText, bookingData })

  } catch (e) {
    console.error('amelia-chat error:', e)
    return NextResponse.json({ error: 'Error al conectar con Amelia' }, { status: 500 })
  }
}
