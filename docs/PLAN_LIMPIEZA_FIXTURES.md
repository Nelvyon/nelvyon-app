# Plan de limpieza de datos de certificación

**NO EJECUTADO. BLOCKED_ON_FOUNDER.** Nada borrado, nada modificado.

Producción no tiene clientes: `REAL_PRODUCTION_DATA = 0`. Eso abre una ventana
para dejar la base limpia antes del primer cliente — pero borrar sigue siendo
irreversible, así que aquí está el plan con su evidencia, su orden y su rollback.

## Las 33 tablas UNKNOWN, ya clasificadas

Se investigaron una a una leyendo una fila de muestra. Ya no hay UNKNOWN:

### SYSTEM_DATA — catálogo y configuración del producto (11 tablas) · **NO TOCAR**

`autopilot_capabilities` (31) · `os_sector_certifications` (25) ·
`agent_policies` (20) · `agent_catalog` (12) · `support_templates` (8) ·
`saas_exchange_rates` (7) · `saas_marketplace_apps` (5) · `plan_rango` (5) ·
`usage_limits` (4) · `early_adopter_config` (1) · `local_ai_config` (1)

Son la **definición del producto**: qué agentes existen, qué puede hacer cada uno,
qué planes hay. Borrarlas rompería NELVYON, no lo limpiaría.

`agent_kill_switch` (1) merece mención aparte: es el interruptor de parada de los
agentes, en `detenido = false`. **Nunca se toca.**

### OBSERVABILIDAD — el sistema hablando de sí mismo (5 tablas) · **NO BORRAR, SÍ RECALCULAR**

`business_health_baseline` (19) · `os_template_dna_scores` (20, `source:
synthetic`) · `security_events` (12) · `business_incidents` (7) ·
`os_learning_run_log` (2)

`security_events` contiene **denegaciones RBAC reales** (`saas.rbac.denied`,
15–16 de agosto): es la observabilidad funcionando. Se conserva.

### CERTIFICATION_FIXTURE — datos de los inquilinos de prueba (17 tablas)

`os_sector_shield_audits` (2761) · `saas_ceo_brief_runs` (538) ·
`saas_pack_entitlements` (172) · `onboarding` (25) · `os_jobs` (12, `client_id:
c_done`) · `saas_private_ai_settings` (12) · `saas_autopilot_settings` (6) ·
`saas_private_ai_audit` (3) · `local_ai_rag_chunks`/`documents` (2+2) ·
`saas_tenant_memory_settings` (2) · `saas_workflow_versions` (2) · y las 24 ya
clasificadas antes.

## El efecto secundario que hay que planificar

**`business_health_baseline` tiene aprendido `clientes_visibles = 1101` como valor
sano** (visto el 2026-08-23). Esos 1.101 clientes son fixtures.

Si se borran sin más, el sistema de salud verá caer la métrica de 1.101 a 0, lo
marcará como anomalía y generará incidencias en `business_incidents`. Es decir:
**la limpieza se denunciaría a sí misma como un incidente de producción.**

No es un fallo: es el sistema haciendo su trabajo. Pero el plan tiene que
contemplarlo, o el primer efecto visible de limpiar será una alarma falsa.

## Orden propuesto

1. **Backup completo** de la base. Sin esto no se empieza: es lo único que hace
   reversible un `DELETE`.
2. **Aplicar la 574 antes de borrar nada** — atribuye las 2.761 auditorías
   huérfanas. Después de borrar, su `pack_run_id` ya no resolvería y se perdería
   la posibilidad de repararlas.
3. **Silenciar el sistema de salud** durante la ventana, o borrar
   `business_health_baseline` **en el mismo paso** para que reaprenda desde cero.
4. **Borrar por inquilino, no por tabla.** Los 22 `saas_tenants` de prueba y los
   3 workspaces se identifican por nombre (`PAI-*`, `Cert*`, `Co-*`, `*Smoke*`,
   `QA Audit Co`, `Mi Workspace`). Borrar tabla por tabla dejaría huérfanos
   cruzados.
5. **Verificar contando**: cada tabla del inventario a 0, y las de SYSTEM_DATA
   **intactas**. La señal de que algo salió mal no es un error: es un catálogo
   que se quedó vacío.
6. **Recalcular baselines** y comprobar que `/health/business` vuelve a `ok`.

## Lo que NO se recomienda

- **No borrar `_migrations`** ni `status_checks` (1.410 filas): son la historia
  del despliegue.
- **No borrar los 3 workspaces sin más**: `workspace_id = 1` es el dueño de
  5.050 entregables y 14.178 eventos de auditoría. Borrarlo en cascada es la
  operación de mayor alcance de todo el plan y merece su propia ventana.
- **No hacerlo antes de la 574**: se perdería la atribución determinista.

## Alternativa que conviene considerar

Dado que **no hay ningún dato real que preservar**, recrear la base desde las
migraciones sería más limpio y más verificable que un borrado selectivo de 41
tablas: el resultado es exactamente el esquema, sin residuo posible.

Tiene un coste: se perdería `status_checks` y el historial de despliegue. Y exige
que las migraciones apliquen limpias sobre una base virgen — que es justamente lo
que comprueba `test_migrations_run_on_virgin_postgres`, hoy **saltada** por falta
de `NELVYON_PG_VIRGEN_DSN`.

**Recomendación**: antes de decidir entre borrado selectivo y recreación, ejecutar
esa prueba. Si las migraciones no aplican limpias sobre una base virgen, la
recreación no es una opción y hay que saberlo **antes**, no durante.
