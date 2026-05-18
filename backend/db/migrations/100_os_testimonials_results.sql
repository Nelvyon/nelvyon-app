CREATE TABLE testimonials_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  sector text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_testimonials_results_user_id ON testimonials_results(user_id);
CREATE INDEX idx_testimonials_results_agent_id ON testimonials_results(agent_id);
CREATE INDEX idx_testimonials_results_created_at ON testimonials_results(created_at DESC);
