CREATE TABLE IF NOT EXISTS generated_logos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  brand_name VARCHAR(512) NOT NULL,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  revised_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_logos_user_id ON generated_logos(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_logos_created_at ON generated_logos(created_at);
