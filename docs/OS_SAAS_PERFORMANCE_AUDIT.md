# OS + SaaS — Rendimiento (estado honesto)

> Snapshot 2026-07-16 · **Sin re-medición load/CWV esta pasada** (soak MCP)

## Presupuestos propuestos (por clase)

| Clase | p95 objetivo (propuesta) | Medido esta pasada |
|-------|--------------------------|--------------------|
| SaaS API lectura autenticada | < 500 ms | No |
| SaaS API escritura | < 1.5 s | No |
| Pack OS kickoff | < 120 s (async OK) | Histórico CI |
| Router inference (cert) | por clase modelo | Certificado — no re-run |
| MCP soak | 2h fail=0 | En curso |
| LCP marketing | < 2.5 s | No |
| Bundle `/saas` | budget TBD | No |

## Índices / DB

| Ítem | Estado |
|------|--------|
| Mig 512 citas `(tenant_id, start_at)` | Autorada; **no aplicada** (soak) |
| Mig 510 perf indexes | En repo |
| TEXT vs UUID 505 | Deuda P1 post-soak |

## CI load

| Workflow | Estado |
|----------|--------|
| `load-test-saas.yml` | Existe; **no ejecutado hoy** |

## Conclusión

Rendimiento **no certificado** en esta pasada. No optimizar a ciegas.  
Post-MCP: aplicar 512 → medir p95 APIs críticas → CWV marketing.
