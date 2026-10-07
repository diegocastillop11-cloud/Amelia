---
name: plan
description: Planear una función nueva explorando el código primero. Usar cuando el usuario pida agregar una feature, mejora o cambio de comportamiento — "agreguemos", "quiero que la app haga X", "cómo implementamos", "planea", "diseña esta función" — ANTES de escribir código. NO usar para bugs (→ fixer), proyectos desde cero (→ arranque) ni cambios triviales de una línea.
---

# Planear una función

Regla madre: **nunca proponer sin explorar.** Un plan escrito antes de leer el código es
ficción con formato de plan.

Segunda regla: **si una pregunta puede cambiar el plan, se hace ANTES de escribirlo; si no
lo cambia, se decide, se anota la decisión y se sigue.** Nada de "¿quieres que…?" a mitad
de ejecución.

## Fase 1 — Explorar según la zona

| Zona | Leer primero |
|---|---|
| UI existente | La página en `frontend/src/pages/`, sus tipos en `frontend/src/types/`, su test en `frontend/src/test/` |
| Endpoint | El router en `backend/src/routes/`, el handler en `controllers/` (solo la sección relevante si es grande) y el service que usa |
| Datos / schema | La última migración en `supabase/migrations/` y las funciones del service que tocan esa tabla |
| IA | El helper de cliente LLM existente y el manejo de errores de IA — no inventar otra infraestructura |
| Auth / pagos | `lib/AuthContext.tsx`, `hooks/useSubscription.ts`, `services/subscriptionService.ts` |
| Navegación | `frontend/src/App.tsx` y el sidebar/layout |
| Copy público | La landing y las reglas de copy del `CLAUDE.md` |

Confirmar con la exploración los patrones que el plan debe respetar:
- Handler: `getUser(req)` → try/catch → `res.status(...).json({ error: mensaje })`.
- El frontend llama al backend solo vía `lib/api.ts` (Bearer token automático).
- Todo corre en una sola función serverless: sin estado en memoria entre requests, sin
  workers; lo periódico va por crons de Vercel (1×/día en plan hobby).

## Fase 2 — Preguntas obligatorias (respondidas por escrito en el plan)

1. **¿Cuál es el problema real?** Si ya se resuelve con algo existente, decirlo antes.
2. **¿Qué es lo más pequeño que lo resuelve?** Normalmente: un endpoint + una sección de UI
   en una página existente. Página o tabla nueva solo si es inevitable.
3. **¿Qué se rompe con este cambio?**
   - Tabla nueva con datos de usuario → migración nueva, RLS activado, entra al
     backup/export si existe, y cascada al borrar cuenta.
   - Feature con IA → gating de suscripción, límites de uso en trial, costo por usuario.
   - Archivo de más de ~500 líneas → el código nuevo va a un archivo propio.
   - Rama nueva → env vars de Preview en el hosting.
4. **Casos límite:** cuenta nueva sin datos, respuesta de IA malformada, idioma, y datos de
   otro usuario (todo query filtra por `user_id`).
5. **¿Cómo verificamos?** Comandos concretos por paso, no "se testeará".
6. **¿Qué NO haremos y por qué?** Lista explícita contra el alcance que crece solo.

## Fase 3 — Formato del plan

```
## Plan: <nombre>
**Problema real:** ...
**Lo mínimo que lo resuelve:** ...
**Decisiones tomadas:** ...
**No haremos:** ... porque ...

1. <paso> — Verifica: <comando o acción>
2. ...
```

- Cada paso deja el repo compilando y los tests verdes. Orden típico: migración → service
  → controller + route → tipos → UI → test.
- Rama `feature/<nombre-corto>`. Commits convencionales en español: `feat(scope): ...`.
- Migraciones primero y solo aditivas (`ADD COLUMN`, `CREATE TABLE`); nada destructivo en
  el mismo PR que las usa.

## Fase 4 — Definición de "quedó"

Tests verdes + typecheck de front y back + build completo + flujo visto funcionando en el
Preview + `/review` sin hallazgos graves. Recién ahí se mergea (ver skill `deploy-seguro`).
