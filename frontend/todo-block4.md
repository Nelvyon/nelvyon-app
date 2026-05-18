# BLOQUE 4 — SSO, Billing, APIs, Compliance, Provisioning

## Files to Create/Modify (max 8)

1. **src/pages/saas/SaasAPIHub.tsx** (NEW) — Public API keys + Webhooks management
   - API key generation/revocation with scopes
   - Webhook endpoint CRUD with event subscriptions
   - Request logs and delivery status
   - Rate limit display per key

2. **src/pages/saas/SaasCybersecurity.tsx** (REWRITE) — Security Center Enterprise
   - SSO/SAML/OIDC configuration panel
   - Session management (active sessions, force logout)
   - IP allowlist/blocklist
   - 2FA enforcement policies
   - Security events timeline (existing, enhanced)
   - Login anomaly detection display

3. **src/pages/saas/SaasSystemLogs.tsx** (REWRITE) — Compliance & Governance
   - GDPR data export (user data package)
   - Data retention policies configuration
   - Audit log with advanced filters + CSV/JSON export
   - Compliance checklist (SOC2, GDPR, HIPAA indicators)
   - Privacy settings (cookie consent, data processing)

4. **src/pages/saas/SaasBilling.tsx** (ENHANCE) — Billing Admin with Usage Limits
   - Usage meters (API calls, storage, contacts, users)
   - Rate limit indicators per plan
   - Overage alerts and auto-upgrade suggestions
   - Invoice history with download

5. **src/pages/saas/SaasTenantSettings.tsx** (ENHANCE) — Provisioning & Deployment
   - Environment provisioning (staging/production)
   - Custom domain configuration
   - Backup/restore controls
   - White-label settings

6. **src/App.tsx** (MODIFY) — Add route for SaasAPIHub

7. **src/lib/api.ts** (MODIFY) — Add API types for new endpoints