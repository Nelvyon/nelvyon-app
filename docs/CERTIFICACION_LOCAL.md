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

## Fase de profundidad de servicios (29-08-2026)

Esta fase cambió el foco: de demostrar que la **maquinaria** funciona a
demostrar que **lo que hace** vale.

### Lo que se midió y salió mal

| Qué | Antes | Después |
|---|---|---|
| Contexto del cliente que llega al agente | **0,40** | **1,00** |
| Servicios que personalizan de verdad | 2 de 25 | **25 de 25** |
| Servicios con intake propio de su disciplina | 6 de 25 | **25 de 25** |
| Comprobaciones de calidad | 21 | **60 en 16 disciplinas** |
| Servicios que entregan un fichero al cliente | 8 de 25 | **25 de 25** |

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
| Suite completa contra PostgreSQL real | **8.305 pruebas pasan, 0 fallan** |
| `next build` de producción | **OK** |
| 153 rutas sobre el build real, con un inquilino nuevo | **0 respuestas 5xx** |

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
| **Dónde vive el modelo de IA** | decisión empresarial con coste recurrente. Sin ella, todo lo que exige IA real sigue en `UNAVAILABLE`, que es lo correcto pero no es lo útil |
| **Aplicar las migraciones 578–589** | son migraciones productivas; ADR-064 exige aprobación auditable y la exige con razón |
| **Desplegar** | acción productiva |
| **Los 12 trabajos parados en producción** | ejecutarlos gasta dinero de clientes reales |
| **Los tres servicios sin departamento** | `influencer_marketing_premium`, `canales_comunicaciones_premium` y `bots_premium` se prometen sin nadie que los haga. O se les asigna departamento o se dejan de ofrecer: las dos son decisiones de negocio |
| **Los cinco defectos de esquema confirmados** | arreglarlos toca tablas de producción |

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
DATABASE_URL=postgres://... node scripts/cuadro-de-mando.mjs
```

Todos los informes se regeneran. Ninguno se edita: un documento que se escribe a
mano se convierte en marketing en tres revisiones.
