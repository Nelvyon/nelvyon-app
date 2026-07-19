# MASTER — Roadmap integración Open Source NELVYON

> Sin instalación en esta fase · Basado en 480 proyectos evaluados

---

## Fase 0 — Ya integrado / en curso

| Proyecto | Estado | Capa |
|---|---|---|
| Ollama | ✅ Phase 2 local AI | Router + RAG |
| pgvector | ✅ Docker local-ai | Vectores tenant |
| Postgres 16 | ✅ Railway prod | DB principal |
| Vitest + Playwright | ✅ CI | Quality |
| Next.js / React / Tailwind | ✅ apps/web | Frontend |

---

## Fase 1 — Post Router certificado (0-3 meses)

| Prioridad | Proyecto | Objetivo |
|---|---|---|
| P0 | Instructor / PydanticAI | Structured pack outputs |
| P0 | MCP SDK (TS + Python) | Tool bridge estándar |
| P1 | Temporal | Workflows duraderos SaaS |
| P1 | Trivy + Gitleaks | Supply chain CI |
| P1 | Uptime Kuma | SLO monitoring |
| P1 | n8n self-host | Reemplazar blueprints Zapier |

---

## Fase 2 — Infra OSS (3-6 meses)

| Prioridad | Proyecto | Objetivo |
|---|---|---|
| P1 | SigNoz / Grafana stack | Observabilidad unificada |
| P1 | Authentik | SSO enterprise tenants |
| P2 | Listmonk + Postal | Email marketing self-host |
| P2 | LiteLLM | Gateway cloud+local |
| P2 | Unstructured / Docling | Ingest documentos packs |

---

## Fase 3 — Agency capabilities (6-12 meses)

| Prioridad | Proyecto | Objetivo |
|---|---|---|
| P2 | ComfyUI / InvokeAI | Generación assets packs |
| P2 | Crawlee / Firecrawl | SEO/competitor research |
| P2 | Metabase | BI dashboards clientes |
| P2 | Chatwoot | Helpdesk omnicanal |
| P3 | Twenty CRM | Sync opcional HubSpot |

---

## Fase 4 — Laboratorio (evaluar, no prod)

- Dify, Flowise, AutoGen, CrewAI — prototipos agentes
- Open WebUI — consola ops PRIVATE_MODE
- Windmill, Activepieces — alternativas n8n
- OpenClaw — bridge mensajería (evaluar vs MCP)

---

## NO integrar (mantener SaaS)

| Servicio | Motivo |
|---|---|
| Stripe | PCI, billing maduro — mantener |
| AWS SES (prod) | Deliverability verificada — OSS como backup |
| Railway | Ops simplificada — Coolify solo si coste escala |

---

## Métricas de éxito por integración

1. 0 regresiones en smokes P0 (`scripts/run-staging-p0-smokes.mjs`)
2. PRIVATE_MODE compatible verificado
3. Aislamiento tenant en tests
4. Documentación en `docs/INTEGRATIONS.md`
5. Sin mock silencioso en prod (regla NELVYON)
