import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED  = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const type = formData.get('type') as string ?? 'gallery'

    if (!file) return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'Formato no permitido. Usa JPG, PNG o WebP.' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'La imagen no puede superar los 5MB.' }, { status: 400 })
    }

    // Nombre único para evitar colisiones
    const ext      = file.name.split('.').pop() ?? 'jpg'
    const filename = `${user.id}/${type}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer      = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('business-assets')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage error:', uploadError)
      // Si el bucket no existe, dar un mensaje claro
      if (uploadError.message?.includes('bucket')) {
        return NextResponse.json({
          error: 'El almacenamiento no está configurado. Crea el bucket "business-assets" en Supabase Storage.'
        }, { status: 500 })
      }
      return NextResponse.json({ error: 'Error al subir la imagen. Intenta nuevamente.' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('business-assets')
      .getPublicUrl(filename)

    return NextResponse.json({ url: publicUrl, filename })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Error interno al procesar la imagen.' }, { status: 500 })
  }
}
