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

## Bloque 3 — dónde va

**42/55 certificadas · 0 bloqueadas · 13 pendientes.** Estado vivo generado en
`docs/BLOQUE_3_ESTADO.md`:

    python -m backend.db.certificacion.estado_bloque3

### Cómo se ejecuta la certificación del Bloque 3

    NELVYON_B3_DSN=postgresql://nelvyon_local:...@localhost:5434/nelvyon_b2_cert     npx vitest run   # desde apps/web

`laPuertaDelBloque3NoPuedeSaltarse` falla si se declara `NELVYON_B3_PUERTA=1` sin
ese DSN: una puerta sin base se saltaría las suites y diría verde.

### Las 13 que quedan

`aprendizaje_autonomo`, `conocimiento_del_cliente`, `creatividad_y_generacion`,
`enrutado_de_modelo`, `entregables_y_certificados`, `infra_ia_propia`,
`ingesta_de_conocimiento`, `memoria_y_rag`, `orquestacion_privada`,
`prompts_y_idioma`, `rag_privado`, `reporting_y_roi`, `varios_del_nucleo`.

### Defectos encontrados en el Bloque 3, por si se pierde el hilo

1. **Inyección de prompt por diseño** — el material de RAG y memoria se
   concatenaba en el mensaje de sistema. Corregido en `contextoRecuperado.ts`.
2. **Escalada de permisos** — `forbiddenActions` estaba muerto para 8 de 9
   acciones: lo prohibido se degradaba a «pendiente de aprobación».
3. **La puerta no ejecutaba `backend/private-ai`** ni `config` ni `http`.
4. **QA que rechazaba lo correcto** — buscaba la cadena `"todo"` como subcadena,
   y en español eso marca casi cualquier texto legítimo.
5. **Métrica fabricada** — la visibilidad en IA se presentaba como medida cuando
   la respuesta la escribía el modelo propio imitando a ChatGPT.

Los cinco con mutación comprobada.

### Una trampa técnica que costó tiempo

Aplicar arreglos con un script de Python convierte `\b` en un **carácter de
retroceso real** (0x08). Es invisible al leer el fichero y hace que una expresión
regular no case nunca. Se detectó mirando los bytes. Usar cadenas crudas.

Y escribir un fichero leído con `newline=""` en Windows **duplica todas las
líneas**. Leer universal, escribir con `newline="
"`.
