# Preflight del despliegue

Lo escribe `scripts/preflight-del-despliegue.mjs` comparando **f62916afa740** —lo que
corre en producción— con **115f8819**. **No despliega nada.**

| | |
|---|---|
| Commits | 207 |
| Ficheros tocados | 779 |
| Migraciones nuevas | 21 |
| Rutas nuevas / borradas | 5 / 0 |

## Por área

| Área | Ficheros |
|---|---|
| `OTHER` | 182 |
| `TESTS` | 81 |
| `DATABASE` | 79 |
| `DOCS` | 71 |
| `AGENTS` | 63 |
| `WEB` | 58 |
| `AI` | 40 |
| `CONNECTORS` | 30 |
| `SECURITY` | 29 |
| `SCRIPTS` | 24 |
| `EMAIL` | 20 |
| `API` | 20 |
| `JOBS` | 17 |
| `PORTAL` | 15 |
| `RBAC_RLS` | 15 |
| `BILLING` | 14 |
| `OS` | 12 |
| `AUTH` | 9 |

## El orden: ¿migrar antes o después?

**MIGRAR ANTES DE DESPLEGAR.** El código nuevo nombra tablas que hoy no existen
en producción. Si se despliega primero, esas rutas fallan hasta que se migre:

- `os_sector_shield_audits_backfill_574` — la usan `backend/db/certificacion/decisiones_y_bloqueos.json`
- `workflow_nodes` — la usan `backend/db/certificacion/capacidades_estado.json`, `backend/db/certificacion/catalogo_virgen_semantico.json`, `backend/db/certificacion/hueco_reconstruccion.json`, `backend/db/certificacion/virgen2_tablas.txt`, `backend/db/migrate.ts`
- `visual_workflow_executions` — la usan `backend/db/certificacion/capacidades_estado.json`, `backend/db/certificacion/catalogo_virgen_semantico.json`, `backend/db/certificacion/hueco_reconstruccion.json`, `backend/db/certificacion/virgen2_tablas.txt`, `backend/db/migrate.ts`
- `workflow_trigger_registry` — la usan `backend/db/certificacion/capacidades_estado.json`, `backend/db/certificacion/catalogo_virgen_semantico.json`, `backend/db/certificacion/hueco_reconstruccion.json`, `backend/db/certificacion/virgen2_tablas.txt`, `backend/db/migrate.ts`
- `user_provider_api_keys` — la usan `backend/apikeys/apiKeyService.ts`, `backend/db/certificacion/capacidades_operacion_estado.json`, `backend/db/certificacion/catalogo_virgen_semantico.json`, `backend/db/certificacion/hueco_reconstruccion.json`, `backend/db/certificacion/virgen2_tablas.txt`
- `campaign_recipients` — la usan `backend/db/certificacion/virgen2_toleradas.json`, `backend/db/clasificacion_507.json`, `backend/db/migrate.ts`, `backend/db/omisiones_conocidas_507.json`, `backend/db/splitSqlStatements.ts`
- `funnel_steps` — la usan `apps/web/src/lib/packs/funnelGrowthPack.ts`, `apps/web/src/lib/packs/funnelPackProduction.ts`, `apps/web/src/lib/packs/packEliteTemplates.ts`, `apps/web/src/lib/packs/types.ts`, `backend/db/certificacion/catalogo_produccion.json`
- `autorizaciones_de_gasto` — la usan `backend/gasto/guardaDeGasto.ts`
- `gastos_ejecutados` — la usan `backend/gasto/guardaDeGasto.ts`
- `os_client_brain` — la usan `backend/cerebro/CerebroDeNegocioService.ts`, `backend/cerebro/fuenteCanonica.ts`
- `os_client_brain_history` — la usan `backend/cerebro/CerebroDeNegocioService.ts`
- `os_service_requests` — la usan `backend/portal/CicloDelClienteService.ts`
- `os_client_connections` — la usan `backend/portal/CicloDelClienteService.ts`
- `os_objetivos` — la usan `backend/resultados/MotorDeResultados.ts`
- `os_mediciones` — la usan `backend/resultados/MotorDeResultados.ts`
- `os_acciones` — la usan `backend/resultados/MotorDeResultados.ts`
- `os_aprendizajes` — la usan `backend/resultados/MotorDeResultados.ts`
- `os_insights` — la usan `backend/inteligencia/InteligenciaEntreDepartamentos.ts`
- `comercial_bajas` — la usan `backend/comercial/CicloComercial.ts`, `backend/comercial/ProspeccionResponsable.ts`
- `comercial_preparaciones` — la usan `backend/comercial/CicloComercial.ts`, `backend/comercial/ProspeccionResponsable.ts`
- `workspace_chatbot_conversations` — la usan `backend/db/verificacion_manual_507.json`, `backend/services/cdp_service.py`, `backend/services/chatbot_service.py`, `backend/services/finetuning_service.py`, `backend/services/reporting_service.py`
- `comercial_respuestas` — la usan `backend/comercial/CicloComercial.ts`
- `comercial_oportunidades` — la usan `backend/comercial/CicloComercial.ts`

**Ninguna migración quita ni renombra nada** fuera de comentarios: son aditivas.
El código viejo sigue funcionando con el esquema nuevo, así que migrar antes no
deja producción rota en la ventana entre migrar y desplegar.

## Variables de entorno

**14 que lee el codigo de produccion y el desplegado no.** Una que falte
no rompe el despliegue: rompe la primera peticion que pase por ahi, que es peor porque
parece que fue bien.

- `NELVYON_DB_POOL_MAX` — en `backend/db/DbClient.ts`
- `NELVYON_EMAIL_ENABLED` — en `backend/email/emailService.ts`
- `NELVYON_GASTO_EXTERNO_HABILITADO` — en `backend/gasto/guardaDeGasto.ts`
- `NELVYON_JOBS_POOL_MAX` — en `backend/db/DbJobsClient.ts`
- `NELVYON_LISTADO_MAX` — en `backend/saas/cotaDeListado.ts`
- `NELVYON_LLM_ALLOW_DEGRADATION` — en `backend/autonomous/llm/llmPolicy.ts`
- `NELVYON_LLM_PRICE_OVERRIDES` — en `backend/autonomous/llm/providers/pricing.ts`
- `NELVYON_MIGRATE_WRITE_OMISSIONS` — en `backend/db/migrate.ts`
- `NELVYON_MODO_COSTE_CERO` — en `backend/coste/PoliticaDeCosteCero.ts`
- `NELVYON_QA_MODO` — en `backend/calidad/MotorDeCalidad.ts`
- `NELVYON_WEB_JOBS_DATABASE_URL` — en `backend/db/DbJobsClient.ts`
- `OS_WORKER_SILENCIO_MS` — en `backend/os-agents/OsQueueWorker.ts`
- `SES_SNS_TOPIC_ARN` — en `apps/web/src/app/api/webhooks/ses/route.ts`
- `TRUSTED_PROXY_HOPS` — en `apps/web/src/lib/security/rateLimit.ts`

**Ninguna es obligatoria.** Todas se leen con un valor por defecto o comparándolas
con un valor concreto, así que el despliegue arranca sin ponerlas. Y las que
protegen algo caen del lado seguro cuando faltan: sin
`NELVYON_GASTO_EXTERNO_HABILITADO` el gasto externo queda **apagado**, y sin
`NELVYON_MODO_COSTE_CERO` el modo de coste cero queda **encendido**.

Otras **18** son nuevas pero **solo las leen pruebas y guiones**, asi que no
hacen falta en produccion. Se listan igual porque no ponerlas es una decision, no un
olvido:

`AUTONOMOUS_OLLAMA_MODEL`, `CERT_PG_CONTAINER`, `NELVYON_B2_DSN`, `NELVYON_B2_PUERTA`, `NELVYON_B3_DSN`, `NELVYON_B3_PUERTA`, `NELVYON_B4_DSN`, `NELVYON_BACKEND_URL`, `NELVYON_COLA_CERT_DSN`, `NELVYON_DB_IDLE_TX_TIMEOUT_MS`, `NELVYON_DB_STATEMENT_TIMEOUT_MS`, `NELVYON_MODELO_REAL`, `NELVYON_MODELO_REAL_SERVICIOS`, `NELVYON_PERMITIR_REINICIO_PG`, `NELVYON_PG_CERT_DSN`, `NELVYON_WEB_APP_CERT_DSN`, `NELVYON_WEB_CERT_DSN`, `NELVYON_WEB_JOBS_CERT_DSN`

## Dependencias y runtime

| | |
|---|---|
| Dependencias nuevas | 0 |
| Dependencias con versión cambiada | 0 |
| Dependencias retiradas | 0 |
| Gestor de paquetes | pnpm@10.33.0 → pnpm@10.33.0 |
| Node exigido | sin declarar → sin declarar |

## Rutas

### Nuevas — 5

- `apps/web/src/app/api/admin/sala-de-maquinas/route.ts`
- `apps/web/src/app/api/platform/portal/conexiones/route.ts`
- `apps/web/src/app/api/platform/portal/intake/route.ts`
- `apps/web/src/app/api/platform/portal/resumen/route.ts`
- `apps/web/src/app/api/platform/portal/servicios/route.ts`

**Ninguna ruta desaparece.** Nada que estuviera llamando a producción se queda sin destino.

## Lo que este preflight NO puede contestar

- **Si un cambio de comportamiento rompe algo en ejecución.** Eso no se ve en un
  diff. Para eso está el humo posterior al despliegue.
- **Si las 8.563 pruebas cubren lo que importa.** Dicen que lo que se probó pasa.
- **Si el despliegue arranca.** El build compila aquí; que arranque allí depende de
  variables y de red.
