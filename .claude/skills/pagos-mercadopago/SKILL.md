---
name: pagos-mercadopago
description: Reglas verificadas con dinero real para cobrar suscripciones con MercadoPago (Chile/LATAM) y PayPal. Usar SIEMPRE antes de tocar checkout, webhooks, planes, suscripciones, comprobantes o estados de pago — disparadores: "pagos", "MercadoPago", "MP", "PayPal", "suscripción", "webhook", "cobro", "checkout", "no se activó el pago", "plan mensual".
---

# Pagos con MercadoPago y PayPal

Todo lo de abajo se verificó pagando de verdad. **Estos puntos fallan en silencio**: no
cambiar nada sin volver a probar con un pago real.

## Máquina de estados (`subscriptions.status`)

`trial` (al registrarse) → `pending_payment` (checkout creado) → `active` (pago aprobado) →
`expired` | `cancelled`. Una fila por usuario (`UNIQUE user_id`). Flags: `is_test`,
`is_exempt`, `payment_suspended`. El backend bloquea funciones de pago con HTTP 402 si el
estado no es `trial` ni `active`.

## MercadoPago Preapproval (suscripción recurrente)

1. **No se puede crear la suscripción por API** en Chile: `POST /preapproval` con
   `preapproval_plan_id` responde `400 card_token_id is required`; sin plan, `500`. Única
   vía: mandar al usuario al `init_point` del **plan** (`GET /preapproval_plan/{id}`).
2. Por esa vía **no viaja `external_reference`**. La asociación usuario↔pago se hace a la
   vuelta: MP redirige al `back_url` con el `preapproval_id` y el frontend llama a
   `POST /subscription/link-preapproval`. Esa ruta es pública: **esperar a que Supabase
   restaure la sesión** antes de llamarla, o sale sin token y el pago queda huérfano.
3. MP mezcla los nombres de los parámetros de vuelta (id de suscripción bajo
   `external_reference`, `preference-id` con guion). La página de retorno acepta todas las
   variantes.
4. En cobros de suscripción `metadata` llega vacío; el preapproval está en
   `point_of_interaction.transaction_data.subscription_id`. `payer_email` del preapproval
   también viene vacío.
5. `status: 'authorized'` = ya cobró (al instante). Usar `next_payment_date` como
   vencimiento, no sumar 30 días.
6. `summarized` viene en `null` y `/authorized_payments/search` devuelve `[]` aun con cobros
   reales. No construir nada sobre eso.
7. El plan queda atado a la cuenta que lo creó y su `back_url` no se edita. Cambiar de
   cuenta o dominio = plan nuevo + actualizar `MP_PREAPPROVAL_PLAN_ID`.
8. No se puede probar pagándose a uno mismo: se necesita una segunda cuenta de MP como
   compradora.

## Webhooks

- URL con `www` (`https://www.<dominio>/api/subscription/webhook`): el ápex responde 308 y
  muchos emisores no siguen redirects.
- Eventos MP: **Pagos (legacy)** + **Planes y suscripciones**. El resto ensucia logs.
- Responden **siempre 200** y validan consultando el pago real a la API de MP (no confiar
  en el body).
- Un `MP_WEBHOOK_SECRET` que no coincide hace que se descarten todas las notificaciones en
  silencio. Configurarlo solo verificando después con un pago real.
- Como respaldo, un cron diario de **reconciliación** consulta los pagos recientes en MP y
  corrige estados que el webhook no alcanzó a actualizar.

## Crons recomendados (diarios)

Recordatorio de vencimiento, recordatorio de fin de trial, expirar trials vencidos,
revertir `pending_payment` antiguos, reconciliar pagos, resumen diario de registros.
Protegidos con `CRON_SECRET`.

## Comprobantes

Cada pago aprobado inserta en `payment_receipts` (idempotente por `mp_payment_id` /
`paypal_subscription_id`) y envía comprobante por email.

## Verificación antes de dar por bueno cualquier cambio de pagos

1. Script smoke que confirma de qué cuenta es el token y si el plan le pertenece.
2. Pago real de punta a punta contra un **Preview**: checkout → retorno → `link-preapproval`
   → webhook → `status = 'active'` → comprobante enviado.
3. Revisar los logs de la función durante el pago.
