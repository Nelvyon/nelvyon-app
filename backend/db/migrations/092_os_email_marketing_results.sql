CREATE TABLE email_marketing_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  sector text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_email_marketing_results_user_id ON email_marketing_results(user_id);
CREATE INDEX idx_email_marketing_results_agent_id ON email_marketing_results(agent_id);
CREATE INDEX idx_email_marketing_results_created_at ON email_marketing_results(created_at DESC);
