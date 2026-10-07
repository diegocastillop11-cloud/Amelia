---
name: deploy-seguro
description: Llevar un cambio a producción sin que lo vean usuarios antes de verificarlo — rama, Preview de Vercel, verificación, merge y registro. Usar cuando el usuario diga "súbelo", "deploya", "pásalo a producción", "mergea", "publica el cambio", "haz push", o al terminar un fix o feature. NO usar para cambios que todavía no pasan los tests (→ fixer).
---

# Deploy seguro

Regla: **nunca push de código directo a `master`/`main`.** Un push directo deploya a
producción sin red; si algo sale mal, ya lo vieron usuarios reales.

Excepción: cambios mecánicos sin lógica ni UI (docs, bump de versión, binarios). Si hay
duda, preguntar.

## Pasos

1. **Gate local** (todos en verde, con output pegado):
   - Tests: `cd frontend && npm test` (y `cd backend && npm test` si existen).
   - Typecheck: `npx tsc --noEmit` en frontend y backend.
   - Build completo: `cd frontend && npm run build` (es lo que corre el hosting).
2. **Rama:** si estás en la rama principal, crea `feature/<nombre>` o `fix/<nombre>`.
   Commits convencionales en español (`feat(scope): ...`, `fix(scope): ...`).
3. **Push de la rama** y espera el deploy de Preview (`vercel ls` o el check del PR).
   - Si sale en negro o con `supabaseUrl is required`: faltan env vars de Preview para esa
     rama. Agregarlas (dashboard → Settings → Environment Variables, "Preview" sin
     restringir rama) y redeployar con un commit vacío.
4. **Verificar el Preview**, no el localhost:
   - `GET <preview-url>/api/health` responde ok.
   - El flujo cambiado, recorrido en el navegador (`preview_start` con la URL), sin errores
     en consola.
   - Si toca login con Google: la URL de Preview debe estar permitida en Supabase
     (`https://*.vercel.app/**`).
5. **Review:** `/review` (o `/code-review`) sobre el diff. Sin hallazgos graves.
6. **Merge** a la rama principal (PR o `git merge` + push). Vercel deploya solo.
7. **Verificar producción:** `GET https://www.<dominio>/api/health` y el flujo cambiado.
8. **Registrar el cambio** en la bitácora interna, en lenguaje para no técnicos:
   ```bash
   node scripts/log-report.mjs --tipo <correccion|implementacion|plan> --titulo "..." --contenido "..." --checklist "item 1|item 2"
   ```
9. **Si hay app móvil** y el cambio tocó `frontend/`: subir versión en sus 3 lugares y
   recompilar el APK según el procedimiento del `CLAUDE.md`.

## Reporte final al usuario

Qué cambió, URL del Preview verificado, resultado de los tests (números reales), commit
mergeado y estado de producción. Si algún paso se saltó, decir cuál y por qué.
