# BLOQUE 5 — estado por categoría de producto

Generado desde `capacidades_producto_estado.json` y `benchmark_mercado_estado.json`.
No se edita a mano: los dos ficheros tienen guardián y el segundo, además,
se compara con su propia derivación.

| Categoría | Áreas | Estado | Veredicto de mercado | Referente |
|---|---:|---|---|---|
| `acceso` | 7 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | Keycloak (codigo abierto), Auth.js (codigo abierto) |
| `agencia_y_partners` | 8 | `FIXED_CERTIFIED` | `SIN_COMPARAR` | — (no comparable) |
| `analitica_y_reporting` | 4 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | Matomo (codigo abierto), Metabase (codigo abierto) |
| `automatizacion` | 5 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | n8n (codigo abierto), Make (plan gratuito) |
| `campanias_y_email` | 6 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | Mailchimp (plan gratuito), Brevo (plan gratuito) |
| `cobro_y_facturacion` | 4 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | Stripe Billing (documentacion publica), Invoice Ninja (codigo abierto) |
| `contenido_y_copy` | 6 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | Notion (plan gratuito), Google Docs |
| `crm_y_ventas` | 7 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | HubSpot CRM (plan gratuito), Zoho CRM Free |
| `cuenta_y_configuracion` | 8 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | Keycloak (codigo abierto) |
| `enlaces_y_utilidades` | 8 | `FIXED_CERTIFIED` | `SIN_COMPARAR` | — (no comparable) |
| `entregables_y_packs` | 6 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | Google Drive, Notion (plan gratuito) |
| `funnels_y_conversion` | 7 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | Google Forms (gratuito), Typeform (plan gratuito) |
| `ia_y_agentes` | 3 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | Flowise (codigo abierto), LangChain (codigo abierto) |
| `integraciones_y_api` | 8 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | n8n (codigo abierto), Zapier (documentacion publica) |
| `legales` | 8 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | Textos legales publicos de cualquier SaaS |
| `os_plataforma` | 40 | `FIXED_CERTIFIED` | `SIN_COMPARAR` | — (no comparable) |
| `os_servicios_premium` | 25 | `FIXED_CERTIFIED` | `SIN_COMPARAR` | — (no comparable) |
| `portal_del_cliente` | 3 | `PASS_CERTIFIED` | `PROPIA_MEDIDA` | Chatwoot (codigo abierto) |
| `publicidad` | 3 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | Google Ads (documentacion publica), Meta Ads Manager (documentacion publica) |
| `reputacion` | 2 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | Google Business Profile (gratuito) |
| `seo_y_visibilidad` | 3 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | Google Search Console (gratuito), Ahrefs Webmaster Tools (gratuito) |
| `sitio_publico` | 31 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | Cualquier sitio publico de SaaS (medible sin cuenta) |
| `social_y_comunidad` | 4 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | Buffer (plan gratuito), Discourse (codigo abierto) |
| `soporte_e_inbox` | 4 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | Chatwoot (codigo abierto), FreeScout (codigo abierto) |
| `web_y_tienda` | 7 | `FIXED_CERTIFIED` | `PROPIA_MEDIDA` | WooCommerce (codigo abierto), Medusa (codigo abierto) |

**Contador: 25 + 0 + 0 = 25**

## Evidencia por categoría

### `acceso`

7 areas · 10 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 1 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** Los proveedores OAuth reales estan prohibidos en este bloque.

### `agencia_y_partners`

8 areas · 13 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 50 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** NO COMPARABLE: la operativa de agencia con subcuentas, marca blanca y reparto de comision no tiene un referente gratuito y documentable con la misma unidad. Inventar uno para poder poner una nota seria peor que decir que no lo hay.

### `analitica_y_reporting`

4 areas · 44 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 3 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** Sin trafico real no hay datos que comparar.

### `automatizacion`

5 areas · 17 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 43 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** El referente es una plataforma generica de flujos; NELVYON automatiza su propio dominio. Comparables en mecanica, no en alcance.

### `campanias_y_email`

6 areas · 8 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 58 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** NELVYON tiene el correo APAGADO por diseno en certificacion (`CorreoDesactivadoError`), asi que ni siquiera el lado propio se mide enviando: se mide que el envio no sale sin autorizacion.

### `cobro_y_facturacion`

4 areas · 10 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 16 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** Cobrar de verdad es coste externo y produccion. Lo que SI se mide aqui es que el importe lo decide el servidor y que la tabla de precios esta congelada.

### `contenido_y_copy`

6 areas · 6 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 74 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** Comparacion de superficie: el referente es un editor generico y NELVYON un generador orientado a campania.

### `crm_y_ventas`

7 areas · 16 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 23 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** El comportamiento del referente solo se puede leer en su documentacion: medirlo exigiria una cuenta suya y datos reales.

### `cuenta_y_configuracion`

8 areas · 31 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 4 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** El referente es un servidor de identidad; NELVYON integra RBAC en el producto. Comparables en propiedades, no en forma.

### `enlaces_y_utilidades`

8 areas · 9 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 23 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** NO COMPARABLE: son rutas de utilidad y previsualizacion internas, sin equivalente comercial.

### `entregables_y_packs`

6 areas · 7 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 42 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** El referente entrega ficheros; NELVYON entrega paquetes de servicio. La unidad no es la misma.

### `funnels_y_conversion`

7 areas · 13 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 27 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** La conversion del referente depende de su trafico; no hay dos poblaciones comparables.

### `ia_y_agentes`

3 areas · 3 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 327 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** NELVYON se certifica con la IA APAGADA (`NELVYON_AI_ENABLED=0`) y sin proveedores de pago. Lo medido es el contrato de estados y las guardas, no la calidad de un modelo.

### `integraciones_y_api`

8 areas · 8 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 81 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** Los webhooks externos reales estan prohibidos en este bloque.

### `legales`

8 areas · 8 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 10 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** Comparar la CALIDAD juridica de un texto no es una medida tecnica; afirmarlo seria opinar con cara de dato.

### `os_plataforma`

40 areas · 69 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 3 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** NO COMPARABLE: es el sistema operativo interno de la agencia. Un referente externo mediria otra cosa.

### `os_servicios_premium`

25 areas · 50 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 3 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** NO COMPARABLE: son 25 servicios de agencia empaquetados. No hay producto gratuito que venda lo mismo con la misma unidad.

### `portal_del_cliente`

3 areas · 10 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 0 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Medida sin defectos en ninguna de las tres auditorias. No se toco nada.*

**Límite de la comparativa:** El referente cubre soporte, no entrega de proyecto. Solape parcial.

### `publicidad`

3 areas · 7 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 3 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** Cualquier medida real implicaria gasto publicitario: coste externo > 0 €.

### `reputacion`

2 areas · 9 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 3 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** Requiere una ficha de negocio real. No se usan clientes reales.

### `seo_y_visibilidad`

3 areas · 3 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 52 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** Los referentes miden un dominio real conectado; NELVYON se certifica contra entorno de certificacion. No son la misma poblacion.

### `sitio_publico`

31 areas · 47 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 34 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** ESTE es el unico eje donde la misma medida se podria tomar de los dos lados sin cuenta ni pago, porque una pagina publica se puede auditar con axe. No se ha hecho: exigiria lanzar peticiones contra servidores de terceros, y este bloque no sale a la red. Queda registrado como limite, no como resultado.

### `social_y_comunidad`

4 areas · 10 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 49 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** Publicar de verdad exige credenciales de las redes, prohibidas aqui.

### `soporte_e_inbox`

4 areas · 6 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 56 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** Los canales reales (WhatsApp, correo) estan desconectados en certificacion.

### `web_y_tienda`

7 areas · 19 pantallas barridas. Auditoria estatica: 0 defectos (RELLENO, ENLACE_MUERTO, SIN_ALT, ALT_INUTIL, TABLA_SIN_SCROLL, ANCHO_FIJO) y 0 enlaces internos a 404 sobre 888 rutas derivadas. Medicion en navegador sobre 3 rutas de esta categoria (axe-core WCAG 2.1 AA, viewport 375px): 8 violaciones graves ANTES -> 0 DESPUES, 0 desbordamiento horizontal, 0 errores de JavaScript, 0 pantallas que acaben en el login.

*Defectos medidos y corregidos en la causa; vuelto a medir a cero.*

**Límite de la comparativa:** El proceso de compra real implica pagos; prohibidos en este bloque.

