CREATE TABLE agencycert_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agent_id text NOT NULL,
  sector text NOT NULL,
  input jsonb NOT NULL,
  output jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agencycert_results_user_id ON agencycert_results(user_id);
CREATE INDEX idx_agencycert_results_agent_id ON agencycert_results(agent_id);
CREATE INDEX idx_agencycert_results_created_at ON agencycert_results(created_at DESC);

CREATE TABLE agency_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  nivel text NOT NULL,
  estado text NOT NULL,
  score numeric NOT NULL,
  badge_url text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_agency_certifications_agency_id ON agency_certifications(agency_id);
CREATE INDEX idx_agency_certifications_nivel ON agency_certifications(nivel);
CREATE INDEX idx_agency_certifications_estado ON agency_certifications(estado);
CREATE INDEX idx_agency_certifications_expires_at ON agency_certifications(expires_at);
