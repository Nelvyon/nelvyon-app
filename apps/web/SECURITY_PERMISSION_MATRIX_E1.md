# NELVYON E1 Permission Matrix (Critical Self-Service)

This matrix consolidates critical routes/actions and the minimum role required today.
It is intended to remove ambiguity between product intent, comments, and enforcement.

## Workspace Role Legend

- `owner`
- `admin`
- `operator`
- `member`
- `viewer`

Mutation baseline in backend (`workspace_can_mutate`): `owner | admin | operator`.

## Critical Routes and Required Role

| Area | Route / Action | Backend Dependency | Effective Minimum |
|---|---|---|---|
| Auth | `GET /api/v1/auth/me` | `get_current_user` | authenticated user |
| Onboarding | `GET /api/v1/onboarding/progress` | `require_workspace` | workspace member |
| Onboarding | `POST /api/v1/onboarding/complete-step` | `require_workspace_operator` | operator |
| Workspace | `GET /api/v1/workspace/list` | `get_current_user` | authenticated user |
| Workspace/Settings | `PUT /api/v1/workspace/update` | `require_workspace_operator` | operator |
| Workspace Members | `POST /api/v1/workspace/members/invite` | `require_workspace_operator` | operator |
| Helpdesk | `POST /api/v1/entities/helpdesk_tickets` | `require_workspace_operator` + plan guard | operator |
| Helpdesk | `GET /api/v1/entities/helpdesk_tickets` | `require_workspace` | workspace member |
| Billing Summary/Usage | `GET /api/v1/billing/*` | `require_workspace` | workspace member |
| Billing Checkout | `POST /api/v1/payment/create_payment_session` | `require_workspace_admin` | admin/owner |
| Billing Verify | `POST /api/v1/payment/verify_payment` | `require_workspace_operator` | operator |
| OS/Automations | `GET /api/v1/automation/jobs|stats` | `require_workspace` | workspace member |
| OS/Automations | `POST /api/v1/automation/process-job|retry` | `require_workspace_operator` | operator |
| Audit Logs (global-style) | `GET /api/v1/audit/logs` | `get_current_user` (non-admin sees own only) | authenticated user |
| Security Events (workspace) | `GET /api/v1/entities/security_events` | `require_workspace` | workspace member |

## Explicit Misalignments to Resolve in E1/E2

1. **Comment vs enforcement drift (workspace management):**
   - `workspace_management.py` comments mention "admin/owner", but dependency is `require_workspace_operator`.
   - Current implementation allows `operator` for tenant settings/member management actions that may be intended admin-only.

2. **Billing verify elevation:**
   - `POST /api/v1/payment/verify_payment` currently allows `operator` (`require_workspace_operator`), while checkout creation is admin-only.
   - This split should be confirmed as intentional policy (or tightened).

3. **Audit API split model:**
   - `/api/v1/audit/logs` is user/global style; `/api/v1/entities/security_events` is workspace-scoped.
   - UI should default to workspace-scoped feed for enterprise trust clarity.

## Current Policy for apps/web UI

- Module gating in frontend (`roleMatrix.ts`) keeps:
  - Settings view: `member`, edit/create: `operator`.
  - Billing create action: `admin`.
  - Audit/security view is placed under Settings and read-only.

## E1 Definition of Done Alignment

- Matrix accepted as source for critical route role expectations.
- No ambiguous critical action left undocumented.
- Any intentional mismatch is explicitly recorded as policy, not accidental drift.
