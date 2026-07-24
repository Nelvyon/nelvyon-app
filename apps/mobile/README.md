# Nelvyon Mobile (Capacitor)

Production shell that loads the live SaaS app from `https://nelvyon.com/saas/dashboard`.

```bash
pnpm -C apps/mobile sync
pnpm -C apps/mobile ios    # requires macOS + Xcode
pnpm -C apps/mobile android
```

Push notifications use the same VAPID keys as `/saas/pwa`.

## Secure architecture notes

The mobile app is a thin Capacitor webview wrapper — it does **not** duplicate
business logic. It inherits the same server-side auth/tenant enforcement as
the web SaaS app, plus a small set of mobile-specific security contracts
implemented and tested in `backend/agency/MobileSecureSession.ts`.

### Tenant isolation

Every HTTP call the shell makes must carry an explicit tenant header
(`X-Tenant-Id`) alongside the auth token — never an implicit "current tenant"
resolved only from a cookie. `assertMobileTenantIsolation()` hard-fails (throws)
any attempt to act on a tenant different from the one the session was issued
for. This mirrors the same tenant-scoping discipline used by
`requireSaasContext` on the web app.

### Auth: cookie/token

- Web (browser) sessions use the existing JWT httpOnly cookie
  (`requireSaasContext`), unchanged by this app.
- The Capacitor webview, when it needs to call APIs directly (e.g. background
  sync for the offline queue) instead of relying on the webview's own cookie
  jar, uses a short-lived Bearer token built by `buildMobileAuthHeaders()`.
  Sessions have an explicit `expiresAtMs` and are rejected once expired —
  there is no long-lived hardcoded secret embedded in the app bundle.
- `isMobileSessionValid()` is the single source of truth for "is this session
  usable" (tenant id present, token present, device id present, not expired).

### Offline (basic)

`MobileOfflineQueue` is an in-memory, bounded (200 items), capped-retry
(5 attempts) queue for actions captured while the device has no connectivity
(notes, task/lead status updates, message drafts). Nothing is silently
dropped: items that exhaust their retry budget are returned by `drain()` as
`failed` so the caller can surface them to the user instead of losing data
silently. This is a **basic** stub — it does not yet persist to on-device
storage (e.g. Capacitor Preferences/SQLite), so an app kill during offline
mode currently loses the queue; that gap is tracked as `PREPARED_OFF` in
`backend/agency/MobileAppContract.ts`.

### Capability contract

`backend/agency/MobileAppContract.ts` is the honest, tested inventory of what
this app can and cannot do today (webview shell, secure session, offline
queue basic = verified; push notifications, Android local build = prepared
but not exercised in this environment; iOS build, App Store publish, Play
Store publish = blocked on external hardware/accounts). It is never allowed
to claim a store publish without real evidence — see
`docs/ops/MOBILE_APPLE_ANDROID_CEO_CHECKLIST.md`.
