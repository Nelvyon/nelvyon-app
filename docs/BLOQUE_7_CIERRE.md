# BLOQUE 7 — SEGURIDAD OFENSIVA Y ABUSO DE EXTREMO A EXTREMO

**Qué se pedía:** no una revisión pasiva ni una lista marcada en verde, sino
intentar romper las propiedades de seguridad desde interfaces y fronteras reales
y demostrar experimentalmente qué ocurre.

**Qué salió:** ocho defectos reales encontrados y corregidos, dos hallazgos que
no se han corregido porque son decisiones humanas, y una corrección de
denominador que invalidaba el punto de partida.

Todo el trabajo se hizo en entorno controlado: coste externo 0 €, sin tocar
producción, sin pagos, correos, webhooks externos ni OAuth reales, y sin lanzar
una sola petición contra infraestructura de terceros. Las firmas de AWS, Slack,
Stripe y los proveedores OAuth se **construyen** con claves generadas en el
proceso, porque lo que se pone a prueba es la propiedad, no la clave.

---

## 1. Lo primero: el denominador estaba mal por un 43 %

El inventario arrancó contando **531 superficies atacables** con cero huérfanas.
Parecía cerrado. No lo estaba: solo miraba `apps/web/src/app/api/**/route.ts`, el
enrutador nuevo de Next. Este árbol tiene **también** el enrutador de páginas, y
bajo `apps/web/src/pages/api/` hay **396 rutas más** — entre ellas cuatro de
`admin/analytics` que leen la cookie de sesión a mano, sesenta y seis de
integraciones con terceros y doscientos treinta y tres agentes.

El total real es **925 superficies**.

Cero huérfanas sobre un denominador al que le falta el 43 % del árbol no es un
verde: es una medida de otra cosa. Y no hizo falta reducir el inventario a
propósito para llegar ahí — bastó con no mirar donde también había.

Se descubrió persiguiendo un tercer sistema de claves de API que no aparecía por
ningún lado del inventario. Es la clase de hallazgo que solo aparece si uno tira
del hilo en vez de dar por bueno el número que ya tenía.

**Ninguno de los defectos de abajo se descubrió mirando la lista.** Se
descubrieron leyendo el código de frontera en frontera. Pero el inventario
corregido es lo que permite decir *cuánto* se ha mirado, y sin él la respuesta
habría sido «el 57 % creyendo que era el 100 %».

---

## 2. Los ocho defectos corregidos

### 2.1 GRAVE · El canal en vivo de cualquier inquilino, para cualquiera

`pages/api/os/ws` levanta el WebSocket del panel de ejecución. La subida de
conexión cogía `clientId` de la barra de direcciones y registraba el socket. **Sin
cookie, sin token, sin comprobar nada.** Y `clientId` **es el identificador del
inquilino** — lo pasa el propio frontend:

```js
wss://app.nelvyon.com/api/os/ws?clientId=${tenantId}
```

Dos consecuencias, y la segunda es peor:

1. Quien conociera el id de un inquilino recibía todos sus eventos de ejecución.
2. `registerClient` **cierra la conexión anterior** del mismo `clientId`. El
   atacante no solo escuchaba: echaba a la víctima de su propio canal.

Todo eso sin cuenta en NELVYON, con una línea de JavaScript.

**Corregido** atando la conexión a la sesión: se lee la cookie por su nombre
exacto, se verifica el token y se exige que el canal pedido sea el del inquilino
de la sesión. El WebSocket es del mismo origen, así que el navegador manda la
cookie aunque sea `sameSite: "strict"`.

Para poder certificarlo hubo que sacar la decisión del oyente de `upgrade` a una
función propia: **una defensa que no se puede llamar desde una prueba es una
defensa que no se puede certificar.**

### 2.2 GRAVE · Escritura entre inquilinos desde una cuenta de AWS gratuita

`/api/webhooks/ses` verificaba la firma SNS con esmero —incluida la URL del
certificado, anclada, que es justo la defensa que la mayoría se deja— y no
comparaba el `TopicArn` con nada.

**AWS firma para todo el mundo.** Cualquiera crea un topic en su cuenta, lo
apunta a este endpoint, y sus mensajes llegan con firma auténtica y certificado
servido por AWS de verdad. Y el manejador **auto-confirmaba toda suscripción**,
así que el atacante enganchaba su topic él solo.

Con eso, `extractIds` saca el `tenantId` de las cabeceras del correo —del
atacante— y lo mete en `UPDATE saas_campania_recipients ... WHERE tenant_id = $1`.
Un anónimo marcaba como rebotados los destinatarios de las campañas de cualquier
inquilino.

**Corregido** con lista de topics permitidos (`SES_SNS_TOPIC_ARN`).

> **REQUISITO DE DESPLIEGUE:** `SES_SNS_TOPIC_ARN` debe configurarse antes del
> siguiente despliegue. Sin ella la ruta responde **503 en producción** —cierre
> en falso deliberado, mismo idioma que `META_WA_APP_SECRET` en la ruta hermana
> de WhatsApp—. Fuera de producción no se exige, para no romper las pruebas.

### 2.3 GRAVE · Colgar la cuenta de Google Ads de otro en tu propia cuenta

Los cinco proveedores OAuth (Google, Meta, LinkedIn, TikTok, Snapchat) firmaban
el `state` con HMAC-SHA256, tiempo constante, caducidad de diez minutos y el
`userId` dentro. Impecable — y respondía a la pregunta equivocada.

**El `state` firmado prueba quién EMPEZÓ el flujo. No prueba quién lo está
TERMINANDO**, que es la pregunta que decide a nombre de quién se guardan los
tokens del proveedor.

Ataque de manual: el atacante arranca el flujo en su cuenta, obtiene la URL de
consentimiento con su `state` legítimo, se la manda a la víctima, la víctima
aprueba en su Google, y la cuenta de Google Ads de la víctima queda conectada
dentro de la cuenta NELVYON del atacante — que puede gastar su presupuesto
publicitario.

**Corregido** atando el flujo al navegador con un nonce de 32 bytes: el hash
dentro del `state`, el valor en una cookie `httpOnly` de diez minutos acotada a
`/api/oauth`.

**Lo que NO se hizo y por qué.** La corrección evidente sería exigir sesión en el
callback y comparar con `parsed.userId`. **No sirve:** la cookie de sesión de
NELVYON es `sameSite: "strict"` y no viaja en el redirect que llega desde el
proveedor, así que habría roto los cinco flujos legítimos. Se comprobó el
atributo de la cookie **antes** de elegir la corrección, no después.

### 2.4 GRAVE · Contenido ajeno pegado al prompt de sistema de los agentes

`buildAgentContext` montaba el `systemSuffix` de cada agente pegando —en texto
plano y al mismo nivel que las reglas de NELVYON— tres fuentes que no son de
NELVYON: memoria compartida, memoria del inquilino y trozos de RAG. Sin marca,
sin delimitador y sin neutralizar.

Había **una** barrera y estaba en el sitio equivocado: `assertSafeMemoryContent`,
una lista de frases **en español** aplicada al escribir. Dos problemas:

1. Una lista de bloqueo siempre está incompleta. Eso se asume, no se discute.
2. **No miraba `key`**, que llegaba del cuerpo de la petición sin filtro y **sin
   tope de longitud**, y se interpolaba cruda en el prompt. Un canal directo
   desde el cuerpo de una petición HTTP hasta el texto de sistema de un agente.

**Corregido de forma estructural, no por filtrado:** `comoDato()` colapsa todo
espacio en blanco y carácter de control, borra las marcas del propio dato y acota
la longitud; `bloqueDeDatos()` envuelve cada fuente entre marcas que el dato no
puede escribir y antepone que lo que sigue son datos, no instrucciones. El RAG se
envuelve **también** aunque hoy sea documentación propia: la frontera no la
decide la procedencia que uno cree que tiene un texto, sino quién lo ha escrito
en ese fichero.

### 2.5 · SSRF en la guarda canónica de salida

`assertSafeEgressUrl` es el punto único que decide a dónde puede NELVYON hacer
una petición cuando la dirección la elige un inquilino. Se le escapaban dos
cosas, **medidas y no supuestas**:

- **IPv6 con una IPv4 dentro.** Node normaliza `[::ffff:127.0.0.1]` a
  `[::ffff:7f00:1]`, y la comprobación solo miraba los prefijos `::1`, `::`,
  `fc`, `fd` y `fe80`. Ni `7f00:1` ni `a9fe:a9fe` empiezan por ninguno. Un
  inquilino podía configurar su webhook contra el loopback, contra
  `169.254.169.254` o contra la red privada, y NELVYON hacía el POST desde
  **dentro** de su infraestructura.
- **El punto final del DNS.** `localhost.` resuelve igual que `localhost` y no
  estaba en la lista.

**Corregido** extrayendo los últimos 32 bits de la IPv6 y pasándolos por la misma
regla de IPv4 (mapeada, compatible y NAT64) — una sola regla, no dos que
diverjan— y recortando el punto final.

Las formas decimal, hexadecimal, octal y corta de IPv4 **sí** estaban cubiertas,
pero por cobertura **prestada**: las normaliza el analizador de URL de Node antes
de que la guarda las vea. Se aseguran igualmente, para enterarnos si un día deja
de hacerlo.

### 2.6 · SSRF de segundo orden en dos URLs que venían firmadas

Dos rutas hacían una petición saliente a una URL que llegaba **dentro** del
mensaje:

- `/api/webhooks/ses` visitaba `SubscribeURL` tal cual — llegando a
  `169.254.169.254`— mientras su hermana `SigningCertURL` sí pasaba por un patrón
  anclado. El mismo sobre, dos URLs, una comprobada.
- `/api/webhooks/slack/interactions` hacía POST a `payload.response_url` sin
  mirar el destino.

Las dos exigen firma válida, así que son defensa en profundidad, no una puerta
abierta. Pero la firma dice que el mensaje no ha sido alterado en tránsito; no
dice que su contenido sea inofensivo. **Corregidas** anclando ambas.

### 2.7 · Asignación masiva de identidad, tres veces

El mismo defecto en tres sitios distintos: se comprueba con rigor el campo que
identifica al inquilino y se confía en el de al lado.

- `os/certificates/issue`: `tenantId` del cuerpo. Se podía **sellar un
  certificado de entrega a nombre de otro cliente**, y aparecía en su listado.
- `saas/shared-memory`: `userId` y `workspaceId` del cuerpo. `userId` es filtro
  de búsqueda, así que un miembro podía escribir memoria que aparece en la
  búsqueda de otro.
- `pages/api/os/ws`: `clientId` de la barra de direcciones (es el 2.1).

**Corregidos** los tres, y convertido en **regla estructural** que cubre los dos
enrutadores: ninguna ruta toma su identidad de la petición, con la única
excepción de un administrador de plataforma, que opera entre inquilinos por
diseño y tiene que decirlo en la propia ruta.

### 2.8 · Trozo de credencial viva en los registros

`keyId` se calculaba como `rawKey.slice(0, 20)` —`nlv_` más **dieciséis**
caracteres hexadecimales de la clave de API viva— y de ahí viajaba a `logUsage()`,
que lo **persiste**, y al rastro de auditoría de MCP.

El propio servicio ya guarda un `key_prefix` de **doce** caracteres para
enseñarlo en la interfaz: la casa había decidido cuánta clave es enseñable, y la
puerta cortaba ocho caracteres más por su cuenta. No es explotable —quedan 128
bits— pero es un trozo de credencial viva en registros que lee gente, y la
identidad estable de una clave ya existía: su `id`.

**Corregido:** `verifyKey` devuelve el `id` de la fila y la puerta lo usa.

---

## 3. Los dos hallazgos que NO se han corregido

Los dos son decisiones humanas. Se documentan con evidencia y se dejan para quien
tenga que tomarlas.

### 3.1 · Nadie puede ser administrador de plataforma

`isUserAdmin` consulta `os_users.role` y, si falla, `nelvyon_users.role`.
**Ninguna de las dos existe**: no hay migración en el árbol que cree la tabla ni
que añada la columna. Las dos consultas lanzan, los dos `catch` devuelven `false`,
y toda la superficie `admin/*` responde **403 a cualquiera**.

Cierra en falso, que es la dirección correcta. Por eso **no se ha «arreglado»
añadiendo un esquema**: decidir quién es administrador de plataforma es una
decisión de producto con consecuencias de acceso.

Sí se corrigió el **diagnóstico**: un esquema ausente se tragaba en un `catch` y
se informaba como «no es administrador», indistinguible de una denegación
legítima. Ahora se registra una vez, alto y claro, y se sigue denegando.

### 3.2 · El workspace derivado colisiona

`stableWorkspaceIdFromTenant` es un hash multiplicativo por 31 reducido a
`% 900_000`. Medido con UUID reales, media de veinte repeticiones:

| Inquilinos | Colisiones (media) |
|-----------:|-------------------:|
| 1 000 | 0,5 |
| 2 000 | 1,8 |
| 5 000 | 13,1 |

Una colisión significa **dos inquilinos mandando el mismo `X-Workspace-Id` aguas
arriba**, es decir compartiendo la unidad de aislamiento que usa FastAPI. No es un
ataque —los identificadores de inquilino son UUID que genera el servidor— es un
defecto que **llega solo con el crecimiento**.

No se corrige aquí porque cambiar la derivación cambia el identificador de todos
los inquilinos que ya lo usan, y dejaría huérfanos los datos guardados bajo el
viejo. Es una decisión con consecuencias de migración.

Se deja constatado además que el árbol no es coherente consigo mismo:
`saas/oauth/callback` hace `tenant?.workspaceId ?? derivado` —prefiere el
workspace **real**— mientras `saas/oauth/connect` y `dialer-advanced` derivan
siempre teniendo `ctx.tenant.workspaceId` disponible en el mismo contexto.

---

## 4. Las mutaciones, y las cuatro que enseñaron algo

**44 mutaciones aplicadas. 39 caen.** Las cinco que no cayeron son las que más
enseñaron, y por eso se registran aparte en vez de esconderse.

### M14 — la defensa que era una casualidad

Una mutación que admitía tokens de tres partes **no tumbaba** la prueba que decía
asegurar que un JWT no vale como token de capacidad. El JWT seguía cayendo, pero
por otro sitio: `JSON.parse` de una cadena con un punto dentro produce basura. El
comentario afirmaba una barrera —el recuento de partes— que no se estaba
midiendo.

Se afiló la prueba para exigir el **motivo** del rechazo. Entonces cayó. Es la
diferencia entre una defensa y una casualidad.

### M16 — dos mutaciones indistinguibles

Quitar la comprobación de contención de rutas de fichero no tumbaba nada, y
relajar la lista blanca daba **exactamente el mismo resultado** que quitar las
dos. Dos mutaciones distintas indistinguibles significa que una de las dos
defensas no se estaba midiendo.

Se añadió una prueba que mide la segunda capa por separado: *para cualquier
entrada, o revienta, o la ruta queda dentro del inquilino*. Ahora relajar la
lista blanca da 28 rojos y quitar las dos da 29. La capa es una capa.

M16 **sigue sin caer por sí sola, y eso es correcto**: con la lista blanca
estricta la contención es inalcanzable. No se ha forzado que caiga.

### M32 — el negativo verde que nunca llegaba a la defensa

Tres casos decían «una clave revocada no entra», «una desactivada no entra», «una
caducada no entra». Los tres verdes. Al mutar la consulta de producción
—quitarle `active=TRUE AND revoked_at IS NULL`— **los tres siguieron verdes**.

Interrogaban a mi doble. La decisión no vive en TypeScript: vive en un `WHERE` de
PostgreSQL. De ahí salió una suite contra PostgreSQL real, y sobre ella la misma
mutación tumba tres.

### M25, M26 — mutaciones que no cambian nada observable

Comparar el nonce de OAuth por prefijo mutaba una **rama muerta** (los dos lados
son hashes SHA-256 de longitud fija). Dejar de hashear el nonce no cambia ningún
comportamiento: el flujo sigue funcionando y el ataque sigue fallando, porque lo
que lo detiene es la ausencia de la **cookie**, no el formato. El hasheo es
defensa en profundidad contra la fuga del `state` por registros, y eso no se
puede afirmar desde fuera.

### Y una nota de método sobre M27 y M28

Las dos dieron verde en su primer intento y **no era que sobrevivieran**: la
sustitución nunca llegó a aplicarse. Se repitieron comprobando en el fichero que
el código había cambiado de verdad **antes** de leer el resultado.

Una mutación que no se aplica es indistinguible de una que sobrevive si solo se
mira el color.

---

## 5. Lo que se encontró bien hecho

No todo era defecto, y decirlo importa tanto como lo demás:

- **La puerta de sesión** aguanta catorce ataques: `alg:none`, confusión de
  algoritmo con HS512, firma con otra clave, firma recortada, payload manipulado
  para cambiar de inquilino y para ascender a `owner`, token caducado, siete
  formas de basura y cuatro nombres de cookie parecidos.
- **El aislamiento entre inquilinos** cierra en falso sin caída silenciosa, y el
  `tenantId` del propio token —aunque va firmado— **no manda** sobre la
  pertenencia real.
- **La puerta de cron** cierra cuando `CRON_SECRET` no está puesta o está en
  blanco, que es la forma fácil de dejar dieciséis trabajos al alcance de
  cualquiera.
- **Los enlaces de capacidad** (apertura, clic, baja, aprobación) llevan HMAC con
  comparación en tiempo constante, caducidad comprobada y el ámbito dentro de la
  firma.
- **La aprobación de un clic** reclama el token con un `UPDATE ... RETURNING`
  **antes** de cualquier efecto — se comprueba que es la primera consulta, no
  solo que exista.
- **No hay inyección SQL.** ~180 sitios de interpolación en 58 ficheros, todos
  aclarados por forma o leídos hasta su origen. Ninguno lleva datos de la
  petición al texto de la consulta.
- **No hay travesía de rutas.** Treinta payloads contra los dos segmentos, con
  lista blanca anclada **y** comprobación de contención.

---

## 6. Lo que queda dicho para la próxima vez

- Un guardián estructural que cubre **los dos enrutadores** y cuatro reglas: sin
  guarda sin justificar, cron sin secreto, admin sin comprobar, e identidad
  tomada de la petición.
- Un guardián de entradas hostiles sobre **todo el árbol**: SQL, salidas y
  lectura de ficheros, con suelo mínimo y control positivo y negativo en la regla
  que espera cero.
- Dos reglas que exigen que **los cinco** proveedores OAuth aten el flujo, no
  uno.

Y un residuo aceptado y escrito, no escondido: `assertSafeEgressUrl` mira la
**cadena** de la URL. Un dominio público cuyo registro A apunte a una IP interna
—o que cambie entre la comprobación y la conexión— no se detecta ahí. Cerrarlo
exige resolver y comprobar la IP al conectar, con reverificación tras cada
redirección. Es trabajo de la capa de red, y queda anotado en la propia suite
para que nadie la lea como si cubriera esa parte.
