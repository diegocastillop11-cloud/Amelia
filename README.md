# Amelia — Constructor de sitios web con IA

## Setup inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Edita el archivo `.env.local` con tus credenciales reales:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
ANTHROPIC_API_KEY=sk-ant-...
SUPERADMIN_EMAIL=tu@email.com
```

### 3. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor → New Query**
3. Copia y ejecuta el contenido de `supabase-setup.sql`
4. Verifica en **Table Editor** que se crearon las tablas

### 4. Iniciar el servidor

```bash
npm run dev
```

---

## Flujo de uso

1. Ir a `http://localhost:3000/auth/register` y crear una cuenta
2. El sistema redirige automáticamente al **Dashboard**
3. En **Mi Sitio**, completar el formulario y hacer clic en "Generar con IA"
4. Revisar el preview, hacer ajustes y publicar

### Acceso al panel Admin

Asegúrate de que `SUPERADMIN_EMAIL` en `.env.local` coincide exactamente con tu email.
Al iniciar sesión con ese email, serás redirigido automáticamente a `/admin`.

---

## Solución de problemas

### El redirect no funciona

```bash
# Windows PowerShell
Remove-Item -Recurse -Force .next
npm run dev
```

### Variables undefined en producción (Vercel)

Configurar todas las variables en:
**Vercel Dashboard → Settings → Environment Variables**

### Error de TypeScript en el build

```bash
npm run build
# Revisar los errores antes de hacer deploy
```

---

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Estilos**: Tailwind CSS + DM Sans + Sora
- **Base de datos**: Supabase (PostgreSQL + Auth + RLS)
- **IA**: Claude API (Anthropic)
- **Deploy**: Vercel
