-- MIG 324: Stripe webhook idempotency table (shared by TS + Python handlers)
-- Ensures duplicate Stripe event deliveries are ignored.
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  id               bigserial PRIMARY KEY,
  stripe_event_id  text NOT NULL,
  event_type       text NOT NULL,
  status           text NOT NULL DEFAULT 'received', -- received | processing | processed
  received_at      timestamptz NOT NULL DEFAULT now(),
  processed_at     timestamptz,
  error_message    text
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_stripe_webhook_events_event_id
  ON stripe_webhook_events(stripe_event_id);

CREATE INDEX IF NOT EXISTS ix_stripe_webhook_events_stripe_event_id
  ON stripe_webhook_events(stripe_event_id);
