# BLOQUE 7 — ESTADO POR CATEGORÍA DE SUPERFICIE ATACABLE

Derivado de `backend/db/certificacion/superficies_atacables_estado.json`, que a
su vez se compara con el inventario derivado del árbol. Este fichero no se
escribe a mano: si el árbol cambia y una categoría se queda sin superficies, el
guardián lo dice.

**925 superficies · 12 categorías · 0 huérfanas**

| Categoría | Superficies | Estado |
|---|---:|---|
| `panel_inquilino` | 314 | FIXED_CERTIFIED |
| `agentes_y_mcp` | 308 | FIXED_CERTIFIED |
| `producto_autenticado` | 93 | CERTIFIED_CON_HALLAZGO |
| `oauth_y_terceros` | 84 | FIXED_CERTIFIED |
| `publico_sin_sesion` | 48 | CERTIFIED |
| `portal_y_partners` | 18 | CERTIFIED |
| `cron_y_tareas` | 16 | CERTIFIED |
| `webhooks_entrantes` | 12 | FIXED_CERTIFIED |
| `autenticacion` | 11 | FIXED_CERTIFIED |
| `administracion` | 9 | CERTIFIED_CON_HALLAZGO |
| `claves_y_scim` | 7 | FIXED_CERTIFIED |
| `frontera_de_confianza` | 5 | FIXED_CERTIFIED |

Leyenda:

- `FIXED_CERTIFIED` — se encontró al menos un defecto real, se corrigió en la
  raíz y la corrección está respaldada por mutaciones que caen.
- `CERTIFIED` — se atacó y no se encontró defecto; las mutaciones confirman que
  la suite habría detectado uno.
- `CERTIFIED_CON_HALLAZGO` — se atacó, no hay defecto explotable en la puerta,
  pero hay un hallazgo que **requiere una decisión humana** y no se ha resuelto
  unilateralmente. Están detallados en `BLOQUE_7_CIERRE.md` §3.

---

## `administracion` — 9 superficies · CERTIFIED_CON_HALLAZGO

> Antes de corregir el denominador: 5.
> La diferencia son rutas del enrutador de páginas que el inventario no miraba.

**Ataques.** 14 casos. Contra PostgreSQL real (2): se comprueba en el CATALOGO que el esquema que isUserAdmin consulta no existe, y que con ese esquema nadie es administrador sin que la ruta reviente —con un usuario real, uno inexistente, un identificador que no es UUID y la cadena vacia—. Sobre la comparacion (12): 'admin' concede, tres formas de mayusculas conceden, y siete roles parecidos (administrator, admin_readonly, superadmin, ' admin', 'admin ', 'adm', vacio) NO conceden, mas cinco tipos que no son texto.

**Evidencia.** serAdministradorLoDiceLaBase.pg.test.ts 6/6 contra PostgreSQL real. Regresion: las 29 pruebas de backend/admin siguen verdes. Ademas el guardian estructural comprueba que toda ruta admin/ lleva su comprobacion.

**Mutaciones.** Sin mutacion de la comprobacion porque hoy es inalcanzable —ver veredicto—. Lo que si se comprueba es que si el esquema APARECE, la prueba del catalogo se pone roja y obliga a revisar.

**Veredicto.** HALLAZGO QUE REQUIERE DECISION HUMANA, NO CORREGIDO AQUI. `isUserAdmin` consulta `os_users.role` y, si falla, `nelvyon_users.role`. NINGUNA DE LAS DOS EXISTE: no hay migracion en el arbol que cree la tabla os_users ni que anada una columna role a nelvyon_users. Las dos consultas lanzan, los dos catch devuelven false, y el resultado es que NADIE puede ser administrador de plataforma: toda la superficie admin/* y toda ruta con requirePlatformAdmin responde 403 a cualquiera. || Cierra en falso, que es la direccion correcta, y por eso NO se ha 'arreglado' anadiendo un esquema: decidir quien es administrador de plataforma es una decision de producto con consecuencias de acceso, y una auditoria no la toma. || SI se ha corregido el DIAGNOSTICO: un esquema ausente se tragaba en un catch y se informaba como 'no es administrador', indistinguible de una denegacion legitima —el mismo defecto que la puerta de sesion tenia con DATABASE_URL, que tambien lo destaparon los controles positivos—. Ahora se registra una vez, alto y claro, y se sigue denegando: hacer que un error de configuracion conceda acceso seria el defecto contrario y mucho peor. || Lo bueno que ya hacia y queda asegurado: el rol se lee de la BASE y no del token, asi que degradar a alguien surtiria efecto en la siguiente peticion en vez de esperar ocho horas a que caduque su sesion. Y la comparacion es igualdad exacta sin distinguir mayusculas: ningun rol parecido concede.

---

## `agentes_y_mcp` — 308 superficies · FIXED_CERTIFIED

> Antes de corregir el denominador: 73.
> La diferencia son rutas del enrutador de páginas que el inventario no miraba.

**Ataques.** 7 ataques contra la frontera de contexto de los agentes: una `key` con saltos de linea que abre una seccion falsa, un `content` que abre una linea con forma de instruccion de sistema, cinco variantes de salto (CR, CRLF, tabulador, separador de linea Unicode U+2028, U+2029), una `key` de cien mil caracteres que ahoga el contexto, una entrada que intenta CERRAR la marca de datos desde dentro, y dos controles (la memoria sigue llegando; el bloque va anunciado). Ademas se verifico que las 5 herramientas MCP pasan el tenantId del gate y ninguna lo toma del cuerpo.

**Evidencia.** elContenidoAjenoEsDatoNoOrden.test.ts 7/7. Regresion: 106 pruebas de private-ai, shared-memory y la ruta de memoria siguen verdes.

**Mutaciones.** 4 mutaciones fieles, las 4 caen. M27 el bloque deja de delimitarse y anunciarse -> 2 rojos; M28 comoDato deja de colapsar saltos de linea -> 3 rojos; M29 deja de acotar la longitud -> 1 rojo; M30 deja de borrar las marcas del propio dato -> 1 rojo. NOTA DE METODO: M27 y M28 dieron VERDE en su primer intento y NO era que sobrevivieran: la sustitucion nunca llego a aplicarse (el shell mangleaba las secuencias de escape). Se repitieron comprobando en el fichero que el codigo habia cambiado de verdad ANTES de leer el resultado. Una mutacion que no se aplica es indistinguible de una que sobrevive si solo se mira el color.

**Veredicto.** DEFECTO ENCONTRADO Y CORREGIDO. buildAgentContext montaba el prompt de sistema de cada agente pegando, en texto plano y al mismo nivel que las reglas de NELVYON, tres fuentes que NO son de NELVYON: memoria compartida, memoria del inquilino y trozos de RAG. Sin marca, sin delimitador y sin neutralizar. Habia UNA barrera y estaba en el sitio equivocado: assertSafeMemoryContent, una lista de frases EN ESPANOL aplicada al ESCRIBIR. Dos problemas: una lista de bloqueo siempre esta incompleta —eso se asume, no se discute— y sobre todo NO MIRABA `key`, que llegaba del cuerpo de la peticion sin filtro y SIN TOPE DE LONGITUD y se interpolaba cruda en el prompt. Era un canal directo desde el cuerpo de una peticion HTTP hasta el texto de sistema de un agente. || Corregido en la raiz y de forma estructural, no por filtrado: `comoDato()` colapsa todo espacio en blanco y caracter de control, borra las marcas del propio dato y acota la longitud; `bloqueDeDatos()` envuelve cada fuente ajena entre marcas que el dato no puede escribir y antepone que lo que sigue son DATOS, no instrucciones. El RAG se envuelve TAMBIEN aunque hoy sea documentacion propia: la frontera no la decide la procedencia que uno cree que tiene un texto, sino quien lo ha escrito en ese fichero. Ademas se acoto `key` a 200 caracteres en la ruta. || CORRECCION DE UNA PRUEBA MIA: la primera version exigia que la frase inyectada DESAPARECIERA del texto. Eso no es la propiedad, es filtrado de contenido — justo lo que se argumenta que no funciona. Se reescribio para medir lo estructural: la frase puede aparecer, pero no fuera del bloque de datos ni empezando una linea.

---

## `autenticacion` — 11 superficies · FIXED_CERTIFIED

**Ataques.** 14 ataques ejecutados contra authenticate() y extractToken().

**Evidencia.** 11 superficies. ataquesContraLaPuertaDeSesion.test.ts 14/14: alg none, confusion de algoritmo HS512, firma con otra clave, firma recortada, payload manipulado para cambiar inquilino, payload manipulado para ascender a owner, token caducado, siete formas de basura, cookie con token ajeno, cuatro nombres de cookie parecidos, Basic auth, Bearer vacio, y dos controles positivos.

**Mutaciones.** 3 mutaciones fieles, las 3 caen: quitar el fijado de algoritmo -> 'el atacante elige el algoritmo'; ignoreExpiration -> 'se acepto un token caducado'; cookie por includes -> 'la cookie nelvyon_token_x se tomo por la de sesion'. 1 INFIEL: la prueba de alg:none NO tumbaba el fijado de algoritmo porque jsonwebtoken rechaza 'none' por su cuenta; hubo que anadir el ataque con HS512, que si lo ejercita.

**Veredicto.** Sin defecto de producto en la puerta. Se encontro un acoplamiento: verifyToken es puramente criptografico (lo dice su documentacion) pero construir AuthService exige DbClient y por tanto DATABASE_URL; sin ella TODO token se rechaza como Unauthorized, incluido uno legitimo. Es cierre seguro, pero confunde 'mal configurado' con 'no autorizado'. Lo destaparon los controles positivos de esta suite.

---

## `claves_y_scim` — 7 superficies · FIXED_CERTIFIED

**Ataques.** 19 ataques. Puerta (12): clave revocada, desactivada, caducada, seis formas de clave inexistente o basura, sin cabecera, esquema Basic, escalada de ambito (clave de lectura pidiendo escritura), ambito inexistente, el identificador propagado, el limite de uso y el aislamiento del limite entre claves. PostgreSQL REAL (7): clave viva, revocada de nacimiento, revocada EN USO, desactivada en uso, caducada, inexistente, e identidad del identificador.

**Evidencia.** laClaveDeApiComoCredencial.test.ts 12/12 y revocarUnaClaveLaRevoca.pg.test.ts 7/7 contra PostgreSQL real con filas de verdad en api_keys.

**Mutaciones.** 4 mutaciones fieles, las 4 caen. M31 volver a cortar la clave para el identificador -> 1 rojo; M32bis quitar 'active=TRUE AND revoked_at IS NULL' de la consulta REAL -> 3 rojos; M36 quitar la comprobacion de caducidad -> 1 rojo. || RESULTADO DE MUTACION QUE CREO UNA SUITE: M32 sobre la suite de la puerta NO CAYO. Sus tres casos de revocacion estaban verdes porque interrogaban a MI DOBLE de verifyKey; la decision vive en un WHERE de PostgreSQL y la ejecucion nunca la alcanzaba. De ahi salio la suite .pg, y sobre ella la misma mutacion tumba tres. Es la demostracion literal de que un negativo verde no certifica una defensa si no llega a ella.

**Veredicto.** DEFECTO ENCONTRADO Y CORREGIDO: fuga de credencial a los registros. `keyId` se calculaba como rawKey.slice(0,20) —'nlv_' mas DIECISEIS caracteres hexadecimales de la clave viva— y de ahi viajaba a logUsage(), que lo PERSISTE, y al rastro de auditoria de MCP como identificador de usuario y de clave. El propio servicio ya guarda un key_prefix de DOCE caracteres para la interfaz: la casa habia decidido cuanta clave es enseñable y la puerta cortaba ocho caracteres mas por su cuenta. No es explotable (quedan 128 bits) pero es un trozo de credencial viva en registros que lee gente. Corregido: verifyKey devuelve el `id` de la fila y la puerta lo usa. || Sin defecto en el resto: la clave se guarda como sha256, la revocacion y la caducidad se comprueban donde se decide, los ambitos no escalan, un ambito inexistente se deniega, y el limite de uso no cruza entre claves. Observacion registrada: la columna `is_active` que anadio la migracion 507 esta MUERTA —ni TypeScript ni Python la leen ni la escriben— y las dos implementaciones (TS y FastAPI) coinciden en escribir y comprobar `revoked_at`, asi que revocar por una superficie revoca en la otra.

---

## `cron_y_tareas` — 16 superficies · CERTIFIED

**Ataques.** 16 casos contra las tres verificaciones (verifyCronHeader, verifyCronBearer, verifyCronFlexible) y una ruta real de extremo a extremo: cinco formas de basura por las tres puertas, sin presentar nada, siete prefijos del secreto, cuatro sufijos, mayusculas, CRON_SECRET sin poner, CRON_SECRET en blanco, cabecera vacia que no debe tapar un Bearer valido, cabecera equivocada que no debe caerse hacia el Bearer valido, esquema en minusculas, y controles positivos por las cuatro vias.

**Evidencia.** entrarPorLaPuertaDeCron.test.ts 16/16. La certificacion tiene dos mitades: el guardian estructural prueba que LAS DIECISEIS rutas llaman a una de las tres verificaciones (mapeado: 6 verifyCronHeader, 8 verifyCronBearer, 2 verifyCronFlexible), y esta suite prueba que la puerta aguanta — incluyendo /api/cron/status-check de extremo a extremo, donde se comprueba que runAllChecks NO llega a ejecutarse sin el secreto.

**Mutaciones.** 3 mutaciones fieles, las 3 caen. M9 'no hay secreto' pasa a significar 'no hace falta secreto' -> 2 rojos; M10 la comparacion acepta prefijos -> 1 rojo; M11 la ruta comprueba DESPUES de hacer el trabajo -> 1 rojo (el trabajo se ejecuto con 401).

**Veredicto.** Sin defecto. La puerta cierra en falso cuando CRON_SECRET no esta puesta o esta en blanco -que es la forma facil de dejar dieciseis trabajos al alcance de cualquiera-, compara la longitud antes que el contenido y despues en tiempo constante, y ninguna de las 16 rutas admite el secreto por query string. verifyCronBearer acepta el secreto sin el esquema 'Bearer ' y rechaza el esquema en minusculas: es mas estricto que HTTP y cierra en la direccion correcta.

---

## `frontera_de_confianza` — 5 superficies · FIXED_CERTIFIED

**Ataques.** 34 contra assertSafeEgressUrl: cinco salidas legitimas de control, 19 destinos que ya estaban cerrados (esquema, credenciales en la URL, localhost, loopback, 0.0.0.0, metadatos de AWS y de Google, las tres redes privadas, CGNAT, .local, .localhost, y cuatro formas de IPv6 interna), cinco formas de IPv4 disfrazada (decimal, hexadecimal, octal, corta, cero), DIEZ formas de IPv6 con una IPv4 dentro, y cuatro con punto final de DNS.

**Evidencia.** salirDeCasaPorLaPuertaDeAtras.test.ts 34/34. Regresion: las 46 pruebas que ya usaban la guarda siguen verdes. Los otros cuatro puntos de la categoria estan cubiertos por sus propias suites: saasRequestContext por cruzarDeInquilinoNoCuela.pg (8/8), middleware y AuthContext por la puerta de sesion (14/14), y contextoDeInquilino por la puerta de la API publica.

**Mutaciones.** 3 mutaciones fieles, las 3 caen. M37 dejar de mirar la IPv4 dentro de la IPv6 -> 10 rojos; M38 devolver el punto final del DNS -> 1 rojo; M39 mirar solo la forma decimal y no la hexadecimal -> 10 rojos (lo que confirma que la forma que importa es la hexadecimal, porque es a la que Node normaliza).

**Veredicto.** DEFECTO ENCONTRADO Y CORREGIDO en la guarda canonica de SSRF — la que se consolido en el Bloque 6 borrando dos copias, lo que la convierte en punto unico: lo que se le escapa se le escapa a todo el producto. Se le escapaban DOS cosas, medidas y no supuestas. (1) IPv6 con una IPv4 dentro: Node normaliza [::ffff:127.0.0.1] a [::ffff:7f00:1], y la comprobacion solo miraba los prefijos ::1, ::, fc, fd y fe80 — ni 7f00:1 ni a9fe:a9fe empiezan por ninguno, asi que un inquilino podia configurar su webhook contra el loopback, contra 169.254.169.254 o contra la red privada, y NELVYON hacia el POST desde DENTRO de su infraestructura. Corregido extrayendo los ultimos 32 bits y pasandolos por la MISMA regla de IPv4 (mapeada, compatible y NAT64). (2) El punto final del DNS: `localhost.` resuelve igual que `localhost` y no estaba en la lista. || Las formas decimal, hexadecimal, octal y corta de IPv4 SI estaban cubiertas, pero por cobertura PRESTADA: las normaliza el analizador de URL de Node antes de que la guarda las vea. Se aseguran igualmente para enterarnos si deja de hacerlo. || RESIDUO ACEPTADO Y ESCRITO: un nombre publico cuyo registro A apunte a una IP interna —o que cambie entre la comprobacion y la conexion, la reconexion de DNS clasica— NO se puede detectar aqui, porque esta funcion mira la cadena. Cerrarlo exige resolver y comprobar la IP al conectar, con reverificacion tras cada redireccion; es trabajo de la capa de red y queda anotado en la propia suite para que nadie la lea como si cubriera esa parte.

---

## `oauth_y_terceros` — 84 superficies · FIXED_CERTIFIED

> Antes de corregir el denominador: 16.
> La diferencia son rutas del enrutador de páginas que el inventario no miraba.

**Ataques.** 10 ataques contra el estado de OAuth: completar el flujo SIN la cookie del nonce (el ataque), con el nonce de OTRO flujo, con cinco formas de cookie invalida (vacia, en blanco, dos nombres parecidos, otro nombre), con seis prefijos del nonce, state sin firma, state con firma ajena, state de dos partes rotas, reescribir el userId, state de hace media hora firmado DE VERDAD, y sin clave configurada. Mas dos controles: el flujo legitimo funciona y la cookie es corta y httpOnly.

**Evidencia.** terminarElFlujoDeOtro.test.ts 10/10, y el guardian estructural comprueba que LOS CINCO proveedores lo hacen: 2 reglas nuevas en test_las_fronteras_no_se_abren_solas.py (10/10). Typecheck limpio en los 12 ficheros tocados.

**Mutaciones.** 1 fiel que cae, 2 registradas como NO DETECTABLES con su motivo. M24 la comprobacion del nonce siempre dice que si -> 4 rojos. M22 un callback nuevo sin atar el flujo -> el guardian rojo. M23 un arranque que crea el state y olvida la cookie -> el guardian rojo. NO DETECTABLES: M25 (comparar el nonce por prefijo) mutaba una rama MUERTA —los dos lados son hashes SHA256 de longitud fija, asi que la rama de longitudes distintas no se alcanza nunca—; y M26 (dejar de hashear el nonce) no cambia ningun comportamiento observable: el flujo sigue funcionando y el ataque sigue fallando, porque lo que para el ataque es la ausencia de la COOKIE, no el formato del nonce. El hasheo es defensa en profundidad contra la fuga del state por registros e historial, y eso no se puede afirmar desde fuera.

**Veredicto.** DEFECTO GRAVE ENCONTRADO Y CORREGIDO en los CINCO proveedores (Google, Meta, LinkedIn, TikTok, Snapchat). El `state` estaba bien hecho —HMAC-SHA256, tiempo constante, caducidad de 10 min, userId dentro— y respondia perfectamente a la pregunta equivocada: prueba quien EMPEZO el flujo, no quien lo TERMINA, que es la que decide a nombre de quien se guardan los tokens del proveedor. Ataque de manual: el atacante arranca el flujo en su cuenta, obtiene la URL de consentimiento con su state legitimo, se la manda a la victima, y la cuenta de Google Ads de la victima queda conectada dentro de la cuenta NELVYON del atacante, que puede gastar su presupuesto. Corregido atando el flujo al navegador con un nonce de 32 bytes: hash dentro del state, valor en una cookie httpOnly de 10 minutos acotada a /api/oauth. || LO QUE NO SE HIZO Y POR QUE: la correccion evidente seria exigir sesion en el callback y comparar con parsed.userId. NO SIRVE: la cookie de sesion de NELVYON es sameSite 'strict' y NO viaja en el redirect que llega desde el proveedor, asi que habria roto los cinco flujos legitimos. Se comprobo el atributo de la cookie ANTES de elegir la correccion, no despues. La cookie del nonce es 'lax' por eso mismo. || Ademas se unifico el criterio de `Secure`: se exporto isSecureContext() de authCookies en vez de dejar una segunda copia con otra condicion — este arbol ya tiene escrito que de tres copias de un control, dos se quedan atras.

---

## `panel_inquilino` — 314 superficies · FIXED_CERTIFIED

> Antes de corregir el denominador: 235.
> La diferencia son rutas del enrutador de páginas que el inventario no miraba.

**Ataques.** 8 ataques: A->B por cabecera, A->B por cookie, inquilino inexistente, tenantId del token apuntando a otro, B->A (direccion contraria), usuario sin inquilino, accion inexistente, y control positivo. Ademas 6 ataques de asignacion masiva contra POST /api/saas/shared-memory: userId ajeno, workspaceId ajeno, tres disfraces (espacios, mayusculas, salto de linea) y dos controles.

**Evidencia.** 235 superficies tras una sola puerta. cruzarDeInquilinoNoCuela.pg.test.ts 8/8 contra PostgreSQL REAL con dos inquilinos completos (usuarios, workspaces, saas_tenants, workspace_members).

**Mutaciones.** 3 mutaciones, las 3 caen: caida silenciosa sin pertenencia -> caen 4 ataques; el inquilino sale del token -> 'le dio acceso a un inquilino del que no es miembro'; ignorar la cabecera (falso arreglo) -> caen 3, incluido el control. M4 (reintroducir userId del cuerpo en shared-memory) cae: 2 ataques rojos.

**Veredicto.** Sin defecto de producto. requireSaasContext toma el inquilino de la peticion (cabecera x-nelvyon-tenant-id o cookie nelvyon_saas_tenant_id, ambas del cliente) pero lo valida contra la pertenencia real y cierra en falso sin caida silenciosa. El tenantId del propio token, aunque va firmado, NO manda sobre la pertenencia. DEFECTO ENCONTRADO Y CORREGIDO en POST /api/saas/shared-memory: el inquilino salia bien de la sesion, pero sus dos campos hermanos —userId y workspaceId, los que dicen de quien es la entrada DENTRO del inquilino— salian del cuerpo. userId es filtro de busqueda, asi que un miembro podia escribir memoria que aparece en la busqueda por usuario de otro; el workspace es unidad de aislamiento real y su pertenencia no se comprobaba. Corregido en la raiz: userId de la sesion, workspaceId del inquilino verificado. agentId sigue viniendo del cuerpo a proposito: acotar una entrada a un agente es para lo que existe el campo y authorizeRead lo cierra.

---

## `portal_y_partners` — 18 superficies · CERTIFIED

**Ataques.** 11 ataques contra la aprobacion de un clic: token ya gastado, el orden de la reclamacion frente al efecto, la forma del SQL de reclamacion, el entregable del cuerpo frente al del token, entregable de otro cliente, entregable inexistente, cinco tokens rotos, reescribir el token para apuntar a otro entregable, rechazo sin motivo, y comentario de cinco mil caracteres.

**Evidencia.** aprobarConUnClicUnaSolaVez.test.ts 11/11. La capa de token que hay debajo esta certificada aparte en falsificarUnEnlaceDeCapacidad.test.ts (15/15).

**Mutaciones.** 3 mutaciones fieles, las 3 caen. M40 quitar la comprobacion de que el entregable es de ese cliente -> 2 rojos; M41 sacar el entregable del CUERPO en vez del token -> 1 rojo; M42 dejar de exigir motivo al rechazar -> 1 rojo.

**Veredicto.** Sin defecto, y es de lo mejor construido del arbol. La reclamacion del token es un UPDATE ... WHERE used_at IS NULL AND expires_at > NOW() RETURNING id que ocurre ANTES de cualquier efecto —se comprueba que es la PRIMERA consulta, no solo que exista—, lo que resuelve la carrera donde se puede resolver y no en la aplicacion. El entregable, el workspace y el cliente salen del token firmado y NUNCA del cuerpo, y aun asi se vuelve a comprobar contra la fila que el entregable pertenezca a ese cliente. Importa mas de lo que parece: los escaneres antivirus de las empresas VISITAN los enlaces de los correos antes de entregarlos, asi que un enlace de un solo uso mal hecho se gasta solo. Aqui el gasto ocurre en el POST, no en el GET de vista previa.

---

## `producto_autenticado` — 93 superficies · CERTIFIED_CON_HALLAZGO

> Antes de corregir el denominador: 87.
> La diferencia son rutas del enrutador de páginas que el inventario no miraba.

**Ataques.** 13 casos contra proxyPlatformFetch, el paso obligado de ~60 de las 93: diez formas raras de la cabecera X-Workspace-Id (+42, 42.0, 0x2a, 4.2e1, ' 42abc', '42 42', -1, 0, abc, '1,2'), un numero mas alla del entero seguro, el workspace de otro inquilino, una cabecera ilegible, sin sesion, una ruta de entidad sin workspace, y la estabilidad y el reparto de la derivacion.

**Evidencia.** elWorkspaceQueVaAguasArriba.test.ts 13/13. Se mide la LOGICA DE DECISION del proxy —como lee la cabecera, en que orden comprueba y si llega a llamar aguas arriba—; la pertenencia en si es una consulta y esta certificada aparte contra PostgreSQL real en cruzarDeInquilinoNoCuela.pg.test.ts. Se dice explicitamente en la propia suite para que nadie la lea como si cubriera esa mitad.

**Mutaciones.** 2 mutaciones fieles, las 2 caen. M43 volver a tratar una cabecera ilegible como ausente -> 1 rojo; M44 aceptar cualquier numero de JavaScript en la cabecera -> 2 rojos.

**Veredicto.** Sin defecto en la puerta: el workspace llega del cliente pero se comprueba la pertenencia ANTES de llamar aguas arriba, y si falla NO se llama —denegar despues de haber preguntado ya es tarde para una escritura—. Una cabecera presente que este lado no sabe leer se RECHAZA en vez de tratarse como ausente, que es un defecto ya corregido en un bloque anterior y que aqui queda asegurado. || HALLAZGO MEDIDO QUE REQUIERE DECISION HUMANA, NO CORREGIDO AQUI: stableWorkspaceIdFromTenant es un hash multiplicativo por 31 reducido a % 900_000. Con novecientas mil casillas, el limite del cumpleanos muerde: medido con UUID reales y media de veinte repeticiones, 1.000 inquilinos dan 0,5 colisiones; 2.000 dan 1,8; 5.000 dan 13,1. Una colision significa DOS INQUILINOS MANDANDO EL MISMO X-Workspace-Id aguas arriba, es decir compartiendo la unidad de aislamiento que usa FastAPI. No es un ataque —los identificadores de inquilino son UUID que genera el servidor— es un defecto que llega solo con el crecimiento. NO se corrige aqui porque cambiar la derivacion cambia el identificador de todos los inquilinos que ya lo usan y dejaria huerfanos los datos guardados bajo el viejo: es una decision con consecuencias de migracion. || Se deja constatado ademas que el arbol no es coherente consigo mismo: saas/oauth/callback hace `tenant?.workspaceId ?? derivado` —prefiere el workspace REAL y solo deriva si falta— mientras saas/oauth/connect y dialer-advanced derivan siempre teniendo ctx.tenant.workspaceId disponible en el mismo contexto. Tres sitios, dos criterios.

---

## `publico_sin_sesion` — 48 superficies · CERTIFIED

> Antes de corregir el denominador: 46.
> La diferencia son rutas del enrutador de páginas que el inventario no miraba.

**Ataques.** 50 ataques. Tokens de capacidad (15): firma inventada por cuatro vias, firma con otra clave, nueve formas de basura estructural, reapuntar el inquilino, reapuntar el entregable, alargar la caducidad, token caducado con firma BUENA, convertir un token de apertura en uno de baja, JWT de sesion presentado como token de capacidad y al reves, sin clave, clave corta. Travesia de rutas (35): treinta payloads —%2e, doble codificacion, barra invertida, UNC, nulo, separador Unicode de ancho completo, ruta absoluta, 129 caracteres, punto, vacio— contra los DOS segmentos, mas la propiedad de que el inquilino va dentro de la ruta.

**Evidencia.** falsificarUnEnlaceDeCapacidad.test.ts 15/15 y salirseDelDirectorioDelInquilino.test.ts 35/35. Ademas el guardian de entradas hostiles mide TODO el arbol: 12/12 con control positivo y negativo de la regla de inyeccion.

**Mutaciones.** 7 mutaciones fieles, 6 caen. M12 el token deja de caducar -> 1 rojo; M13 la firma no se comprueba -> 5 rojos; M14 admitir tokens de TRES partes -> INICIALMENTE NO CAYO (ver veredicto), cae tras afilar; M15 lista blanca de rutas relajada -> 28 rojos; M16 quitar la comprobacion de contencion -> NO CAE, y es correcto; M17 las dos fuera -> 29 rojos; M18/M21 ficheros hostiles sinteticos contra el guardian -> caen las tres reglas, incluida la variante ESCONDIDA tras una variable intermedia.

**Veredicto.** Sin defecto. Los enlaces de capacidad (apertura, clic, baja, aprobacion) llevan HMAC-SHA256 con comparacion en tiempo constante, caducidad comprobada, ambito dentro de la firma y clave que falla en cerrado con minimo de 32 caracteres. Las rutas de fichero llevan lista blanca anclada por segmento MAS comprobacion de contencion, y el inquilino forma parte de la ruta. || DOS RESULTADOS DE MUTACION QUE MERECEN QUEDAR ESCRITOS. (1) M14 no cayo: un JWT se rechazaba por fallar el JSON.parse, NO por el recuento de partes que el comentario decia estar asegurando. Se afilo la prueba para exigir el MOTIVO ('malformed') y entonces cayo. Es la diferencia entre una defensa y una casualidad. (2) M16 no cae y NO se ha forzado que caiga: con la lista blanca estricta, la comprobacion de contencion es inalcanzable. Lo que si se hizo fue anadir una prueba que mide esa segunda capa por separado —o revienta, o la ruta queda dentro— porque antes M15 y M17 daban resultados IDENTICOS, y dos mutaciones indistinguibles significan que una de las dos defensas no se estaba midiendo. Ahora M15 da 28 y M17 da 29. || CORRECCION DE DENOMINADOR: la primera version de la regla de inyeccion SQL uso un grep por LINEAS y encontro 5 sitios en todo el arbol; el SQL de este repositorio es multilinea y los sitios reales son ~180 en 58 ficheros. Se rehizo entera. Un denominador equivocado por un factor de 36 es la diferencia entre 'lo he leido todo' y 'he leido el 3%'.

---

## `webhooks_entrantes` — 12 superficies · FIXED_CERTIFIED

**Ataques.** 20 ataques. SES/SNS (9): notificacion firmada de un topic ajeno, escritura contra el inquilino que elige el atacante, auto-confirmacion de suscripcion ajena, SubscribeURL a 169.254.169.254, SKIP_SNS_VERIFY en produccion, cuatro URLs de certificado hostiles, y dos controles. Slack (11): seis destinos hostiles para response_url (metadata, red interna, localhost, dominio del atacante, dominio que imita a Slack, Slack en el userinfo), firma invalida, peticion de hace una hora, sin secreto, y dos controles.

**Evidencia.** unaFirmaValidaNoDiceDeQuien.test.ts 9/9 y laUrlQueVieneDentroDelMensaje.test.ts 11/11. Las firmas se construyen de verdad: par RSA generado en el proceso y firma SHA1 sobre la cadena canonica de SNS; HMAC-SHA256 sobre 'v0:ts:body' para Slack. NO SE TOCA AWS NI SLACK: lo unico que se sustituye es de quien es la clave, que es lo irrelevante para la propiedad. Regresion: sesWebhook.test.ts 10/10 sigue verde.

**Mutaciones.** 4 mutaciones fieles, las 4 caen. M5 quitar la lista de topics -> 3 rojos; M6 el interruptor vuelve a alcanzar produccion -> 1 rojo; M7 SubscribeURL sin comprobar -> 1 rojo; M8 quitar el anclaje de response_url -> 6 rojos.

**Veredicto.** CUATRO DEFECTOS ENCONTRADOS Y CORREGIDOS. (1) GRAVE, /api/webhooks/ses: la firma SNS se verificaba con esmero -incluida la URL del certificado, anclada- pero el TopicArn no se comparaba con nada. AWS firma para todo el mundo: cualquiera con una cuenta gratuita crea un topic en SU cuenta, lo apunta aqui, y sus mensajes traen firma autentica y certificado servido por AWS. Y el manejador AUTO-CONFIRMABA toda suscripcion, asi que el atacante enganchaba su topic el solo. Con eso, extractIds saca el tenantId de las cabeceras del correo -del atacante- y lo mete en UPDATE saas_campania_recipients WHERE tenant_id=$1: un anonimo marcaba como rebotados los destinatarios de las campanias de cualquier inquilino. Corregido con lista de topics (SES_SNS_TOPIC_ARN). (2) SKIP_SNS_VERIFY no miraba el entorno: una variable heredada dejaba el webhook abierto en produccion. Ahora no alcanza produccion. (3) El sobre trae DOS URLs y solo se validaba una; SubscribeURL se visitaba tal cual (SSRF a la metadata de la instancia). Las dos pasan ya por el mismo patron anclado. (4) /api/webhooks/slack/interactions hacia POST a payload.response_url sin mirar el destino; anclado a hooks.slack.com. Alcance honesto: (4) y (3) exigen firma valida, asi que son defensa en profundidad; (1) y (2) no exigen nada. || REQUISITO DE DESPLIEGUE: SES_SNS_TOPIC_ARN debe configurarse antes del siguiente despliegue. Sin ella la ruta responde 503 en produccion -cierre en falso deliberado, mismo idioma que META_WA_APP_SECRET en la ruta de WhatsApp-. Fuera de produccion no se exige, para no romper el entorno de pruebas. || Sin defecto en el resto: Stripe (4 rutas) verifica con tolerancia de +-5m y comparacion en tiempo constante y distingue 'no configurado' (503) de 'sin firma' (401); Paddle responde 410; WhatsApp exige META_WA_APP_SECRET en produccion; workflows/webhook-in tiene sesion e idempotencia PERSISTENTE por inquilino; saas/webhooks valida la URL saliente con assertSafeEgressUrl y la guarda TIENE llamadores reales (create y update).

---
