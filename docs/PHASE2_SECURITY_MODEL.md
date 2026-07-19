# PHASE 2 — Modelo de seguridad IA local

---

## PRIVATE_MODE=ON (default)

### Allowlist de egress

| Destino | Permitido | Tipo |
|---------|-----------|------|
| `127.0.0.1`, `localhost`, `::1` | ✅ | Loopback |
| `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` | ✅ | Docker / LAN privada |
| `host.docker.internal` | ✅ | Docker → host |
| `*.local` | ✅ | mDNS local |
| `PRIVATE_MODE_ALLOWED_HOSTS` | ✅ | openclaw, postgres container, MCP |
| Internet público | ❌ | Bloqueado |
| `api.openai.com`, `api.anthropic.com` | ❌ | Siempre bloqueado salvo ventana owner |

### Ventana Internet owner

```bash
PRIVATE_MODE_INTERNET_UNTIL=2026-07-11T20:00:00Z
```

Expira automáticamente — vuelve a modo local.

### OpenClaw / MCP

| Servicio | Política |
|----------|----------|
| OpenClaw **local** (Docker/LAN) | ✅ `assertUrlAllowed` |
| OpenClaw **remoto** (Internet) | ❌ |
| MCP **localhost** | ✅ |
| MCP remoto | ❌ |

---

## Aislamiento multi-tenant

1. **RLS PostgreSQL** en `local_ai_memory`, `local_ai_rag_documents`, `local_ai_rag_chunks`
2. **`set_config('app.tenant_id')`** en cada transacción
3. **Checksum SHA-256** en memoria, documentos y chunks
4. **Tests** `localAiPhase2.test.ts` — cross-tenant debe retornar 0 filas

Un cliente **nunca** recupera datos de otro tenant.

---

## Almacenamiento

| Dato | Ubicación | Cifrado |
|------|-----------|---------|
| Vectores + memoria | Postgres volume Docker | En reposo: responsabilidad OS/disco |
| Backups | `backend/local-ai/backups/` | Opcional AES-256-GCM (`LOCAL_AI_BACKUP_PASSPHRASE`) |
| Config | Postgres `local_ai_config` | Checksum |

---

## Red

- Postgres: **`127.0.0.1:5434`** únicamente (no `0.0.0.0`)
- Sin Cloudflare Tunnel, ngrok, Tailscale por defecto
- Sin telemetría en módulo private-ai

---

## Dependencias externas (requieren autorización explícita)

| Dependencia | Cuándo | Alternativa local |
|-------------|--------|-------------------|
| Ollama | Inferencia + embeddings | Obligatorio local |
| OpenAI/Anthropic | ❌ en PRIVATE_MODE | Ollama |
| Railway/Supabase | ❌ para IA privada | Postgres Docker |
| Docker Hub pull | Primera vez | Imagen `pgvector/pgvector:pg16` cacheada |

---

## Evidencia de cumplimiento

```bash
pnpm -C apps/web exec vitest run backend/saas/__tests__/privateAiPrivateMode.test.ts backend/saas/__tests__/localAiPhase2.test.ts
```

---

## Flags post-MCP (prep ADR-017 — default OFF)

| Flag | Default | Nota |
|------|---------|------|
| `NELVYON_SHARED_MEMORY_ENABLED` | `0` | Runtime memoria compartida |
| `NELVYON_OPENCLAW_BRIDGE_ENABLED` | `0` | Bridge OpenClaw |
| `NELVYON_ORCHESTRATOR_ENABLED` | `0` | Orquestador multi-agente |
| `NELVYON_MCP_PRODUCTIVE_ENABLED` | `1` | MCP productivo — **no cambiar durante soak** |