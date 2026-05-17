# Amelia — Instrucciones para Claude

## Qué es este proyecto
SaaS chileno para pequeños negocios: genera sitios web con IA, gestiona reservas online, y tiene chat inteligente (Amelia) que atiende clientes 24/7. Stack: Next.js 14 App Router · Supabase · Claude API · TypeScript · Tailwind.

## Cómo trabajar en este proyecto

### Reglas de comunicación
- **Siempre responder en español**, sin excepción.
- **Trabajar con planes de acción**: antes de implementar algo no trivial, presentar un plan numerado breve (3-5 pasos), esperar confirmación, luego ejecutar paso a paso.
- **Siempre corrige solo lo que el usuario esta solicitando, no toques nada mas del codigo que no sea lo que se pidio modificar.

### Contexto de producto
- Amelia es para **cualquier tipo de negocio** — barberías, pastelerías, consultas médicas, ventas de productos, etc. Las métricas, textos y flows deben ser genéricos (ej: "citas" no "cortes", "clientes" no "pacientes").
- La URL principal siempre es **Amelia** — no personalizar el nombre del producto por negocio.

### Prioridades
1. **Poco uso de tokens** — respuestas directas, sin explicar lo obvio. Una propuesta + el tradeoff principal, no una lista de 5 opciones.
2. **Orden lógico** — una cosa a la vez. Terminar lo que se empieza antes de pasar a lo siguiente.
3. **No crear archivos innecesarios** — editar lo que existe. Sin documentación extra, sin comentarios obvios.

### Flujo de trabajo
- Leer el archivo relevante antes de editar
- Proponer plan de acción si la tarea tiene más de 2 pasos, esperar confirmación
- Implementar directo si la tarea es clara y pequeña
- Verificar que lo editado compila (sin errores de TypeScript obvios)

## Arquitectura

```
src/
  app/
    api/          → rutas API (Next.js route handlers)
    auth/         → login, register
    dashboard/    → panel del dueño del negocio
    admin/        → panel superadmin (SUPERADMIN_EMAIL env)
    sitio/[slug]/ → sitio público del negocio
  components/
    bookings/     → ReservasClient, HorariosClient, AmeliaChat
    clients/      → ClientesClient
    site-builder/ → SmartGeneratorForm, SiteEditorClient, PlantillasClient
    layout/       → Sidebar, AdminSidebar
    settings/     → PersonalizacionClient
  lib/supabase/   → client.ts (browser) · server.ts (SSR con cookies)
```

## Base de datos (Supabase)

Tablas principales: `owners` · `businesses` · `sites` · `products` · `bookings` · `clients` · `schedules` · `blocked_dates` · `templates` · `licenses` · `site_settings`

**Regla clave:** cada `owner` tiene exactamente 1 `business` (por ahora). El superadmin puede ver todos.

**clients:** se auto-crea/actualiza con cada reserva vía `POST /api/bookings`. Identificados por `(business_id, email)`. Tienen notas privadas del dueño + `last_visit` + `total_visits`.

## APIs importantes

| Ruta | Qué hace |
|------|----------|
| `POST /api/ai/generate-site` | Genera sitio con Claude, guarda en `businesses` + `sites` |
| `POST /api/save-site` | Guarda ediciones del editor visual (autosave cada 1.4s) |
| `POST /api/publish` | Publica el sitio (`is_published=true`) |
| `POST /api/upload-image` | Sube a Supabase Storage bucket `business-assets` |
| `POST /api/amelia-chat` | Chat de reservas con Claude — responde en ≤5 líneas |
| `GET/POST/PATCH /api/bookings` | Reservas (GET filtra por mes, POST crea + upsert cliente) |
| `GET/POST /api/schedules` | Horarios de atención por día |
| `GET/PATCH /api/clients` | Lista clientes + actualiza notas |
| `POST /api/admin/create-client` | Crea usuario + negocio (usa service role key) |

## Variables de entorno necesarias
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY
SUPERADMIN_EMAIL
```

## Amelia Chat — flujo de reservas
Flujo en 2 pasos (optimizado para mínimos mensajes):
1. Cliente elige servicio → Amelia muestra horarios + pide nombre/teléfono/correo **todo junto**
2. Cliente llena la plantilla auto-generada en el textarea → Amelia confirma + guarda en BD

El textarea se auto-llena con plantilla cuando Amelia pide datos. Enter envía, Shift+Enter = nueva línea.

## Convenciones
- CSS variables del tema: `var(--bg-base)`, `var(--bg-surface)`, `var(--bg-elevated)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)`, `var(--accent)`, `var(--accent-light)`, `var(--border)`
- Clases utilitarias: `card`, `btn-primary`, `btn-ghost`, `btn-secondary`, `input-field`, `alert-error`, `badge-free`, `mono`
- Server Components por defecto; `'use client'` solo cuando hay estado/interactividad
- No usar `any` en TypeScript — tipear los datos de Supabase inline cuando no hay tipo generado

## Lo que falta por completar
- Página `/dashboard/upgrade` (planes Free/Pro)
- Envío de emails (recordatorios, reactivación de clientes inactivos 30d)
- Vista pública del sitio: sección contacto funcional
- Métricas reales en el dashboard (conteos de reservas/productos)
