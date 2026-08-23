# BLOQUE 2 — cierre

**SHA candidato:** `ef1e7819` (rama `bloque4-webhooks`)
**Inventario:** 38 certificadas · 1 bloqueada · 0 pendientes = **39**

El estado por capacidad vive en `backend/db/certificacion/capacidades_estado.json`
y se resume, generado, en `docs/BLOQUE_2_ESTADO.md`. Este documento cuenta lo que
un listado de estados no puede contar: **qué estaba roto**.

---

## Lo que se encontró

Nueve defectos de producto, todos con la misma firma: la interfaz decía que sí y
la base no cambiaba, o cambiaba mal. Ninguno daba error visible.

### 1 · Workflows — ninguna ejecución se registraba nunca

`ON CONFLICT (idempotency_key)` sobre un índice único **parcial**. PostgreSQL no
puede inferir un índice parcial si no se repite su `WHERE`, y falla al planificar
— siempre, con cualquier dato. Así que ni una sola ejecución de workflow llegó a
guardarse. Se corrigió repitiendo el predicado: `WHERE idempotency_key IS NOT NULL`.

### 2 · Workflows — los pasos se guardaban como `{}`

`pg` **no** serializa un array de JS a JSON: manda un literal de array de
PostgreSQL. Contra una columna `jsonb`, `[]` se guardaba como `{}` (corrupción
silenciosa) y `[{...}]` reventaba. Lo peor: el registrador de fallos tenía el
mismo defecto, así que el camino de error tampoco dejaba rastro. Tres sitios
corregidos con `JSON.stringify(...)::jsonb`.

### 3 · Facturación — `NaN` como importe

`NaN` es un valor **válido** en una columna `numeric` de PostgreSQL. Un total de
línea no finito se guardaba sin error y la factura quedaba con un importe que no
es un número. `calcTotals` ahora lo rechaza en el cálculo.

### 4 · Notificaciones — marcar como leída fallaba siempre

`markRead` moldeaba `tenant_id = $3::uuid` contra una columna `varchar`.
Excepción de tipos en cada llamada, sin excepción.

### 5, 6 y 7 · Inbox — tres defectos, cada uno mataba una operación entera

- Consultaba `saas_team_members`, tabla que **no existe** (es `team_members`):
  crear conversación estaba roto.
- `$5` sin molde: crear conversación sin primer mensaje, roto.
- La columna `content` es `NOT NULL` y el servicio solo escribía `body`: enviar
  mensaje fallaba **siempre**.

### 8 · Subcuentas — una agencia no podía dar de alta a un cliente

`create` generaba el identificador como `sub_<16hex>` para una columna `uuid`. Lo
grave no es el fallo, es que **una prueba unitaria exigía literalmente ese
prefijo** (`expect(...).toMatch(/^sub_/)`). Como usaba un doble de la base, el
error de tipo nunca aparecía: la prueba estaba certificando el defecto y su verde
lo protegía. Ahora exige un UUID y niega el prefijo.

### 9 · Tienda — la primera configuración se descartaba en silencio

`INSERT INTO store_settings (tenant_id) VALUES ($1) ON CONFLICT DO UPDATE SET ...`.
La primera vez no hay conflicto: entra el `INSERT` con el `tenant_id` solo y la
rama `DO UPDATE` **no llega a ejecutarse**. El comercio se configuraba, la
respuesta decía que sí, y no se guardaba nada. A partir de la segunda vez
funcionaba, que es lo que lo hacía difícil de ver.

---

## Lo que NO era un defecto

Dos investigaciones abiertas se cerraron **sin tocar producto**, y merece decirlo
porque el impulso era el contrario:

- **Entitlements**: el resultado vacío que parecía un fallo de concesión era
  contaminación de las pruebas rotas del inbox. Trazado de punta a punta:
  conceder 8 → base 8 → listar 8. No había defecto.
- **`consumeLaunch`**: escribe en entitlements, no en `saas_pack_launches`. Mi
  prueba miraba la tabla equivocada.

`InvoicingService` y `ABTestingService` resultaron **código muerto**: solo los
citan el barril y sus propias pruebas con doble de base. El contrato vivo es
`/api/saas/facturas → SaasFacturasService → invoices` y
`/api/saas/ab-testing → SaasAbTestingService → ab_tests`. **No los borro**: la
decisión de borrar o conectar es del fundador. Quedan inventariados como
`CODIGO_MUERTO`, con un guardián que recorre el árbol y **falla si alguien los
conecta** — porque entonces dejarían de estar muertos y su hueco volvería a contar.

---

## Falsos verdes cerrados

Tres, y son el tipo de cosa que sostiene una certificación entera sobre nada:

1. **Las 16 suites compartían el mismo par de inquilinos.** Vitest corre los
   ficheros en paralelo contra la misma base: el `beforeEach` de uno borraba lo
   que otro acababa de sembrar. Por separado pasaban los 16, juntos caían tres.
   Salió como falso rojo; con otros tiempos habría salido como falso verde. Cada
   fichero tiene ahora su propio par.

2. **Una puerta sin `NELVYON_B2_DSN` se saltaba las 242 pruebas y decía verde.**
   No decía "no certificado": decía "certificado". `laPuertaDelBloque2NoPuedeSaltarse`
   lo convierte en fallo.

3. **`docs/BLOQUE_2_ESTADO.md` se editaba a mano** aunque declarase que su fuente
   era el JSON. Llegó a anunciar "14/39 certificadas · 24 pendientes" con el JSON
   en 38 y 0. Ahora se genera, y un guardián falla si los dos se separan.

---

## Cada arreglo se comprobó por mutación

No cuenta un arreglo sin una prueba que caiga al reintroducir el defecto. Se
reintrodujo cada uno y se verificó la caída, indicando siempre el número de sitios
mutados para no contar una mutación que no llegó a aplicarse.

---

## Lo que queda bloqueado

| Qué | Por qué |
|---|---|
| `integraciones` (capacidad) | la parte externa exige proveedores reales. Lo interno —el almacén de conexiones, que es el riesgo— sí está certificado |
| 68 pruebas de RLS | credencial del rol `nelvyon_web_app`: `WEB_DB_ROLE_CUTOVER` = BLOQUEADO POR EL FUNDADOR |
| 16 pruebas de aislamiento local-ai | exigen un rol sin privilegios; la suite se **niega** ante un superusuario, y hace bien |
| 6 pruebas en vivo | proveedor de IA real: apagadas por la regla de coste externo 0 € |
| migración 576 | `f570a0b0...d1d66b92`, **sin aplicar**. Verificado: ninguna de 568–576 está aplicada |
| `InvoicingService` / `ABTestingService` | decisión de producto, no mía |

---

## Hallazgo sobre la migración 576

El trinquete de huecos de recuperación (`test_no_aparecen_huecos_nuevos_de_recuperacion`)
está condicionado a `NELVYON_VIRGEN_DSN` y por eso **no había llegado a correr en
ninguna puerta**: sin esa variable se salta y la suite dice "passed" igual.

Ejecutado por fin contra las dos referencias, el resultado es limpio:

| Base de referencia | 576 | Resultado |
|---|---|---|
| `nelvyon_rec_final` | aplicada | **4/4 verde** |
| `nelvyon_cert545` | sin aplicar | **8 huecos** |

Los ocho son exactamente las columnas que crea la 576:
`affiliate_clicks.affiliate_id`, `campaigns.from_email`, `campaigns.from_name`,
`retail_results.output`, `retail_results.sector`, `saas_conversations.metadata`,
`security_events.message`, `security_events.metadata`.

Dicho de forma útil para decidir: **el código escribe esas ocho columnas y la
cadena oficial de migraciones no las crea.** Una restauración desde cero fallaría
ahí. La 576 las cierra todas y no deja ninguna suelta — está medido en las dos
direcciones, no supuesto.

La 576 sigue **sin aplicar** (`f570a0b0700ba210c7b6f2984f42b885ba8f926e6f85ebfb0d6cb93bc1d66b92`)
porque está en ADR-064. No la aplico. Queda la medición, que es lo que hacía falta
para que la decisión no sea a ciegas.

---

## Revisión individual de skips

La puerta exigía mirarlos uno a uno. Se miraron, y **la mitad no debían estar
saltados**: no eran deuda, eran infraestructura que nadie había conectado.

### Web — 178 saltados

| | Qué se hizo |
|---|---|
| **88** | **recuperados y ejecutados, todos verdes**: aislamiento OS del lado web, migración 523, reclamo de evento, contexto de inquilino, la baja que no resucita, colas que no duplican trabajo, persistencia ERP |
| 68 | bloqueados: exigen la credencial del rol `nelvyon_web_app` (`WEB_DB_ROLE_CUTOVER`) |
| 16 | `rlsIsolation`: exige un rol **sin** privilegios. Apuntado a un superusuario **falla**, y hace bien: RLS no se aplica a superusuarios, así que estaría midiendo el vacío |
| 6 | exigen proveedor de IA en vivo: apagadas por la regla de coste 0 € |

Esos 88 incluyen el grueso del aislamiento entre inquilinos. Estaban escritos y
no corrían. Con `--no-file-parallelism` pasan los 95 del lote.

### Python — 26 saltados

| | Qué se hizo |
|---|---|
| **16** | **recuperados y ejecutados**: 13 de reintentos de webhooks salientes (retry/idempotencia, que la puerta pedía por su nombre), 1 de la cadena de migraciones sobre base virgen, 2 del trinquete de huecos |
| 2 | migración `571`, **apartada** por el fundador: no está en el árbol, no hay fichero que leer |
| 2 | listas de deuda **vacías** (`HUERFANAS_CONOCIDAS`, `FUERA_DEL_CATALOGO`). Es el estado deseado, no un agujero: la prueba real sí corre, y hay control positivo explícito que impide que un extractor inerte dé verde |
| 5 | conectores que no declaran ruta: no hay nada que comprobar en ellos |
| 1 | `workspace_members_invites` no existe en este entorno. La prueba **lo dice y se salta**, en vez de dar un verde silencioso |

Ninguno era una prueba apagada. Cero `skip` incondicionales en el árbol, y hay un
guardián que lo vigila con su propio control positivo.

---

## Un defecto más, encontrado por la propia puerta

La última corrida tumbó `nelvyonBrainKnowledge`: `expected 8 to be less than or
equal to 5`. Había añadido tres documentos —el cierre, la línea base del Bloque 3
y el "empieza aquí"— sin clasificarlos en el índice de conocimiento.

El guardián funcionaba. La tentación era subir el tope de 5 a 8; se clasificaron
los tres documentos, que es lo que el guardián pedía.

---

# BLOQUE_2_EXECUTABLE = CLOSED

Declarado el **2026-08-23** sobre árbol congelado, rama `bloque4-webhooks`.

## Inventario

| | |
|---|---|
| Clasificadas | **39 / 39** |
| Certificadas | **38** (33 `PASS_CERTIFIED` + 5 `FIXED_CERTIFIED`) |
| Bloqueadas | **1** (`integraciones`, externa) |
| Pendientes | **0** |

Contador inviolable: **38 + 1 + 0 = 39**. El denominador se deriva de las 922
rutas de API y un guardián falla si una ruta queda huérfana o una capacidad se
queda sin rutas: no se puede inflar ni desinflar para que el porcentaje salga.

## Evidencia de la puerta

| Tanda | Resultado |
|---|---|
| Web completa (783 ficheros) | **7148 pasadas · 0 fallos · 178 saltadas** |
| Python completa, PostgreSQL real | **3598 pasadas · 0 fallos · 10 saltadas** · 9:07 |
| Certificación Bloque 2, 16 ficheros juntos | **242 / 242** |
| Aislamiento y RLS, en serie | **95 / 95** |
| Guardianes de inventario y trinquetes | **16 / 16**, ninguno saltado |

Las dos puertas se ejecutaron **por separado y solas** sobre el mismo árbol. La
corrida en la que se solaparon tumbó tres pruebas por `Test timed out in 5000ms`
—saturación de máquina, no producto— y se repitió en vez de subir el timeout.

## Qué se demostró

- **PostgreSQL real** en las 16 suites de capacidades y en la tanda de RLS.
- **Aislamiento A/B** con la matriz de 8 puntos, y **control positivo en cada
  prueba negativa**: devolver cero filas a todo el mundo no cuenta como aislar.
- **RBAC e IDOR**: `viewer` lee y no escribe; declarar el workspace de otro sin
  pertenecer a él no sirve; sin contexto no se ve nada (fallo cerrado).
- **Dinero**: importes no finitos rechazados en el cálculo, no en la base.
- **Concurrencia**: cuatro escrituras simultáneas sobre la misma versión del ERP,
  gana una y la versión sube una sola vez.
- **Reintentos e idempotencia**: 13 pruebas de webhooks salientes, recuperadas de
  entre las saltadas y ejecutadas.
- **Workflows de punta a punta**, incluido el camino de error.
- **Mutación crítica en cada arreglo**: reintroducido el defecto, la prueba cae.
  Siempre indicando el número de sitios mutados, porque una mutación que no llega
  a aplicarse deja un verde que parece bueno.

## Defectos corregidos

Nueve, detallados arriba. Ninguno daba error visible: todos eran "la interfaz
dice que sí y la base no cambia, o cambia mal".

## Skips y xfails

Revisados **uno a uno**: 178 en web y 26 en Python. Se recuperaron y ejecutaron
**104** que estaban escritas y no corrían. El resto está bloqueado por el rol
`nelvyon_web_app`, por exigir proveedor en vivo, o son listas de deuda vacías con
control positivo. **Cero skips incondicionales** en el árbol, vigilado por un
guardián con su propio control positivo.

Ninguno de los saltos oculta ninguna de las 38 capacidades certificadas: los 39
estados citan evidencia ejecutada, y el guardián del inventario lo comprueba.

## Producción y coste

- **Producción: NO TOCADA.** Toda la certificación fue contra bases de
  certificación (`nelvyon_b2_cert`, `nelvyon_web_cert`, `nelvyon_cert545`,
  `nelvyon_mig_cert`, `nelvyon_rec_final`).
- **Ninguna migración bloqueada aplicada.** Verificado en `_migrations`:
  568–576 → ninguna. La 576 sigue sin aplicar, SHA
  `f570a0b0700ba210c7b6f2984f42b885ba8f926e6f85ebfb0d6cb93bc1d66b92`.
- **Sin fixtures de PROD borradas. Sin operaciones destructivas. Sin cambios de
  roles ni credenciales.**
- **Coste externo generado: 0 €.** `NELVYON_AI_ENABLED=0`. Canary IA cerrado.
  Ningún proveedor de pago activado.

## Gates que siguen pendientes

`WEB_DB_ROLE_CUTOVER` · ADR-064 (`568/569/570/572/573/574/575/576`; `571`
apartada) · `STRIPE_MEMBERSHIP_REACTIVATION` · decisión sobre `InvoicingService` y
`ABTestingService` · validación de email en CRM.

Todos **BLOCKED_ON_FOUNDER**. La ausencia del fundador no es autorización.
