import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const address = searchParams.get('address')
  if (!address) return NextResponse.json({ error: 'Falta address' }, { status: 400 })

  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=cl`
    const res  = await fetch(url, {
      headers: { 'User-Agent': 'Amelia-SaaS/1.0 (contacto@amelia.cl)' },
      next: { revalidate: 3600 },
    })
    const data = await res.json()
    if (!data[0]) return NextResponse.json({ error: 'Dirección no encontrada' }, { status: 422 })
    return NextResponse.json({
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    })
  } catch {
    return NextResponse.json({ error: 'Error de geocodificación' }, { status: 500 })
  }
}
