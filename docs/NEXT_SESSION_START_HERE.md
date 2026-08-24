# EMPIEZA AQUÍ

Estado a **2026-08-23**. Rama `bloque4-webhooks`, worktree `C:\Users\Daniel\nelvyon-w3`.

## Dónde estamos

| Bloque | Estado |
|---|---|
| 1 · Seguridad + base técnica | **CERRADO** → `docs/BLOQUE_1_CIERRE.md` |
| 2 · Web + SaaS + OS completos | **CERRADO** en `2b2c3d8e` → `docs/BLOQUE_2_CIERRE.md` |
| 3 · Empresa IA autónoma | **CERRADO** en `3feaaf24` → `docs/BLOQUE_3_CIERRE.md` |
| 4 · Certificación final | pendiente |

El estado por capacidad se **genera**, no se escribe:

    python -m backend.db.certificacion.estado_bloque2

Fuente: `backend/db/certificacion/capacidades_estado.json`.
Resumen: `docs/BLOQUE_2_ESTADO.md`. Un guardián falla si se separan.

**Bloque 2 · cerrado**: 39/39 clasificadas · 38 certificadas · 1 bloqueada · 0
pendientes. Puerta: web 7148/0 fallos, Python 3598/0 fallos contra PostgreSQL
real. SHA `2b2c3d8e`.

**Bloque 3 · denominador cerrado**: `backend/db/certificacion/capacidades_ia.py`
deriva 2224 módulos de IA en **55 capacidades** con 0 huérfanos —
25 servicios que NELVYON vende, 21 de orquestación, 9 de la empresa IA interna.
Estado en `capacidades_ia_estado.json`, guardián en
`backend/tests/test_el_inventario_de_ia_esta_cerrado.py`.
Contador: **CERTIFIED + BLOCKED + PENDING = 55**.

## Bloqueado por el fundador — no lo toques

Esto no caduca y **la ausencia del fundador no es autorización**:

- `WEB_DB_ROLE_CUTOVER` — el cambio al rol `nelvyon_web_app`.
  Bloquea 68 pruebas de RLS que están escritas y listas.
- **ADR-064**: migraciones `568/569/570/572/573/574/575/576` — no aplicar.
  La `571` está apartada.
  La `576` no está aplicada; su SHA es
  `f570a0b0700ba210c7b6f2984f42b885ba8f926e6f85ebfb0d6cb93bc1d66b92`.
- `STRIPE_MEMBERSHIP_REACTIVATION`.
- Producción no se toca. No se borran fixtures de PROD. No hay operaciones
  destructivas. No se cambian roles ni credenciales.
- No se abre Canary IA. No se activa OpenAI ni ningún proveedor de pago.
  **Coste externo nuevo = 0 €.**
- Email inválido en CRM: el comportamiento actual queda **documentado**, no
  cambiado. No se cambia semántica de producto sin autorización.

## Dos decisiones que esperan al fundador

Ninguna es urgente y ninguna es mía:

1. `InvoicingService` — código muerto. Borrarlo (con su export del barril y su
   prueba) **o** conectarlo.
2. `ABTestingService` — lo mismo.

Mientras tanto están inventariados como `CODIGO_MUERTO` y un guardián falla si
alguien los conecta.

## Cómo se ejecuta la puerta

Está escrito, con las cuatro tandas y sus variables, en
`backend/db/certificacion/LEEME.md`. Dos cosas que **no** son opcionales:

- La tanda de RLS va con `--no-file-parallelism`. No es una rebaja: en paralelo
  esas suites se pisan entre ficheros.
- La puerta se ejecuta **sola**. Solapar la suite web con la de Python tumbó tres
  pruebas por `Test timed out in 5000ms` — saturación de la máquina, no producto.

## Reglas de trabajo que se ganaron a base de fallar

- **Antes de contar una mutación, demuestra que se aplicó**: imprime el número de
  sitios mutados. Un `python -c "..."` en PowerShell se come los `$1` y aplica
  cero cambios en silencio.
- **Un verde sin prueba que caiga no cuenta.** Reintroduce el defecto; si sigue
  verde, la prueba no sirve — corrígela.
- **Una prueba negativa necesita control positivo.** Devolver cero filas a todo el
  mundo no es aislamiento, es una consulta rota.
- **No confundas código muerto con producto.**
- **No mates una suite por lenta si sigue progresando.** `test_rls_saas_cross_tenant.py`
  tarda ~14 minutos y no está colgada.

## Bloque 3 — CERRADO

`BLOQUE_3_EXECUTABLE = CLOSED`. **SHA certificado `3feaaf24`.**

**55/55 clasificadas · 48 `PASS` + 7 `FIXED` · 0 bloqueadas · 0 pendientes.**

| Puerta | Resultado |
|---|---|
| Web (808 ficheros) | 7518 pasadas · 0 fallos · 178 saltadas |
| Python, PostgreSQL real | 3607 pasadas · 0 fallos · 10 saltadas |
| Aislamiento y RLS, en serie | 95/95 |
| Guardianes | 23/23 |

El árbol queda **limpio antes y después** de la puerta: `apps/web/.data` tenía 17
zips rastreados que cada corrida regeneraba, y un SHA que se ensucia al ejecutar
su propia puerta no certifica nada.

### Cómo repetir la puerta

    # Web, sola
    NELVYON_B3_PUERTA=1     NELVYON_B3_DSN=postgresql://nelvyon_local:...@localhost:5434/nelvyon_b2_cert     NELVYON_B2_DSN=postgresql://nelvyon_local:...@localhost:5434/nelvyon_b2_cert     npx vitest run                                    # desde apps/web

    # Aislamiento, EN SERIE
    NELVYON_WEB_CERT_DSN=...nelvyon_web_cert     MIG523_TEST_DATABASE_URL=...nelvyon_mig_cert     DATABASE_URL=...nelvyon_b2_cert     npx vitest run --no-file-parallelism aislamiento_os_lado_web migration523       reclamoDeEvento contextoDeInquilino laBajaNoResucita colasNoDuplicanTrabajo       ErpDomainSnapshotStore ErpPersistenceRoundtrip

    # Python, sola
    NELVYON_AI_ENABLED=0 NELVYON_PG_CERT_DSN=...nelvyon_cert545     NELVYON_WEB_CERT_DSN=...nelvyon_web_cert     NELVYON_VIRGEN_DSN=...nelvyon_rec_final     python -m pytest backend/tests -q -p no:randomly

### Bloqueos que esperan al fundador

`WEB_DB_ROLE_CUTOVER` (bloquea 68 pruebas ya escritas) · ADR-064
(`568/569/570/572/573/574/575/576`; `571` apartada) ·
`STRIPE_MEMBERSHIP_REACTIVATION` · decisión sobre `InvoicingService` y
`ABTestingService` · validación de email en CRM · `chrome-devtools-mcp` pendiente
de revisión de permisos de red.

### Bloque 4

Arranca **después** de `3feaaf24`, en commits posteriores, sin tocar ese árbol.
