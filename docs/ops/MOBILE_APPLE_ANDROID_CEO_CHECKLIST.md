# Mobile — Apple / Android CEO checklist

Honest status of the `apps/mobile/` Capacitor shell relative to real device
builds and app store publishing. Source of truth: `backend/agency/MobileAppContract.ts`
(tested — `backend/agency/__tests__/MobileAppContract.test.ts`).

**No task in this document was executed with a paid account.** This session
did not open, pay for, or configure any Apple Developer Program or Google
Play Console account. Nothing here should be read as "app is published" or
"app is in review" — it is not.

Evidencia de bloqueo Android (2026-07-25):
`scripts/docs/evidence/os-saas-e2e/modules/mobile.android_blocked.md`.

---

## Apple (iOS) — BLOCKED_EXTERNAL

| Step | Status | Blocker |
|---|---|---|
| iOS local build (`pnpm -C apps/mobile ios`) | BLOCKED_EXTERNAL | Requires macOS + Xcode. Not available in this environment. |
| Apple Developer Program enrollment | BLOCKED_EXTERNAL | **Paid** ($99/yr). Explicitly out of scope — no Apple paid account authorized. |
| App Store Connect app record | BLOCKED_EXTERNAL | Depends on the enrollment above. |
| TestFlight / App Store submission | BLOCKED_EXTERNAL | Depends on both of the above. |
| Install smoke (simulator/device) | **NOT RUN** | No PASS claimed without real device evidence. |

### What the CEO needs to do (when ready to spend)

1. Enroll in the Apple Developer Program (personal or organization) — $99/yr.
2. Provide a Mac (owned, rented CI runner, or a cloud Mac service) for Xcode
   builds and signing — this repo cannot build/sign iOS binaries without one.
3. Once both exist, re-run this checklist and update
   `backend/agency/MobileAppContract.ts` with real evidence (App Store
   Connect app id) before flipping any status away from `BLOCKED_EXTERNAL`.

---

## Android — BLOCKED_EXTERNAL (this environment)

| Step | Status | Blocker |
|---|---|---|
| Native project (`apps/mobile/android/`) | BLOCKED_EXTERNAL | Folder **missing** — `capacitor sync` not executed in this environment. |
| Android SDK / `adb` | BLOCKED_EXTERNAL | **Not installed** on this Windows machine — verified 2026-07-25. |
| Android local debug build | BLOCKED_EXTERNAL | Requires Android Studio + SDK + generated `android/` project (none present). |
| Local device/emulator install + smoke test | **NOT RUN** | **No PASS claimed** — no APK, no adb, no emulator/device. |
| Google Play Console registration | BLOCKED_EXTERNAL | **Paid** (one-time $25 registration fee). No budget approved in this session. |
| Play Store listing + review submission | BLOCKED_EXTERNAL | Depends on the registration above. |

### What remains verified (no native binary)

| Capability | Status | Evidence |
|---|---|---|
| Capacitor shell config | IMPLEMENTED_VERIFIED | `apps/mobile/capacitor.config.json` + `package.json` |
| Tenant-isolated secure session | IMPLEMENTED_VERIFIED | `MobileSecureSession.ts` + unit tests |
| Offline action queue (basic) | IMPLEMENTED_VERIFIED | `MobileSecureSession.ts` + unit tests |

### Local Android build steps (when CEO provides Android Studio + SDK)

These steps are **documentation only** — not executed here:

```bash
pnpm -C apps/web build          # builds the Next.js app the shell points at (or use the remote server.url)
pnpm -C apps/mobile sync        # capacitor sync — generates android/ + copies web assets
pnpm -C apps/mobile android     # opens android/ in Android Studio
# In Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)
# Resulting APK: apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

A debug APK from the steps above would be sideloadable for internal testing at
zero Play Console cost — but **this session produced no APK and claims no install PASS**.

---

## Rollback / no-op guarantee

Nothing in this checklist, `MobileAppContract.ts`, or `MobileSecureSession.ts`
enables any network call to Apple or Google services, any payment, or any
store submission. All of it is either local tooling documentation or pure,
unit-tested TypeScript.
