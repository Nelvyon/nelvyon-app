# Mobile Android release APK (Phase 3)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-30 |
| **VERDICT** | **IMPLEMENTED_VERIFIED** — `assembleRelease` **BUILD SUCCESSFUL** |
| ApplicationId | `com.nelvyon.saas` |
| versionName | **1.0.0** |
| versionCode | **10000** |
| APK (deliverable) | `.release-logs/android/nelvyon-saas-1.0.0-2026-07-30T15-58-40-267Z.apk` |
| APK (Gradle out) | `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` |
| Size | **3.61 MB** (3 788 541 bytes) |
| SHA-256 | `b8a3a65b488ae67fdb7e682528021acda1ea32cc75cc0a95bfb2fc5831e5a800` |
| Signing | Local release keystore (gitignored) — sideload / internal · **not** Play App Signing |
| Build | `node scripts/build-android-release-apk.mjs` |
| Server URL | `https://nelvyon.com/saas/dashboard` (Capacitor `server.url`) |

## Install

```bash
adb install -r ".release-logs/android/nelvyon-saas-1.0.0-2026-07-30T15-58-40-267Z.apk"
```

Or copy the APK to the phone → enable “Install unknown apps” → open the file.

## Rebuild

```bash
node scripts/build-android-release-apk.mjs
```

Play Store upload remains **BLOCKED_EXTERNAL** until CEO Google Play account + upload key.
