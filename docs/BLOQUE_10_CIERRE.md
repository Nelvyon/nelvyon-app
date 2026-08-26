# BLOQUE 10 — CERTIFICACIÓN INTEGRAL FINAL

Este bloque no inventa funcionalidad. Comprueba que **lo certificado en los nueve
anteriores sigue siendo cierto junto**, que un cliente puede recorrer el producto
de punta a punta, y que quien vaya a desplegar sabe exactamente qué le falta.

---

## 1. Lo heredado sigue en pie

Los inventarios derivados se recalculan desde el árbol en cada ejecución. No son
listas guardadas: si el árbol cambia, cambian.

| Inventario | Bloque | Resultado |
|---|---|---|
| Superficies atacables | 7 | **925** · 12 categorías · **0 huérfanas** |
| Puntos de escalado | 8 | **1 367** · 7 clases · **0 huérfanos** |
| Capacidades de operación | 9 | **655** · 8 familias · **0 runbooks rotos** |

Y una comprobación que este bloque añade y que no existía: **ningún arreglo
posterior invalidó evidencia anterior**. La forma de saberlo no fue mirar los
documentos, sino correr el árbol entero — y ahí apareció una regresión real que
la puerta del Bloque 7 no había visto (§4).

---

## 2. El recorrido completo, con dos clientes a la vez

Un E2E que solo comprueba el camino feliz de **un** cliente no vale para un SaaS.
Lo que hay que demostrar es que **dos clientes recorren el producto a la vez y no
se ven**.

Perfiles: el autónomo (12 contactos) y la agencia (300). No son personajes
decorativos — cambian el volumen y hacen que el recorrido atraviese de verdad las
cotas que el Bloque 8 puso, en vez de quedarse siempre por debajo.

| Paso | Qué se comprueba desde los **dos** lados |
|---|---|
| 1 · alta | dos altas no comparten inquilino |
| 2 · autenticación | cada token trae **su** usuario |
| 3-4 · configuración y operación | ningún perfil ve un contacto del otro |
| 5 · automatización | un perfil no puede leer la secuencia del otro |
| 6-7 · resultado y reporting | la suma de las partes **no** es el total de nadie |
| 8 · permisos | una acción inexistente se **deniega**; pedir el inquilino ajeno por cabecera se rechaza |
| 9 · recuperación | repetir una inscripción **no** duplica |
| 10 · cierre | un token caducado deja de servir |

**14/14** contra PostgreSQL real.

> Dos casos fallaron al principio porque el producto exige que una secuencia
> tenga **pasos** antes de admitir inscripciones. La regla es del producto y hace
> bien: inscribir a alguien en una automatización vacía es prometerle algo que no
> va a pasar. El recorrido la sigue en vez de saltársela — que es la diferencia
> entre un E2E y una demostración.

---

## 3. La puerta de despliegue: ejecutable, no prosa

Una checklist en prosa se lee, se asiente y se despliega igual.
`scripts/puerta-de-despliegue.mjs` **se ejecuta** y separa cuatro cosas que se
confunden constantemente:

| Clase | Qué significa | Cómo se arregla |
|---|---|---|
| `AUTOMATIC_PASS` (15) | comprobado aquí, ahora, contra el árbol | si falla, una defensa ha desaparecido |
| `REQUIRED_CONFIGURATION` (4) | falta poner algo en el entorno | configurando |
| `BLOCKED_HUMAN_DECISION` (8) | alguien tiene que decidir | decidiendo |
| `EXTERNAL_VERIFICATION_REQUIRED` (6) | solo se comprueba fuera de aquí | ejecutándolo allí |

Las cuatro se arreglan de forma distinta. Meterlas en la misma lista deja como
única acción posible «revisar todo», que es lo mismo que no revisar nada.

Los bloqueos **no se escriben a mano**: salen de `decisiones_y_bloqueos.json`,
que es la única fuente. Añadir uno allí lo hace aparecer aquí solo.

**Y muerde.** Comprobado en las tres direcciones:

- sin configuración → salida **1**
- con configuración → salida **0**
- borrando `resolverClienteDeWs` del árbol → salida **2**, nombrando la defensa
  que falta y por qué importaba

---

## 4. La regresión que encontró correr el árbol entero

`estadoDeOauthYSalida.test.ts` —una suite del **Bloque 4**— llamaba a
`createOAuthState`, que desapareció en el Bloque 7 al atar el flujo OAuth al
navegador. Se eliminó a propósito, para que ninguna ruta pudiera quedarse en la
versión vulnerable. Y rompió la suite anterior.

Se cambió **la llamada** y nada más: todo lo que la suite afirma sigue
comprobándose igual. La propiedad del Bloque 4 no se relajó — sobrevivió a un
cambio de API que la reforzó.

**Que apareciera en el Bloque 8 y no en la puerta del 7 fue un fallo de aquella
puerta**, que se corrió sobre las zonas tocadas y no sobre el árbol entero. La
puerta de este bloque corre el árbol completo, y por eso este bloque existe.

---

## 5. Los saltos: de 96 a 10

Un salto **no es un aprobado**. Al empezar la noche había 96 pruebas saltándose en
silencio por variables de entorno que nadie había escrito en ningún sitio.

| Se desbloqueó | Pruebas | Qué faltaba |
|---|---:|---|
| RLS efectiva con `nelvyon_web_app` | 30 | la contraseña del rol local |
| Memoria, RAG, GDPR, idempotencia, tareas | 54 | `NELVYON_B3_DSN` y `NELVYON_B4_DSN` |
| `migration523` | 18 | una base desechable con las migraciones aplicadas |
| `rlsIsolation` | 16 | una base de local-ai **y la cadena de migraciones** |

Ese último tenía un detalle que costó encontrar: el esquema de local-ai se
aprovisiona **fuera de la cadena de migraciones**, así que `local_ai_audit`,
`local_ai_config` y `local_ai_ingest_jobs` se quedaban **sin RLS** — porque quien
se la activa es la migración 567, que nunca corría contra esa base. Aplicando las
dos cosas, la suite pasa 16/16.

Todo está en `docs/COMO_EJECUTAR_LAS_PUERTAS.md`, con los comandos exactos.

Lo que **sigue** saltándose está clasificado, no ignorado:

- `rls.test.ts` (2) — **EXTERNAL_VERIFICATION_REQUIRED**: exigen Supabase en vivo.
- `perderPostgresYVolver` (3) — corre **a solas**, con permiso explícito, porque
  reinicia el contenedor.
- 5 sueltas de suites «live» que apuntan a entornos externos.

---

## 6. Lo que este bloque NO hizo

- **No tocó producción.** Ni una petición.
- **No gastó un euro.** Ninguna llamada a un proveedor de pago.
- **No resolvió ninguna decisión humana.** Las ocho siguen abiertas, y una es
  nueva de esta noche.
- **No declaró nada listo sin condiciones.** El estado real está en
  `docs/ESTADO_DE_LANZAMIENTO.md`, con sus cuatro listas separadas.

---

## 7. Los cuatro fallos que encontró correr Python entero

La suite Python completa tarda **46 minutos** y son 3 735 pruebas. Se corrió
entera, no por muestreo, y encontró **cuatro fallos**. Los cuatro eran guardianes
de bloques anteriores reaccionando a trabajo de esta noche — exactamente para lo
que existen.

### 7.1 · Un retroceso literal que cegaba una regla mía

`test_lo_que_entra_de_fuera_no_construye_codigo.py` tenía un byte **0x08**
(retroceso) donde debía ir `\b`. Mi patrón de «constante con cadena de métodos»
terminaba en un carácter de control, así que **no casaba nunca**.

Es exactamente la clase de defecto contra la que llevo tres bloques avisando: una
regla cegada que sigue en verde. Y lo cometi DOS VECES: al escribir este mismo
parrafo volvi a poner un retroceso en vez de la secuencia de escape, y tuve que
corregirlo. Por eso el guardian existe y por eso no basta con tener cuidado. La cazó un guardián del Bloque 5 escrito para
esto (`test_guardia_de_roles.py`), no yo.

Y al corregirlo, la regla empezó a funcionar — con lo que una de mis
justificaciones escritas a mano pasó a sobrar, y el guardián de excusas muertas
también lo dijo. Las dos direcciones.

### 7.2 · Captura de entorno al cargar el fichero

`entrarPorLaPuertaDeCron.test.ts` capturaba `process.env.CRON_SECRET` fuera de un
hook. Vitest reparte varios ficheros por *worker*: lo que se congela en la carga
es lo que dejó **otro fichero del mismo worker**, no lo que había antes de esta
suite. Movido dentro de `beforeEach`.

### 7.3 · Un falso positivo del guardián de rutas

Tomaba mi fichero `pages/api/os/__tests__/…test.ts` por una ruta de API. Next
**no enruta ningún segmento que empiece por `_`**, así que `__tests__` no es una
superficie — es la misma regla que `superficies_atacables.py` ya usaba.

No es un ablande: es un fichero que nadie puede llamar por HTTP. Antes de esta
noche no había ningún `__tests__` bajo `pages/api`, así que el hueco del guardián
nunca se había visto.

### 7.4 · Un trinquete que exigía apretarse

`test_rls_trinquete_de_cobertura.py` falló con: *«la deuda bajó a 2: actualiza
`DEUDA_MAXIMA` para que el trinquete siga apretado»*.

Al aplicar las migraciones pendientes a la base de certificación, dos de las
cuatro tablas sin RLS pasaron a tenerla. El trinquete **exige registrar las
bajadas** — si no, la holgura se acumula y deja de ser un trinquete. Apretado de
4 a 2.

Las dos que quedan son `client_memory` y `saas_tenants`. La segunda no baja sola,
y su motivo está medido: la migración 567 y su guarda de tabla vacía (§2 del
Bloque 9).
