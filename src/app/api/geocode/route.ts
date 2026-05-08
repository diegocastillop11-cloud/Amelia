import { NextResponse } from 'next/server'

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=cl`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Amelia-SaaS/1.0 (contacto@amelia.cl)' },
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    if (!data[0]) return null
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const origin      = searchParams.get('origin')
  const destination = searchParams.get('destination')
  const pricePerKm  = Number(searchParams.get('pricePerKm') ?? 1000)

  if (!origin || !destination)
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })

  const [from, to] = await Promise.all([geocode(origin), geocode(destination)])

  if (!from) return NextResponse.json({ error: 'No se encontró la dirección de origen' }, { status: 422 })
  if (!to)   return NextResponse.json({ error: 'No se encontró la dirección de destino' }, { status: 422 })

  const straightKm = haversineKm(from.lat, from.lng, to.lat, to.lng)
  const distanceKm = Math.round(straightKm * 1.4 * 10) / 10   // factor de ruta × 1.4
  const cost       = Math.round(distanceKm * pricePerKm)

  return NextResponse.json({ distanceKm, cost, pricePerKm })
}
