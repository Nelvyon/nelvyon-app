# NELVYON-LABS — Bloque 2 Observabilidad (cerrado)

> 2026-07-15 · Tras bloque 1 Seguridad cerrado y Router certificado

## Decisiones finales (2/2)

| ID | Licencia | Decisión | Evidencia |
|---|---|---|---|
| **uptime-kuma** | MIT | **Integrado parcialmente** | Adapter `NelvyonObservabilityAdapter` + blueprint de monitores sobre `/api/health*`. Flag `NELVYON_UPTIME_KUMA_ENABLED` (default off). **Sin** Docker/vendor copy en monorepo. |
| **prometheus** | Apache-2.0 | **Sustituido** | Railway metrics + `/api/health/deep` + staging P0 smokes cubren TSDB self-hosted. No proceso Prometheus (RAM/disco injustificados). |

## Comparación con stack previo

| Capacidad | Antes | Después |
|---|---|---|
| Liveness/readiness | `/api/health*` ✅ | Igual + contrato Labs |
| Uptime externo | Manual / Railway | Opcional: blueprint Kuma → URL externa |
| Series temporales | Railway | Sin Prometheus server (sustituido) |

## Seguridad / supply chain

- Repos confirmados: `louislam/uptime-kuma` (MIT), `prometheus/prometheus` (Apache-2.0)
- Sin telemetría nueva, sin puertos nuevos en runtime SaaS
- Rollback: `NELVYON_UPTIME_KUMA_ENABLED=0`

## Recursos

| Recurso | Impacto |
|---|---|
| RAM/VRAM | **0** (flags off; sin contenedor) |
| Disco | ~negligible (TS + docs) |
| Servicios | 0 |

## Gate bloque 2

**CERRADO** — siguiente: bloque 3 MCP (SDKs, **sin** OpenClaw/orquestador/agentes).
