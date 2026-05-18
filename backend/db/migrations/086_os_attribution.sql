CREATE TABLE attribution_touchpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  contact_id uuid REFERENCES crm_contacts(id) ON DELETE SET NULL,
  channel text NOT NULL,
  campaign text,
  source text,
  medium text,
  content text,
  converted boolean NOT NULL DEFAULT false,
  revenue numeric NOT NULL DEFAULT 0,
  occurred_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_attribution_touchpoints_user ON attribution_touchpoints(user_id);
CREATE INDEX idx_attribution_touchpoints_channel ON attribution_touchpoints(channel);
CREATE INDEX idx_attribution_touchpoints_converted ON attribution_touchpoints(converted);
CREATE INDEX idx_attribution_touchpoints_occurred_at ON attribution_touchpoints(occurred_at);

CREATE TABLE attribution_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  model text NOT NULL,
  period_start timestamptz,
  period_end timestamptz,
  results jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_attribution_reports_user ON attribution_reports(user_id);
CREATE INDEX idx_attribution_reports_model ON attribution_reports(model);
