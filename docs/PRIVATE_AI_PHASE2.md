# Fase 2 — IA privada Nelvyon (prep)

> **Ver documento principal:** [PRIVATE_AI_ARCHITECTURE.md](./PRIVATE_AI_ARCHITECTURE.md)

Estado: **infraestructura modular preparada**. Sin modelo instalado. Sin OpenClaw. Sin RAG ingest.

Default: `NELVYON_AI_ENABLED=0`, `NELVYON_AI_MODE=unconfigured` — cero llamadas de red.

Para desarrollo local sin modelo: `NELVYON_AI_ENABLED=1` + `NELVYON_AI_MODE=stub`.


---

## 1. Propuesta técnica

### Principio rector

OpenClaw **no es la inteligencia**. Es (o será) el **orquestador de agentes**. La inteligencia viene de:

| Fuente | Estado actual | Fase 2+ |
|--------|---------------|---------|
| Modelo local (Ollama) | Provider nuevo | Requiere Ollama en host/Railway sidecar |
| Base conocimiento Nelvyon | Tabla `nelvyon_rag_chunks` | Ingest manual/script pendiente |
| Datos SaaS (CRM, campañas…) | Servicios existentes | Vía tools MCP / servicios |
| Memoria tenant | `SaasTenantMemoryService` (S58) | Integrada en prompts agente |
| Procesos internos | `SaasAutonomyService`, packs, workflows | Gates reutilizados |
| Permisos por agente | Registry 17 agentes | Enforcement en `SaasPrivateAiService` |
| Auditoría | `saas_private_ai_audit` | Activa en cada run |

### Arquitectura (additive)

```
SaaS UI / OS UI (fase 3+)
        │
        ▼ /api/saas/private-ai/*
SaasPrivateAiService (registry · permisos · approvals · audit)
        │
        ├── PrivateAiRouter → Ollama / OpenAI / Anthropic / Mock
        └── Reutiliza: Autonomy, Memory, MCP (fase 3)
```

**No se toca** en Fase 2a:

- `backend/os-agents/LlmClient.ts`
- `packOrchestrator.ts`, kickoff routes, Portal BFF
- Rutas legacy `pages/api/saas/*`

**Se reutiliza**:

- `SaasTenantMemoryService`, `SaasAutonomyService`, `NelvyonMcpService`, `nelvyonZeroCostAi`

### OpenClaw vs agentes OS

| Capa | Hoy | Fase 3+ |
|------|-----|---------|
| OS sector agents (~193) | `LlmClient` OpenAI | Adapter opcional a `PrivateAiRouter` |
| Registry privado (17) | Nuevo | Orquestación central |
| OpenClaw | No en repo | Bridge HTTP/MCP externo |

---

## 2. Variables de entorno

```bash
NELVYON_AI_MODE=auto          # auto | local | openai | anthropic | mock
PRIVATE_AI_ONLY=1               # Bloquea APIs externas
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen2.5:7b
OPENAI_API_KEY=                 # opcional
ANTHROPIC_API_KEY=              # opcional
```

Sin Ollama ni keys → mock con **`mock: true`** en respuesta API.

---

## 3. API

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/saas/private-ai` | Settings tenant |
| PATCH | `/api/saas/private-ai` | Override settings (owner) |
| GET | `/api/saas/private-ai/agents` | Lista agentes |
| POST | `/api/saas/private-ai/agents` | Ejecutar agente |
| GET/POST | `/api/saas/private-ai/approvals` | Cola aprobación |

Agente piloto: **`ceo_supervisor`**.

---

## 4. Plan por fases

| Fase | Entregable |
|------|------------|
| **2a (hecho)** | Provider, registry, audit, approvals, API, tests |
| **2b** | Ingest RAG docs → `nelvyon_rag_chunks` |
| **2c** | Panel UI agentes |
| **2d** | Tool bridge MCP |
| **2e** | OpenClaw bridge |
| **2f** | Adapter `ILlmClient` OS |
| **2g** | Smokes P0 staging |

---

## 5. Tests

```bash
pnpm -C apps/web exec vitest run backend/saas/__tests__/PrivateAiPhase2.test.ts
node scripts/validate-saas-migrations.mjs
```
