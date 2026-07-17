# PHASE2 — Threat model (Elite Real)

> Controles implementados vs riesgos residuales. No implica producción hardened.

| Amenaza | Control en repo | Evidencia | Residual |
|---------|-----------------|-----------|----------|
| Prompt injection (directa) | SecurityGuard + memory write reject | phase2Elite, specialization SecurityGuard | Live LLM may still paraphrase |
| Indirect injection vía RAG | Corpus synthetic safe; ingest validation TBD | SYNTHETIC_CORPUS | Full malicious-doc pipeline incomplete |
| Exfiltración / cross-tenant | Memory forbidCrossTenant; SecurityGuard export blocks | sharedMemoryContracts | Mig 514 must be applied in DB |
| Abuso de herramientas | MCP permissions; forbidden OpenClaw tools | openclaw contracts | Legacy MCP path still present (deprecated) |
| SSRF OpenClaw | PRIVATE_MODE allowlist + mock localhost | HttpOpenClawBridge + mock tests | Real URL must stay allowlisted |
| Acciones irreversibles | Approval queue Private AI; improvement loop no auto-deploy | controlledImprovement guarantees | Human approval ops process |
| Envenenamiento memoria | Content security + usefulness gate | contentSecurity.ts | Auto-write STM still flag-gated |
| Denial of compute | Orchestrator queue depth + circuit | ORCHESTRATOR_RESILIENCE | No cluster-wide quota yet |
| Bucles orquestación | Sequential break on requireAllSuccess; timeout | runtime coordinate | Live multi-agent loops untested |
| Secretos en logs | Redaction patterns; noSecretsInLogs spec | redactMemorySecrets | Panel must not dump prompts |

## Prioridad siguiente

1. Ingest + retrieval eval del corpus sintético en LocalVectorStore  
2. Suite adversaria RAG (doc injection)  
3. Live Ollama workflow SLO under load  
