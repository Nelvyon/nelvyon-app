-- Performance indexes for workspace-scoped list endpoints (FRENTE 45)

CREATE INDEX IF NOT EXISTS idx_dialer_calls_ws_created ON dialer_calls (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dialer_calls_ws_status ON dialer_calls (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_tickets_ws_created ON tickets (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_ws_status ON tickets (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_invoices_ws_created ON invoices (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_ws_status ON invoices (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_forms_ws_created ON forms (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forms_ws_status ON forms (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_form_responses_form ON form_responses (form_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_qr_codes_ws_created ON qr_codes (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_scans_qr ON qr_scans (qr_id, scanned_at DESC);

CREATE INDEX IF NOT EXISTS idx_crm_contacts_ws_created ON crm_contacts (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_deals_ws_created ON crm_deals (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_activities_ws_created ON crm_activities (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_ws_created ON bookings (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_ws_status ON bookings (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_webinars_ws_created ON webinars (workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_ws_status ON subscriptions (workspace_id, status);

CREATE INDEX IF NOT EXISTS idx_marketplace_items_active ON marketplace_items (active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_buyer ON marketplace_purchases (buyer_workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_ws ON push_subscriptions (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON webhook_deliveries (endpoint_id, created_at DESC);
