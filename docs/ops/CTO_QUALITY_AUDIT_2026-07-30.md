# CTO Quality Audit — 2026-07-30

> Verificación real · `claimReady: false` · canary **KILL** · sin deploy prod en este bloque  
> Tip docs previo: `aaf6007c` · tip prod live: `3f10c272`

## 1. Problemas encontrados

| Sev | Problema | Evidencia |
|-----|----------|-----------|
| P1 | `activeId` incorrecto en citas/chat/copywriter | Sidebar destacaba módulo equivocado |
| P1 | Mojibake UTF-8 en lead-scoring / loyalty UI | Strings ilegibles en UI |
| P1 | `es.json` / `pt.json` con bytes Latin-1 inválidos UTF-8 | `JSON.parse` / i18n frágil |
| P1 | Branding Envato/Landrick en SaaS customer UI | setup + web-builder + Featured card |
| P1 | `stableWorkspaceIdFromTenant("")` → `"default-tenant"` compartido | Riesgo aislamiento sintético |
| P1 | Clave i18n `saml_coming_soon` con copy “available” | Honestidad de naming |
| P2 | Cookie/chat marketing en Capacitor WebView | Bloqueaba login (sesión anterior) |
| P2 | Dashboard 404 Tenant not found → empty “Error” | Usuarios nuevos post-register |
| P2 | Scratch `tmp-*` / `vitest-out.txt` sin gitignore | Higiene repo |
| — | DashForge en producto | **Ausente** (solo `.reference/` gitignored) |

## 2. Problemas corregidos

- Sidebar `activeId`: citas / chat / copywriter  
- UTF-8 lead-scoring + loyalty  
- Repair encoding `apps/web/messages/es.json` + `pt.json`  
- Strip Envato/Landrick copy en UI SaaS (licencia interna permanece en backend/docs)  
- Fail-closed `stableWorkspaceIdFromTenant` + test  
- Rename i18n `saml_available` + test wire  
- `NativeShellChromeGate` + tests  
- Dashboard `404` → `/saas/onboarding`  
- `.gitignore`: `.reference/`, `tmp-*`, `vitest-out.txt`

## 3. Riesgos restantes

- Integraciones externas (OAuth/SES/Twilio/Ads spend/social publish) **BLOCKED_EXTERNAL** / CEO  
- Private AI canary **KILL** (intencional)  
- Rediseño DashForge: solo Fase 1 plan (UI kit no migrado a producto)  
- HMAC puede compartir secretos JWT/NEXTAUTH/TRACKING (documentado; no hardcode)  
- OS seeds siguen mencionando Envato en rutas **OS** (agencia), no SaaS customer path  
- Playwright E2E completo / a11y axe / Lighthouse no re-ejecutados en este bloque (coste/tiempo)

## 4. No validado / por qué

| Área | Motivo |
|------|--------|
| Playwright full SaaS E2E | No corrido aquí (suite larga; requiere env staging/auth) |
| Build Next prod completo | No corrido en este bloque (tsc+lint PASS; build ~minutos) |
| Auditoría a11y automatizada (axe) | No hay gate CI axe dedicado ejecutado ahora |
| Perf Lighthouse | Requiere URL staging + red |
| Multi-tenant RLS live prod | Requiere DB prod probe autorizado |
| Soak MCP/Router | Prohibido invalidar soaks certificados |

## 5. Requiere hardware físico

- Push/FCM real, OEM WebView, Play Integrity, cámara/biometría  
- Smoke APK ya **PASS en emulador** (evidence `mobile.android_emulator_phase3_2026-07-30.md`)

## 6. Estado módulos SaaS (honestidad)

| Área | Estado verificado |
|------|-------------------|
| Auth cookie + middleware | Intactos (no tocados salvo chrome gate) |
| CRM / workflows / sequences (unit) | Cubiertos en Vitest core **PASS** |
| Nav activeId (3 páginas) | **FIXED** |
| Lead-scoring / loyalty copy | **FIXED** |
| Web-builder branding UI | **FIXED** (nombre componente interno histórico) |
| DashForge UI migration | **PLAN only** — no COMPLETADO |

## 7. Estado integraciones

Sin cambio de flags: Ads spend OFF · Social publish OFF · Twilio/WA secrets humanos · Stripe/SES ops externos · IA canary KILL.

## 8. Resultado pruebas (este bloque)

| Gate | Resultado |
|------|-----------|
| `tsc --noEmit` | **PASS** (exit 0) |
| `eslint --max-warnings 0` | **PASS** (exit 0) |
| Vitest `backend/saas` + email + saas-crm + saas-shell | **PASS** 2488 tests / 199 files |
| Vitest focal (proxy + ChromeGate + i18n wire) | **PASS** |
| Playwright | **NO EJECUTADO** |
| Build prod | **NO EJECUTADO** |
| Security scan Trivy/Gitleaks | **NO EJECUTADO** en este bloque |

## 9. Evidencias

- Terminal logs locales tsc/lint/vitest (exit 0)  
- `docs/ops/DASHFORGE_MIGRATION_PLAN.md`  
- `scripts/docs/evidence/os-saas-e2e/modules/mobile.android_emulator_phase3_2026-07-30.md`

## 10–11. Archivos / commits

Ver `git log` / diff del bloque de commits de calidad (este informe se actualiza tras commit).

## 12. Recomendaciones finales

1. Ejecutar `pnpm -C apps/web build` + `test:e2e:saas` en CI/staging antes de cualquier UI DashForge.  
2. Continuar DashForge Fase 2 solo tras OK al plan (kit → `nelvyon-ui`).  
3. No flip `claimReady`; mantener canary KILL.  
4. Smoke físico Android opcional para FCM/OEM.  
5. Considerar gate CI que falle si `messages/*.json` no es UTF-8 válido.

**Estado global de este bloque: PARCIAL (calidad P1 corregida + gates unitarios verdes) — NO “producto terminado / COMPLETADO absoluto”.**
