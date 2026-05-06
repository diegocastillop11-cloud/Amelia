import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = req.nextUrl
  const isSuperAdmin = user?.email === process.env.SUPERADMIN_EMAIL

  // ── No autenticado ──────────────────────────────────────────
  if (!user) {
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }
    return res
  }

  // ── Autenticado intentando ir a auth ───────────────────────
  if (pathname.startsWith('/auth')) {
    const dest = isSuperAdmin ? '/admin' : '/dashboard'
    return NextResponse.redirect(new URL(dest, req.url))
  }

  // ── Superadmin: acceso total (admin + dashboard + todo) ────
  // Solo redirige a /admin si va a la raíz sin destino claro
  if (isSuperAdmin) {
    // Puede entrar a /admin y a /dashboard libremente
    // Solo bloqueamos si intenta acceder a /auth (ya cubierto arriba)
    return res
  }

  // ── Owner normal: no puede ir a /admin ─────────────────────
  if (pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/auth/:path*'],
}
