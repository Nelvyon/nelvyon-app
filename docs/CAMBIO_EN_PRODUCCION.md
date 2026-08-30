# Qué cambiaría en producción

Lo escribe `scripts/que-cambiaria-en-produccion.mjs` restando dos huellas del
esquema: la de producción tal como está y la de una base reconstruida desde cero
con las 488 migraciones. **No se edita a mano y no ha tocado producción.**

> Producción medida el 2026-08-30 · PostgreSQL 18.6 (Debian 18.6-1.pgdg13+2) on x86_64-pc-linux-gnu
> Referencia local medida el 2026-08-30

## Lo que la cadena de migraciones da por hecho

Medido reconstruyendo la base desde cero sobre **PostgreSQL 18.6**, la misma
versión mayor que producción. Salieron dos requisitos que ninguna migración crea
y que hasta ahora no estaban escritos en ningún sitio:

1. **La extensión `vector`.** La migración 309 la necesita. Un PostgreSQL sin
   pgvector se para ahí.
2. **Los roles `nelvyon_app` y `nelvyon_jobs`.** Se usan desde la migración 279 y
   **ninguna migración los crea**. La 577 sí crea los del lado web
   (`nelvyon_web_app`, `nelvyon_web_jobs`), pero esos dos son anteriores y vienen
   de fuera.

Producción los tiene, así que no es un riesgo para aplicar las pendientes. Importa
por otra cosa: la frase «las 488 aplican desde cero» sólo era cierta sobre un
clúster que ya traía esos roles. Sobre uno de verdad vacío, la cadena se para en
la 556.

## Las migraciones que faltan

Son **21**:

- `568_rls_os_tablas_vacias_restantes.sql`
- `569_rls_os_tablas_con_datos.sql`
- `570_rls_saas_tenant_id_no_uuid.sql`
- `572_rls_saas_tablas_con_datos.sql`
- `573_indices_de_inquilino_en_tablas_sociales.sql`
- `574_atribuir_las_auditorias_de_shield_sin_dueno.sql`
- `575_reparar_lo_que_la_507_y_la_406_no_llegaron_a_crear.sql`
- `576_columnas_que_el_codigo_escribe_y_no_existian.sql`
- `577_roles_del_lado_web.sql`
- `578_las_cinco_tablas_que_nunca_se_crearon.sql`
- `579_la_cola_que_nadie_vaciaba.sql`
- `580_autorizacion_de_gasto_externo.sql`
- `581_cerebro_de_negocio.sql`
- `582_el_cliente_puede_pedir_y_conectar.sql`
- `583_motor_de_resultados.sql`
- `584_inteligencia_entre_departamentos.sql`
- `585_indice_por_inquilino_donde_manda_rls.sql`
- `586_prospeccion_responsable.sql`
- `587_dos_chatbots_dos_tablas.sql`
- `588_lo_que_faltaba_de_verdad.sql`
- `589_del_prospecto_al_cliente.sql`

## Lo que aparecería

| | Cuántos |
|---|---|
| Tablas nuevas | 24 |
| Columnas en tablas que ya existen | 19 |
| Índices | 114 |
| Políticas RLS | 404 |
| Tablas que pasan a tener RLS | 109 |

### Tablas nuevas

- `autorizaciones_de_gasto`
- `campaign_recipients`
- `comercial_bajas`
- `comercial_oportunidades`
- `comercial_preparaciones`
- `comercial_respuestas`
- `funnel_steps`
- `gastos_ejecutados`
- `os_acciones`
- `os_aprendizajes`
- `os_client_brain`
- `os_client_brain_history`
- `os_client_connections`
- `os_insights`
- `os_mediciones`
- `os_objetivos`
- `os_public_api_keys`
- `os_service_requests`
- `saas_user_invoices_legacy`
- `user_provider_api_keys`
- `visual_workflow_executions`
- `workflow_nodes`
- `workflow_trigger_registry`
- `workspace_chatbot_conversations`

### Columnas añadidas a tablas existentes

- `affiliate_clicks.affiliate_id:uuid`
- `bookings.zoom_meeting_id:text`
- `campaigns.from_email:text`
- `campaigns.from_name:text`
- `os_jobs.attempts:integer NOT NULL`
- `os_jobs.dead_lettered_at:timestamp with time zone`
- `os_jobs.idempotency_key:text`
- `os_jobs.last_error:text`
- `os_jobs.lease_expires_at:timestamp with time zone`
- `os_jobs.locked_at:timestamp with time zone`
- `os_jobs.locked_by:text`
- `os_jobs.max_attempts:integer NOT NULL`
- `os_jobs.run_after:timestamp with time zone NOT NULL`
- `retail_results.output:jsonb`
- `retail_results.sector:text`
- `saas_conversations.metadata:jsonb`
- `stripe_webhook_events.error_message:text`
- `stripe_webhook_events.id:bigint NOT NULL`
- `workflows.edges_json:jsonb NOT NULL`

## Lo que DESAPARECERÍA — leer esto primero

Cada línea de aquí es algo que producción tiene y la referencia no. **No**
significa que las migraciones lo vayan a borrar: significa que las dos bases
divergen por ahí, y hay que entender por qué antes de tocar nada.

El caso conocido: la migración 567 activa RLS **sólo sobre tablas vacías**. Una
base reconstruida desde cero las encuentra vacías y las cubre; producción, con
datos dentro, se las saltó. Esa diferencia ya existía y no la crean las
pendientes.

### columnas — 66

- `local_ai_audit.action:text NOT NULL`
- `local_ai_audit.agent_id:text`
- `local_ai_audit.client_id:uuid`
- `local_ai_audit.created_at:timestamp with time zone NOT NULL`
- `local_ai_audit.id:uuid NOT NULL`
- `local_ai_audit.input_checksum:text`
- `local_ai_audit.metadata:jsonb NOT NULL`
- `local_ai_audit.output_checksum:text`
- `local_ai_audit.source_id:text`
- `local_ai_audit.tenant_id:uuid NOT NULL`
- `local_ai_config.checksum:text NOT NULL`
- `local_ai_config.key:text NOT NULL`
- `local_ai_config.updated_at:timestamp with time zone NOT NULL`
- `local_ai_config.value:jsonb NOT NULL`
- `local_ai_ingest_jobs.checksum:text`
- `local_ai_ingest_jobs.client_id:uuid`
- `local_ai_ingest_jobs.completed_at:timestamp with time zone`
- `local_ai_ingest_jobs.created_at:timestamp with time zone NOT NULL`
- `local_ai_ingest_jobs.error:text`
- `local_ai_ingest_jobs.file_path:text NOT NULL`
- `local_ai_ingest_jobs.id:uuid NOT NULL`
- `local_ai_ingest_jobs.metadata:jsonb NOT NULL`
- `local_ai_ingest_jobs.source_id:text NOT NULL`
- `local_ai_ingest_jobs.status:text NOT NULL`
- `local_ai_ingest_jobs.tenant_id:uuid NOT NULL`
- `local_ai_memory.checksum:text NOT NULL`
- `local_ai_memory.client_id:uuid`
- `local_ai_memory.content:text NOT NULL`
- `local_ai_memory.created_at:timestamp with time zone NOT NULL`
- `local_ai_memory.embedding:USER-DEFINED`
- `local_ai_memory.id:uuid NOT NULL`
- `local_ai_memory.metadata:jsonb NOT NULL`
- `local_ai_memory.permissions:jsonb NOT NULL`
- `local_ai_memory.source_id:text NOT NULL`
- `local_ai_memory.status:text NOT NULL`
- `local_ai_memory.tenant_id:uuid NOT NULL`
- `local_ai_memory.updated_at:timestamp with time zone NOT NULL`
- `local_ai_memory.version:integer NOT NULL`
- `local_ai_rag_chunks.checksum:text NOT NULL`
- `local_ai_rag_chunks.chunk_index:integer NOT NULL`
- …y 26 más

### indices — 19

- `api_keys:api_keys_pkey`
- `invoices:invoices_pkey`
- `local_ai_audit:idx_local_ai_audit_tenant`
- `local_ai_audit:local_ai_audit_pkey`
- `local_ai_config:local_ai_config_pkey`
- `local_ai_ingest_jobs:idx_local_ai_ingest_tenant`
- `local_ai_ingest_jobs:local_ai_ingest_jobs_pkey`
- `local_ai_memory:idx_local_ai_memory_client`
- `local_ai_memory:idx_local_ai_memory_embedding`
- `local_ai_memory:idx_local_ai_memory_tenant`
- `local_ai_memory:local_ai_memory_pkey`
- `local_ai_rag_chunks:idx_local_ai_rag_chunks_embedding`
- `local_ai_rag_chunks:idx_local_ai_rag_chunks_tenant`
- `local_ai_rag_chunks:local_ai_rag_chunks_pkey`
- `local_ai_rag_chunks:local_ai_rag_chunks_tenant_id_document_id_chunk_index_versi_key`
- `local_ai_rag_documents:idx_local_ai_rag_docs_tenant`
- `local_ai_rag_documents:local_ai_rag_documents_pkey`
- `local_ai_rag_documents:local_ai_rag_documents_tenant_id_source_id_version_key`
- `workflows:ix_workflows_id`

### politicas — 11

- `local_ai_audit:local_ai_audit_saas_tenant_delete:DELETE`
- `local_ai_audit:local_ai_audit_saas_tenant_insert:INSERT`
- `local_ai_audit:local_ai_audit_saas_tenant_select:SELECT`
- `local_ai_audit:local_ai_audit_saas_tenant_update:UPDATE`
- `local_ai_ingest_jobs:local_ai_ingest_jobs_saas_tenant_delete:DELETE`
- `local_ai_ingest_jobs:local_ai_ingest_jobs_saas_tenant_insert:INSERT`
- `local_ai_ingest_jobs:local_ai_ingest_jobs_saas_tenant_select:SELECT`
- `local_ai_ingest_jobs:local_ai_ingest_jobs_saas_tenant_update:UPDATE`
- `local_ai_memory:local_ai_memory_tenant_isolation:ALL`
- `local_ai_rag_chunks:local_ai_rag_chunks_tenant:ALL`
- `local_ai_rag_documents:local_ai_rag_docs_tenant:ALL`

### restricciones — 15

- `api_keys:api_keys_pkey:p`
- `invoices:invoices_pkey:p`
- `local_ai_audit:local_ai_audit_pkey:p`
- `local_ai_config:local_ai_config_pkey:p`
- `local_ai_ingest_jobs:local_ai_ingest_jobs_pkey:p`
- `local_ai_ingest_jobs:local_ai_ingest_jobs_status_check:c`
- `local_ai_memory:local_ai_memory_pkey:p`
- `local_ai_memory:local_ai_memory_status_check:c`
- `local_ai_rag_chunks:local_ai_rag_chunks_document_id_fkey:f`
- `local_ai_rag_chunks:local_ai_rag_chunks_pkey:p`
- `local_ai_rag_chunks:local_ai_rag_chunks_status_check:c`
- `local_ai_rag_chunks:local_ai_rag_chunks_tenant_id_document_id_chunk_index_versi_key:u`
- `local_ai_rag_documents:local_ai_rag_documents_pkey:p`
- `local_ai_rag_documents:local_ai_rag_documents_status_check:c`
- `local_ai_rag_documents:local_ai_rag_documents_tenant_id_source_id_version_key:u`

### tablasConRls — 5

- `local_ai_audit`
- `local_ai_ingest_jobs`
- `local_ai_memory`
- `local_ai_rag_chunks`
- `local_ai_rag_documents`


## Lo que este documento NO dice

- **Que aplicarlas sea seguro.** Dice qué cambiaría. La decisión de aplicarlas es
  de Daniel y no se ha tomado.
- **Que las dos bases queden idénticas.** No quedarán: producción tiene datos y la
  referencia no, y hay guardas que dependen de eso.
- **Que exista una copia de seguridad.** No la hay verificada desde aquí, y tomar
  una completa mueve cientos de megas por el proxy — tráfico de salida real, que
  bajo el modo de coste cero no se hace sin autorización.
