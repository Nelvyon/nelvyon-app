# EMPIEZA AQUÍ

Estado a **2026-08-25**. Rama `bloque4-webhooks`, worktree `C:\Users\Daniel\nelvyon-w3`.

## Dónde estamos

| Bloque | Estado |
|---|---|
| 1 · Seguridad + base técnica | **CERRADO** → `docs/BLOQUE_1_CIERRE.md` |
| 2 · Web + SaaS + OS completos | **CERRADO** en `2b2c3d8e` → `docs/BLOQUE_2_CIERRE.md` |
| 3 · Empresa IA autónoma | **CERRADO** en `3feaaf24` → `docs/BLOQUE_3_CIERRE.md` |
| 4 · Operación real | **CERRADO** en `cf43aeda` → `docs/BLOQUE_4_CIERRE.md` |
| 5 · Producto medido y comparativa | **CERRADO** → `docs/BLOQUE_5_CIERRE.md` |

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

## Bloque 5 — CERRADO

`BLOQUE_5_EXECUTABLE = CLOSED`.

**25/25 categorías de producto · 24 `FIXED_CERTIFIED` + 1 `PASS_CERTIFIED` ·
0 bloqueadas · 0 pendientes.** Contador: **25 + 0 + 0 = 25**.

Denominador: `backend/db/certificacion/capacidades_producto.py` deriva
**217 áreas de producto en 25 categorías con 0 huérfanas**. Estado en
`capacidades_producto_estado.json`; comparativa en
`benchmark_mercado_estado.json`, que **se regenera**, no se edita:

    python -m backend.db.certificacion.benchmark_mercado --escribir

### Las tres auditorías, y cómo se ejecutan

    python -m backend.db.certificacion.auditoria_de_pantallas    # 7 reglas, 1069 ficheros
    python -m backend.db.certificacion.auditoria_de_rutas        # 888 rutas, 0 enlaces a 404
    python -m backend.db.certificacion.informe_por_categoria     # cruza las dos por categoría

La cuarta necesita servidor construido y va aparte:

    cd apps/web && npx next build && npx next start -p 3000
    PLAYWRIGHT_BASE_URL=http://localhost:3000       npx playwright test e2e/bloque5/medicion-por-categoria.spec.ts --workers=2

Abre un navegador de verdad sobre 75 rutas —las 25 categorías— y mide con
axe-core (WCAG 2.1 AA, `serious` y `critical`), desbordamiento a 375 px y errores
de JavaScript. **75/75.** De **993 violaciones graves a 0**.

`rutas_por_categoria.json` es un fichero **generado**; hay un guardián que falla
si se desincroniza del inventario. Regenerar con la orden que el propio mensaje
de error imprime.

### Lo que este bloque enseñó y conviene no olvidar

- **Los defectos de producto no se encuentran leyendo el código.** Los dos peores
  —una identidad falsa («Thomas Fleming») en 75 pantallas, y una sesión que echaba
  al login en 136— llevaban meses delante de todo el mundo y ninguna suite los
  veía. Aparecieron al abrir un navegador.
- **Afilar una regla es el mismo gesto que cegarla.** Por eso cada regla del
  auditor tiene control positivo *y* negativo en
  `test_el_auditor_de_pantallas_ve_los_defectos.py`. Ese guardián encontró un
  punto ciego que ocultaba 425 casos en su primera ejecución.
- **Un arreglo que sirve a la mitad del producto no es un arreglo.** Oscurecer el
  azul arreglaba el tema claro y rompía el oscuro. El guardián de contraste mira
  **los dos temas** a propósito.
- **Un cronómetro no es una señal.** Esperar «1500 ms» fallaba con la máquina
  cargada; esperar a que las hojas de estilo estén aplicadas, no.
- **Clasifica un documento AL CREARLO** en `orphanClassification.ts`. El cierre
  del Bloque 4 no lo hizo y puso roja la puerta de este bloque.

### Fase B: por qué no hay ninguna superioridad declarada

**0 `SUPERIOR` · 0 `EQUAL` · 21 `PROPIA_MEDIDA` · 4 `SIN_COMPARAR`.**

No es modestia ni falta de trabajo: afirmar superioridad exige **la misma medida
tomada en el referente**, y eso requiere una cuenta suya, coste externo y datos
reales — las tres prohibidas aquí. El veredicto lo **deriva** `_veredicto()` de
las clases de evidencia, y no hay ninguna rama que devuelva `SUPERIOR` sin
`MEASURED` en los dos lados. Escribirlo a mano en el JSON pone la puerta roja.

Si algún día se autoriza medir a un competidor, `test_hoy_no_hay_ni_una_
superioridad_declarada` se pondrá rojo y habrá que cambiarlo **a propósito**, con
la evidencia delante.

### Cambio visible

El azul de marca es `#0063c2` en el **tema claro** (antes `#0084ff`): mismo tono,
un escalón más oscuro, por exigencia de contraste WCAG. El tema oscuro conserva
`#0084ff` porque allí el nuevo no cumple. Reversible en una línea.

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

## Bloque 4 — CERRADO

`BLOQUE_4_EXECUTABLE = CLOSED`. **SHA certificado `cf43aeda`.**

**13/13 · 8 `FIXED_CERTIFIED` + 5 `PASS_CERTIFIED` · 0 bloqueadas · 0 pendientes.**

| Puerta | Resultado |
|---|---|
| Web (830 ficheros) | 7663 pasadas · 0 fallos · 178 saltadas |
| Python, PostgreSQL real | 3616 pasadas · 0 fallos · 10 saltadas |
| Aislamiento y RLS, en serie | 95/95 |
| Guardianes (inventario + web) | 38 + 46 |

Estado vivo generado:

    python -m backend.db.certificacion.estado_bloque4

### Cómo repetir la puerta del Bloque 4

    # Web, sola
    NELVYON_B4_DSN=...nelvyon_b2_cert NELVYON_B3_DSN=... NELVYON_B2_DSN=...     npx vitest run                                     # desde apps/web

    # Python, sola
    NELVYON_AI_ENABLED=0 NELVYON_PG_CERT_DSN=...nelvyon_cert545     NELVYON_WEB_CERT_DSN=...nelvyon_web_cert NELVYON_VIRGEN_DSN=...nelvyon_rec_final     python -m pytest backend/tests -q -p no:randomly

    # Aislamiento, EN SERIE (ver BLOQUE_3 handoff para la lista)

### Interruptores que ahora existen

- `NELVYON_AI_ENABLED=0` — ningún proveedor de IA, ni siquiera para sondear.
- `NELVYON_EMAIL_ENABLED` — **apagado por defecto fuera de producción**. Apagado,
  `sendEmail` lanza `CorreoDesactivadoError`; nunca finge que envió.
- `OS_WORKER_SILENCIO_MS` — cuánto silencio hace falta para dar un trabajo por
  muerto. No lo bajes para «arreglar» un despliegue de pasos largos.

### Dos reglas que este bloque confirmó dos veces cada una

1. **Un negativo verde no certifica una defensa si la ejecución nunca la
   alcanzó.** Pasó en OAuth (secreto con otro nombre) y en GDPR (error lanzado en
   una sentencia que va por otra función). Solo la mutación lo destapa.
2. **Un timeout no se arregla subiendo el timeout.** Mide primero la causa.

### Bloque 5 — punto de arranque

Auditoría comparativa contra referentes mundiales: SaaS líderes y agencias de
marketing digital de máximo nivel. Arranca **después** de `cf43aeda`, en commits
posteriores.

La regla que ya está fijada para ese bloque: **no afirmar superioridad sin
evidencia comparativa**. Paridad o superioridad solo donde sea objetivamente
verificable; en lo demás, decir qué falta.
