-- MIG 290 — In-app support tickets + templates (nelvyon_users.user_id is TEXT)
CREATE TABLE IF NOT EXISTS support_templates (
  id text PRIMARY KEY,
  category text NOT NULL CHECK (category IN ('billing', 'technical', 'feature_request', 'other')),
  title text NOT NULL,
  description text NOT NULL,
  auto_response text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES nelvyon_users (user_id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  category text NOT NULL CHECK (category IN ('billing', 'technical', 'feature_request', 'other')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  template_used text,
  auto_response text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_created ON support_tickets (user_id, created_at DESC);

INSERT INTO support_templates (id, category, title, description, auto_response)
VALUES
  (
    'billing_invoice',
    'billing',
    'No encuentro mi factura',
    'No puedo encontrar mi factura o recibo de pago',
    'Tus facturas están disponibles en Dashboard → Configuración → Facturación. Paddle (nuestro procesador de pagos) envía una copia automática al email de tu cuenta tras cada cobro. Si no la encuentras, revisa la carpeta de spam.'
  ),
  (
    'billing_refund',
    'billing',
    'Solicitar reembolso',
    'Quiero solicitar un reembolso por mi suscripción',
    'Procesamos reembolsos dentro de los 7 días posteriores al cargo según nuestra política en nelvyon.com/refund-policy. Para solicitar uno, por favor indica el motivo y lo gestionaremos en 24-48h hábiles.'
  ),
  (
    'billing_upgrade',
    'billing',
    'Cambiar mi plan',
    'Quiero cambiar a un plan diferente',
    'Puedes cambiar tu plan en cualquier momento desde Dashboard → Configuración → Plan. Los cambios aplican de forma inmediata y el cobro se prorratea automáticamente.'
  ),
  (
    'tech_agent_slow',
    'technical',
    'Un agente tarda demasiado',
    'Mi agente de IA está tardando más de lo normal',
    'Los agentes de IA procesan en cola. Los tiempos normales son 30-120 segundos según carga. Si lleva más de 5 minutos en estado "procesando", por favor indica el ID del job y lo investigaremos.'
  ),
  (
    'tech_integration',
    'technical',
    'Error al conectar integración',
    'No puedo conectar mi cuenta de Google/Meta/etc',
    'Para conectar integraciones ve a Dashboard → Integraciones. Si recibes un error de permisos, asegúrate de que la cuenta que conectas tiene permisos de administrador en la plataforma correspondiente.'
  ),
  (
    'tech_api',
    'technical',
    'Error en la API',
    'Recibo errores al usar la API de NELVYON',
    'Comprueba que tu API key está activa en Dashboard → API Keys. Los errores 429 indican que superaste el límite de tu plan. Los errores 5xx son transitorios — reintenta con backoff exponencial.'
  ),
  (
    'feature_request',
    'feature_request',
    'Sugerir nueva funcionalidad',
    'Quiero proponer una mejora o nueva característica',
    'Gracias por tu sugerencia. La añadimos a nuestro roadmap público en nelvyon.com/roadmap. Las features con más votos de la comunidad tienen prioridad en cada sprint.'
  ),
  (
    'other_general',
    'other',
    'Otra consulta',
    'Tengo una pregunta que no encaja en las otras categorías',
    'Hemos recibido tu mensaje. Nuestro sistema automático intentará ayudarte. Si la respuesta automática no resuelve tu duda, la escalamos al siguiente nivel.'
  )
ON CONFLICT (id) DO NOTHING;

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_select_own ON support_tickets;
CREATE POLICY support_tickets_select_own ON support_tickets
  FOR SELECT
  USING (user_id = auth.uid()::text);

DROP POLICY IF EXISTS support_tickets_insert_own ON support_tickets;
CREATE POLICY support_tickets_insert_own ON support_tickets
  FOR INSERT
  WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS support_tickets_update_own ON support_tickets;
CREATE POLICY support_tickets_update_own ON support_tickets
  FOR UPDATE
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
