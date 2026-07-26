# CEO — Aprobaciones puntos 1–4

> **Estado: `CEO_DECIDED_2026-07-26`.**  
> Prep tip **`43d7c3db`** / pin **`33e654e9`+** · live staging `738f8200` · live prod `d03721c1` · `claimReady: false` · **NOT READY**  
> Evidencia: `points_1_4_failclosed_latest.json` · `points_1_4_ceo_decision_latest.md`

## Decisión firmada (Daniel · 2026-07-26)

| # | Punto | Decisión | Efecto operativo (Cursor) |
|---|-------|----------|---------------------------|
| 1 | Migraciones prod (ADR-064) | **SÍ** | Gate fail-closed **certificado y mantenido** · **no** ejecutar migraciones nuevas ahora |
| 2 | Dual-write ERP (ADR-062) | **NO todavía** | **PREPARED_OFF** · flags=`0` · SSOT = `erp_domain_snapshots` JSONB |
| 3 | RAG/pgvector Railway (ADR-065) | **NO todavía** | Schema/apply **bloqueado** · **no** DDL Railway |
| 4 | Canary IA prod | **NO todavía** | IA prod · OpenAI · OpenClaw · MCP · SM productivo **OFF** |

## Reglas vigentes

- **SÍ en #1 ≠ aplicar migraciones.** Solo autoriza la **política de gate** (ventana temporal obligatoria).
- Sin ventana `NELVYON_PROD_MIGRATE_APPROVED=1` + `NELVYON_PROD_MIGRATE_APPROVED_BY=Daniel` (+ pin opcional): pending>0 en prod → **fail deploy**.
- Tras cualquier ventana futura: **unset** inmediato de vars de aprobación.
- #2–#4: prohibido activar hasta nuevo SÍ escrito.

## Frases originales (archivo)

1. Migrate gate política → **SÍ**  
2. Dual-write cutover → **NO todavía**  
3. RAG schema Railway staging → **NO todavía**  
4. Canary IA prod (diseño) → **NO todavía**

## Firma

| Rol | Decisión | Fecha | Firma |
|-----|----------|-------|-------|
| CEO | 1 SÍ · 2–4 NO todavía | 2026-07-26 | Daniel (chat Cursor) |
| CTO (exec) | Documentar · certificar gate · 0 activaciones | 2026-07-26 | Cursor agent |

**claimReady permanece false.**
