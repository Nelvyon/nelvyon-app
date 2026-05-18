-- MIG 292 — Public changelog + roadmap
CREATE TABLE IF NOT EXISTS changelog_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL CHECK (type IN ('feature', 'improvement', 'fix', 'security')),
  published_at timestamptz NOT NULL DEFAULT now(),
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_changelog_entries_published ON changelog_entries (published_at DESC);

CREATE TABLE IF NOT EXISTS roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  status text NOT NULL CHECK (status IN ('planned', 'in_progress', 'done')),
  category text NOT NULL CHECK (category IN ('core', 'integrations', 'ai', 'billing', 'ux')),
  votes integer NOT NULL DEFAULT 0,
  eta text,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roadmap_items_public ON roadmap_items (status, votes DESC, created_at DESC);

INSERT INTO changelog_entries (version, title, body, type, published_at)
VALUES
  (
    '1.0.0',
    'Lanzamiento de NELVYON',
    'Primera versión pública de NELVYON. Agentes de IA para marketing, SEO, contenido, publicidad y más. Dashboard completo, pagos con Paddle, soporte multi-idioma.',
    'feature',
    now()
  ),
  (
    '1.0.1',
    'Sistema de soporte in-app',
    'Widget de soporte flotante con plantillas automáticas. Respuestas automáticas para las consultas más frecuentes.',
    'feature',
    now()
  ),
  (
    '1.0.2',
    'NPS y feedback loop',
    'Sistema de Net Promoter Score automático a los 7 días. Botón de feedback visible en todo el dashboard.',
    'improvement',
    now()
  );

INSERT INTO roadmap_items (title, description, status, category, votes, eta)
VALUES
  (
    'Voz: NELVYON Voice',
    'Controla NELVYON con tu voz, como Jarvis. Sin escribir nada.',
    'planned',
    'ai',
    0,
    'Q3 2026'
  ),
  (
    'OAuth TikTok Ads',
    'Conecta tu cuenta de TikTok Ads y gestiona campañas desde NELVYON.',
    'in_progress',
    'integrations',
    0,
    'Mayo 2026'
  ),
  (
    'OAuth LinkedIn Ads',
    'Conecta LinkedIn Ads para campañas B2B automatizadas.',
    'in_progress',
    'integrations',
    0,
    'Mayo 2026'
  ),
  (
    'API pública v1',
    'Acceso programático a todos los agentes de NELVYON via REST API con API keys.',
    'planned',
    'core',
    0,
    'Q3 2026'
  ),
  (
    'App móvil iOS + Android',
    'Dashboard nativo para gestionar tus agentes desde el móvil.',
    'planned',
    'ux',
    0,
    'Q4 2026'
  ),
  (
    'Marketplace de agentes',
    'Crea y vende tus propios agentes de IA en el marketplace de NELVYON.',
    'planned',
    'core',
    0,
    'Q4 2026'
  ),
  (
    'White-label',
    'Ofrece NELVYON con tu propia marca a tus clientes.',
    'planned',
    'core',
    0,
    'Q1 2027'
  ),
  (
    'Agentes de email marketing',
    'Agentes especializados en campañas de email: segmentación, copy, A/B testing.',
    'planned',
    'ai',
    0,
    'Q3 2026'
  );

ALTER TABLE changelog_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE changelog_entries FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS changelog_entries_select_public ON changelog_entries;
CREATE POLICY changelog_entries_select_public ON changelog_entries
  FOR SELECT
  USING (true);

ALTER TABLE roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE roadmap_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS roadmap_items_select_public ON roadmap_items;
CREATE POLICY roadmap_items_select_public ON roadmap_items
  FOR SELECT
  USING (true);
