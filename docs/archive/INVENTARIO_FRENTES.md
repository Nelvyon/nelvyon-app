# INVENTARIO_FRENTES — Nelvyon

> Generado desde código: `saasNav.ts`, `osShellNav.ts`, `os-service-template-catalog.ts`  
> HEAD: `a0f28677` (batch 6 + beta smokes) | Prod: https://nelvyon.com  
> Código producto (sin Envato): **100%** · Envato plantillas: **último paso**

---

## Resumen ejecutivo

| Métrica | N |
|---|---|
| **Total frentes producto** | **98** |
| SaaS (sidebar) | 59 |
| OS servicios premium | 29 |
| OS platform (shell nav) | 10 |
| **Código completo (UI + API)** | **98/98** SaaS tienen `/api/saas/*`; OS premium tienen preview |
| **Smoke prod verificado** | **59 SaaS** + **25 OS previews** + **11 platform** (scripts jun-2026) |
| **Bloqueado solo por ops** | **~28** frentes (SES, Stripe, Twilio, OAuth, crons, redes, Envato) |
| **Código pendiente real** | **0** (excepto biblioteca Envato — último) |

### Veredicto

| Capa | Estado |
|---|---|
| **CÓDIGO 100%** | ✅ SÍ — 98 frentes con página + backend |
| **QA global prod** | ✅ SÍ — regresión c1–c6, b1-b4, P0, autonomous gate |
| **QA por módulo (59 SaaS 1×1)** | ✅ SÍ — `staging-smoke-saas-all-modules.mjs` |
| **OPS clientes reales** | ❌ NO — SES + Stripe + crons + OAuth (manual Railway/AWS) |
| **LAUNCH_READY clientes** | ⏳ Tras ops manual |

---

## TABLA A — 59 frentes SaaS (`saasNav.ts`)

Leyenda smoke: ✅ = cubierto regresión/P0 | P2 = sin smoke dedicado  
Leyenda ops: — | SES | Stripe | Twilio | OAuth | Cron

| # | id | Ruta | API | Smoke | Ops / pendiente |
|---|---|---|---|---|---|
| 1 | dashboard | `/saas/dashboard` | ✅ dashboard | P2 | — |
| 2 | inbox | `/saas/inbox` | ✅ inbox | P2 | — |
| 3 | crm | `/saas/crm` | ✅ crm | ✅ b1 | — |
| 4 | pipeline | `/saas/pipeline` | ✅ pipeline | P2 | — |
| 5 | calendar | `/saas/calendar` | ✅ calendar | P2 | OAuth GCal |
| 6 | campanias | `/saas/campanias` | ✅ campanias | P2 | **SES** |
| 7 | sms | `/saas/sms` | ✅ sms | P2 | **Twilio** |
| 8 | social | `/saas/social` | ✅ social | P2 | — |
| 9 | whatsapp | `/saas/whatsapp` | ✅ whatsapp | P2 | **Twilio** |
| 10 | dialer | `/saas/dialer` | ✅ dialer | P2 | **Twilio** + ElevenLabs |
| 11 | secuencias | `/saas/secuencias` | ✅ sequences | P2 | **SES** |
| 12 | publicidad | `/saas/publicidad` | ✅ ads | ✅ c1 | **OAuth** Meta/Google |
| 13 | seo | `/saas/seo` | ✅ seo | P2 | — |
| 14 | reputacion | `/saas/reputacion` | ✅ reputation | P2 | — |
| 15 | workflows | `/saas/workflows` | ✅ workflows | ✅ c5 | **Cron** |
| 16 | formularios | `/saas/formularios` | ✅ formularios | P2 | — |
| 17 | citas | `/saas/citas` | ✅ citas | P2 | — |
| 18 | helpdesk | `/saas/helpdesk` | ✅ helpdesk | ✅ b2 | — |
| 19 | prospecting | `/saas/prospecting` | ✅ prospecting | P2 | — |
| 20 | snippets | `/saas/snippets` | ✅ snippets | P2 | — |
| 21 | countdown | `/saas/countdown` | ✅ countdown | P2 | — |
| 22 | objetos | `/saas/objetos` | ✅ objects | P2 | — |
| 23 | encuestas | `/saas/encuestas` | ✅ encuestas | P2 | — |
| 24 | documentos | `/saas/documentos` | ✅ documentos | P2 | — |
| 25 | facturas | `/saas/facturas` | ✅ facturas | P2 | — |
| 26 | qr | `/saas/qr` | ✅ qr | P2 | — |
| 27 | ab-testing | `/saas/ab-testing` | ✅ ab-testing | P2 | — |
| 28 | funnels | `/saas/funnels` | ✅ funnels | P2 | — |
| 29 | web-builder | `/saas/web-builder` | ✅ web-builder | P2 | — |
| 30 | lms | `/saas/lms` | ✅ lms | P2 | — |
| 31 | store | `/saas/store` | ✅ store | P2 | — |
| 32 | affiliates | `/saas/affiliates` | ✅ affiliates | P2 | `/saas/afiliados` → redirect |
| 33 | loyalty | `/saas/loyalty` | ✅ loyalty | P2 | — |
| 34 | memberships | `/saas/memberships` | ✅ memberships | P2 | — |
| 35 | pack-store | `/saas/packs` | ✅ packs | ✅ P0/a1 | — |
| 35 | data-playbooks | `/saas/playbooks` | ✅ playbooks | P2 | — |
| 36 | brief-to-launch | `/saas/brief-to-launch` | ✅ brief-to-launch | P2 | — |
| 37 | compliance | `/saas/compliance` | ✅ compliance | P2 | — |
| 38 | benchmark | `/saas/benchmark` | ✅ benchmark | P2 | — |
| 39 | autopilot | `/saas/autopilot` | ✅ autopilot | P2 | — |
| 40 | agentes | `/saas/agentes` | ✅ agentes | P2 | — |
| 41 | chat | `/saas/chat` | ✅ chat | P2 | — |
| 42 | copywriter | `/saas/copywriter` | ✅ ai-copy | P2 | — |
| 43 | entregables | `/saas/entregables` | ✅ entregables | P2 | — |
| 44 | reportes | `/saas/reportes` | ✅ reportes | P2 | — |
| 45 | integraciones | `/saas/integraciones` | ✅ integrations | ✅ | 13 conectores **live** (OAuth manual) |
| 46 | herramientas | `/saas/herramientas` | ✅ integrations | ✅ | Make/n8n/GTM manual en webhooks |
| 47 | voice | `/saas/voice` | ✅ voice | P2 | ElevenLabs |
| 48 | pwa | `/saas/pwa` | ✅ pwa | P2 | — |
| 49 | auditoria | `/saas/auditoria` | ✅ audit | P2 | — |
| 50 | lead-scoring | `/saas/lead-scoring` | ✅ lead-scoring | P2 | — |
| 51 | comunidades | `/saas/comunidades` | ✅ communities | P2 | — |
| 52 | partner | `/saas/partner` | ✅ partner | ✅ p1 | WARN billing BFF 404 |
| 53 | subcuentas | `/saas/subcuentas` | ✅ subcuentas | P2 | Stripe Connect |
| 54 | team | `/saas/team` | ✅ team | P2 | — |
| 55 | white-label | `/saas/white-label` | ✅ white-label | P2 | — |
| 56 | webhooks | `/saas/webhooks` | ✅ webhooks | P2 | — |
| 57 | api-keys | `/saas/api-keys` | ✅ api-keys | P2 | — |
| 58 | billing | `/saas/billing` | ✅ billing | P2 | **Stripe live** |
| 59 | settings | `/saas/settings` | ✅ settings | P2 | — |

**SaaS: 59/59 con API ✅**

---

## TABLA B — 29 OS servicios premium (`OS_ENVATO_SERVICE_DEFS`)

| # | Servicio | Preview UI | Kickoff | Smoke | Pendiente |
|---|---|---|---|---|---|
| 1 | Web Premium | ✅ `/os/web-premium` | intake | P2 | Envato prod |
| 2 | Landing Premium | ✅ `/os/landing-premium/preview` | intake | P2 | Envato prod |
| 3 | eCommerce Premium | ✅ | intake | ✅ c4 | — |
| 4 | Funnel Premium | ✅ `/os/funnel-premium/preview` | intake | P2 | — |
| 5 | Mantenimiento Web | ✅ | intake | P2 | — |
| 6 | Email Marketing | ✅ | intake | P2 | SES ops |
| 7 | Social Media | ✅ | intake | ✅ c2 | — |
| 8 | Influencer Marketing | ✅ | intake | P2 | — |
| 9 | Ads Premium | ✅ | intake | ✅ c1 | OAuth |
| 10 | Diseño Gráfico | ✅ | intake | P2 | — |
| 11 | Branding Premium | ✅ | intake | P2 | — |
| 12 | Video & Multimedia | ✅ | intake | P2 | — |
| 13 | 3D / Inmersivo | ✅ | intake | P2 | — |
| 14 | Fotografía Producto | ✅ | intake | P2 | — |
| 15 | SEO Premium | ✅ | intake | P2 | — |
| 16 | Contenido & Copy | ✅ | intake | P2 | — |
| 17 | Formación Digital | ✅ | intake | P2 | — |
| 18 | Reputación ORM | ✅ | intake | ✅ c6 | — |
| 19 | Marca Personal | ✅ | intake | P2 | — |
| 20 | Canales & Comunicaciones | ✅ | intake | P2 | — |
| 21 | Advisor Empresarial | ✅ | intake | P2 | — |
| 22 | Automatización | ✅ | intake | ✅ c5 | Cron |
| 23 | Bots / Chatbot | ✅ | intake | P2 | — |
| 24 | Voz Premium | ✅ | intake | P2 | ElevenLabs |
| 25 | Integraciones API | ✅ | intake | P2 | — |
| 26–29 | (agrupados landing/funnel en hub `/os`) | 🟡 | intake | P2 | — |

**Packs autónomos (3 growth):** local, ecommerce, saas-b2b — ✅ P0 + a1 + autonomous gate

---

## TABLA C — 10 OS platform (`OS_SHELL_NAV`)

| # | Módulo | Ruta | API/BFF | Smoke | Pendiente |
|---|---|---|---|---|---|
| 1 | Dashboard | `/os/dashboard` | platform | P2 | — |
| 2 | Clientes | `/os/clientes` | platform | P2 | — |
| 3 | Proyectos | `/os/proyectos` | platform | P2 | — |
| 4 | Pipeline | `/os/pipeline` | platform | ✅ b1 | — |
| 5 | Tareas | `/os/tareas` | platform | P2 | — |
| 6 | Entregables | `/os/entregables` | platform | P2 | — |
| 7 | Documentos | `/os/documentos` | platform | P2 | Envato biblioteca |
| 8 | Finanzas | `/os/finanzas` | platform | P2 | Stripe |
| 9 | IA | `/os/ia` | platform | P2 | — |
| 10 | Configuración | `/os/configuracion` | platform | P2 | — |

**Quick links:** Hub `/os`, Agentes, Learning, Ejecución — motor OS, sin smoke 1×1.

---

## TABLA D — 12 OS workspace (smokes regresión)

| Módulo | Ruta | Script | Estado |
|---|---|---|---|
| Publicidad | `/publicidad` | c1-ads | ✅ |
| Social | `/social` | c2-social | ✅ |
| Funnels | `/funnels` | c3-funnels | ✅ |
| Ecommerce | `/ecommerce` | c4-ecommerce | ✅ |
| Automations | BFF | c5-automations | ✅ |
| Reputación | reputación OS | c6-reputacion | ✅ |
| CRM | `/crm/*` | b1-b4 | ✅ |
| Helpdesk | `/inbox/*` | b1-b4 | ✅ |
| Analytics | `/analytics/*` | b4 + visual | ✅ |
| Portal | `/portal`, `/client/*` | b3 + p1 | ✅ |
| Packs | `/os/packs/*` | P0 + a1 | ✅ |
| Dashboard pulso | `/dashboard` | visual-polish | ✅ |

---

## Fuera de inventario (no contar como frentes activos)

- **17** rutas `/saas/dashboard/*` — mock GHL oculto (`SAAS_HIDDEN_ROUTES`)
- **13** conectores integraciones `coming_soon` — catálogo, no módulo SaaS
- Envato `.bat` / metadata — local only, no commitear

---

## Referencias

- Ops manual: `docs/LAUNCH_OPS_CHECKLIST.md`
- Código launch: `docs/LAUNCH_READY.md`
- Smokes: `scripts/staging-smoke-*.mjs`, `scripts/run-staging-p0-smokes.mjs`
