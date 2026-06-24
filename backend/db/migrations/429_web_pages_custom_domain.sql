-- 429_web_pages_custom_domain.sql — add custom_domain to saas_web_pages
ALTER TABLE saas_web_pages
  ADD COLUMN IF NOT EXISTS custom_domain TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_saas_web_pages_domain ON saas_web_pages(custom_domain)
  WHERE custom_domain IS NOT NULL;
