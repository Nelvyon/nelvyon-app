-- MIG 308: Stripe billing (replaces Paddle columns for new checkouts)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id
  ON subscriptions(stripe_subscription_id);

-- Backfill from legacy Paddle IDs where present
UPDATE subscriptions
SET
  stripe_subscription_id = COALESCE(stripe_subscription_id, paddle_subscription_id),
  stripe_customer_id = COALESCE(stripe_customer_id, paddle_customer_id)
WHERE paddle_subscription_id IS NOT NULL
  AND (stripe_subscription_id IS NULL OR stripe_customer_id IS NULL);
