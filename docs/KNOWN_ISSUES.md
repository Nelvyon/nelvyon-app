# KNOWN_ISSUES — Errores conocidos

> No eliminar hasta resolver. Mover a **Historial resuelto** con solución.

---

## Activos

### UI — verificación visual en staging pendiente (módulo 8 Funnels/formularios/landing pages, 2026-07-31)

| Campo | Valor |
|-------|-------|
| **Estado** | **Corregido en código y verificado por tsc/lint/build/vitest/smoke** · pendiente de captura autenticada real |
| **Detalle** | `/saas/{formularios,funnels,web-builder,web-builder/[pageId]}` — 3 fixes funcionales de causa raíz (ver historial resuelto) + migración visual completa de `/saas/funnels` y el editor `/saas/web-builder/[pageId]` (patrón `DarkCard`/hex literales → tokens semánticos + `KpiTile`). No se pudo tomar captura autenticada en local por falta de `DATABASE_URL`, mismo bloqueo que módulos 2–7. |
| **Evidencia** | `docs/ops/W3CRM_MIGRATION_PLAN.md` §19.4 — tsc/ESLint/build PASS, vitest 2467 passed/4 skipped, smoke sin sesión incl. nuevo endpoint de submissions (307/401, sin 500) |
| **Próximo paso** | Validar visualmente en el primer despliegue a staging con sesión real (agrupar con módulos 2–7 pendientes de la misma validación) |

### UI — verificación visual en staging pendiente (módulo 7 Marketing y redes sociales, 2026-07-31)

| Campo | Valor |
|-------|-------|
| **Estado** | **Corregido en código y verificado por tsc/lint/build/vitest/smoke** · pendiente de captura autenticada real |
| **Detalle** | `/saas/{social,publicidad,seo,reputacion}` — sustitución sistemática de colores Tailwind literales por tokens semánticos + KPIs migrados a `KpiTile`. Sin fix funcional (las 4 pantallas ya eran 100% reales). No se pudo tomar captura autenticada en local por falta de `DATABASE_URL`, mismo bloqueo que módulos 2–6. |
| **Evidencia** | `docs/ops/W3CRM_MIGRATION_PLAN.md` §18.3 — tsc/ESLint/build PASS, vitest 2467 passed/4 skipped, smoke sin sesión (307/401, sin 500) |
| **Próximo paso** | Validar visualmente en el primer despliegue a staging con sesión real (agrupar con módulos 2–6 pendientes de la misma validación) |

### UI — verificación visual en staging pendiente (módulo 6 Calendario/citas, 2026-07-31)

| Campo | Valor |
|-------|-------|
| **Estado** | **Corregido en código y verificado por tsc/lint/build/vitest/smoke** · pendiente de captura autenticada real |
| **Detalle** | `/saas/citas` (fix de causa raíz — ver historial resuelto) y `/saas/calendar` (fixes de estados loading/empty/error) verificados sin sesión. No se pudo tomar captura autenticada en local por falta de `DATABASE_URL`, mismo bloqueo que módulos 2, 3, 4 y 5. |
| **Evidencia** | `docs/ops/W3CRM_MIGRATION_PLAN.md` §17.4 — tsc/ESLint/build PASS, vitest 2467 passed/4 skipped, smoke sin sesión incluyendo PATCH/DELETE (307/401, sin 500) |
| **Próximo paso** | Validar visualmente en el primer despliegue a staging con sesión real (agrupar con módulos 2, 3, 4 y 5 pendientes de la misma validación) |

### UI — verificación visual en staging pendiente (módulo 5 Automatizaciones/workflows, 2026-07-31)

| Campo | Valor |
|-------|-------|
| **Estado** | **Corregido en código y verificado por tsc/lint/build/vitest/smoke** · pendiente de captura autenticada real |
| **Detalle** | `/saas/workflows` (fixes de consistencia visual) y `/saas/workflows/editor` (fix de causa raíz — ver historial resuelto) verificados sin sesión. No se pudo tomar captura autenticada en local por falta de `DATABASE_URL`, mismo bloqueo que módulos 2, 3 y 4. |
| **Evidencia** | `docs/ops/W3CRM_MIGRATION_PLAN.md` §16.4 — tsc/ESLint/build PASS, vitest 92+2467 passed/4 skipped, smoke sin sesión (307/401, sin 500) |
| **Próximo paso** | Validar visualmente en el primer despliegue a staging con sesión real (agrupar con módulos 2, 3 y 4 pendientes de la misma validación) |

### UI — verificación visual en staging pendiente (módulo 4 Comunicación, 2026-07-31)

| Campo | Valor |
|-------|-------|
| **Estado** | **Corregido en código y verificado por tsc/lint/build/vitest/smoke** · pendiente de captura autenticada real |
| **Detalle** | `/saas/{campanias,secuencias,deliverability}` migrados a `NelvyonDs*`+`KpiTile`; `/saas/sms` corregido de causa raíz (ver historial resuelto). No se pudo tomar captura autenticada en local por falta de `DATABASE_URL`, mismo bloqueo que módulos 2 y 3. |
| **Evidencia** | `docs/ops/W3CRM_MIGRATION_PLAN.md` §15.3 — tsc/ESLint/build PASS, vitest 2467 passed/4 skipped, smoke sin sesión (307/401, sin 500) |
| **Próximo paso** | Validar visualmente en el primer despliegue a staging con sesión real (agrupar con módulos 2 y 3 pendientes de la misma validación) |

### UI — verificación visual en staging pendiente (fix contraste oscuro `/saas/*`, 2026-07-30)

| Campo | Valor |
|-------|-------|
| **Estado** | **Corregido en código, verificado por compilación + mockup estático** · pendiente de captura autenticada real |
| **Detalle** | `SaasShellLayout` no activaba el scope `.dark`; `globals.css` no registraba `--color-destructive/success/warning`. Corregido (ver ADR-075 §13.1 en `DECISIONS.md` y `docs/ops/W3CRM_MIGRATION_PLAN.md` §13.1). No se pudo tomar captura de `/saas/crm` o `/saas/pipeline` autenticados en local por falta de `DATABASE_URL`. |
| **Evidencia** | Compilación aislada de `globals.css` con `@tailwindcss/postcss` (antes: "unknown utility class"; después: reglas generadas) + captura de mockup estático con las clases reales de `NelvyonDsCard`/`Badge`/`Button`/`SectionHeader` dentro de `.dark` |
| **Próximo paso** | Validar visualmente en el primer despliegue a staging con sesión real |

### Historial — wf.create Internal 500 (localhost 2026-07-17) → CLOSED_STAGING 2026-07-28

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto en staging** · payload cert manual+active **201** · score_threshold fixed via mig 522 |
| **Detalle** | Fail histórico opaque Internal error en localhost; reval staging CERTIFIED. Prod mig 522 pendiente CEO. |
| **Evidencia** | `WORKFLOWS_E2E_REVAL_PENDING.md` · `saas.workflows_latest.json` |

### Ops (no KI) — Prod private AI canary inference DB (ADR-068/069)

| Campo | Valor |
|-------|-------|
| **Estado** | **PREPARED** schema/RLS · canary **PREPARED_OFF** · CEO SÍ/NO pending |
| **Detalle** | Option A: `local_ai_*` + role RLS en prod DB · `LOCAL_AI_DATABASE_URL` SET · KILL ON · AI off. Apertura solo tras `CEO_PROD_CANARY_OPEN_YN.md`. |
| **Evidencia** | `railway.rag_prod_option_a_prep_latest.md` · `CEO_PROD_CANARY_OPEN_YN.md` |

### Ops (no KI) — Puntos 1–4 CEO batch (ADR-066 → ADR-067)

| Campo | Valor |
|-------|-------|
| **Estado** | **CEO_DECIDED** · #1 SÍ (política) · #2–#4 staging verified / prod canary attempted fail-closed |
| **Detalle** | Gate migrate fail-closed **CEO-ACK**. ADR-068: dual-write+RAG staging verified; prod canary mesh OK but inference blocked on local-AI DB default. |
| **Evidencia** | `CEO_POINTS_1_4_APPROVAL_REQUEST.md` · `private-ai.prod_canary_adr068_latest.md` |

### Ops (no KI) — Prod migrate gate ADR-064 (histórico 519/520 kept)

| Campo | Valor |
|-------|-------|
| **Estado** | **Mitigado VERIFIED** — tip `c2edb2da` · prod skip-apply · `migrate.ts` también gated · 519/520 **no revertidas** |
| **Detalle** | Gate: `NELVYON_PROD_MIGRATE_APPROVED=1` + `APPROVED_BY`; pending sin approval → deploy/`pnpm migrate` fail. Staging auto-migrate intacto. |
| **Evidencia** | `prodMigrateGate.ts` · `migrate.ts` · vitest · staging `da6b7a74` · prod `a82b55ac` · `prod.migrate_gate_latest.md` · ADR-064 |
| **Pendiente CEO** | Ack histórico + no dejar vars approval permanentes en prod |

### Ops (no KI) — Email + PDF locale PARTIAL (no FULL_VERIFIED)

| Campo | Valor |
|-------|-------|
| **Estado** | **Abierto** — **PARTIAL** |
| **Detalle** | UI catalogs es/en/fr/de/it/pt **FULL**. Email transactional SES+billing lifecycle **LOCALIZED** (Lote A 2026-07-28). PDF labels chrome LOCALIZED; **legal/tax body HUMAN_REVIEW**. No FULL_VERIFIED email/PDF sin revisión legal. Inventario: `docs/ops/EMAIL_PDF_LOCALE_PARTIAL.md`. |

### Ops (no KI) — Android APK build SDK pending

| Campo | Valor |
|-------|-------|
| **Estado** | **Mitigado local** · release APK **1.0.0** built + emulator smoke PASS · Play publish **BLOCKED_EXTERNAL** |
| **Detalle** | Evidence `mobile.android_release_latest.md` · emulator `mobile.android_emulator_phase3_2026-07-30.md` · sideload keystore local ≠ Play App Signing · FCM/OEM físico pendiente |
| **Checklist** | `MOBILE_APPLE_ANDROID_CEO_CHECKLIST.md` |

### Ops (no KI) — ADR-057 external integrations pending CEO

| Campo | Valor |
|-------|-------|
| **Estado** | **BLOCKED_EXTERNAL** / **BLOCKED_CEO** |
| **Detalle** | Cores internos verified · rutas externas pendientes: Twilio real (Block 11) · OAuth apps reales (Block 16) · ads spend/OAuth (Block 13) · social publish (Block 14) · App Store/Play + APK SDK (Block 18) · multi-region **COST** (Block 21) · IA prod canary (Block 25 · `CEO_IA_PROD_CANARY_REQUEST.md`) — pgvector Docker live (Block 24) **resuelto 2026-07-25**, Railway **PREPARED_OFF** |

### Ops (no KI) — Legal checklist campañas + Datos Pepito (claimReady)

| Campo | Valor |
|-------|-------|
| **Estado** | **Abierto** — **BLOCKED_LEGAL** claimReady / READY |
| **Detalle** | Gate reforzado ADR-055/056/057 · Block 15 mass-send controls verified · `claimReadyLegal` hard-false · send **BLOCKED_LEGAL** · `DATOS_PEPITO_LICENSE_DOSSIER.md` · Pepito **forbidden** · falta confirmación escrita + licencia comercial |

### Ops (no KI) — Ads OAuth spend path

| Campo | Valor |
|-------|-------|
| **Estado** | **BLOCKED_EXTERNAL** |
| **Detalle** | Block 13 core **IMPLEMENTED_VERIFIED** · no live Meta/Google/LinkedIn OAuth spend path · `NELVYON_ADS_SPEND_ENABLED=0` · `ADS_OAUTH_SPEND_CEO_CHECKLIST.md` |

### Ops (no KI) — Social oficial NELVYON

| Campo | Valor |
|-------|-------|
| **Estado** | **PREPARED_OFF** |
| **Detalle** | `NelvyonOfficialSocialOps` + `NELVYON_OFFICIAL_SOCIAL_CEO_CHECKLIST.md` · 8 cuentas **PENDING_CEO** · sin publish/OAuth |

### Ops (no KI) — Private AI prod canary (Block 25)

| Campo | Valor |
|-------|-------|
| **Estado** | **PREPARED_OFF** · **BLOCKED_CEO** |
| **Detalle** | `PrivateAiCanaryPrep` checklist verified · `isProductionCanaryAuthorized()` hardcoded **false** · `CEO_IA_PROD_CANARY_REQUEST.md` **PENDING_CEO** |

### Ops (no KI) — OpenClaw prod canary

| Campo | Valor |
|-------|-------|
| **Estado** | **BLOCKED_CEO** |
| **Detalle** | Staging_mock CERT · `CEO_OPENCLAW_PROD_CANARY_REQUEST.md` **PENDING_CEO** · prod requiere nueva auth CEO |

### Ops (no KI) — Private AI prod canary mesh (ADR-068)

| Campo | Valor |
|-------|-------|
| **Estado** | **BLOCKED_EXTERNAL** |
| **Detalle** | CEO authorized code ack + gates on tip `428c6c91`. Prod live `d03721c1` sin tip canary; `TS_AUTHKEY`/`OLLAMA_HOST` **ABSENT**. Canary **not** activated (no degraded prod). |
| **Evidencia** | `private-ai.prod_canary_adr068_latest.md` |

### Ops (no KI) — Railway pgvector staging ACTIVATED (ADR-068) · prod DDL OFF

> Histórico PREPARED_OFF supersedido en staging 2026-07-26. Prod DDL sigue OFF.

### Ops (no KI) — Railway pgvector extension VERIFIED · Private RAG path PREPARED_OFF (histórico)

| Campo | Valor |
|-------|-------|
| **Estado** | Extension **INSTALLED** (vector 0.8.0) on staging · Private RAG path **PREPARED_OFF** |
| **Detalle** | Probe 2026-07-25: `local_ai_rag_*` ausente · `nelvyon_rag_chunks`/`saas_tenant_memory_chunks` sin columna vector · `LOCAL_AI_DATABASE_URL` ABSENT · Ollama env SET · Docker RAG path intacto VERIFIED |
| **Evidencia** | `railway.pgvector_probe_latest.md` |
| **Pendiente** | CEO/Daniel: migrate `local_ai_rag_*` en staging o DB dedicada + wiring |

### Ops (no KI) — 2ª réplica Railway BLOCKED_EXTERNAL/COST

| Campo | Valor |
|-------|-------|
| **Estado** | **BLOCKED_EXTERNAL/COST** — no activada (`numReplicas=1`) |
| **Evidencia** | `ha.replica_cost_block_latest.md` · equivalencia: ERP concurrency ALL_PASS |

### Ops (no KI) — pgvector RAG en staging (histórico · supersedido por probe extension)

| Campo | Valor |
|-------|-------|
| **Estado** | **PREPARED_OFF** (staging path) — ver Ops Railway pgvector arriba |
| **Detalle** | Verificación EN VIVO de pgvector RAG (2026-07-25) se hizo contra Docker+Ollama de la máquina local del owner, no contra Railway staging. Extender a staging requeriría: (1) instancia Postgres+pgvector alcanzable desde el servicio de Railway staging (`LOCAL_AI_DATABASE_URL`) — no provisionada; (2) `OLLAMA_HOST` mesh (Tailscale) desde staging al Ollama del owner — ya documentado como **pendiente CEO separado** en `docs/ops/CEO_IA_STAGING_APPROVAL_REQUEST.md`. Ninguno de los dos se activó ni se solicitó en esta sesión. |

---

## Historial resuelto (reciente)

### Funcional — respuestas de formularios (`saas_form_submissions`) persistidas pero invisibles para el tenant → RESUELTO

| Campo | Valor |
|-------|-------|
| **Resuelto** | **2026-07-31** (módulo Funnels/formularios/landing pages, ver `docs/ops/W3CRM_MIGRATION_PLAN.md` §19.2) |
| **Causa** | El endpoint público `/api/forms/[formId]/submit` ya insertaba correctamente cada envío en `saas_form_submissions` (con `contact_id` vinculado cuando aplica) desde antes de esta migración, pero no existía ningún endpoint autenticado de lectura ni UI para consultarlos — los datos existían en base de datos pero eran inaccesibles para el cliente del tenant. Adicionalmente, `saas_forms.is_active` (soportado por `PATCH`) y `DELETE` no tenían control en la UI. |
| **Fix** | Nuevo `GET /api/saas/formularios/[formId]/submissions` (permiso `workflows.read`, verifica ownership de tenant antes de consultar, `LEFT JOIN saas_contacts` para mostrar el contacto vinculado) + componente `SubmissionsModal` en `/saas/formularios`. Toggle de `isActive` y botón de eliminar añadidos a cada tarjeta de formulario (usan `PATCH`/`DELETE` ya existentes). |
| **Evidencia** | tsc/eslint/build PASS · vitest core 2467 passed/4 skipped · smoke `GET /api/saas/formularios/:id/submissions` → 401 sin sesión (sin 500) |
| **Nota** | Sin cambios en el esquema `saas_form_submissions` ni en el endpoint público de envío — se expone lectura de datos ya persistidos, mismo patrón que el módulo Comunicación (`SaasSmsService.listRecent`) · canary IA apagado · `claimReady: false` |

### Funcional — funnels sin botón de eliminar pese a soporte backend completo → RESUELTO

| Campo | Valor |
|-------|-------|
| **Resuelto** | **2026-07-31** (módulo Funnels/formularios/landing pages, ver `docs/ops/W3CRM_MIGRATION_PLAN.md` §19.2) |
| **Causa** | `DELETE /api/saas/funnels/[funnelId]` ya existía y funcionaba (borrado real con aislamiento por `tenant_id`), pero `/saas/funnels` no tenía ningún botón que lo invocara — un funnel creado por error no podía eliminarse desde la UI. |
| **Fix** | Botón de eliminar con confirmación (`window.confirm`) en cada fila del listado de funnels, invoca el `DELETE` ya existente. |
| **Evidencia** | tsc/eslint/build PASS · vitest core 2467 passed/4 skipped · smoke `DELETE /api/saas/funnels/:id` → 401 sin sesión (sin 500) |
| **Nota** | Sin cambios en `SaasFunnelService` ni en el esquema — se expone una capacidad ya implementada · canary IA apagado · `claimReady: false` |

### Funcional — editor de páginas web-builder implementado pero inalcanzable desde el listado, sin ruta de borrado → RESUELTO

| Campo | Valor |
|-------|-------|
| **Resuelto** | **2026-07-31** (módulo Funnels/formularios/landing pages, ver `docs/ops/W3CRM_MIGRATION_PLAN.md` §19.2) |
| **Causa** | `/saas/web-builder/[pageId]` (editor visual de secciones completo, con preview en iframe, SEO, dominio custom e historial de versiones) ya estaba implementado, pero el listado `/saas/web-builder` no tenía ningún enlace hacia él — la única forma de editar una página era navegar manualmente a la URL. Además, `SaasWebBuilderService.delete()` existía en el servicio backend pero no tenía ninguna ruta HTTP que lo expusiera. |
| **Fix** | Botón "Editar" (enlace `<Link>` a `/saas/web-builder/[pageId]`) añadido a cada tarjeta del listado. Nuevo `DELETE /api/saas/web-builder/[pageId]` (permiso `contacts.write`, llama al método de servicio ya existente) + botón de eliminar con confirmación en el listado. |
| **Evidencia** | tsc/eslint/build PASS · vitest core 2467 passed/4 skipped · smoke `DELETE /api/saas/web-builder/:id` → 401 sin sesión (sin 500) |
| **Nota** | Sin cambios en `SaasWebBuilderService` — se expone una capacidad de servicio ya implementada y probada · canary IA apagado · `claimReady: false` |

### Funcional — citas sin forma de confirmar/completar/cancelar/borrar (KPI "Completadas" fijo en 0) → RESUELTO

| Campo | Valor |
|-------|-------|
| **Resuelto** | **2026-07-31** (módulo Calendario/citas, ver `docs/ops/W3CRM_MIGRATION_PLAN.md` §17.2) |
| **Causa** | `saas_appointments` modela 5 estados (`scheduled/confirmed/completed/cancelled/no_show`) y `/saas/citas` ya calculaba y mostraba un KPI "Completadas", pero `/api/saas/citas/route.ts` solo exponía `GET`/`POST` — ninguna cita podía transicionar nunca de `scheduled`, dejando ese KPI matemáticamente fijo en `0` para siempre, y una cita creada por error no podía eliminarse. |
| **Fix** | Nuevo `PATCH`/`DELETE /api/saas/citas/[id]` (permiso `workflows.write`, mismo ya usado por `POST /api/saas/citas`; scoping por `tenant_id` preservado) — `PATCH` valida `status` contra los 5 valores reales del esquema y permite actualización parcial; `DELETE` es borrado real con aislamiento multi-tenant. `/saas/citas` añade botones de acción por fila (Confirmar/Completar/Cancelar/Eliminar) con manejo de error visible. |
| **Evidencia** | tsc/eslint/build PASS · vitest core 2467 passed/4 skipped · smoke `PATCH`/`DELETE /api/saas/citas/:id` → 401 sin sesión (sin 500) |
| **Nota** | Sin cambios en el esquema de `saas_appointments` ni en el email de confirmación SES — se expone un ciclo de vida ya modelado en el esquema, igual que el patrón de los módulos 4 y 5 · canary IA apagado · `claimReady: false` |

### Funcional — editor visual de workflows siempre publicaba la misma demo fija de 2 nodos → RESUELTO

| Campo | Valor |
|-------|-------|
| **Resuelto** | **2026-07-31** (módulo Automatizaciones/workflows, ver `docs/ops/W3CRM_MIGRATION_PLAN.md` §16.2) |
| **Causa** | `/saas/workflows/editor` nunca llamaba a `GET /api/saas/workflows/visual` (ya implementado y funcional) — siempre arrancaba con los mismos 2 nodos hardcodeados (`Trigger: contact_created` → `Action: send_email`) sin ninguna forma de recuperar un flujo guardado anteriormente. Tampoco existía ninguna paleta ni botón para insertar nodos nuevos ni cambiar el tipo de uno existente, por lo que el editor solo podía publicar siempre esa misma combinación fija. `deleteWorkflow` (ya implementado y testeado en `DragDropWorkflowService`) tampoco estaba expuesto por ninguna API — no había forma de borrar un flujo creado por error. |
| **Fix** | Nuevo `GET`/`DELETE /api/saas/workflows/visual/[id]` (permisos `workflows.read`/`workflows.delete`, ya existentes) expone `getWorkflow`/`deleteWorkflow`; editor reescrito con panel "Mis flujos" (listar/cargar/eliminar flujos reales) y paleta de nodos trigger/acción con selector de tipo — acciones limitadas a los 4 tipos que `publishAsSaasWorkflow` mapea de forma explícita (`send_email`, `notify`, `add_tag`, `webhook_out`) para no introducir una nueva degradación silenciosa a `notify` |
| **Evidencia** | tsc/eslint/build PASS · vitest `dragDropWorkflow.test.ts` (backend sin cambios, ya cubierto) + core 2467 passed/4 skipped · smoke `/api/saas/workflows/visual/:id` (GET/DELETE) → 401 sin sesión (sin 500) |
| **Nota** | Sin mocks nuevos ni cambios en `DragDropWorkflowService`/modelo de datos — se expone capacidad de backend ya real y probada, igual que el patrón de `SaasSmsService.listRecent` en el módulo 4 · canary IA apagado · `claimReady: false` |

### Funcional — `/saas/sms` mostraba "campañas SMS" con datos descartados y acciones no implementadas → RESUELTO

| Campo | Valor |
|-------|-------|
| **Resuelto** | **2026-07-31** (módulo Comunicación, ver `docs/ops/W3CRM_MIGRATION_PLAN.md` §15.2) |
| **Causa** | (1) `load()` de `/saas/sms` descartaba la respuesta real de `GET /api/saas/sms` y asignaba `campaigns: []` hardcodeado — la lista de "campañas" nunca reflejaba datos reales. (2) El modal "Nueva campaña SMS" llamaba a `POST /api/saas/sms` con `{action:"create_campaign"}`, acción nunca implementada en `SaasSmsService` (el `POST` real solo soporta envío único o `recipients[]`) — siempre fallaba con 400. (3) El modal de envío único enviaba `{to, body}` cuando la API espera `{to, message}` — ese envío tampoco funcionaba nunca. Además, `saas_sms_log` (migración 419) ya persistía cada envío por tenant pero ningún método leía esa tabla de vuelta. |
| **Fix** | Nuevo `SaasSmsService.listRecent(tenantId, limit)` lee `saas_sms_log`; `GET /api/saas/sms` expone `messages: SaasSmsLogEntry[]`; página reescrita para mostrar el historial real (mismo patrón que WhatsApp/Dialer) en vez del concepto de "campaña" sin respaldo backend; modal de envío único corregido a `{to, message}` |
| **Evidencia** | `SaasSmsService.test.ts` (+2 tests `listRecent`) · tsc/eslint/build PASS · vitest 2467 passed/4 skipped · smoke `/api/saas/sms` → 401 sin sesión (sin 500) |
| **Nota** | Sin mocks nuevos — se elimina el único mock real que existía en el módulo (`campaigns: []` hardcodeado) · canary IA apagado · `claimReady: false` |

### Funcional — open rate de `/saas/campanias` siempre mostraba 0% → RESUELTO

| Campo | Valor |
|-------|-------|
| **Resuelto** | **2026-07-31** (módulo Comunicación, ver `docs/ops/W3CRM_MIGRATION_PLAN.md` §15.1) |
| **Causa** | La lista de campañas calculaba `openRate` por fila como `(0 / c.sentCount) * 100` — numerador literal `0` en el frontend, pese a que `SaasCampaniasService.getCampanias` ya devolvía `openedCount`/`clickedCount` reales por campaña; el tipo `Campania` del frontend simplemente no incluía esos campos. |
| **Fix** | Tipo `Campania` ampliado con `openedCount`/`clickedCount`; cálculo de `openRate` corregido para usar el dato real |
| **Evidencia** | tsc/eslint/build PASS · vitest 2467 passed/4 skipped |
| **Nota** | Sin cambios de API — el backend ya devolvía el dato correcto, el bug era puramente de mapeo en el frontend |

### Funcional — historial de `/saas/chat` no se persistía (GDPR gap) → RESUELTO

| Campo | Valor |
|-------|-------|
| **Resuelto** | **2026-07-31** (módulo IA NELVYON, ver `docs/ops/W3CRM_MIGRATION_PLAN.md` §14.2) |
| **Causa** | `POST /api/saas/chat` generaba la respuesta llamando a OpenAI directamente pero nunca escribía en `saas_chat_messages`, mientras `GET` sí leía de esa tabla vía `SaasChatService.getHistory`. Efecto: el historial del asistente de marketing se perdía siempre al recargar, y esas conversaciones quedaban fuera del export/delete GDPR (`SaasGdprService` ya opera sobre `saas_chat_messages`). |
| **Fix** | Nuevo método `SaasChatService.saveExchange(userId, tenantId, userContent, assistantContent)` (persiste sin reinvocar el LLM) llamado desde el `POST` tras obtener la respuesta; nuevo `DELETE /api/saas/chat` (expone `clearHistory`, ya existente sin uso); frontend carga historial real al montar y ofrece "Nueva conversación" |
| **Evidencia** | `saasChat.test.ts` (+1 test `saveExchange`, 13/13 PASS) · tsc/eslint/build PASS · smoke sin sesión `/api/saas/chat` → 401 (sin 500) |
| **Nota** | Sin mocks · misma tabla/API ya existente y ya cubierta por GDPR · canary IA apagado · `claimReady: false` |

### UI — tono de badge `"default"` inválido en Contratos de `/saas/pipeline` → RESUELTO

| Campo | Valor |
|-------|-------|
| **Resuelto** | **2026-07-31** |
| **Causa** | `apps/web/src/app/saas/pipeline/page.tsx`, pestaña Contratos: `tone={statusTone[c.status] ?? "default"}` — `"default"` no es un valor válido de `NelvyonDsBadgeProps["tone"]` (`neutral\|primary\|success\|warning\|danger`). Solo compilaba porque `Record<string, Tone>` no fuerza el tipo del lado derecho de `??`. |
| **Fix** | Fallback cambiado a `"neutral"` (tono válido) |
| **Evidencia** | tsc PASS · eslint PASS · vitest `backend/saas` + `src/features/saas-deals` 2449 passed/4 skipped · build producción PASS · commit `8974e873` |
| **Nota** | Sin cambios de comportamiento visible en producción — todos los estados reales (`draft/sent/signed/active/expired/cancelled`) ya estaban cubiertos en el mapa; corrección de tipo/robustez preventiva |

### KI — pgvector RAG: minScore=0.32 no refusa en corpus de tenant muy pequeño (P2) → RESUELTO

| Campo | Valor |
|-------|-------|
| **Resuelto** | **2026-07-27** |
| **Fix** | `resolveEffectiveRagMinScore` en `LocalRagRetriever.ts` — suelo **0.45** si `0 < activeChunkCount < 48`; corpus grande conserva **0.32** (nunca se bajó el default) |
| **Evidencia** | `pgvector-rag.live_latest.md` **VERDICT PASS** (críticos+calidad) · `localRagMinScoreFloor.test.ts` · load 8× PASS · calibración staging related~0.63 / unrelated~0.37 |
| **Nota** | Sin mocks · sin umbrales bajados · canary prod **no** abierto · `claimReady: false` |

### Ops-R — ERP process-memory as SSOT / loss-on-restart (P0 design risk) → ADR-061

| Campo | Valor |
|-------|-------|
| **Resuelto (código)** | **2026-07-25** — ADR-061 |
| **Causa** | ADR-060: ERP Blocks 26–29 runtime SSOT was process-local in-memory → data lost on process restart |
| **Fix** | Mig **520** `erp_domain_snapshots` + RLS · `ErpDomainSnapshotStore` · API routes → `with*Persistence` · when `DATABASE_URL` set, **Postgres is SSOT** (process-memory no longer SSOT) · mig **519** remains companion schema reserved |
| **Evidencia** | `520_erp_postgres_persistence.sql` · `ErpPersistentRuntime` · API erp routes · vitest roundtrip · OsCatalogV1 nextAction · living docs ADR-061 |
| **Nota** | Staging survival **VERIFIED** 2026-07-25 (`9e931f08` · `794662d7`). Prod ERP migrate still gated. `claimReady: false`. |

### Ops — pgvector RAG live e2e (Block 24 "yellow point 7") — Docker+Ollama real, aislamiento app+RLS verificado

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-25 (verificado EN VIVO en máquina local del owner) |
| **Evidencia** | `scripts/staging-smoke-pgvector-rag-e2e.mjs` → `scripts/docs/evidence/os-saas-e2e/modules/pgvector-rag.live_latest.md` — 11/13 checks críticos+calidad PASS, 2 quality FAIL documentados (ver KI arriba) · Docker `nelvyon-local-ai-postgres` (pgvector/pgvector:pg16) healthy · Ollama `nomic-embed-text` reachable · `backend/agency/__tests__/PrivateVectorRagCore.test.ts` 27 PASS · `tsc --noEmit` 0 errores |
| **Nota** | `PrivateVectorRagCore.PRIVATE_VECTOR_RAG_STATUS.productionPgvectorPath` promovido de `PREPARED_OFF` → `IMPLEMENTED_VERIFIED` con evidencia + timestamp + gap conocido documentado (nunca oculto) · `OsCatalogV1` `private_vector_rag.nextAction` actualizado · staging sigue **PREPARED_OFF** (ver Ops arriba) |

### Ops — ADR-057 Blocks 11–25 internal cores (local · deploy pending)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-24 (código local verificado) |
| **Evidencia** | `tsc` **0** · `backend/agency` **249 PASS** · influencers pack **PASS** · `pwa-certify` **PASS** · private-rag synthetic **ALL_PASS** (27 tests) · catalog **v1.4.0** |
| **Nota** | tip **TBA** · staging deploy **pending push** · externos siguen **BLOCKED** |

### Ops — ADR-056 P0/P1 audit fixes (local · deploy pending)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-24 (código local) |
| **Evidencia** | base tip **`6364c28c`** · tsc **0** · agency **109 PASS** · CampaignsLegal+saasCampanias+saasEnv+mcpProductive+catalog availability **PASS** · eslint changed routes **0** |
| **Nota** | Fixes **uncommitted** · tip TBA · staging runtime still ADR-055 `53149384` |

### Ops — ADR-055 E2E PASS (automations/reputation + SM/MCP synthetic)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-24 |
| **Evidencia** | tip **`53149384`** · deploy **`e514bbd7`** SUCCESS · `automations_reputation_e2e_latest.md` · SM/MCP synthetic flags ON · productivo 0 |

### Ops — ADR-055 local CODE_READY (deploy pending)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-24 (código local) |
| **Evidencia** | agency **64+ PASS** · tsc **0** · catalog **1.2.0** · tip **TBA** |
| **Nota** | E2E automations/reputation + staging deploy **pending** |

### Ops — ADR-054 11 packs + auditor ALL_PASS

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-24 |
| **Evidencia** | tip `980ea216` · deploy `23f637b9` · `auditor.all_packs_e2e_latest.md` |

### Ops — ADR-053 OS v1 staging closure

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-24 |
| **Evidencia** | tip `37b8bd42` · deploy `dd7505e9` |

### Ops — Social ADR-052 staging CERT

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-24 |
| **Evidencia** | E2E `--only=social` ALL_PASS · tip `4d331b55` · deploy `85fe50cc` · 7 entregables portal |
| **Nota** | Login 401 corregido resync `STAGING_QA_PASSWORD` + `seedQaOperator` (staging only) |

### Ops — 5 packs beta → ALL_PASS / available

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto** 2026-07-24 |
| **Detalle** | `.release-logs/beta-packs-e2e-2026-07-24T13-42-38.txt` · tip `eb462545` |

### Ops — Strategy/Funnel/Retention E2E post-deploy

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto** 2026-07-24 |
| **Detalle** | `ecommerce-pack-e2e-20260724-015452` · `saas-b2b-pack-e2e-20260724-022752` · registry elite ecommerce+crm_sales |

### Ops — Staging mesh Pack E2E QA soft-fail → ALL_PASS

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-24 |
| **Detalle** | tip `99b30730` · ADR-046 · Pack E2E **completed** · 5 auto-approve · supersede `needs_review` `f5de9c43` |

### Ops — Prod residual `OPENAI_API_KEY`

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-24 |
| **Detalle** | Variable eliminada · **ABSENT** · `AUTONOMOUS_ALLOW_OPENAI` ABSENT |

---

## Historial resuelto

### KI-031 — Staging Mesh Option A: Tailscale join FAIL (invalid/consumed TS_AUTHKEY)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-23 |
| **Causa** | Auth key ephemeral consumida en redeploys |
| **Solución** | `TS_AUTHKEY` reusable+ephemeral · `MESH_JOIN_OK` · peer `nelvyon-staging-web-1` active · deploy `6aeb4106` |

### Ops (no KI) — Web `git_sha` null after `railway up`

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto 2026-07-22** → historial |
| **Reparación** | ONE `railway redeploy --service "@nelvyon/web" --from-source -y` → deploy `7d625161` · live `git_sha=9ca0cf29a5e5` |
| **Nota** | claimReady remains **false** (legal + CEO IA). |

### Ops (no KI) — Staging pack E2E `LLM_NOT_CONFIGURED` / mesh

| Campo | Valor |
|-------|-------|
| **Estado** | **Superseded parcialmente por KI-031** — tip `1d5d620a` Pack E2E **WARN** critical=0 sin `MESH_JOIN_OK` (no declara mesh path) |
| **Detalle** | Tras `MESH_JOIN_OK` re-correr Pack E2E + probe Ollama vía proxy. OpenAI sigue OFF. |
| **Evidencia** | deploy `03a16532` · HANDOVER 2026-07-23 |

### Ops (no KI) — Local pack as-complete con Ollama 3b

| Campo | Valor |
|-------|-------|
| **Estado** | **Observado** — no bloquea go-live DNS |
| **Severidad** | Baja (local QA quality) |
| **Detalle** | Kickoff HTTP local+Ollama completa pipeline en `needs_review` cuando artifacts 3b no alcanzan QA≥85. **Model/hardware limit** (threshold 85 unchanged; NOT false PASS). Phase C heliovolt 3b **qa=55**; 8b **qa=89** (evidence). OpenAI auto-fallback removed (`AUTONOMOUS_ALLOW_OPENAI` opt-in). |
| **Evidencia** | `.release-logs/hardening-ia-packs-20260722.txt` · run `c61cb100…` needs_review · 8b optional pass |

### KI-027 - Test drift brain knowledge (`ingestEvidence.verified`)

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto 2026-07-21** |
| **Severidad** | Era Baja (P2) — mitigada |
| **Reparación** | Test `nelvyonBrainKnowledge.test.ts` ahora mirrors `knowledge_ingest_evidence.json` (`ok && verified`); conserva `claimComplete:false`. Validador post-elite → 508–516. |
| **Evidencia** | Brain tests 7/7 PASS · `nelvyon-verify-all` → **CONDITIONAL_READY** (0 FAIL) · `validate-post-elite-migrations` OK 508–516 |
| **Nota** | No se debilitó cobertura; `claimComplete` sigue tipado `false`. |

### KI-020 - CSRF Origin en mutaciones cookie SaaS (mitigado en codigo)

| Campo | Valor |
|-------|-------|
| **Estado** | Mitigado en repo · smoke staging apex PASS · app Origin allowlist fix 2026-07-22 (`assertSaasOrigin` + `staging-smoke-ki020-csrf.mjs`) |
| **Severidad** | Alta (antes); controlada tras fix |
| **Detalle** | Mutaciones `/api/saas/*` con cookie sin Origin/Referer validos -> 403 via `assertSaasOrigin`. Fallback SES bounce/complaint ahora exige `tenant_id`. |
| **Docs** | `docs/CIERRE_FINAL_PRIORITARIO.md` |

### KI-022 - Staging schema drift: legacy `conversations` (integer) vs mig 401 (UUID)

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto en staging 2026-07-20** (histórico activo para referencia) |
| **Severidad** | Era Alta — mitigada |
| **Reparación** | Mig `400a_reconcile_legacy_integer_conversations.sql` (rename legacy vacío) → `401` aplicada. Postcheck: `conversations.id` uuid · `conversation_messages` FK OK · legacy 0 filas. |
| **Evidencia** | Staging `_migrations` contiene `400a_*` + `401_inbox_conversations.sql`. Backup local fuera de repo. |
| **Nota** | No se editó 401. Producción no tocada. |

### KI-023 - Staging migrate bloqueado en `402_pipeline_deals.sql` (tenant_id)

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto en staging 2026-07-20** |
| **Severidad** | Era Alta — mitigada |
| **Reparación** | Mig `401a_reconcile_legacy_integer_deals.sql` (idempotencia UUID+tenant_id antes de abort destino; check seq `deals_legacy_integer_id_seq`) → `402`…`407` OK. Postcheck: `deals.id` uuid + `tenant_id` · pipelines/stages+FKs · legacy 0 filas. |
| **Evidencia** | Staging `_migrations` contiene `401a_*` + `402_pipeline_deals.sql` … `407_*`. Backup local fuera de repo. |
| **Nota** | No se editó 402. Producción no tocada. Cadena continuó hasta **FATAL @408** → KI-024. |

### KI-024 - Staging migrate bloqueado en `408_calendar_events.sql` (tenant_id)

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto en staging 2026-07-20** |
| **Severidad** | Era Alta — mitigada |
| **Reparación** | Mig `407a_reconcile_legacy_integer_calendar_events.sql` (idempotencia UUID+tenant; check destino/seq) → `408`…`506` OK. **Nota:** nombre `407a` no `408a` porque sort lexicográfico tiene `408_*` < `408a_*`. |
| **Postcheck** | `calendar_events.id` uuid + `tenant_id` · `calendar_events_legacy_integer` 0 filas · `_migrations` 407a+408…506 · **507 ausente** |
| **Nota** | No se editó 408. Producción no tocada. Verify Shared Memory diferido. Stop siguiente = KI-025 @507. |

### KI-025 - Staging: mig 507 dual-schema + orden `current_tenant_id()` (audit)

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto en staging 2026-07-21** (cadena migrate + Shared Memory) |
| **Severidad** | Era Alta — mitigada para bloqueo 507 |
| **Reparación** | `506a_reconcile_legacy_pre_507_social_posts.sql` (rename vacío) → 507…515. **507 no editada** (prod ya la tiene). |
| **Postcheck** | `_migrations` 506a+507…515 · `social_posts` UUID+tenant_id int · legacy 0 · SM **verified:true** |
| **Residual** | Warnings 507 tolerados + policies tenant ausentes → **KI-026** |

### KI-026 - Staging: RLS policies tenant ausentes tras 507 (42883 / type drift)

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto en staging 2026-07-21** |
| **Severidad** | Era Media–Alta — mitigada (defensa en profundidad) |
| **Reparación** | Mig aditiva `516_fastapi_rls_repair.sql` (idempotente; no edita 507; no toca SM). **ADR-032** dual-plane. |
| **Postcheck** | 13 tablas RLS ON + policies · predicado funnels/chatbot aislamiento OK · SM `verified:true` · `_migrations` contiene 516 |
| **Nota** | Runtime SET ROLE no disponible en pooler/superuser; evidencia = catalog + predicados = expresiones de policy. Audit JWT skip si &lt;2 tenants onboarding. |

### KI-021 - Shared Memory 514/515 no aplicadas en staging

| Campo | Valor |
|-------|-------|
| **Estado** | **Resuelto en staging 2026-07-21** |
| **Detalle** | 514+515 en `_migrations` · tablas + RLS + policies SaaS · `verify-shared-memory-schema.mjs` → `verified:true` (`method: node-pg`) |
| **Nota** | Flags runtime Shared Memory **siguen OFF** por defecto; no activar en prod. |


### KI-018 — Fase 2 Elite: residuales post-PASS (ops remotas)

| Campo | Valor |
|-------|-------|
| **Estado** | Parcialmente mitigado 2026-07-20 (local) |
| **Severidad** | Controlada |
| **Detalle** | Elite/Workforce PASS intactos. **Local:** Docker+pgvector+ingest Brain **verified** (1559 chunks). Sigue pendiente ops remota: migrate **514/515** staging (KI-021), OpenClaw URL real. |
| **Docs** | `docs/PHASE2_ELITE_CERT.md` · ADR-026 · HANDOVER Bloque 1 |

### KI-016 — (histórico residual) Docker/pgvector LocalVectorStore

| Campo | Valor |
|-------|-------|
| **Estado** | Mitigado en local 2026-07-20 — ver KI-018 |
| **Detalle** | Compose local-ai UP + ingest verified; comparar entornos staging sigue ops |

### KI-012 — Vulnerabilidades npm high (transitive)

| Campo | Valor |
|-------|-------|
| **Severidad** | Media (dependencias) |
| **Detalle** | ~17 high en árbol pnpm tras overrides; 0 critical |
| **Mitigación** | Gate CI falla solo en critical; Dependabot semanal; overrides documentados ADR-012 |
| **Fix** | Actualizar deps upstream cuando patches disponibles; no exclusiones globales |

---

### KI-005 — Private AI: dual RAG stores (deuda controlada → facade)

| Campo | Valor |
|-------|-------|
| **Severidad** | Baja (mitigada) |
| **Detalle** | Facade `UnifiedRagStore` prefer LocalRagRetriever → fallback NelvyonRagStore. Router cert path sin cambios. |
| **Mitigación** | `NELVYON_RAG_PREFER_LOCAL=0` rollback · docs `PHASE2_RAG_UNIFIED.md` |
| **Fix** | Ingest vector local **verified** 2026-07-20 (1559 chunks). Cutover ops staging/prod RAG sigue aparte. |

---

### KI-009 — Railway SSH no configurado en entorno agente

| Campo | Valor |
|-------|-------|
| **Severidad** | Baja (ops) |
| **Detalle** | `railway ssh` requiere clave en `~/.ssh/` |
| **Fix** | `ssh-keygen -t ed25519` + `railway ssh keys add` |

---

## Historial resuelto

### Ops-R — Cloudflare DNS `app.nelvyon.com`

| Campo | Valor |
|-------|-------|
| **Resuelto** | **2026-07-22** |
| **Evidencia** | Railway verified+cert VALID · live/ready 200 · `.release-logs/dns-app-verify-pass-20260722.txt` · `docs/ops/DNS_APP_NELVYON.md` |
| **Nota** | CNAME+TXT DNS-only en Cloudflare |

### KI-R028 — Stripe Live STARTER price (ex KI-028)

| Campo | Valor |
|-------|-------|
| **Resuelto** | **2026-07-22** |
| **Evidencia** | `GET /api/billing/price-audit` (auth cron) en `nelvyon.com` + `nelvyonweb-production.up.railway.app` → **allValid=true** · starter/pro/agency `stripeRetrieveOk=true` · `stripeActive=true` · sin `resource_missing` |
| **Vars** | `STRIPE_PRICE_ID_STARTER` / `PRO` / `AGENCY` SET (`price_*`); `STRIPE_PRICE_ID_AGENCY_PARTNER` ausente (fuera del audit checkout; no bloquea KI-028) |
| **Nota** | Sin crear precios/cobros en esta pasada |

### KI-R030 — Runtime `security/headers` cwd apps/web (ex KI-030)

| Campo | Valor |
|-------|-------|
| **Resuelto** | **2026-07-22** |
| **Causa** | `next.config` resolvía `./src/lib/security/headers` desde cwd `/app` |
| **Fix** | CMD `cd /app/apps/web && exec node server.js` · WORKDIR `/app` · `.dockerignore` WIP |
| **Deploy** | `3f08f13d` **SUCCESS** · SHA vivo `bba71f14afc1` · live/ready 200 · logs Ready sin headers error |
| **Evidencia** | Local docker PASS · vitest 3/3 · tsc 0 · `.release-logs/p0-smokes-post-ki030.txt` |

### KI-R029 — Prod migraciones 512–516 vía preDeployCommand (ex KI-029)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-21 |
| **Solución** | `/railway.toml` + `/railway.json`: `preDeployCommand = ["pnpm -C apps/web migrate:prod"]`; Dockerfile raíz copia `apps/web/scripts` + workspace + `WORKDIR /app` |
| **Evidencia** | Deploy `922c8039` logs `[migrate] run/done` 512…516 · `all migrations complete` · read-only `_migrations` `all512to516=true` (ejecutado ~2026-07-21T17:31:04Z) |
| **Nota** | App start del mismo deploy falló → **KI-030**; schema drift KI-029 **cerrado** |

### KI-R014 — AWS SES production access (ex KI-014)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-21 |
| **Solución** | AWS Review GRANTED · ProductionAccessEnabled true · SendingEnabled true · nelvyon.com Verification/DKIM SUCCESS · self-send OK · SNS webhook confirmed |
| **Evidencia** | Bloque 4 ejecución · `docs/OPS_SES_PROD.md` (actualizar checklist) |

### KI-R017 — Migraciones dollar-quote / CREATE IF NOT EXISTS (ex KI-017)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-19 (mitigado) |
| **Solución** | Splitter portado a `scripts/lib/splitSqlStatements.mjs` + `scripts/validate-split-sql.mjs`; migrate-pg usa el mismo port. Colisiones 406/415 corregidas; 507 consolidated skip. Residual: auditoría IF NOT EXISTS restante no bloquea fresh migrate. |

---

### KI-R016 — Docker Desktop local no disponible para E2E live (ex KI-016)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-17 |
| **Solución** | Engine UP; Postgres pgvector `:5433` + Redis `:6380`; live multi-tenant PASS · `PRODUCTION_CERTIFICATION_REPORT.md` · `live_multitenant_latest.json` |

---

### KI-R019 — Workforce cert CONDITIONAL → PASS (ex KI-019)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-19 |
| **Solución** | Residuals + live Ollama/RAG auto + soak + production build en `run-workforce-cert.mjs`; `verdict=PASS`; `nelvyonAutonomousWorkforceCertified=true`; skipped=0; force-pass rechazado. Evidencia: `workforce_certification.json`, `workforce_live.json`, `workforce_soak.json` |

---

### KI-R015 — Lead scoring legacy `scored_leads` / `LeadScoringService` (ex KI-015)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-17 |
| **Solución** | Eliminada clase `LeadScoringService`; mig `513_drop_scored_leads.sql`; HTTP `/leads` permanece 410; SSOT = `SaasLeadScoringService` |

---

### KI-R012 — Restore drill Postgres (DR) sin evidencia

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-17 |
| **Solución** | `scripts/run-postgres-restore-drill.mjs` — pg_dump → pg_restore ephemeral · **8/8 PASS** · `postgres_restore_drill_latest.json` |

---

### KI-R011 — SES dominio nelvyon.com (ex KI-013)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-11 (ops) / docs sync 2026-07-17 |
| **Evidencia** | `CEO_FINAL_ACTIONS.md` — VerificationStatus SUCCESS, DKIM SUCCESS |

---

### KI-R010 — SNS SES subscription (ex KI-011)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-10 |
| **Evidencia** | Topic `nelvyon-ses-events` confirmado · `CEO_FINAL_ACTIONS.md` |

---

### KI-R009 — Status page probes externos fallaban

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-10 |
| **Causa** | statusChecker usaba URLs AWS/Stripe incorrectas; DB no usaba health checks reales |
| **Solución** | Probes internos + checkDatabase/checkStripe/checkSES; cron status-check en GH Actions |

---

### KI-R008 — Staging Elite Gate fallaba por deploy SHA timeout

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-10 |
| **Causa** | Railway no rebuild en pushes scripts-only; gate esperaba SHA indefinidamente |
| **Solución** | `DEPLOY_WAIT_SOFT` + timeout 10m; local-pack-e2e alineado con ecommerce smokes |

---

### KI-R005 — CI pack tests fallaban (packSeedMetadata, packAutoApprove)

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-09 |
| **Causa** | Mock `createPackRun` sin `{ run, created: true }` → early return en orchestrator |
| **Solución** | Corregidos mocks en tests pack |

---

### KI-R006 — releaseCommand no aplicaba migraciones

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-09 |
| **Solución** | `migrate:prod` unificado + Dockerfile copia `scripts/` |

---

### KI-R007 — Setup dev local sin commit

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-09 |
| **Solución** | Commiteado `config.py`, `load_env_files.py`, README dev |

---

### KI-R004 — CEO brief 42P01 + schema_not_ready

| Campo | Valor |
|-------|-------|
| **Resuelto** | 2026-07-09 17:02 UTC |
| **Solución** | Migrate prod 482–511; cron `processed:1` |

---

## Plantilla nuevo issue

```markdown
### KI-XXX — Título
| Campo | Valor |
| Severidad | |
| Ruta / servicio | |
| Causa | |
| Fix | |
| Estado | |
```
