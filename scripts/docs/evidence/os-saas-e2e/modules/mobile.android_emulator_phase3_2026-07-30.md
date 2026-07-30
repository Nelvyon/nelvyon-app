# Phase 3 — Android emulator validation (no physical device)

**Date:** 2026-07-30  
**AVD:** `Nelvyon_API35` (API 35 google_apis x86_64)  
**Device:** `emulator-5554`  
**APK:** `.release-logs/android/nelvyon-saas-1.0.0-2026-07-30T15-58-40-267Z.apk`  
**Package:** `com.nelvyon.saas` · Capacitor → `https://nelvyon.com/saas/dashboard`

## Results

| Check | Result | Evidence |
|---|---|---|
| Emulator available / boot | **PASS** | AVD created + booted |
| `adb install -r` release APK | **PASS** | Success |
| Cold start `MainActivity` | **PASS** | Process + resumed activity |
| WebView loads remote SaaS | **PASS** | Login + dashboard screenshots |
| Network to nelvyon.com | **PASS** | ICMP OK from emulator |
| Login (in-APK) | **PASS** | Session cookie; Feedback tab only when `/api/auth/me` OK; dashboard after onboarding |
| Navigation (hamburger) | **PASS** | Setup, CRM, Pipeline, Calendar, Pack Store |
| Dashboard | **PASS** | “Welcome, Emu Smoke Co”, health %, checklist |
| CRM | **PASS** | Contactos empty state + Nuevo contacto |
| Automatizaciones | **PARTIAL** | Kit UI (“6 workflows + 4 secuencias / Instalar kit”) visible; `/api/saas/workflows` **200** after onboarding; dedicated `/saas/workflows` screen not reliably reached via coordinate taps (collapsed MANAGEMENT group) |
| Fatal / crash logs | **PASS** | No `AndroidRuntime` FATAL / crash buffer empty; chromium cache noise only |
| Deep link `VIEW` URL into WebView | **FAIL (expected)** | Capacitor does not remap `server.url` on VIEW intent |

## Bugs found & fixes (local tip — needs prod deploy)

1. **New user → dashboard shows “Sin datos / Error”** because `saas_tenants` is null until onboarding (`/api/saas/dashboard` → 404 `Tenant not found`).  
   **Fix:** `apps/web/src/app/saas/dashboard/page.tsx` redirects `404` → `/saas/onboarding`.
2. **Marketing chrome blocks mobile shell** (cookie banner + site chat on login).  
   **Fix:** `NativeShellChromeGate` hides CookieBanner + ChatbotWidget when `Capacitor.isNativePlatform()`.

## Requires physical device (or Appium / WebView debugging)

- Reliable touch/IME automation for collapsed nav groups and complex forms (uiautomator cannot see WebView DOM).
- Push notification delivery / FCM token on real radio.
- Camera / biometric / Google Play Services edge cases.
- Play Integrity / sideload vs Play install path.
- Real device performance, thermal, and OEM WebView variants.
- Offline / flaky mobile network UX.

Screenshots under `.release-logs/android/nelvyon-*.png` (and `*-small.jpg`).
