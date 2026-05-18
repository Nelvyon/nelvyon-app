CREATE TABLE client_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  brand_name text NOT NULL,
  brand_voice text,
  target_audience text,
  industry text,
  competitors text[],
  usp text,
  colors text[],
  keywords text[],
  past_results jsonb NOT NULL DEFAULT '{}',
  preferences jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, brand_name)
);
CREATE INDEX idx_client_profiles_user ON client_profiles(user_id);
CREATE INDEX idx_client_profiles_industry ON client_profiles(industry);
