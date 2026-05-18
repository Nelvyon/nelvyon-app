CREATE TABLE quality_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  attempt integer NOT NULL DEFAULT 1,
  score integer NOT NULL,
  feedback text,
  input jsonb,
  output jsonb,
  passed boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_quality_scores_user ON quality_scores(user_id);
CREATE INDEX idx_quality_scores_agent ON quality_scores(agent_id);
CREATE INDEX idx_quality_scores_passed ON quality_scores(passed);
CREATE INDEX idx_quality_scores_score ON quality_scores(score);
