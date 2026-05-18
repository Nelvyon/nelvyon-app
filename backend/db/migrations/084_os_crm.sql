CREATE TABLE crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  industry text,
  stage text NOT NULL DEFAULT 'lead',
  score integer NOT NULL DEFAULT 0,
  tags text[],
  notes text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_crm_contacts_user ON crm_contacts(user_id);
CREATE INDEX idx_crm_contacts_stage ON crm_contacts(stage);
CREATE INDEX idx_crm_contacts_score ON crm_contacts(score);

CREATE TABLE crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES crm_contacts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  type text NOT NULL,
  summary text,
  agent_id text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_crm_activities_contact ON crm_activities(contact_id);
CREATE INDEX idx_crm_activities_user ON crm_activities(user_id);
CREATE INDEX idx_crm_activities_type ON crm_activities(type);
