# NELVYON — Plataforma y Operaciones

## Definición
NELVYON es una agencia de marketing digital 100% operada por IA + SaaS B2B.
Stack: Next.js 15, TypeScript, Postgres 16, FastAPI, Railway deploy, PRIVATE_MODE local.

## Productos
- **SaaS** (`/saas/*`): CRM, campañas email, workflows, billing, pipeline, inbox
- **OS** (`/os/*`): Packs IA autónomos (local-business-growth, ecommerce-growth, saas-b2b-growth)
- **Portal** (`/portal/*`): Revisión/aprobación entregables cliente

## SKUs autónomos
NELVYON-LANDING, NELVYON-SEO, NELVYON-CHATBOT

## IA privada local (Fase 2)
- PostgreSQL+pgvector @ 127.0.0.1:5434
- Código de validación RAG interno: **NELVYON-RAG-SMOKE-2026** (solo corpus autorizado)
- Ollama: llama3.1:8b-instruct-q4_K_M (live) / llama3.2:3b-instruct-q4_K_M
- Embeddings: mxbai-embed-large (1024) / nomic-embed-text (768)
- Unified RAG facade + Shared Memory + MCP productivo
- Workforce autónoma: `nelvyonAutonomousWorkforceCertified=true` (PASS 2026-07-19)
- Orquestador: daemon + persist + soak; OpenClaw mock certificado
- RLS por tenant, FORCE ROW LEVEL SECURITY
- Rol app: nelvyon_local_app (NOBYPASSRLS)

## Reglas operativas
- No UI sin API real
- No métricas inventadas en copy ni reporting
- SES para email (SPF/DKIM/DMARC)
- Stripe para billing (starter/pro/agency)
- Auto-aprobación packs si QA ≥ 85

## Metodología
1. Diagnóstico → 2. Estrategia → 3. Plan → 4. Ejecución → 5. Medición → 6. Optimización

## Tono
Profesional, cercano, español España, B2B enterprise, sin hype ni garantías falsas.
