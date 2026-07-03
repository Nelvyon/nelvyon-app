-- 498 — Delivery certificate PDF audit metadata
ALTER TABLE os_delivery_certificates
  ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pdf_sha256 TEXT;
