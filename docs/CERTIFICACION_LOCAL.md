# Certificación local

> Estado a 29 de agosto de 2026. Todo lo de aquí está **medido en local**.
> Nada se ha aplicado ni desplegado en producción.

---

## Lo que significa cada palabra

Este documento usa tres etiquetas y sólo tres, porque la diferencia entre ellas
es donde se pierde la honestidad de un informe:

| Etiqueta | Qué quiere decir |
|---|---|
| `LOCAL_CERTIFIED` | funciona, con pruebas que lo demuestran y mutaciones que confirman que las pruebas sirven |
| `PRODUCTION_UNVERIFIED` | no se ha tocado producción. Todo lo de abajo lo es |
| `NO_MEDIDO` | no se sabe. Es una respuesta legítima; un número inventado no |

**Nada se marca `DONE`.** Una fase cuya prueba final exige producción se queda
en `LOCAL_CERTIFIED` + `PRODUCTION_UNVERIFIED`, y ya está.

---

## Cierre integral pre-producción (29-08-2026, tarde)

Esta fase se propuso cerrar lo que quedaba abierto **sin Daniel**. Lo que sigue
no es un resumen de intenciones: cada línea tiene su prueba, y las que defienden
algo tienen además su mutación.

### El catálogo pasa de 25 a 29 servicios

Se añadieron cuatro capacidades que **ningún servicio cubría** y cuyo
departamento ya existía: captación y CRM, analítica y atribución, inteligencia
de mercado, y visibilidad en buscadores de IA.

Y se dejaron fuera cinco que «sonaban bien»: community management cabe dentro de
social media, social listening dentro de inteligencia de mercado y reputación,
growth es una forma de trabajar y no un servicio, partnerships no tiene encaje
demostrable, y programática cabe dentro de ads. El motivo de cada exclusión está
escrito en `backend/os-agents/constants.ts`, no aquí: donde se tomó la decisión.

Cada uno de los cuatro entra con **todo lo que exige un servicio**, no con un
identificador: dimensiones propias de intake, política de optimización con su
métrica y su muestra mínima, herramientas deterministas, rúbrica de calidad,
agente de seis pasos, y personalización **medida ejecutándolo con cinco clientes
sintéticos** —cobertura 1,00 y separación 0,32-0,37—.

**Los cuatro llevan el precio sin decidir**, y eso no es un olvido: un precio
sale de lo que cuesta prestar el servicio y de lo que el mercado paga, no de la
arquitectura. Llevan `precioPendiente: true` y `precioFacturable()` devuelve
`null` para ellos. La prueba no se conforma con comprobar que la puerta cierra:
recorre el árbol para verificar que **nadie lee el importe por su cuenta**.

### NELVYON AI infiere de verdad, en local

Todos los informes anteriores decían «inferencia `UNAVAILABLE`», y era correcto:
nadie lo había comprobado. Pero **«nadie lo ha comprobado» y «no se puede» se
escriben igual y significan cosas distintas**, y esa confusión llevaba meses.

Medido de punta a punta por el adaptador, contra un Ollama local:

| | |
|---|---|
| Procedencia | `REAL_LLM_SUCCESS` — no `MOCK`, no `FALLBACK`, no `RULE_ENGINE` |
| Modelo | `llama3.1:8b-instruct-q4_K_M` |
| Tokens | 81 entrada / 184 salida |
| Coste | **0 €** |

Los tokens importan tanto como la procedencia: producción tiene 14.178 eventos
que dicen `ok: true` con `tok_in: 1`, que es la firma de un doble de pruebas.

**Y lo que esto NO significa.** No significa que NELVYON AI esté servida. El
estado se declara ahora en dos líneas separadas —`LOCAL_REAL_MEASURED` para el
camino real, `UNAVAILABLE` para producción— porque juntarlas en una etiqueta
obligaba a elegir entre exagerar y quedarse corto.

### Lo que sólo se ve cuando escribe un modelo de verdad

Ejecutados servicios completos contra el modelo local y pasado lo que producen
por su propia rúbrica. Ahí apareció lo que ninguna prueba con doble determinista
podía enseñar:

**1. El motor de calidad NO es un espejo de su propio doble.** En el primer
servicio encontró tres bloqueantes en prosa que no había visto nunca, incluida
la que la rúbrica `geo` se escribió para impedir: *«garantizar que el asistente
te cite»*. Un hallazgo aquí no es un fallo de la prueba, es información; lo
sospechoso sería que no encontrara ninguno nunca.

**2. Cien puntos sin haber mirado nada.** Un informe de mercado salió **`PASS`
con 100 puntos y sus cinco comprobaciones de dominio sin ejecutar**: el texto no
traía los campos que miran, así que lo único revisado fue la higiene común —la
misma que se le aplica a una fotografía—. La rama de alto riesgo ya fallaba
cerrada; el agujero estaba en la de riesgo bajo, que es la que usa todo lo que
no toca dinero. Ahora, si la disciplina tiene rúbrica y **ninguna** de sus
comprobaciones pudo ejecutarse, el veredicto es `REVIEW_REQUIRED`.

Con el caso límite protegido, que importa tanto como la regla: una disciplina
que **todavía no tiene** rúbrica propia no va a revisión por eso. «No hay nada
que mirar» y «no se pudo mirar» son cosas distintas, y confundirlas llenaría la
cola de revisión de ruido — una cola con ruido deja de mirarse.

**3. El entregable no sabía leer lo que escribe un modelo.** El compositor exigía
que la respuesta *empezara* por `{`. Un modelo real casi nunca lo hace: antepone
una frase de cortesía y envuelve el JSON en un bloque de código. Con eso, el
documento del cliente le enseñaba las llaves y las comillas en crudo.

**4. La cadena larga agota el plazo del modelo local.** El quinto paso recibía
íntegros los cuatro anteriores. Cuando revienta lo hace bien —lanza, no cae a un
proveedor de pago, no finge éxito— pero no terminar tampoco sirve. Ahora QA
recibe resúmenes, como ya hacía el paso de informe.

### El inventario de conectores dice lo que hay, no lo que declara su ficha

Los cuatro estados del registro mezclan cosas que hay que separar para decidir:
«live» significa que el adaptador está escrito, no que haya credenciales ni que
se haya hablado nunca con el proveedor. Quien lee «live» entiende «funciona».

Contrastados los 16 contra el árbol, **sin una sola credencial puesta**:

| Estado real | Cuántos |
|---|---|
| `CREDENTIAL_REQUIRED` — lo desbloquea quien tenga las cuentas | 9 |
| `PROVIDER_REQUIRED` — hace falta un contrato o una aprobación | 7 |

Y **cinco conectores marcados `stub` tienen el adaptador escrito entero y llaman
a la API real de su proveedor.** Un `stub` que en realidad significa «falta una
clave» hace concluir «esto no está hecho» de algo que sí lo está.

`verificadoConElProveedor: false` en los dieciséis, declarado **aparte** del
estado: si fuera un estado más, un conector «disponible» taparía que nadie lo ha
visto funcionar.

### La cadena de migraciones aplica entera desde cero

Base nueva, 488 migraciones, **488 aplicadas, 0 fallos**, incluidas las 578–589
que en producción siguen pendientes de autorización. La base de pruebas que
había estaba a medias desde una aplicación parcial de la 507 y hacía fallar 110
pruebas por columnas que no existían: no era el repositorio, era esa base.

### Dos defectos que no fallaban, y por eso llevaban meses

**Una dimensión con eñe.** `que_reseñas_son_ciertas` llevaba una eñe en el
identificador, y los lectores derivados buscan `[a-z0-9_]+`: la matriz contaba 92
de 93 y la revisión 93. Dos documentos del mismo árbol discrepando en uno, que es
una diferencia que no llama la atención de nadie.

**Una prueba que medía la tarjeta gráfica.** `routerRagSchemaScope` llevaba en
verde por el hardware, no por el código: al cargar un modelo en la GPU empezó a
fallar porque el router se negaba por falta de VRAM antes de llegar al guard que
la prueba vigila. En una máquina sin `nvidia-smi` pasaba siempre.

### Un índice que dice de qué documento fiarse

`docs/` tiene 179 ficheros y no había forma de saber cuáles describen el sistema
de hoy. Clasificados por lo que se puede comprobar: **7 generados** (los únicos
que no pueden quedarse obsoletos), **46 vigentes**, **121 históricos** — y **5
que declaran ser automáticos sin que se encuentre quién los escribe**, que es
peor que estar viejo y parecerlo.

No se borra ninguno: un documento viejo guarda el porqué de decisiones que siguen
en pie.

---

## Fase de profundidad de servicios (29-08-2026)

Esta fase cambió el foco: de demostrar que la **maquinaria** funciona a
demostrar que **lo que hace** vale.

### Lo que se midió y salió mal

| Qué | Antes | Después |
|---|---|---|
| Contexto del cliente que llega al agente | **0,40** | **1,00** |
| Servicios que personalizan de verdad | 2 de 25 | **29 de 29** |
| Servicios con intake propio de su disciplina | 6 de 25 | **29 de 29** |
| Comprobaciones de calidad | 21 | **70 en 18 disciplinas** |
| Servicios que entregan un fichero al cliente | 8 de 25 | **29 de 29** |

El peor hallazgo no fue el presupuesto: fueron **las restricciones legales**. Una
tienda de suplementos que no puede prometer resultados y una clínica dental
sujeta a publicidad sanitaria recibían un plan que ignoraba las dos cosas. Eso no
es un plan flojo: es una sanción con el nombre de NELVYON.

### Los cinco defectos de esquema, arreglados en la causa raíz

`chatbot_conversations` no era «faltan columnas»: eran **dos subsistemas
distintos compartiendo una tabla**, y la clave ajena hacía imposible arreglarlo
añadiendo columnas.

**Dos de los cinco se arreglaron SIN tocar el esquema** — el dato ya existía con
otro nombre. Añadir la columna habría dejado dos fuentes para lo mismo.

### Lo que la pasada adversarial encontró

Diez intentos de colar trabajo mediocre. Ocho rebotaron. Uno encontró un agujero
real: **la forma de aprobar un plan que no cabe en el presupuesto era no decir
cuánto cuesta**. Las comprobaciones que comparan dos números se esquivan no
declarando uno.

Cinco intentos pasan y quedan escritos como límites, no como cobertura.

---

## Las tres comprobaciones que cierran la sesión

| Comprobación | Resultado |
|---|---|
| Suite completa contra PostgreSQL real | **8.533 pruebas pasan, 0 fallan** (480 saltadas) |
| Cadena de migraciones sobre una base recién creada | **488 de 488, 0 fallos** |
| `next build` de producción | **OK** |
| 153 rutas sobre el build real, con un inquilino nuevo | **0 respuestas 5xx** |
| Inferencia real por el adaptador, contra modelo local | **`REAL_LLM_SUCCESS`, 81/184 tokens, 0 €** |

Las **480 saltadas** no son un aprobado silencioso: son las que exigen una
variable de entorno que aquí no está puesta, y cada una lo dice al saltarse. La
más importante es la de calidad con modelo real, que se enciende a mano porque
tarda veinticinco minutos — una suite que tarda media hora deja de ejecutarse, y
una prueba que no se ejecuta no protege nada.

La tercera llevaba **sin poder ejecutarse**: arrancaba un servidor de producción
sin `JWT_SECRET`, el alta devolvía 500 y el script abortaba con «falta algo para
poder medir». Un guardián que aborta siempre no protege nada, sólo lo parece.

---

## Lo que se ha construido, y cómo se sabe que funciona

Cada línea de la tabla del ledger (`docs/LEDGER_CONSTRUCCION.md`) tiene su SHA,
sus pruebas y sus mutaciones. Lo resumido:

### Siete puertas antes de que salga nada hacia fuera

Ninguna acción con consecuencias externas se ejecuta sin cruzar, por orden:
contrato del agente → aprobación humana → **coherencia de la declaración** →
**calidad** → ejecutor → gasto e idempotencia → cierre del rastro.

Las dos en negrita son nuevas. La de coherencia **la encontró la pasada
adversarial**, no una prueba normal: las consecuencias las declara quien llama,
así que una acción con `importeCents: 5000` y `consecuencias: []` esquivaba a la
vez la puerta de calidad y la de gasto. Dos puertas con un array vacío.

### Nadie evalúa su propio trabajo

El motor de calidad lanza si el evaluador coincide con el autor, y el puente
convierte eso en denegación. Es estructural, no una convención: sin motor
inyectado o sin pieza adjunta, lo que sale hacia fuera **se deniega**. Un
revisor que se esquiva no adjuntando nada no es un revisor.

### Una evaluación de reglas nunca se presenta como de modelo

`REAL` exige proveedor configurado, no una variable de entorno. `resolveLlmMode()`
devuelve `real` con sólo poner `AUTONOMOUS_LLM_MODE`, y fiarse de eso sellaría
aprobaciones que nadie ha dado — el mismo fallo que produjo 14.178 eventos de
producción diciendo `ok: true` sobre trabajo que ninguna IA hizo.

### Los 1.605 agentes sectoriales son distintos de verdad

Ejecutados los 1.605 con la misma entrada y un modelo que sólo escucha:
**1.518 medidos, 1.518 instrucciones distintas, cero parejas equivalentes.**

La sospecha razonable de que aquí hay «un agente copiado 1.605 veces» es
**falsa**, y ahora está medida en vez de opinada. Consecuencia práctica: no hay
nada que consolidar, y fusionarlos perdería 1.518 matices sectoriales.

### Las 55 sentencias de la migración 507, clasificadas **y arregladas**

25 `NEEDS_REPAIR`, 19 `EXPECTED_IDEMPOTENT`, 5 `LEGACY_COMPATIBILITY`, 1 sin
clasificar. Los **cinco defectos confirmados están arreglados** (migraciones 587
y 588, más tres correcciones de código) y verificados en
`backend/db/verificacion_manual_507.json`.

El peor no era «faltan columnas»: eran **dos subsistemas de chatbot compartiendo
una tabla**, con formas incompatibles y una clave ajena que hacía imposible
arreglarlo añadiendo columnas.

**Dos de los cinco se arreglaron sin tocar el esquema.** El dato ya existía con
otro nombre; añadir la columna habría dejado dos fuentes para lo mismo.

El clasificador sigue señalando esos pares porque el arreglo consistió
precisamente en dejar de usar esa columna —ahora el código dice
`(booking_date + booking_time) AS start_at`—. Por eso su salida se llama
**candidatos a mirar**: el heurístico señala, la verificación decide.

### El índice que RLS ya exigía

34 tablas con Row Level Security por inquilino y **ningún índice** que empezara
por `workspace_id`. No es rendimiento, es estructura: si la política obliga a
filtrar por inquilino en toda consulta, sin ese índice cada lectura recorre las
filas de todos los clientes para responder por uno.

Medido sobre 200.000 filas y 500 inquilinos: **9,88 ms → 0,14 ms, 73 veces**.

### La máquina comercial, con el envío imposible por diseño

Cuatro puertas —base legal, baja, no insistir, motivo propio de esa empresa— y
`enviar()` que **lanza siempre**. No es un hueco pendiente de rellenar: es la
puerta cerrada, para que un viernes por la tarde nadie la llame sin querer.

Y la baja es de NELVYON entera: `comercial_bajas` no tiene `workspace_id` ni
RLS, y es la única tabla del sistema que se salta el aislamiento a propósito.
Aislarla por inquilino convertiría cada workspace nuevo en una segunda
oportunidad para molestar a quien ya dijo que no.

---

## Lo que NO se puede afirmar

Cuatro de cinco preguntas de resultado están en `NO_MEDIDO`, y la quinta en
`PARCIAL`. El detalle está en `docs/LO_QUE_SE_PUEDE_AFIRMAR.md`, generado y no
escrito.

**Tener una capacidad no es producir un resultado.** Producción tiene 14.178
eventos de agente que decían `ok: true` sobre trabajo que ninguna IA había
hecho: la capacidad de registrar existía y funcionaba, y el resultado era cero.

No hay en ningún documento de este repositorio una comparación con un
competidor por su nombre, ni una afirmación de superioridad.

---

## Lo que hace falta de Daniel

Cada uno de estos bloquea una parte concreta y ninguno lo puede desbloquear
Claude:

| Qué | Por qué es suyo |
|---|---|
| **Donde vive el modelo de IA en produccion** | decision empresarial con coste recurrente. El camino real esta medido en local (`LOCAL_REAL_MEASURED`, 0 EUR); lo que falta es donde se sirve |
| **Aplicar las migraciones 578–589** | son migraciones productivas; ADR-064 exige aprobación auditable y la exige con razón |
| **Desplegar** | acción productiva |
| **Los 12 trabajos parados en producción** | ejecutarlos gasta dinero de clientes reales |
| **Los cuatro precios sin decidir** | `crm_captacion_premium`, `analitica_atribucion_premium`, `inteligencia_mercado_premium` y `geo_ai_search_premium` estan construidos y no son facturables. Un precio sale de lo que cuesta prestarlos y de lo que el mercado paga |
| **Las credenciales de los 9 conectores en `CREDENTIAL_REQUIRED`** | el codigo esta escrito y llama a la API real; lo que falta son cuentas |
| **Las aprobaciones de los 7 en `PROVIDER_REQUIRED`** | token de desarrollador de Google Ads, salida del sandbox de SES, plantillas de WhatsApp: los aprueba el proveedor, no el codigo |

---

## Cómo reproducir todo esto

```bash
# la base de pruebas
docker start nelvyon-test-postgres

# la suite entera
cd apps/web && NELVYON_COLA_CERT_DSN=postgres://... ./node_modules/.bin/vitest run

# que compila y es desplegable
node scripts/puerta-de-build.mjs

# que ninguna ruta revienta sobre el build real
DATABASE_URL=postgres://... node scripts/humo-sobre-build-de-produccion.mjs

# los informes, todos generados y ninguno escrito a mano
node scripts/clasificar-las-55-omisiones-de-la-507.mjs
node scripts/donde-duele-de-verdad.mjs
node scripts/revision-de-servicios.mjs
node scripts/lo-que-se-puede-afirmar.mjs
node scripts/contrato-de-servicio.mjs
node scripts/matriz-de-servicios.mjs
node scripts/que-es-nelvyon-ai.mjs
node scripts/que-documento-me-creo.mjs

# la inferencia local y la calidad de lo que escribe un modelo de verdad
cd apps/web && ./node_modules/.bin/vitest run   ../../backend/autonomous/llm/__tests__/laInferenciaLocalEsRealOSeDiceQueNo.pg.test.ts
cd apps/web && NELVYON_MODELO_REAL=1 ./node_modules/.bin/vitest run   ../../backend/os-agents/__tests__/loQueSaleConUnModeloReal.pg.test.ts
DATABASE_URL=postgres://... node scripts/cuadro-de-mando.mjs
```

Todos los informes se regeneran. Ninguno se edita: un documento que se escribe a
mano se convierte en marketing en tres revisiones.
