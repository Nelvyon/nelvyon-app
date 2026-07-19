# OS + SaaS — Inventario funcional

> **Snapshot:** 2026-07-16 · **Método:** estático (código + docs + cert JSON)  
> **Actualizado:** 2026-07-16 — **MCP PRODUCTIVO NELVYON COMPLETADO** · OS/SaaS **NO COMPLETADOS**
>
> Inventario estático + clasificación. E2E runtime crítico = siguiente bloque.  
> **JSON:** `docs/os-saas-functional-matrix.json`  
> **Regla:** no marcar CERTIFICADO sin artefacto; no declarar OS/SaaS cerrados

## Conteos verificables

| Superficie | Cantidad | Evidencia |
|------------|---------:|-----------|
| Páginas `page.tsx` (total) | **333** | `apps/web/src/app/**` |
| SaaS `/saas/*` | **92** | |
| OS `/os/*` | **91** | |
| Portal `/portal/*` | **7** | |
| Marketing | **21** | |
| Admin | **4** | |
| API `route.ts` (total) | **513** | |
| `/api/saas` | **228** | |
| `/api/os` | **71** | |
| `/api/platform` | **76** | |
| `/api/public` | **21** | |
| `/api/cron` | **16** | |
| `/api/webhooks` | **8** | |
| `/api/auth` | **11** | |
| `/api/admin` | **5** | |

## Clasificación (leyenda)

| Código | Significado |
|--------|-------------|
| **CERTIFIED** | Artefacto reproducible (`completed: true` / cert JSON) |
| **IMPLEMENTED_UNCERTIFIED** | Código + tests/gates; sin cert de producto |
| **PARTIAL** | UI/API existen; falta ops/OAuth/terceros |
| **MOCK_OR_SIMULATED** | Mock/stub presentado o silencioso |
| **DISCONNECTED** | Contratos/flags OFF / no wired |
| **BROKEN** | Evidencia de fallo funcional |
| **BLOCKED_EXTERNAL** | Código listo; bloqueo CEO/tercero |
| **OBSOLETE_OR_DUPLICATE** | Legacy / dual stack documentado |

## Matriz de capacidades

| id | Capacidad | UI | API | Servicio | Estado | Evidencia |
|----|-----------|----|-----|----------|--------|-----------|
| saas.auth.jwt | Auth JWT cookies | `/login`, `/saas/*` | `/api/auth/*` | `saasRequestContext` | IMPLEMENTED_UNCERTIFIED | App Router auth |
| saas.auth.sso | SSO OIDC/SAML | settings | `/api/saas/sso` | `SaasSsoService` | PARTIAL | IdP por tenant |
| saas.tenants.team_rbac | Equipo + RBAC | `/saas/team` | `/api/saas/team` | `SaasTeamService` | IMPLEMENTED_UNCERTIFIED | ADR-022 `settings.write` |
| saas.tenants.api_keys | API keys | `/saas/api-keys` | `/api/saas/api-keys` | `SaasApiKeysService` | IMPLEMENTED_UNCERTIFIED | owner-only write |
| saas.tenants.webhooks | Webhooks egress | `/saas/webhooks` | `/api/saas/webhooks` | `SaasWebhooksService` | IMPLEMENTED_UNCERTIFIED | SSRF `assertSafeEgressUrl` |
| saas.crm.contacts | CRM contactos | `/saas/crm` | `/api/saas/crm/**` | `SaasCrmService` | IMPLEMENTED_UNCERTIFIED | vitest CRM |
| saas.crm.pipeline | Pipeline/deals | `/saas/pipeline` | `/api/saas/deals/**` | `SaasDealsService` | IMPLEMENTED_UNCERTIFIED | Playwright pipeline |
| saas.crm.lead_scoring | Lead scoring SSOT | `/saas/lead-scoring` | `/api/saas/lead-scoring` | `SaasLeadScoringService` | CERTIFIED_CORE | preferido |
| saas.crm.lead_scoring_legacy | Legacy `/leads` | — | `/lead-scoring/leads` | 410 Gone | OBSOLETE | eliminado (mig 513) |
| saas.email.campaigns | Campañas email | `/saas/campanias` | `/api/saas/campanias/**` | `SaasCampaniasService` | BLOCKED_EXTERNAL | KI-013/014 SES |
| saas.email.sequences | Secuencias | `/saas/secuencias` | `/api/saas/sequences/**` | `SaasSequencesService` | BLOCKED_EXTERNAL | SES |
| saas.seo | SEO | `/saas/seo` | `/api/saas/seo` | `SaasSeoService` | PARTIAL | Semrush opcional |
| saas.ads | Publicidad | `/saas/publicidad` | `/api/saas/ads/**` | Ads services | PARTIAL | OAuth proveedores |
| platform.ads.bff | Ads BFF | OS/platform | `/api/platform/ads/**` | `adsBffRoute` | PARTIAL | GET degraded; POST 502 |
| saas.social | Social | `/saas/social` | `/api/saas/social/**` | `SaasSocialService` | PARTIAL | OAuth |
| saas.workflows | Workflows | `/saas/workflows` | `/api/saas/workflows/**` | `SaasWorkflowService` | IMPLEMENTED_UNCERTIFIED | motor real; email→SES |
| saas.autopilot | Autopilot | `/saas/autopilot` | `/api/saas/autopilot` | `SaasAutopilotService` | PARTIAL | cron + canales |
| saas.inbox | Inbox | `/saas/inbox` | `/api/saas/inbox/**` | `SaasInboxService` | IMPLEMENTED_UNCERTIFIED | DB |
| saas.helpdesk | Helpdesk | `/saas/helpdesk` | helpdesk APIs | `SaasHelpdeskService` | IMPLEMENTED_UNCERTIFIED | |
| saas.comms.twilio_wa | SMS/WA/dialer | `/saas/sms` etc. | Twilio/WA APIs | SMS/WA services | PARTIAL | credenciales |
| saas.billing.stripe | Billing | `/saas/billing` | `/api/saas/billing/**` + webhooks | `SaasBillingService` | IMPLEMENTED_UNCERTIFIED | keys Stripe |
| saas.analytics | Reportes/KPI | `/saas/reportes` | `/api/saas/reportes/**` | Analytics services | IMPLEMENTED_UNCERTIFIED | |
| portal.client | Portal cliente | `/portal/**` | `/api/platform/portal/**` | Portal tokens | IMPLEMENTED_UNCERTIFIED | HMAC |
| os.packs.growth | Packs OS | `/os/packs/**` | kickoff APIs | `packOrchestrator` | IMPLEMENTED_UNCERTIFIED | CI os-pack-gate |
| os.platform | OS platform | `/os/(platform)/**` | `/api/os/**` | Os* services | IMPLEMENTED_UNCERTIFIED | ~71 APIs |
| ai.router | Model Router | private-ai | router-health | `local-ai/router` | **CERTIFIED** | `router_certification_final.json` |
| ai.specialization | Especialización | — | private-ai | specialization/* | **CERTIFIED** | `v6_cert_fixed` |
| ai.mcp | MCP productivo | — | `/api/saas/mcp` | `backend/mcp` | **CERTIFIED** | `mcp_certification_final.json` |
| ai.private_ai | Private AI wired | `/saas/agentes` | `/api/saas/private-ai/**` | Private AI + Router | IMPLEMENTED_UNCERTIFIED | flag OFF default |
| ai.ollama_rag_dual | Dual Ollama/RAG | — | — | KI-005 | PARTIAL | post-MCP unify |
| ai.shared_memory | Shared Memory | — | — | contracts | DISCONNECTED | flag OFF |
| ai.openclaw | OpenClaw | — | — | contracts | DISCONNECTED | flag OFF |
| public.api | Public API v1/v2 | developers | `/api/public/v1/**` | public API ctx | IMPLEMENTED_UNCERTIFIED | |
| public.funnels | Funnels + contratos | `/f/*` | public funnel/contracts | Funnel/CPQ | IMPLEMENTED_UNCERTIFIED | XSS sanitize ADR-022 |
| admin.platform | Admin | `/admin/**` | `/api/admin/**` | NelvyonAdminService | IMPLEMENTED_UNCERTIFIED | |
| platform.ecommerce.bff | Ecommerce BFF | OS ecommerce | `/api/platform/ecommerce/**` | ecommerceBff | PARTIAL | POST fail-closed |
| saas.legacy.f62 | Hubs GHL legacy | `/saas/dashboard/*` | redirects | legacyF62Redirects | OBSOLETE_OR_DUPLICATE | no rebuild |
| saas.legacy.pages_api | pages/api saas | — | 410 | `_deprecated` | OBSOLETE_OR_DUPLICATE | |

## Resumen numérico (capacidades inventariadas)

| Estado | N |
|--------|--:|
| CERTIFIED | 2 |
| IMPLEMENTED_UNCERTIFIED | ~22 |
| PARTIAL | ~10 |
| BLOCKED_EXTERNAL | 2 |
| DISCONNECTED | 2 |
| OBSOLETE_OR_DUPLICATE | 3 |
| BROKEN (evidencia esta pasada) | 0 nuevos |
| MOCK silencioso conocido (POST BFF) | corregido ADR-022 |

## Qué NO es esta pasada

- E2E browser de las 333 páginas  
- Load/soak OS/SaaS (pendiente post-cert MCP)  
- Restore backup drill  
- Certificación producto OS/SaaS  

Ver `OS_SAAS_FINAL_CERTIFICATION.md`.
