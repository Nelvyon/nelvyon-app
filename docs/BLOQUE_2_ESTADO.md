# BLOQUE 2 — estado vivo

> Se actualiza solo desde `backend/db/certificacion/capacidades_estado.json`.
> **La fuente es ese fichero**, no este resumen.

**14/39 certificadas · 1 bloqueadas · 24 pendientes**

## Certificadas (14)

- `ab_testing`
- `auth_onboarding_workspaces`
- `campanias`
- `contratos`
- `crm`
- `dashboard`
- `encuestas`
- `facturacion_billing`
- `gdpr_cumplimiento`
- `inbox_helpdesk`
- `marca_blanca`
- `pwa`
- `web_builder`
- `workflows`

## Bloqueadas (1)

- `integraciones`

## Pendientes (24)

- `admin_plataforma`
- `ads`
- `analytics_reporting`
- `chatbot`
- `contenido`
- `cuenta_y_suscripcion`
- `dialer_voz_llamadas`
- `ecommerce_tienda`
- `email`
- `erp`
- `formularios_captacion`
- `ia_privada_memoria`
- `lms_formacion`
- `os`
- `packs_entregables`
- `partners_afiliados`
- `portal_cliente`
- `prospeccion_cold_email`
- `redes_sociales`
- `reputacion_sentimiento`
- `reservas`
- `salud_infra`
- `seo_visibilidad`
- `storage_uploads`

## Cómo continuar

```
docker start nelvyon-local-ai-postgres
NELVYON_B2_DSN=postgresql://nelvyon_local:nelvyon_local_dev@localhost:5434/nelvyon_b2_cert
cd apps/web
npx vitest run ../../backend/saas/__tests__/flujoLote1.pg.test.ts   # y Lote2..5, Crm, Workflows, Presupuestos, Integraciones
```

La base `nelvyon_b2_cert` se clona de `nelvyon_rec_final`, que se reconstruye
solo con las migraciones oficiales:

```
docker exec nelvyon-local-ai-postgres psql -U nelvyon_local -d postgres   -c "DROP DATABASE IF EXISTS nelvyon_b2_cert"   -c "CREATE DATABASE nelvyon_b2_cert TEMPLATE nelvyon_rec_final"
```

## Patrón de certificación que funciona

1. Extraer las firmas REALES del servicio antes de escribir nada — la mitad de
   los falsos rojos salen de suponer la forma de entrada.
2. Servicio REAL contra PostgreSQL real. Un doble certifica el doble.
3. Nunca conformarse con lo que devuelve la escritura: RELEER, y varias veces
   mirar la fila sin pasar por el servicio.
4. Inquilino A y B a la vez, con control positivo: devolver cero filas a todo el
   mundo no es aislamiento.
5. Mutación que reintroduzca el defecto. Si sigue verde, la prueba no vale.

## Errores míos que se repiten, para no volver a pagarlos

- **Comillas invertidas dentro de una plantilla de cadena**: la cierran. Cuatro
  veces.
- **Comentarios `--` fuera del literal SQL**: en posición de TypeScript no son
  comentarios.
- **`$1` dentro de `python -c "..."`**: el shell se lo come. Usar heredoc.
- **Suponer la forma de entrada** en vez de leerla del tipo.
