# NELVYON — DEMO → REAL Production Block

## Objective
Elevate key modules from demo to production-ready (94-95/100).
No new modules. Focus on depth, real persistence, and production hardening.

## Changes Required

### 1. Backend: Add billing/usage endpoints (NEW router)
- `GET /api/v1/payment/invoices` — derive invoices from subscription history
- `GET /api/v1/payment/usage` — real usage meters from DB counts
- File: `app/backend/routers/billing_usage.py`

### 2. Frontend: SaasBilling — Replace hardcoded data with real API calls
- Remove hardcoded `usageMeters` and `invoices` useState arrays
- Fetch from new backend endpoints
- File: `app/frontend/src/pages/saas/SaasBilling.tsx`

### 3. Frontend: Helpdesk — Integrate notification service
- Import and use `notificationService` for real-time ticket updates
- Add notification bell/indicator in helpdesk header
- File: `app/frontend/src/pages/saas/SaasHelpdesk.tsx`

### 4. Frontend: SaasLayout — Add NotificationCenter component
- Show notification bell in top bar with unread count
- Dropdown with recent notifications
- File: `app/frontend/src/components/NotificationCenter.tsx`
- Update: `app/frontend/src/components/SaasLayout.tsx`

### 5. Frontend: Contracts — Add digital signature flow
- Canvas-based signature pad in contract signing dialog
- Save signature data to backend via `api.signContract()`
- Already has `signContract` in api.ts ✅

### 6. Production: CI/CD + Staging + Scalability docs
- File: `PRODUCTION.md` — CI/CD pipeline, staging env, scalability roadmap
- File: `.github/workflows/ci.yml` — GitHub Actions CI config

## Files to create/modify (≤8 files):
1. `app/backend/routers/billing_usage.py` (NEW)
2. `app/backend/main.py` (ADD router import)
3. `app/frontend/src/pages/saas/SaasBilling.tsx` (MODIFY — real data)
4. `app/frontend/src/pages/saas/SaasHelpdesk.tsx` (MODIFY — notifications)
5. `app/frontend/src/components/NotificationCenter.tsx` (NEW)
6. `app/frontend/src/components/SaasLayout.tsx` (MODIFY — add NotificationCenter)
7. `PRODUCTION.md` (NEW — CI/CD, staging, scalability)
8. `.github/workflows/ci.yml` (NEW — CI pipeline)