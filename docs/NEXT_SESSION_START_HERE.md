# EMPIEZA AQUÍ

Estado a **2026-08-23**. Rama `bloque4-webhooks`, worktree `C:\Users\Daniel\nelvyon-w3`.

## Dónde estamos

| Bloque | Estado |
|---|---|
| 1 · Seguridad + base técnica | **CERRADO** → `docs/BLOQUE_1_CIERRE.md` |
| 2 · Web + SaaS + OS completos | **CERRADO** en `2b2c3d8e` → `docs/BLOQUE_2_CIERRE.md` |
| 3 · Empresa IA autónoma | **EN CURSO** → `docs/BLOQUE_3_LINEA_BASE.md` |
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

## Bloque 3 — 55/55, PENDING = 0

**48 `PASS_CERTIFIED` + 7 `FIXED_CERTIFIED` + 0 bloqueadas + 0 pendientes = 55.**
SHA candidato `068aba51`. Cierre en `docs/BLOQUE_3_CIERRE.md`.

Estado vivo generado:

    python -m backend.db.certificacion.estado_bloque3

### Cómo se ejecuta la puerta del Bloque 3

    NELVYON_B3_PUERTA=1     NELVYON_B3_DSN=postgresql://nelvyon_local:...@localhost:5434/nelvyon_b2_cert     NELVYON_B2_DSN=postgresql://nelvyon_local:...@localhost:5434/nelvyon_b2_cert     npx vitest run     # desde apps/web

`laPuertaDelBloque3NoPuedeSaltarse` falla si se declara `NELVYON_B3_PUERTA=1` sin
el DSN: una puerta sin base se saltaría las suites y diría verde.

**La puerta se ejecuta sola.** Solapar la suite web con la de Python tumbó tres
pruebas por `Test timed out in 5000ms` en el Bloque 2 — saturación de máquina, no
producto.

### Siete defectos encontrados en el Bloque 3

1. Inyección de prompt por diseño (RAG y memoria en el mensaje de sistema).
2. Escalada de permisos: `forbiddenActions` muerto para 8 de 9 acciones.
3. La puerta no ejecutaba `backend/private-ai`, `config` ni `http`.
4. QA que rechazaba lo correcto por buscar `"todo"` como subcadena.
5. Métrica fabricada: visibilidad en IA presentada como medida.
6. Degradación silenciosa y permanente del almacén de prompts.
7. Un literal roto en el orquestador privado, sin cobertura que lo detectara.

Los siete con mutación comprobada. Detalle en `docs/BLOQUE_3_CIERRE.md`.

### Dos trampas técnicas

- Aplicar arreglos con Python convierte `` en un **carácter de retroceso real**
  (0x08), invisible al leer, y la regex no casa nunca. Usar cadenas crudas.
- Escribir un fichero leído con `newline=""` en Windows **duplica las líneas**.
  Leer universal, escribir con `newline="
"`.
