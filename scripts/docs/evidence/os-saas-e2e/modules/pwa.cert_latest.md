# PWA certification

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-26T13:17:58.651Z |
| Host | win32 (Node v24.18.0) |
| Resultado | PASS |
| Chrome/Windows (criterios de instalabilidad) | VERIFIED — manifest válido (name/icons/display/start_url) + iconos reales en disco + sw.js con `install`/`fetch` handlers y estrategia cache+offline documentada. Estos son exactamente los criterios que Chrome/Edge (Chromium, Windows) evalúan para marcar el sitio como instalable. |
| iOS Safari "Add to Home Screen" | PARTIAL — no verificado en dispositivo/simulador real en esta sesión |

## manifest.json

- Resultado: PASS
- Campos requeridos ausentes: ninguno
- Iconos declarados: 10
- Iconos faltantes en disco: ninguno
- Estrategia offline documentada en sw.js: sí

## manifest-saas.json

- Resultado: PASS
- Campos requeridos ausentes: ninguno
- Iconos declarados: 10
- Iconos faltantes en disco: ninguno
- Estrategia offline documentada en sw.js: sí

## Honestidad

- "Chrome/Windows VERIFIED" es una auditoría estática y reproducible (este script Node) contra los mismos criterios de instalabilidad que Chrome/Edge (Chromium) evalúan — no es una sesión manual de Chrome DevTools grabada en vivo. Cualquiera puede reproducirla con `node scripts/pwa-certify.mjs`.
- No se marca "iOS Safari install" como VERIFIED sin una prueba real en dispositivo/simulador — queda PARTIAL en este documento hasta que ops lo confirme manualmente. Ver `docs/ops/PWA_IOS_SAFARI_CEO_CHECKLIST.md`.
- Este script solo audita manifest+sw en disco; no publica, despliega ni modifica nada.
- Los iconos PNG multi-tamaño (72–512px) ya existen en disco (`apps/web/public/icons/icon-*.png`, generados con `node apps/web/scripts/generate-pwa-icons.mjs`, usa `sharp`) y están declarados en `manifest.json`, `manifest-saas.json` y en el manifest dinámico `SaasPwaService.DEFAULT_ICONS` — incluyendo los iconos de push notification que `sw.js` referenciaba (`icon-192x192.png`, `icon-96x96.png`).
