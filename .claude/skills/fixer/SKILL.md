---
name: fixer
description: Método para arreglar bugs con evidencia real. Usar SIEMPRE que haya un bug, error, falla o regresión — disparadores: "bug", "error", "falla", "no funciona", "se rompió", "está roto", "arregla", "fix", "no carga", "pantalla en negro", "500", "401", "no me deja", "dejó de funcionar", "volvió a pasar". También cuando otra sesión o modelo afirme que algo "ya quedó arreglado" y haya que verificarlo. NO usar para features nuevas (→ plan) ni proyectos desde cero (→ arranque).
---

# Fixer — arreglar bugs con evidencia

"Debería funcionar" no es evidencia. Cada paso tiene un comando real asociado; los
comandos de este proyecto están en la sección **Comandos** del `CLAUDE.md` raíz. Si vas a
saltarte un paso, di cuál y por qué.

## 1. El método (en orden, sin saltos)

### Paso 1 — Reproducir primero
Haz que el bug pase frente a ti ANTES de tocar código. Si no puedes reproducirlo, todavía
no lo entiendes.

- UI: levanta el dev server (`preview_start` con el nombre de `.claude/launch.json`) y
  navega al flujo exacto.
- API: reproduce con `curl`/`Invoke-RestMethod` contra `http://localhost:<puerto>/api/...`
  con `Authorization: Bearer <token>` si la ruta lo exige.
- Solo en producción: reproduce contra `https://www.<dominio>/api/...` (con `www.` si el
  ápex redirige con 308) y mira los logs del hosting mientras lo haces.
- Reportado por un usuario y no reproducible: pide pasos exactos, navegador/dispositivo y
  captura de consola. No inventes la reproducción.

### Paso 2 — Causa raíz, no síntoma
Pregunta "¿por qué?" hacia atrás hasta el código que DECIDE, no el que muestra el error.
El componente que pinta el mensaje casi nunca es el culpable; el hook, el service o la
fila de la base de datos que alimentó ese estado sí.

Recorrido típico: `routes/*.ts` → `controllers/*.ts` → `services/*.ts` → tabla.
En el frontend: página → hook → `lib/api.ts`.

### Paso 3 — Arreglo mínimo
Solo lo que la causa raíz exige. Nada de refactors "ya que estamos", renombres ni
mejoras de estilo vecinas. Lo demás se anota aparte (o `spawn_task`).

### Paso 4 — Probar con evidencia
Corre EL CASO EXACTO que fallaba y pega el output. Evidencia mínima:

1. El flujo que fallaba, ahora pasando (output visible).
2. Suite de tests completa en verde.
3. Typecheck de frontend y backend en verde (el build del hosting corre `tsc`).

Si el bug era reproducible, agrega un test de regresión en
`frontend/src/test/regressions.test.tsx` con formato `ISSUE-NNN: descripción`.

### Paso 5 — Regla contra el "ya quedó"
Si otra sesión, modelo, commit o el propio usuario dice que algo "ya está arreglado":
busca la evidencia (test, respuesta HTTP, log). **Sin output, se trata como NO
arreglado** y se vuelve al Paso 1. Un commit que dice "fix" no es evidencia.

### Paso 6 — Reporte fiel
Si la prueba falla, se dice con el output completo. Si un paso se saltó, se dice cuál.
Nunca "listo" con tests fallando o sin haber corrido nada.

## 2. Dónde mirar logs

- Frontend local: consola del navegador (`read_console_messages`).
- Backend local: stdout del dev server (`preview_logs`).
- Producción (Vercel): `vercel logs <url-del-deployment>` o Dashboard → Deployments →
  Functions. Son efímeros: reproducir MIENTRAS se miran.
- Auth/DB: Supabase → Authentication → Logs, y Table Editor.
- Webhooks de pago: responden 200 siempre por diseño; solo los logs de la función dicen
  si fallaron por dentro.

## 3. Gotchas que ya costaron horas (stack Vercel + Supabase)

- Ápex que responde **308 → www**: clientes HTTP y emisores de webhooks pierden la
  petición. Probar y configurar siempre contra `www`.
- Preview en negro con `supabaseUrl is required` = faltan env vars de Preview en Vercel.
- `"Unexpected end of JSON input"` al validar token = env var con basura pegada (`\r\n`
  literal o BOM). Verificar con `vercel env pull .tmp_env` + `od -c`, y borrar el archivo.
- Login OAuth que vuelve a `localhost:3000` = falta la URL en Supabase → Authentication →
  URL Configuration (Site URL y Redirect URLs). No es bug de código.
- Un conteo que se queda clavado en 1000 = Supabase corta en 1000 filas sin avisar.
  Paginar con `.range()` y `order` estable.
- 401 "misterioso": sesión revocada por login en otro dispositivo o token expirado sin
  refresh.

Cada gotcha nuevo que descubras va al `CLAUDE.md` el mismo día, con commit `docs:`.
