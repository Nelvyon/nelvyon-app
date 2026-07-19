# NELVYON-LABS — Arquitectura de aprovechamiento

> Generado: 2026-07-15T18:30:58.232Z

## Principio

```
NELVYON-LABS (referencia) ──► Torneo por capacidad ──► Ganador
                                      │
                                      ▼
                         Adaptador NELVYON (contrato propio)
                                      │
                          feature flag + aislamiento
                                      │
                                      ▼
                              nelvyon-app (producto)
```

## Reglas

1. **Nunca** copiar monorepos externos dentro de `apps/web` o `backend/` como vendor masivo.
2. Preferir: dependencia npm/pypi pinneada, contenedor sidecar, o subprocess aislado.
3. Todo ganador nuevo entra tras **certificación Router**.
4. Capacidad = 1 ganador runtime (+ 0..1 reserva no montada).
5. PRIVATE_MODE: sin telemetría ni egress no allowlisted.

## Capas

| Capa | Ejemplos de capacidad |
|---|---|
| Inference | ia_llm (Ollama ya integrado) |
| Knowledge | rag, documentos, memoria |
| Agents | agentes, mcp, navegacion (post-Router) |
| SaaS domain | crm, email, workflows |
| Creative | imagen, video, audio_voz, diseno |
| Platform | seguridad, testing, observabilidad, devops |

## Rollback

Cada integración: feature flag OFF + drop sidecar + revert commit; smoke SaaS + local-ai-health.
