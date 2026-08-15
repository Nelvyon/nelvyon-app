-- 523 — Proteccion contra eventos Stripe fuera de orden.
--
-- PROBLEMA (demostrado con test ejecutable antes de este fix)
-- ----------------------------------------------------------
-- Stripe NO garantiza el orden de entrega de webhooks; lo documenta. El guard
-- de idempotencia del repo opera sobre `stripe_event_id`, asi que un evento con
-- OTRO id pasa limpio aunque sea anterior. `upsertSubscription` persistia con
-- `ON CONFLICT (user_id) DO UPDATE SET plan = EXCLUDED.plan, ...` SIN condicion
-- de recencia, de modo que un evento antiguo sobrescribia uno reciente:
--
--   * un `subscription.updated` antiguo con `agency`, entregado tarde tras uno
--     con `starter`, devolvia al usuario un plan que ya no paga;
--   * una suscripcion cancelada revivia a `active`.
--
-- SOLUCION
-- --------
-- Se persiste la recencia del ultimo evento Stripe aplicado. La comparacion se
-- hace en la MISMA sentencia que muta (ver `upsertSubscription`), no en JS: un
-- SELECT-comparar-UPDATE abriria una ventana TOCTOU entre webhooks concurrentes.
--
-- `last_stripe_event_id` se guarda para trazabilidad y para el desempate: Stripe
-- puede emitir varios eventos en el MISMO segundo, y `evt_...` no es una
-- secuencia cronologica, asi que no se puede inferir orden de el. La politica
-- ante empate exacto de timestamp es NO degradar el estado ya aplicado — se
-- conserva lo escrito y el evento queda registrado en `stripe_webhook_events`
-- para reconciliacion. Inventar un orden seria peor que admitir que no existe.
--
-- Retrocompatible: las filas existentes quedan con NULL, y la condicion trata
-- NULL como "sin evento aplicado", de modo que el primer evento posterior a la
-- migracion siempre entra.

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS last_stripe_event_at TIMESTAMPTZ;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS last_stripe_event_id TEXT;

COMMENT ON COLUMN subscriptions.last_stripe_event_at IS
  'created del ultimo evento Stripe aplicado. Rechaza eventos anteriores en la propia sentencia.';
COMMENT ON COLUMN subscriptions.last_stripe_event_id IS
  'event.id del ultimo evento aplicado. Trazabilidad; NO es orden cronologico.';
