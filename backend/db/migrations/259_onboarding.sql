-- Client onboarding progress (aligned with nelvyon_users.user_id as uuid)
CREATE TABLE IF NOT EXISTS onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES nelvyon_users(user_id) ON DELETE CASCADE,
  welcome_email_sent boolean NOT NULL DEFAULT false,
  profile_completed boolean NOT NULL DEFAULT false,
  first_agent_used boolean NOT NULL DEFAULT false,
  plan_activated boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_user_id ON onboarding(user_id);
