# NELVYON-LABS — Cola de integración (46 RESERVA JUSTIFICADA)

> Actualizado: 2026-07-15 — **CERRADA** (46/46 con decisión final)  
> Router certificado (`completed=true`) · Bloque 1–2 cerrados  
> No incluir: 167 duplicados · 95 licencia · 7 incompatibles  
> Informe: `docs/NELVYON_LABS_INTEGRATION_FINAL.md`

## Orden de bloques

| # | Bloque | IDs (RESERVA) | Estado |
|---|---|---|---|
| 1 | Seguridad y supply chain | `trivy`, `gitleaks` | ✅ integrado |
| 2 | Observabilidad y recuperación | `uptime-kuma`, `prometheus` | ✅ parcial / sustituido |
| 3 | MCP | `mcp-sdk-typescript`, `mcp-sdk-python` | ✅ parcial / sustituido (sin OpenClaw) |
| 4 | Automatización | `bullmq`, `trigger-dev` | ✅ sustituido / descartado |
| 5 | Documentos / OCR / RAG | `tesseract`, `stirling-pdf`, `llamaindex` | ✅ parcial / descartado / sustituido |
| 6 | Navegación / scraping | `playwright-browsers`, `chromedp`, `cheerio` | ✅ sustituido / descartado / parcial |
| 7 | CRM / ventas / soporte | `atomic-crm`, `kanboard`, `chatwoot` | ✅ sustituido / descartado / sustituido |
| 8 | Email / notificaciones | `email-suppression-db`, `ntfy` | ✅ sustituido / parcial |
| 9 | SEO / Ads / contenido / social | `umami`, `strapi`, `ghost`, `mattermost` | ✅ sustituido×2 / descartado×2 |
| 10 | Analítica / BI | `growthbook`, `goaccess`, `evidence-dev`, `cube` | ✅ descartado×4 |
| 11 | Imagen / vídeo / audio / diseño | `ffmpeg`, `opencv`, `whisper`, `faster-whisper`, `excalidraw`, `fontsource` | ✅ mixto |
| 12 | UI / paneles / core / infra | `tailwindcss`…`mem0` (13) | ✅ sustituido/descartado (agentes diferidos) |

## Regla por proyecto

Para cada ID: confirmar licencia → audit security → comparar stack → adaptador → feature flag → tests → benchmark → rollback → docs → decisión final (`integrado` | `parcial` | `sustituido` | `descartado`).

## Capas ya en NELVYON (no re-integrar como vendor)

Ollama, llama.cpp, pgvector/Postgres, Vitest, partes de Playwright/Tailwind/TypeScript/Docker Compose ya en uso → resultado **sustituido por solución ya existente** tras comparación demostrable.
