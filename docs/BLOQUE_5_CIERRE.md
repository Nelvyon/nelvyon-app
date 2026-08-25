# BLOQUE 5 — cierre

**Producto medido.** SHA certificado: `9a3841bc`, rama `bloque4-webhooks`.

Los cuatro bloques anteriores midieron lo que el sistema hace por dentro:
esquema, aislamiento, agentes, operación bajo carga. Este mide **lo que el
cliente ve**, que es lo único que se puede comparar con un producto del mercado.

El resultado más importante no es un número, es una diferencia de método: los
defectos de este bloque **no se encuentran leyendo el código**. Se encuentran
abriendo un navegador. Los dos peores —una identidad falsa en 75 pantallas y una
sesión que echaba al usuario al login en 136— llevaban meses en el árbol,
delante de todo el mundo, y ninguna suite los veía.

---

## El denominador

**217 áreas de producto → 25 categorías → 0 huérfanas.**

Derivado del árbol como los tres inventarios anteriores, con guardián en las dos
direcciones y suelo mínimo. La unidad es el **área de producto**: la carpeta bajo
la que vive un conjunto de pantallas con un propósito comercial. No se cuenta por
pantalla, porque un cliente no contrata pantallas.

| Auditoría | Denominador | Resultado |
|---|---|---|
| Pantallas (7 reglas estáticas) | 1069 ficheros `.tsx` | **0 defectos** |
| Rutas internas | 888 rutas derivadas | **0 enlaces a 404** |
| Navegador (axe-core + 375 px) | 75 rutas, las 25 categorías | **75/75** |

---

## Los defectos

### 1 · Un cliente veía el nombre y el correo de otra persona

`Header.tsx` servía una identidad **fija**: «Thomas Fleming · info@gmail.com ·
Web Designer». No era un dato por defecto ni un estado de carga: era el nombre de
alguien de la plantilla W3CRM, escrito a mano en el marcado.

Esa cabecera se monta en **75 pantallas** del panel a través de
`SaasW3crmShell → Layout → Nav`. Un cliente entraba en su cuenta y leía la
identidad de un desconocido en prácticamente todo el producto.

Al lado, dos desplegables de notificaciones inventadas —«Youtube, a
video-sharing website, goes live $500», «New order placed #XF-2356», «Quisque a
consequat ante Sit amet magna at volutapt…», «Dr sultads Send you Photo»,
«Reminder : Treatment Time!»— todo fechado el 29 de julio de 2022. Un menú de
perfil apuntando a `/app-profile` y `/email-inbox`, rutas que no existen. Y un
«Logout» con `href="#"`: se pulsaba y la sesión seguía abierta.

**Mientras tanto `/api/saas/notifications` estaba construida entera** —listado,
contador, marcar leída, marcar todas— y **sin un solo consumidor en la UI**.
Conectarla no fue producto nuevo: fue enchufar lo que ya estaba.

Sobrevivió porque **ninguna prueba miraba esa cabecera**.

### 2 · Abrir el panel en una pestaña nueva te echaba al login

El JWT vive en `sessionStorage`, que es **por pestaña**. `AuthContext` solo
intentaba recuperar la sesión desde la cookie en una lista de rutas escrita a
mano: `/saas`, `/os`, `/portal`, `/admin`, `/dashboard`, `/auth`, `/login`.

`ProtectedLayout` envuelve **136 pantallas**, y ninguna de las de `/account`,
`/analytics/*`, `/campaigns`, `/billing`, `/crm/*`, `/funnels`, `/publicidad`,
`/reputacion`, `/social`, `/inbox`, `/ecommerce`, `/settings`, `/automations/*`
ni `/app/*` estaba en esa lista.

Consecuencia para un cliente: abre `/analytics` en una pestaña nueva —o pincha el
enlace de un correo, o reinicia el navegador— y aterriza en el login **con la
sesión perfectamente válida en la cookie**; pero `/saas/dashboard` entra sin
problema. Mismo usuario, misma cookie, dos comportamientos según la ruta.

La causa raíz no era que faltaran rutas en la lista: **era que hubiera una
lista**. Se mantiene a mano y se desincroniza siempre. Ahora la sesión la pide el
componente que sabe que la necesita.

Lo destapó la medición: 33 de 75 rutas terminaban en `/login`.

### 3 · Contraste: 993 violaciones graves de WCAG

axe-core, sobre 74 rutas renderizadas de verdad, con el criterio de WCAG 2.1 AA y
contando solo `serious` y `critical`:

| Regla | Antes | Después |
|---|---:|---:|
| `color-contrast` | 819 | **0** |
| `link-in-text-block` | 97 | **0** |
| `link-name` | 62 | **0** |
| `button-name` (crítica) | 13 | **0** |
| `role-img-alt` | 2 | **0** |
| **Total** | **993** | **0** |

La causa dominante era el azul de marca: `#0084ff` da **3,66:1 sobre blanco**
cuando el mínimo es 4,5:1, y por simetría fallaba en las dos direcciones —el azul
como texto y el texto blanco sobre los botones azules.

Se corrigió bajando la luminosidad **conservando el tono** (209°, el mismo azul)
hasta `#0063c2`. Y **solo en el tema claro**: comprobado antes de tocar nada,
sobre la tarjeta oscura `#0b1428` el azul nuevo cae a 4,06:1 y deja de cumplir.
Un solo azul no puede servir a los dos temas; cambiarlo en ambos habría arreglado
la mitad del producto rompiendo la otra.

307 controles de solo icono recibieron nombre accesible. 146 declaraciones de
color de texto se ajustaron al mínimo que cumple.

### 4 · Enlaces que no llevaban a ninguna parte

- **49 `href="#"`** en la primera medición. Tras afinar la regla —el manejador
  casi nunca está en la misma línea que el `href`— quedaban **15 reales**, todos
  en la cabecera del panel. Hoy: **0**.
- **6 enlaces internos a rutas inexistentes**, invisibles a simple vista porque
  *parecen* correctos: `/dashboard` (la cabecera de la aplicación y la
  verificación de correo), `/forgot-password` (el formulario de acceso),
  `/dashboard/partners`, `/dashboard/white-label/clients`, `/app/projects`. Hoy:
  **0 sobre 888 rutas**.

### 5 · Tablas que rompían el móvil

15 tablas sin contenedor con scroll. La regla tuvo que aprender **dos**
convenciones vivas en el árbol —`overflow-x-auto` de Tailwind y
`<div class="table-responsive">` de Bootstrap— y una trampa: el tema redefine
`.table-responsive-lg` como `min-width: 60.9375rem !important`, así que puesta en
el propio `<table>` no crea scroll, **solo le fija 975 px de ancho**.

Medido en navegador a 375 px: **0 desbordamiento horizontal en las 75 rutas**.

### 6 · Una plantilla de otro producto viajando en el bundle

`Menu.tsx` exportaba 536 líneas con el menú de demostración de W3CRM
—«Dashboard», «Profile 1», «Add Role», `/app-profile`— y `SideBar` lo usaba como
**valor por defecto**. Hoy los dos llamantes pasan su menú, así que no se
alcanzaba; pero un defecto que solo está a un `undefined` de distancia acaba
alcanzándose. Retirado: ningún menú es mejor que el menú de otro.

### 7 · Dos de mi propia certificación

- `cronDeadline.test.ts` dejaba un **rechazo no gestionado**: enganchaba el
  `expect` *después* de mover el reloj, así que la promesa rechazaba sin manejador
  y vitest tumbaba el fichero por un error fuera de toda prueba. Verde en
  aislamiento, rojo en la suite completa.
- El cierre del Bloque 4 añadió sus dos documentos **sin registrarlos** en la
  tabla de clasificación, contra la disciplina que ese mismo fichero documenta.
  El detector de huecos pasó de 5 a 7 huérfanos y la puerta se puso roja aquí.
  Clasificados los 9 pendientes: **0 documentos activos sin clasificar**.

---

## Tres lecciones de método

**Afilar una regla es el mismo gesto que cegarla.** La primera pasada dio 192
hallazgos y **tres de las siete reglas tenían falsos positivos**: una casaba
dentro de un comentario, otra miraba solo la etiqueta `<table>` cuando el
contenedor está en el `div` padre, la tercera miraba solo la línea del `href`. Al
afinarlas apareció el riesgo contrario, y con él el guardián que tiene cada regla
ahora: **control positivo** (un defecto real que debe seguir viendo) y **control
negativo** (el patrón legítimo que motivó el afilado). Ese guardián encontró un
punto ciego en su primera ejecución: `COLOR_SUELTO` exigía el `#` pegado a los dos
puntos y era ciega a `style={{ color: "#ff0000" }}`, la forma más común del árbol.
Ocultaba **425 casos**.

**Un arreglo que sirve a la mitad del producto no es un arreglo.** Pasó dos veces
y las dos se detectaron midiendo antes de aplicar: el azul oscurecido rompía el
tema oscuro, y los grises oscurecidos rompían las superficies oscuras. La segunda
llegué a aplicarla y la medición la devolvió. Por eso el guardián de contraste
comprueba **los dos temas**, y una de sus pruebas existe solo para ponerse roja si
alguien vuelve a aplicar el color claro al tema oscuro.

**Un cronómetro no es una señal.** Dos pantallas fallaban por medirse a mitad de
render. La primera versión esperaba 1500 ms fijos y seguía fallando con cuatro
procesos en paralelo: con la máquina cargada, el parpadeo dura más. Se sustituyó
por la condición real —que todas las hojas enlazadas estén aplicadas—. Y el
diagnóstico inicial era **equivocado**: `/crm` parecía un problema de tiempo y era
un defecto de contraste real que mi sondeo no veía porque devolvía la lista vacía
y no había tabla que medir.

---

## Fase B — comparativa de mercado

La instrucción fue literal: **prohibido inventar superioridad**, y en concreto no
declarar `SUPERIOR` ni `EQUAL` cuando solo exista documentación del competidor.

Eso no es una recomendación de estilo: define lo que se puede afirmar. Para
sostener superioridad o paridad en un criterio hace falta **la misma medida
tomada en los dos lados**, y medir el producto de un tercero exige una cuenta
suya —casi siempre de pago—, datos reales y tocar sistemas ajenos. Las tres cosas
están prohibidas en este bloque.

De ahí el resultado, incómodo y honesto:

| Veredicto | Categorías |
|---|---:|
| `SUPERIOR` | **0** |
| `EQUAL` | **0** |
| `PROPIA_MEDIDA` (lo nuestro medido; del referente, solo su documentación) | 21 |
| `SIN_COMPARAR` (no hay base común) | 4 |

El veredicto **no se escribe**: lo deriva `_veredicto()` de las clases de
evidencia de los dos lados, y no existe ninguna rama que devuelva `SUPERIOR` sin
`MEASURED` en ambos. Un guardián lo comprueba, y una mutación lo confirmó:
escribir «SUPERIOR» a mano en el fichero generado pone la puerta roja.

Las cinco clases de evidencia se separan de verdad: `MEASURED` (medido aquí con
herramienta reproducible), `OBSERVED` (visto en producto público gratuito),
`DOCUMENTED` (lo que el fabricante afirma), `SIMULATED` (modelado, no es
evidencia de nada real) y `NOT_COMPARABLE`.

**Límite registrado, no resultado:** `sitio_publico` es el único eje donde la
misma medida podría tomarse de los dos lados sin cuenta ni pago, porque una
página pública se puede auditar con axe. No se ha hecho: exigiría lanzar
peticiones contra servidores de terceros y este bloque no sale a la red.

---

## Evidencia de la puerta

Ejecutada **en serie**, nunca solapando cargas.

| Tanda | Resultado |
|---|---|
| Web completa (800 ficheros) | **7387 pasadas · 0 fallos · 470 saltadas** · 134 s |
| Python completa, PostgreSQL real (`nelvyon_cert545`) | **3669 pasadas · 0 fallos · 25 saltadas** · 9:21 |
| Aislamiento y RLS, en serie | **27 pasadas · 0 fallos · 68 saltadas** (bloqueadas) |
| Guardianes de inventario y auditoría | **107 pasadas · 0 fallos · 2 saltadas** |
| Navegador, 75 rutas, las 25 categorías | **75 / 75** |
| Árbol antes y después | **limpio** |

### Los 25 skips de Python, uno a uno

- **12** — `test_webhooks_salientes_reintentan_de_verdad`: exigen
  `NELVYON_WEB_CERT_DSN`. Esa base **no existe en este entorno** y construirla es
  parte de `WEB_DB_ROLE_CUTOVER`, bloqueado por el fundador.
- **5** — conectores que no declaran ruta.
- **2** — `test_no_aparecen_huecos_nuevos_de_recuperacion`: exigen una base
  reconstruida **solo con migraciones**. Se probó contra `nelvyon_virgen` y
  **falló con 18 huecos**… que son exactamente los que arreglan las migraciones
  `575_reparar_lo_que_la_507_y_la_406_no_llegaron_a_crear` y
  `576_columnas_que_el_codigo_escribe_y_no_existian`, **ambas en el rango
  bloqueado por ADR-064**. Poner al día la base de referencia exige aplicarlas, y
  aplicarlas está prohibido. No se fuerza, y no se cuentan como defecto: son la
  consecuencia medida del bloqueo.
- **2** — migración `571`, apartada del árbol desplegable.
- **2** — listas de deuda **vacías** con control positivo: es el estado deseado,
  no un agujero.
- **1** — `test_migrations_run_on_virgin_postgres`: misma familia que las dos de
  arriba.
- **1** — `workspace_members_invites no existe en este entorno`. Merece mención:
  **lo dice y se salta**, en vez de dar un verde silencioso.

Las **68** de aislamiento son las de `WEB_DB_ROLE_CUTOVER`: la suite se niega ante
un superusuario, y hace bien — RLS no se aplica a superusuarios, así que estaría
midiendo el vacío.

## Producción y coste

- **Producción: NO TOCADA.** Todo contra el entorno de certificación local.
- **Ninguna migración bloqueada aplicada.**
- Sin pagos, sin correos, sin webhooks externos, sin proveedores OAuth reales.
- Sin cambios de credenciales ni de roles.
- Sin dependencias nuevas: `axe-core` ya estaba instalado y **sin usar**; se
  inyecta su bundle en la página en vez de añadir `@axe-core/playwright`.
- **Coste externo generado: 0 €.**

## Gates que siguen esperando decisión

`WEB_DB_ROLE_CUTOVER` · ADR-064 (`568/569/570/572/573/574/575/576`; `571`
apartada) · `STRIPE_MEMBERSHIP_REACTIVATION` · decisión sobre `InvoicingService`
y `ABTestingService` · validación de email en CRM · `chrome-devtools-mcp`.

Todos **BLOCKED_ON_FOUNDER**. La ausencia del fundador no es autorización.

## Cambio visible que conviene saber

El azul de marca pasa de `#0084ff` a `#0063c2` **en el tema claro**. Mismo tono,
un escalón más oscuro, por exigencia de contraste. El tema oscuro conserva
`#0084ff`. Es un cambio de una línea y trivialmente reversible, pero se ve, y por
eso se dice aquí en vez de dejarlo enterrado en un diff.

---

# BLOQUE_5_EXECUTABLE = CLOSED

**25/25 categorías · 24 `FIXED_CERTIFIED` + 1 `PASS_CERTIFIED` · 0 bloqueadas ·
0 pendientes.** Contador: **25 + 0 + 0 = 25**.

**217 áreas · 0 huérfanas · 888 rutas · 0 enlaces rotos · 993 → 0 violaciones
graves de accesibilidad · 0 desbordamiento en móvil.**

SHA certificado: **`9a3841bc`**.
