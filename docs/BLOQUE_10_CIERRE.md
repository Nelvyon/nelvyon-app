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
