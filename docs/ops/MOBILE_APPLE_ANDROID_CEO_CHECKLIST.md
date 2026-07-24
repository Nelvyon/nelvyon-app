# Mobile — Apple / Android CEO checklist

Honest status of the `apps/mobile/` Capacitor shell relative to real device
builds and app store publishing. Source of truth: `backend/agency/MobileAppContract.ts`
(tested — `backend/agency/__tests__/MobileAppContract.test.ts`).

**No task in this document was executed with a paid account.** This session
did not open, pay for, or configure any Apple Developer Program or Google
Play Console account. Nothing here should be read as "app is published" or
"app is in review" — it is not.

---

## Apple (iOS) — BLOCKED_EXTERNAL

| Step | Status | Blocker |
|---|---|---|
| iOS local build (`pnpm -C apps/mobile ios`) | BLOCKED_EXTERNAL | Requires macOS + Xcode. Not available in this environment. |
| Apple Developer Program enrollment | BLOCKED_EXTERNAL | **Paid** ($99/yr). Explicitly out of scope — no Apple paid account authorized. |
| App Store Connect app record | BLOCKED_EXTERNAL | Depends on the enrollment above. |
| TestFlight / App Store submission | BLOCKED_EXTERNAL | Depends on both of the above. |

### What the CEO needs to do (when ready to spend)

1. Enroll in the Apple Developer Program (personal or organization) — $99/yr.
2. Provide a Mac (owned, rented CI runner, or a cloud Mac service) for Xcode
   builds and signing — this repo cannot build/sign iOS binaries without one.
3. Once both exist, re-run this checklist and update
   `backend/agency/MobileAppContract.ts` with real evidence (App Store
   Connect app id) before flipping any status away from `BLOCKED_EXTERNAL`.

---

## Android — partially achievable at zero cost

| Step | Status | Notes |
|---|---|---|
| Android local debug build (`pnpm -C apps/mobile android`) | PREPARED_OFF (not executed this session) | **No cost.** Opens the Capacitor Android project in Android Studio; `./gradlew assembleDebug` produces a sideloadable APK without any Google account. |
| Local device/emulator install + smoke test | PREPARED_OFF | Free — use `adb install app-debug.apk` or drag the APK onto an emulator. |
| Google Play Console registration | BLOCKED_EXTERNAL | **Paid** (one-time $25 registration fee). No budget approved in this session. |
| Play Store listing + review submission | BLOCKED_EXTERNAL | Depends on the registration above. |

### Local Android build steps (no cost, requires Android Studio + JDK installed locally)

```bash
pnpm -C apps/web build          # builds the Next.js app the shell points at (or use the remote server.url)
pnpm -C apps/mobile sync        # capacitor sync — copies web assets + config into native projects
pnpm -C apps/mobile android     # opens android/ in Android Studio
# In Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)
# Resulting APK: apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

This produces a real, installable debug APK for internal testing (sideload
only) without touching any paid service. It does **not** produce a
Play-Store-ready signed release bundle — that requires a release keystore and
(eventually) the paid Play Console account above.

---

## Rollback / no-op guarantee

Nothing in this checklist, `MobileAppContract.ts`, or `MobileSecureSession.ts`
enables any network call to Apple or Google services, any payment, or any
store submission. All of it is either local tooling documentation or pure,
unit-tested TypeScript.
