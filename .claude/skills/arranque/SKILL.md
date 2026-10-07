---
name: arranque
description: Manual para arrancar un proyecto nuevo desde cero, destilado de las cicatrices reales de Ergania. Usar cuando el usuario diga "proyecto nuevo", "nueva app", "empecemos", "arranca", "MVP", "idea nueva", "scaffolding", cuando el directorio de trabajo esté vacío o casi vacío, o cuando un repo tenga cero o un solo commit. NO usar para agregar features a un proyecto ya en marcha.
---

# Arranque de proyecto

Este manual existe porque en Ergania **ningún dolor vino de sobre-ingeniería; todos
vinieron de infraestructura básica que llegó después del código**: git apareció con la
app ya terminada (y con datos personales horneados en la historia), el deploy llegó
tarde y cobró su deuda en una sola noche de 6 fixes seguidos, y las decisiones no
tomadas (proveedor de IA, cómo generar PDFs) se pagaron en zigzags de commits.

Regla madre: **una decisión reversible tomada ya vale más que la decisión "perfecta"
tomada después.** Lo único que NO es reversible: la historia de git y los datos que
entren en ella.

## Fase 0 — Antes de escribir una línea de código

Pregunta al usuario (si no lo dijo ya) y NO avances sin las tres respuestas:

1. **¿Qué problema resuelve?** Una frase. Si necesita dos, no está claro todavía.
2. **¿Quién lo usa?** Persona concreta, no "usuarios".
3. **¿Cuál es la primera cosa visible que demuestra que funciona?** El "hola mundo
   del negocio": la pantalla o respuesta mínima que probaría la idea. TODO el día 1
   apunta a deployar eso.

Escribe las tres respuestas en el CLAUDE.md del proyecto nuevo, arriba de todo.
Son el criterio para decir "no" al alcance que crece solo: si una feature no acerca
la primera cosa visible, va a una lista de "después", no al código.

## Fase 1 — Decisiones de stack (mínimo y aburrido)

Elegir tecnología aburrida, documentada y reemplazable. **Anotar el porqué de cada
elección en una línea** dentro del CLAUDE.md — en Ergania los pivotes caros
(4 cambios de proveedor de IA en 2 días, 6 enfoques de PDF) fueron decisiones que
nunca se escribieron antes de codear.

Default sugerido (el stack probado en Ergania — cada pieza es intercambiable,
confirmar con el usuario cuál aplica):

| Pieza | Default | Porqué |
|---|---|---|
| Frontend | React + Vite + TailwindCSS | Arranque en segundos, HMR, cero config |
| Backend | Express + TypeScript como serverless function | Un solo `api/index.ts`, escala sola |
| Auth/DB | Supabase | Auth + Postgres + RLS sin servidor propio |
| Deploy | Vercel | Push a master = deploy; previews por rama |
| Pagos (si cobra) | MercadoPago Checkout Pro | Funciona en LATAM; no usar Preapproval |

**Decisiones que se toman ANTES de codear, no durante** (cicatrices directas):

- **¿Dónde corre en producción?** El backend de Ergania se escribió sin saberlo y
  hubo que adaptarlo a serverless después. Si es serverless: nada de Chrome headless,
  ni binarios pesados, ni filesystem persistente, ni procesos largos. Verificar las
  restricciones del runtime ANTES de elegir cualquier librería pesada (la saga
  Puppeteer→chromium-min→print→jspdf→pdfmake costó 6 commits y dejó 3 dependencias
  muertas en package.json).
- **Si usa IA: ¿qué proveedor y quién paga?** (¿API key del servidor o del usuario?)
  Decidirlo y anotarlo. En Ergania esto pivoteó 4 veces.
- **¿Genera artefactos pesados (PDF, imágenes, video)?** ¿Dónde: cliente o servidor?
  En serverless casi siempre la respuesta es: en el cliente.

## Fase 2 — Día 1 no negociable (en este orden)

1. **`git init` ANTES del primer archivo de código.** No al final, no "cuando esté
   listo". La historia perdida no se recupera y lo commiteado no se borra.
2. **`.gitignore` ANTES del primer commit**: `node_modules/`, `dist/`, `.env*`,
   `*.log`, y cualquier carpeta de datos/outputs. **Revisar el primer commit archivo
   por archivo antes de hacerlo**: el initial commit de Ergania incluyó CVs reales
   en PDF con nombre y postulaciones — datos personales que quedaron en la historia
   de git para siempre.
3. **Primer commit**: `.gitignore` + README de una línea. Recién ahí, scaffold.
4. **CLAUDE.md desde el día 1** con: el problema/usuario/primera-cosa-visible de la
   Fase 0, comandos reales (dev, build, test, deploy), estructura de carpetas
   explicada, convenciones (idioma del copy, estilo de commits), stack con porqués,
   y lista de env vars requeridas. En Ergania llegó junto con el deploy, no con el
   proyecto — todo lo anterior quedó sin documentar.
5. **Un solo comando para desarrollo** (`npm run dev` levanta todo, con
   `concurrently` si hay frontend+backend).
6. **Validación de env vars al boot, fail-fast y ruidosa**: al arrancar, verificar
   que cada var requerida existe, hacerle `trim()`, limpiar BOM, y **rechazar con
   mensaje claro si contiene `\r`, `\n` o el texto literal `\r\n`** (pegado desde
   un dashboard). En Ergania la basura invisible en `SUPABASE_URL` produjo errores
   crípticos ("Unexpected end of JSON input") y mordió DOS veces con 9 días de
   diferencia. Diez líneas de validación valen horas de debugging.
7. **Deploy el día 1, aunque sea un "hola".** Antes de la primera feature, no
   después de la décima. El deploy tardío junta toda su deuda (config, env vars,
   adaptación al runtime) y la cobra de una vez, la peor noche posible. Con el
   "hola" en producción, cada feature siguiente se deploya sobre terreno conocido.
8. **Ramas + PR desde el día 1**, no desde la semana 2. Commits chicos, mensajes
   convencionales (`feat:`, `fix:`, `docs:`). Nunca debuggear en producción a punta
   de commits "log para debug" en master.

## Fase 3 — Reglas de crecimiento (para que el arranque no se pudra)

- **Cero sobre-ingeniería**: nada de capas, abstracciones ni "por si acaso" para
  problemas que todavía no existen. Un controller, un service, un archivo — hasta
  que duela.
- **Pero cuando duela, dividir**: si un archivo pasa de ~400-500 líneas o una
  segunda feature aterriza en el mismo archivo, separar AHORA. En Ergania el
  controller llegó a 2.500 líneas y una página a 1.470 porque "después lo ordeno"
  nunca llegó.
- **Cada bug de producción deja un test de regresión.** No test-first dogmático:
  candados donde ya dolió (patrón `regressions.test.tsx`).
- **Cada gotcha descubierto va al CLAUDE.md el mismo día**, con commit `docs:`.
  Es lo mejor que hizo Ergania: convierte horas de debugging en párrafos que el
  próximo agente lee en segundos.
- **Scripts de debug van a `scratch/` (gitignoreado) o se borran** — no viven en
  la raíz del repo.
- **Al abandonar un enfoque, desinstalar sus dependencias en el mismo commit.**
  Ergania aún carga puppeteer-core, chromium-min y pdfkit de enfoques muertos.

## Checklist de salida del arranque

El arranque terminó SOLO cuando todo esto es verdad:

- [ ] Problema, usuario y "primera cosa visible" escritos en CLAUDE.md.
- [ ] `git init` fue antes que el código; primer commit revisado archivo por
      archivo, sin datos personales ni binarios.
- [ ] `.gitignore` cubre env, builds, logs y carpetas de datos/outputs.
- [ ] CLAUDE.md con comandos reales, estructura, convenciones, stack con porqués
      y env vars requeridas.
- [ ] Cada elección de stack tiene su porqué en una línea; decisiones de runtime,
      proveedor de IA y artefactos pesados tomadas ANTES de codear.
- [ ] `npm run dev` (o equivalente) levanta todo con un comando.
- [ ] Env vars validadas al boot: trim, BOM, `\r\n`, fail-fast con mensaje claro.
- [ ] Hay una URL de producción viva con al menos un "hola" — deploy day 1.
- [ ] El flujo rama → PR → deploy funciona y se usó al menos una vez.
- [ ] Cero capas especulativas; cero dependencias instaladas "por si acaso".
- [ ] Documentado en CLAUDE.md cómo se agregan env vars nuevas al hosting
      (en Vercel: los previews las escopean POR RAMA — toda rama nueva sale
      en negro hasta agregarlas a mano para esa rama).
