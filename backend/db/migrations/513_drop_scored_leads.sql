-- 513: Drop legacy scored_leads (KI-015).
-- SSOT lead scoring: saas_lead_scoring_* via SaasLeadScoringService / /api/saas/lead-scoring.
-- Legacy HTTP /api/saas/lead-scoring/leads already returns 410 Gone (ADR-023).
-- Safe: IF EXISTS — no-op if table already absent.

DROP TABLE IF EXISTS scored_leads;
