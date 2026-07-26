# Mobile Android local build (zero-cost)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-25 |
| **VERDICT build** | **IMPLEMENTED_VERIFIED** — `assembleDebug` **BUILD SUCCESSFUL** |
| APK | `apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk` (~4.8 MB) |
| JDK | Microsoft OpenJDK **21** (Capacitor 7 requires source 21) |
| SDK | `platforms;android-35` + `build-tools;35.0.0` (cmdline-tools free) |
| Capacitor | `cap add android` + `cap sync` · `webDir=www` · `server.url=https://nelvyon.com/saas/dashboard` |
| Log | `mobile.android_assemble_log.txt` |

## Android — un solo comando (tras conectar dispositivo)

```bash
node scripts/android-one-step.mjs
```

Requisitos: USB debugging o AVD · APK debug ya build (`assembleDebug`).  
El script instala el APK y lista 3 comprobaciones humanas (login / CRM / offline).  
Sin dispositivo → `BLOCKED_EXTERNAL` (no PASS falso).

Checklist largo: `MOBILE_APPLE_ANDROID_CEO_CHECKLIST.md` · iOS: `PWA_IOS_SAFARI_CEO_CHECKLIST.md`  
Master: `CEO_MASTER_ACTIONS_CURSOR_CLOSED.md`


## Tools installed this session (free)

- Microsoft OpenJDK 17 + 21 (winget)
- Google Platform-Tools (`adb`)
- Android cmdline-tools + SDK 34/35 (licenses accepted)

## Rollback / notes

- APK is debug sideload only — not Play Store.
- `local.properties` gitignored (machine SDK path).
- Push notifications remain PREPARED_OFF until device smoke.
