# El contrato de cada servicio

Generado por `scripts/contrato-de-servicio.mjs`. **No se edita a mano**: cada campo
sale del árbol, así que si un servicio pierde su agente, su rúbrica o su política de
optimización, este documento lo dice en la siguiente ejecución en vez de seguir
prometiendo lo que ya no hay.

Son **29 servicios**. Ninguno está verificado en producción, porque nada se ha
desplegado: todo lo que aquí se afirma está medido en local.

## Resumen

| Servicio | Departamento | Agente | Pasos | Herramientas | Rúbrica | Métrica que manda | Precio |
|---|---|---|---|---|---|---|---|
| `web_premium` | Web | ✅ | 8 | 3 | 4 | `conversiones` | 1500 € |
| `ecommerce_premium` | E-commerce | ✅ | 6 | 2 | 4 | `conversiones` | 2000 € |
| `seo_premium` | SEO | ✅ | 8 | 2 | 6 | `sesiones_organicas` | 800 € |
| `ads_premium` | Medios de pago | ✅ | 8 | 2 | 5 | `coste_por_adquisicion` | 1000 € |
| `branding_premium` | Marca | ✅ | 6 | 1 | 5 | `rendimiento_de_la_pieza` | 900 € |
| `voz_premium` | Contenido | ✅ | 7 | 1 | 4 | `rendimiento_de_la_pieza` | 1200 € |
| `bots_premium` | Contenido | ✅ | 6 | 1 | 4 | `rendimiento_de_la_pieza` | 1100 € |
| `personal_digital_premium` | Contenido | ✅ | 6 | 1 | 4 | `conversiones_asistidas` | 700 € |
| `advisor_empresarial_premium` | Estrategia | ✅ | 6 | 1 | 3 | `rendimiento_de_la_pieza` | 1300 € |
| `canales_comunicaciones_premium` | Contenido | ✅ | 6 | 1 | 4 | `rendimiento_de_la_pieza` | 950 € |
| `social_media_premium` | Social media | ✅ | 8 | 1 | 3 | `alcance_util` | 850 € |
| `email_marketing_premium` | Email y ciclo de vida | ✅ | 8 | 2 | 4 | `conversiones_por_envio` | 600 € |
| `contenido_copywriting_premium` | Copywriting | ✅ | 8 | 3 | 4 | `conversiones_asistidas` | 750 € |
| `video_multimedia_premium` | Creatividad | ✅ | 7 | 1 | 5 | `rendimiento_de_la_pieza` | 1400 € |
| `3d_contenido_inmersivo_premium` | Creatividad | ✅ | 7 | 1 | 5 | `rendimiento_de_la_pieza` | 1600 € |
| `fotografia_producto_premium` | Creatividad | ✅ | 7 | 1 | 5 | `rendimiento_de_la_pieza` | 900 € |
| `diseno_grafico_creatividades_premium` | Creatividad | ✅ | 6 | 1 | 5 | `rendimiento_de_la_pieza` | 650 € |
| `consultoria_automatizacion_premium` | Estrategia | ✅ | 6 | 2 | 3 | `conversiones` | 1100 € |
| `integraciones_apis_premium` | Operaciones | ✅ | 6 | 1 | 3 | `conversiones` | 1250 € |
| `mantenimiento_web_premium` | Web | ✅ | 6 | 1 | 4 | `conversiones` | 450 € |
| `reputacion_online_orm_premium` | Reputación | ✅ | 6 | 1 | 3 | `valoracion_media` | 1000 € |
| `formacion_capacitacion_digital_premium` | Contenido | ✅ | 6 | 1 | 4 | `conversiones_asistidas` | 550 € |
| `influencer_marketing_premium` | Social media | ✅ | 6 | 1 | 3 | `alcance_util` | 1500 € |
| `landing_premium` | CRO y experimentación | ✅ | 8 | 4 | 4 | `tasa_de_conversion` | 950 € |
| `funnel_premium` | Embudos y landing | ✅ | 8 | 4 | 3 | `tasa_de_conversion` | 1050 € |
| `crm_captacion_premium` | Captación | ✅ | 6 | 1 | 3 | `leads_cualificados` | pendiente |
| `analitica_atribucion_premium` | Analítica y atribución | ✅ | 6 | 1 | 4 | `cobertura_de_medicion` | pendiente |
| `inteligencia_mercado_premium` | Inteligencia de mercado ⚠️ | ✅ | 6 | 1 | 5 | `decisiones_informadas` | pendiente |
| `geo_ai_search_premium` | Visibilidad en buscadores de IA ⚠️ | ✅ | 6 | 1 | 5 | `menciones_en_respuestas_de_ia` | pendiente |

⚠️ = el departamento que responde de ese trabajo está declarado como *planeado*. El
servicio se ejecuta igual; lo que falta está dicho en su ficha.

---

## `web_premium` — Web Premium

**Resultado de negocio.** Se juzga por `conversiones`, vigilando `velocidad_de_carga`, `errores_por_sesion`, `sesiones`, `valor_medio_pedido`. Por debajo de un 10 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Web — Que la web exista, funcione y se pueda cambiar. KPIs del departamento: disponibilidad, velocidad, incidencias.

**Qué se le pregunta al cliente.**

- `donde_se_atascan` — ¿En qué paso se te cae la gente? ¿Qué te dicen que les frena?
- `que_tiene_que_hacer_la_web` — Cuando alguien entra en tu web, ¿qué quieres que haga exactamente?

**Qué se mide y quién lo aporta.**

- `trafico_actual` *(lo mide el sistema)* — ¿Cuánta gente entra en tu web al mes y cuántos acaban comprando o dejando sus datos?
- `rendimiento_del_sitio` *(lo mide el sistema)* — Cuánta gente entra, cuánta convierte y a qué velocidad carga
- **Muestra mínima:** 500 sesiones en el periodo. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `WebPremiumAgent`, 8 pasos encadenados:

1. Analiza el brief del cliente (LLM)
2. Propone arquitectura visual (LLM)
3. Genera contenido por página (LLM)
4. Configuración SEO (LLM)
5. Checklist QA (LLM)
6. Reporte final de entrega (LLM, markdown)
7. Genera HTML/CSS/JS estático desde el brief (plantilla determinista)
8. Empaqueta sitio en ZIP y registra activo descargable

**Cuentas que hace además de escribir.**

- `muestra-necesaria` — Dice cuánto tráfico hace falta para que un experimento concluya
- `legibilidad` — Dice si el texto se entiende a la primera
- `contraste-de-color` — Dice si el texto sobre el fondo se lee

**Contra qué se revisa lo que produce.**

Rúbrica `web`, 4 comprobaciones:

- `destino-declarado` *(bloqueante)* — Los botones llevan a algún sitio
- `texto-alternativo` *(aviso)* — Las imágenes se pueden leer sin verlas
- `formulario-pide-lo-justo` *(aviso)* — El formulario no ahuyenta con preguntas de más
- `una-idea-por-pantalla` *(aviso)* — Cada pantalla pide una sola cosa

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.342 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- acelerar la carga
- arreglar los errores que ve el usuario
- quitar pasos del proceso de compra


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Google Analytics 4 `google-analytics-4` — estado `live`

**Cuándo deja de intentarlo y habla una persona.**

- las conversiones caen a cero: eso no es conversión, es algo roto
- los errores por sesión se disparan

**Coste para el cliente.** 1500 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `ecommerce_premium` — Ecommerce Premium

**Resultado de negocio.** Se juzga por `conversiones`, vigilando `velocidad_de_carga`, `errores_por_sesion`, `sesiones`, `valor_medio_pedido`. Por debajo de un 10 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** E-commerce — Que el catálogo venda: fichas, búsqueda, carrito, pago. KPIs del departamento: conversión, ticket medio, abandono de carrito.

**Qué se le pregunta al cliente.**

- `productos` — ¿Qué productos vendes?
- `donde_se_atascan` — ¿En qué paso se te cae la gente? ¿Qué te dicen que les frena?
- `economia_del_pedido` — ¿Cuánto te deja de margen un pedido medio, y cuánto puedes pagar por conseguirlo?
- `catalogo` — ¿Cuántas referencias tienes, y cuáles son las que de verdad te dan el dinero?

**Qué se mide y quién lo aporta.**

- `trafico_actual` *(lo mide el sistema)* — ¿Cuánta gente entra en tu web al mes y cuántos acaban comprando o dejando sus datos?
- `rendimiento_del_sitio` *(lo mide el sistema)* — Cuánta gente entra, cuánta convierte y a qué velocidad carga
- `rendimiento_de_la_tienda` *(lo mide el sistema)* — Qué pedidos, qué ticket medio y qué margen deja la tienda
- **Muestra mínima:** 500 sesiones en el periodo. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `EcommercePremiumAgent`, 6 pasos encadenados:

1. Analiza mercado, competencia y oportunidad del ecommerce (LLM)
2. Estructura de tienda, categorías, navegación, UX (LLM)
3. Estrategia de producto, descripciones, fotografía, pricing (LLM)
4. CRO — funnel, checkout, upsells, emails (LLM)
5. SEO ecommerce — PDP, schema, Core Web Vitals (LLM)
6. Report ejecutivo completo (LLM, Markdown)

**Cuentas que hace además de escribir.**

- `economia-de-unidad` — Dice si cada venta deja dinero o lo pierde
- `muestra-necesaria` — Dice cuánto tráfico hace falta para que un experimento concluya

**Contra qué se revisa lo que produce.**

Rúbrica `ecommerce`, 4 comprobaciones:

- `el-precio-no-aparece-tarde` *(aviso)* — El precio se ve antes de invertir tiempo
- `gastos-de-envio-sin-sorpresas` *(bloqueante)* — Los gastos de envío se dicen antes del pago
- `el-pedido-deja-margen` *(bloqueante)* — Lo que cuesta traer un pedido cabe en su margen
- `ficha-con-lo-necesario` *(aviso)* — La ficha responde lo que decide la compra

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.358 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- acelerar la carga
- arreglar los errores que ve el usuario
- quitar pasos del proceso de compra


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Google Analytics 4 `google-analytics-4` — estado `live`

**Cuándo deja de intentarlo y habla una persona.**

- las conversiones caen a cero: eso no es conversión, es algo roto
- los errores por sesión se disparan

**Coste para el cliente.** 2000 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `seo_premium` — SEO Premium

**Resultado de negocio.** Se juzga por `sesiones_organicas`, vigilando `posicion_media`, `impresiones`, `ctr_organico`, `conversiones_organicas`. Por debajo de un 15 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** SEO — Que encuentren al cliente cuando buscan lo que vende. KPIs del departamento: visibilidad, posiciones ganadas, tráfico orgánico.

**Qué se le pregunta al cliente.**

- `productos` — ¿Qué productos vendes?
- `ubicaciones` — ¿Dónde estás? ¿Tienes más de un sitio?
- `competidores` — ¿Con quién te comparan tus clientes?
- `conexiones` — ¿Nos das acceso a tus cuentas para poder trabajar y medir?

**Qué se mide y quién lo aporta.**

- `analytics` *(lo mide el sistema)* — Datos de analítica del cliente.
- `rendimiento_de_busqueda` *(lo mide el sistema)* — Qué tráfico y qué posiciones trae la búsqueda orgánica
- `keywords` *(lo aporta NELVYON)* — ¿Por qué palabras quieres que te encuentren?
- **Muestra mínima:** 200 sesiones orgánicas mensuales. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `SeoPremiumAgent`, 8 pasos encadenados:

1. Auditoría SEO completa del negocio y sector (LLM)
2. Investigación de palabras clave con intención (LLM)
3. Estrategia de contenido para posicionar (LLM)
4. Recomendaciones técnicas prioritarias (LLM)
5. Estrategia de link building y autoridad (LLM)
6. Report ejecutivo con plan 90 días (LLM, Markdown)
7. Genera informe HTML + checklist (plantilla determinista)
8. Empaqueta informe SEO en ZIP descargable

**Cuentas que hace además de escribir.**

- `legibilidad` — Dice si el texto se entiende a la primera
- `hueco-de-contenido` — Dice qué busca la gente que el cliente no responde

**Contra qué se revisa lo que produce.**

Rúbrica `seo`, 6 comprobaciones:

- `meta-descripcion-util` *(aviso)* — La meta descripción cabe en el resultado de búsqueda
- `sin-repeticion-forzada` *(bloqueante)* — No repite la palabra clave hasta hacerse ilegible
- `un-solo-h1` *(aviso)* — Una página, un encabezado principal
- `keywords-con-intencion` *(aviso)* — Cada palabra clave dice qué busca quien la escribe
- `canibalizacion` *(aviso)* — Dos páginas no compiten por lo mismo
- `sin-promesa-de-posicion` *(bloqueante)* — No promete un puesto concreto en Google

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.389 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- reescribir títulos y descripciones
- ampliar el contenido que ya posiciona
- reforzar el enlazado interno
- arreglar lo que impide rastrear o indexar

Con aprobación humana obligatoria:

- unir páginas que compiten entre sí — *toca el mundo real: es_irreversible*


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Google Search Console `google-search-console` — estado `live`
- SEMrush `semrush` — estado `stub`
- Google Analytics 4 `google-analytics-4` — estado `live`

**Cuándo deja de intentarlo y habla una persona.**

- la caída coincide con una actualización conocida del buscador
- hay una penalización o una acción manual
- la caída es superior al 50 % en menos de una semana: eso no es SEO, es algo roto

**Coste para el cliente.** 800 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `ads_premium` — Ads Premium

**Resultado de negocio.** Se juzga por `coste_por_adquisicion`, vigilando `tasa_de_conversion`, `impresiones`, `ctr`, `roas`. Por debajo de un 10 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Medios de pago — Dónde y cuánto se invierte para conseguir el objetivo. KPIs del departamento: CPA, ROAS, presupuesto ejecutado sobre autorizado.

**Qué se le pregunta al cliente.**

- `productos` — ¿Qué productos vendes?
- `ubicaciones` — ¿Dónde estás? ¿Tienes más de un sitio?
- `competidores` — ¿Con quién te comparan tus clientes?
- `ofertas` — ¿Qué ofertas o promociones tienes activas?
- `presupuestos` — ¿Cuánto puedes invertir al mes, y en qué?
- `canales` — ¿Dónde están hoy tus clientes y dónde quieres estar?
- `conexiones` — ¿Nos das acceso a tus cuentas para poder trabajar y medir?
- `economia_del_pedido` — ¿Cuánto te deja de margen un pedido medio, y cuánto puedes pagar por conseguirlo?

**Qué se mide y quién lo aporta.**

- `analytics` *(lo mide el sistema)* — Datos de analítica del cliente.
- `crm` *(lo mide el sistema)* — Datos de su embudo comercial: qué entra, qué convierte, qué se pierde.
- `rendimiento_de_campanas` *(lo mide el sistema)* — Qué cuesta una adquisición y qué devuelve la inversión
- `buyer_personas` *(lo aporta NELVYON)* — ¿Quién decide la compra, y qué le preocupa?
- `keywords` *(lo aporta NELVYON)* — ¿Por qué palabras quieres que te encuentren?
- `audiencias` *(lo aporta NELVYON)* — Audiencias definidas para campañas.
- `creatividades` *(lo aporta NELVYON)* — Creatividades disponibles y su rendimiento.
- **Muestra mínima:** 30 conversiones en el periodo. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `AdsPremiumAgent`, 8 pasos encadenados:

1. Investigación de audiencias y segmentación (LLM)
2. Estrategia de campañas por plataforma (LLM)
3. Copy y creatividades para anuncios (LLM)
4. Estrategia de pujas y presupuesto (LLM)
5. Plan de tracking y medición de conversiones (LLM)
6. Report con ROI y plan de lanzamiento (LLM, Markdown)
7. Genera HTML visual por plataforma y formato (plantilla determinista)
8. Empaqueta creatividades en ZIP descargable

**Cuentas que hace además de escribir.**

- `economia-de-unidad` — Dice si cada venta deja dinero o lo pierde
- `reparto-de-presupuesto` — Dice en cuántos canales se puede estar de verdad con el presupuesto que hay

**Contra qué se revisa lo que produce.**

Rúbrica `ads`, 5 comprobaciones:

- `presupuesto-declarado` *(bloqueante)* — Toda campaña dice cuánto va a gastar
- `destino-declarado` *(bloqueante)* — Un anuncio lleva a algún sitio
- `negativas-declaradas` *(aviso)* — Hay palabras clave negativas
- `presupuesto-da-para-el-plan` *(bloqueante)* — El presupuesto llega para lo que se propone
- `objetivo-medible` *(aviso)* — La campaña dice con qué cifra se juzga

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.394 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- añadir palabras clave negativas

Con aprobación humana obligatoria:

- subir o bajar la puja — *toca el mundo real: gasta_dinero*
- mover el presupuesto entre campañas — *toca el mundo real: gasta_dinero*
- pausar el anuncio que peor va — *toca el mundo real: gasta_dinero*
- cambiar la creatividad — *toca el mundo real: publica_en_nombre_del_cliente*


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Google Ads `google-ads` — estado `oauth_ready`
- Meta Ads (Facebook/Instagram) `meta-ads` — estado `oauth_ready`
- TikTok Ads `tiktok-ads` — estado `stub`
- LinkedIn Ads `linkedin-ads` — estado `stub`

**Cuándo deja de intentarlo y habla una persona.**

- el coste por adquisición supera el margen del cliente: cada venta pierde dinero
- el gasto se ha consumido antes de tiempo
- tres ciclos seguidos sin mejora

**Coste para el cliente.** 1000 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `branding_premium` — Branding Premium

**Resultado de negocio.** Se juzga por `rendimiento_de_la_pieza`, vigilando `uso_de_la_pieza`, `sustituciones`, `coherencia_reportada`. Por debajo de un 20 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Marca — Cómo suena y cómo se ve el cliente, de forma coherente en todo lo que sale. KPIs del departamento: entregables coherentes con la voz declarada.

**Qué se le pregunta al cliente.**

- `competidores` — ¿Con quién te comparan tus clientes?
- `lo_que_la_marca_no_hace` — ¿Hay algo que tu marca no haría nunca? Tono, colores, temas, comparaciones…
- `de_donde_viene_la_marca` — ¿De dónde sale el nombre y qué queréis que la gente sienta al verlo?
- `que_hay_que_conservar` — ¿Hay algo de la imagen actual que NO se pueda tocar? Logo, color, nombre…

**Qué se mide y quién lo aporta.**

- `rendimiento_de_las_piezas` *(lo mide el sistema)* — Qué piezas se usan de verdad y cuáles rinden mejor donde se usan
- **Muestra mínima:** 5 usos de la pieza. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `BrandingPremiumAgent`, 6 pasos encadenados:

1. Auditoría de marca actual y oportunidades (LLM)
2. Estrategia de marca — misión, visión, valores (LLM)
3. Sistema de identidad visual (LLM)
4. Voz y tono de marca — guidelines (LLM)
5. Aplicaciones de marca — web, social, print (LLM)
6. Brand book ejecutivo completo (LLM, Markdown)

**Cuentas que hace además de escribir.**

- `contraste-de-color` — Dice si el texto sobre el fondo se lee

**Contra qué se revisa lo que produce.**

Rúbrica `creatividad`, 5 comprobaciones:

- `una-pieza-por-canal` *(aviso)* — La pieza está hecha para el sitio donde se va a ver
- `hay-fuente-de-los-materiales` *(bloqueante)* — Se sabe de dónde salen las imágenes y las tipografías
- `se-puede-leer-lo-que-pone` *(aviso)* — El texto sobre la imagen se lee
- `respeta-lo-que-la-marca-no-hace` *(bloqueante)* — No propone lo que la marca tiene prohibido
- `sabe-donde-se-va-a-ver` *(aviso)* — La pieza se diseña para donde se va a usar

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.397 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- iterar sobre la pieza que mejor rinde
- retirar lo que nadie usa


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Ninguna. El trabajo de esta disciplina se entrega sin leer de una plataforma ajena.

**Cuándo deja de intentarlo y habla una persona.**

- la marca del cliente ha cambiado y las piezas ya no encajan

**Coste para el cliente.** 900 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `voz_premium` — Voz Premium

**Resultado de negocio.** Se juzga por `rendimiento_de_la_pieza`, vigilando `uso_de_la_pieza`, `sustituciones`, `coherencia_reportada`. Por debajo de un 20 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Contenido — Qué se publica, sobre qué y con qué frecuencia. KPIs del departamento: piezas publicadas, tráfico por pieza.

**Qué se le pregunta al cliente.**

- `preguntas_frecuentes_reales` — ¿Qué os preguntan todos los días, y qué respondéis?
- `cuando_pasar_a_una_persona` — ¿En qué casos quieres que deje de contestar el bot y lo coja alguien del equipo?
- `quien_llama_y_para_que` — ¿Quién os llama, a qué horas y para qué? Pedir cita, dudas, quejas…
- `que_nunca_debe_decir` — ¿Qué NO debe decir nunca quien conteste, aunque se lo pregunten?

**Qué se mide y quién lo aporta.**

- `rendimiento_de_conversaciones` *(lo mide el sistema)* — Cuántas conversaciones se resuelven solas y cuántas acaban en una persona
- **Muestra mínima:** 5 usos de la pieza. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `VozPremiumAgent`, 7 pasos encadenados:

1. Auditoría audio y voice search (LLM)
2. Roadmap podcast y skills (LLM)
3. Guiones podcast y audio ads (LLM)
4. SEO voz y distribución (LLM)
5. QA técnico audio LUFS (LLM)
6. Report alcance audio (LLM, Markdown)
7. Generación real de audio voz (ElevenLabs)

**Cuentas que hace además de escribir.**

- `arbol-de-conversacion` — Convierte las preguntas frecuentes en un árbol con salida a persona

**Contra qué se revisa lo que produce.**

Rúbrica `contenido`, 4 comprobaciones:

- `cabe-en-el-tiempo-del-cliente` *(aviso)* — El calendario se puede cumplir
- `no-todo-el-contenido-vende` *(aviso)* — No todas las piezas son para vender
- `responde-a-alguien-concreto` *(aviso)* — El contenido sabe a quién le habla
- `aporta-algo-que-no-esta-en-todas-partes` *(aviso)* — Dice algo que el cliente sabe y otros no

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.431 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- iterar sobre la pieza que mejor rinde
- retirar lo que nadie usa


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Ninguna. El trabajo de esta disciplina se entrega sin leer de una plataforma ajena.

**Cuándo deja de intentarlo y habla una persona.**

- la marca del cliente ha cambiado y las piezas ya no encajan

**Coste para el cliente.** 1200 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `bots_premium` — Bots Premium

**Resultado de negocio.** Se juzga por `rendimiento_de_la_pieza`, vigilando `uso_de_la_pieza`, `sustituciones`, `coherencia_reportada`. Por debajo de un 20 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Contenido — Qué se publica, sobre qué y con qué frecuencia. KPIs del departamento: piezas publicadas, tráfico por pieza.

**Qué se le pregunta al cliente.**

- `knowledge` — Documentación, manuales y material propio del cliente.
- `momentos_del_cliente` — ¿En qué momentos concretos quieres que le llegue algo? Compró, se registró, lleva tiempo sin volver…
- `quejas_que_se_repiten` — ¿De qué se queja la gente una y otra vez? ¿Hay algo que prefieras que no se conteste en público?
- `preguntas_frecuentes_reales` — ¿Qué os preguntan todos los días, y qué respondéis?
- `cuando_pasar_a_una_persona` — ¿En qué casos quieres que deje de contestar el bot y lo coja alguien del equipo?
- `que_nunca_debe_decir` — ¿Qué NO debe decir nunca quien conteste, aunque se lo pregunten?

**Qué se mide y quién lo aporta.**

- `rendimiento_de_conversaciones` *(lo mide el sistema)* — Cuántas conversaciones se resuelven solas y cuántas acaban en una persona
- **Muestra mínima:** 5 usos de la pieza. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `BotsPremiumAgent`, 6 pasos encadenados:

1. Análisis conversaciones y casos de uso (LLM)
2. Arquitectura intents y canales (LLM)
3. Diseño 3 bots e intents (LLM)
4. NLU, fallbacks, personalización (LLM)
5. QA conversacional y latencia (LLM)
6. Report tickets y CSAT (LLM, Markdown)

**Cuentas que hace además de escribir.**

- `arbol-de-conversacion` — Convierte las preguntas frecuentes en un árbol con salida a persona

**Contra qué se revisa lo que produce.**

Rúbrica `contenido`, 4 comprobaciones:

- `cabe-en-el-tiempo-del-cliente` *(aviso)* — El calendario se puede cumplir
- `no-todo-el-contenido-vende` *(aviso)* — No todas las piezas son para vender
- `responde-a-alguien-concreto` *(aviso)* — El contenido sabe a quién le habla
- `aporta-algo-que-no-esta-en-todas-partes` *(aviso)* — Dice algo que el cliente sabe y otros no

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.443 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- iterar sobre la pieza que mejor rinde
- retirar lo que nadie usa


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Ninguna. El trabajo de esta disciplina se entrega sin leer de una plataforma ajena.

**Cuándo deja de intentarlo y habla una persona.**

- la marca del cliente ha cambiado y las piezas ya no encajan

**Coste para el cliente.** 1100 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `personal_digital_premium` — Personal Digital Premium

**Resultado de negocio.** Se juzga por `conversiones_asistidas`, vigilando `lecturas_completas`, `tiempo_en_pagina`, `comparticiones`. Por debajo de un 20 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Contenido — Qué se publica, sobre qué y con qué frecuencia. KPIs del departamento: piezas publicadas, tráfico por pieza.

**Qué se le pregunta al cliente.**

- `quien_lo_va_a_usar` — ¿Quién va a usar esto en el día a día, y con qué nivel de manejo?
- `de_que_quieres_que_te_conozcan` — ¿Por qué tema quieres ser la persona de referencia?
- `cuanto_tiempo_puedes_dedicar` — ¿Cuánto tiempo puedes dedicarle tú a la semana, siendo realista?

**Qué se mide y quién lo aporta.**

- `rendimiento_del_contenido` *(lo mide el sistema)* — Qué piezas se leen, cuáles convierten y cuáles no las ve nadie
- **Muestra mínima:** 6 piezas publicadas. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `PersonalDigitalPremiumAgent`, 6 pasos encadenados:

1. Auditoría marca personal (LLM)
2. Plan thought leadership (LLM)
3. 30 posts LinkedIn y bio (LLM)
4. SEO perfil y engagement loops (LLM)
5. QA voz y diferenciación (LLM)
6. Report crecimiento audiencia (LLM, Markdown)

**Cuentas que hace además de escribir.**

- `calendario-viable` — Dice si el calendario cabe en las horas que el cliente tiene

**Contra qué se revisa lo que produce.**

Rúbrica `contenido`, 4 comprobaciones:

- `cabe-en-el-tiempo-del-cliente` *(aviso)* — El calendario se puede cumplir
- `no-todo-el-contenido-vende` *(aviso)* — No todas las piezas son para vender
- `responde-a-alguien-concreto` *(aviso)* — El contenido sabe a quién le habla
- `aporta-algo-que-no-esta-en-todas-partes` *(aviso)* — Dice algo que el cliente sabe y otros no

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.445 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- cambiar el ángulo de los temas
- cambiar el formato
- actualizar lo que ya funciona


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Ninguna. El trabajo de esta disciplina se entrega sin leer de una plataforma ajena.

**Cuándo deja de intentarlo y habla una persona.**

- tres ciclos sin que ninguna pieza pase de la media

**Coste para el cliente.** 700 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `advisor_empresarial_premium` — Advisor Empresarial Premium

**Resultado de negocio.** Se juzga por `rendimiento_de_la_pieza`, vigilando `uso_de_la_pieza`, `sustituciones`, `coherencia_reportada`. Por debajo de un 20 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Estrategia — Decide qué se hace por este cliente y en qué orden, a partir de sus objetivos. KPIs del departamento: objetivos con plan asignado, planes revisados tras medir resultados.

**Qué se le pregunta al cliente.**

- `lo_que_hacen_a_mano` — ¿Qué hacéis a mano cada semana que os come tiempo?
- `herramientas_que_usais` — ¿Qué programas usáis a diario y cuáles NO se pueden tocar?
- `de_que_quieres_que_te_conozcan` — ¿Por qué tema quieres ser la persona de referencia?
- `que_decision_hay_que_tomar` — ¿Qué decisión estáis intentando tomar con esta investigación?

**Qué se mide y quién lo aporta.**

- `analytics` *(lo mide el sistema)* — Datos de analítica del cliente.
- `rendimiento_de_la_operacion` *(lo mide el sistema)* — Cuánto tiempo se ahorra y qué procesos siguen atascados
- **Muestra mínima:** 5 usos de la pieza. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `AdvisorEmpresarialPremiumAgent`, 6 pasos encadenados:

1. Diagnóstico 360° DAFO (LLM)
2. Plan estratégico 12 meses (LLM)
3. 90 iniciativas y OKRs (LLM)
4. Quick wins y dashboard (LLM)
5. QA riesgos y financiero (LLM)
6. Report crecimiento 12m (LLM, Markdown)

**Cuentas que hace además de escribir.**

- `donde-esta-el-cuello-de-botella` — Dice en qué paso del embudo se pierde más y qué arreglarlo valdría

**Contra qué se revisa lo que produce.**

Rúbrica `estrategia`, 3 comprobaciones:

- `el-plan-cabe-en-el-presupuesto` *(bloqueante)* — Lo que se propone se puede pagar
- `no-repite-lo-que-ya-fallo` *(bloqueante)* — No propone otra vez lo que al cliente ya le salió mal
- `prioriza` *(aviso)* — Dice qué va primero

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.436 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- iterar sobre la pieza que mejor rinde
- retirar lo que nadie usa


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Ninguna. El trabajo de esta disciplina se entrega sin leer de una plataforma ajena.

**Cuándo deja de intentarlo y habla una persona.**

- la marca del cliente ha cambiado y las piezas ya no encajan

**Coste para el cliente.** 1300 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `canales_comunicaciones_premium` — Canales y Comunicaciones Premium

**Resultado de negocio.** Se juzga por `rendimiento_de_la_pieza`, vigilando `uso_de_la_pieza`, `sustituciones`, `coherencia_reportada`. Por debajo de un 20 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Contenido — Qué se publica, sobre qué y con qué frecuencia. KPIs del departamento: piezas publicadas, tráfico por pieza.

**Qué se le pregunta al cliente.**

- `canales` — ¿Dónde están hoy tus clientes y dónde quieres estar?
- `quejas_que_se_repiten` — ¿De qué se queja la gente una y otra vez? ¿Hay algo que prefieras que no se conteste en público?
- `preguntas_frecuentes_reales` — ¿Qué os preguntan todos los días, y qué respondéis?
- `cuando_pasar_a_una_persona` — ¿En qué casos quieres que deje de contestar el bot y lo coja alguien del equipo?
- `quien_llama_y_para_que` — ¿Quién os llama, a qué horas y para qué? Pedir cita, dudas, quejas…
- `que_nunca_debe_decir` — ¿Qué NO debe decir nunca quien conteste, aunque se lo pregunten?

**Qué se mide y quién lo aporta.**

- `rendimiento_de_conversaciones` *(lo mide el sistema)* — Cuántas conversaciones se resuelven solas y cuántas acaban en una persona
- **Muestra mínima:** 5 usos de la pieza. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `ComunicacionesPremiumAgent`, 6 pasos encadenados:

1. Auditoría omnicanal (LLM)
2. Arquitectura de canales (LLM)
3. Calendario 90d y plantillas (LLM)
4. Orquestación y A/B (LLM)
5. QA marca y GDPR/LOPD (LLM)
6. Report engagement por canal (LLM, Markdown)

**Cuentas que hace además de escribir.**

- `arbol-de-conversacion` — Convierte las preguntas frecuentes en un árbol con salida a persona

**Contra qué se revisa lo que produce.**

Rúbrica `contenido`, 4 comprobaciones:

- `cabe-en-el-tiempo-del-cliente` *(aviso)* — El calendario se puede cumplir
- `no-todo-el-contenido-vende` *(aviso)* — No todas las piezas son para vender
- `responde-a-alguien-concreto` *(aviso)* — El contenido sabe a quién le habla
- `aporta-algo-que-no-esta-en-todas-partes` *(aviso)* — Dice algo que el cliente sabe y otros no

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.443 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- iterar sobre la pieza que mejor rinde
- retirar lo que nadie usa


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Ninguna. El trabajo de esta disciplina se entrega sin leer de una plataforma ajena.

**Cuándo deja de intentarlo y habla una persona.**

- la marca del cliente ha cambiado y las piezas ya no encajan

**Coste para el cliente.** 950 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `social_media_premium` — Social Media Premium

**Resultado de negocio.** Se juzga por `alcance_util`, vigilando `tasa_de_interaccion`, `seguidores_netos`, `clics_al_sitio`. Por debajo de un 20 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Social media — Presencia y conversación en las redes donde están sus clientes. KPIs del departamento: alcance, interacción, tiempo de respuesta a comentarios.

**Qué se le pregunta al cliente.**

- `ubicaciones` — ¿Dónde estás? ¿Tienes más de un sitio?
- `canales` — ¿Dónde están hoy tus clientes y dónde quieres estar?
- `conexiones` — ¿Nos das acceso a tus cuentas para poder trabajar y medir?
- `lo_que_la_marca_no_hace` — ¿Hay algo que tu marca no haría nunca? Tono, colores, temas, comparaciones…
- `cuanto_tiempo_puedes_dedicar` — ¿Cuánto tiempo puedes dedicarle tú a la semana, siendo realista?

**Qué se mide y quién lo aporta.**

- `rendimiento_social` *(lo mide el sistema)* — Qué alcance útil y qué interacción tienen las publicaciones
- `audiencias` *(lo aporta NELVYON)* — Audiencias definidas para campañas.
- **Muestra mínima:** 8 publicaciones en el periodo. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `SocialMediaPremiumAgent`, 8 pasos encadenados:

1. Auditoría de presencia social actual (LLM)
2. Estrategia de contenido por plataforma (LLM)
3. Calendario editorial 30 días (LLM)
4. Estrategia de comunidad y engagement (LLM)
5. KPIs y plan de reporting mensual (LLM)
6. Report con estrategia y 30 días planificados (LLM, Markdown)
7. Genera calendario HTML + posts por plataforma (plantilla determinista)
8. Empaqueta calendario social en ZIP descargable

**Cuentas que hace además de escribir.**

- `calendario-viable` — Dice si el calendario cabe en las horas que el cliente tiene

**Contra qué se revisa lo que produce.**

Rúbrica `social`, 3 comprobaciones:

- `adaptado-a-la-red` *(aviso)* — Cada red tiene sus límites
- `no-el-mismo-post-en-todas` *(aviso)* — No se publica lo mismo en todas las redes
- `calendario-realista` *(aviso)* — La frecuencia cabe en el tiempo que el cliente tiene

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.38 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- cambiar la franja de publicación
- cambiar el reparto entre temas

Con aprobación humana obligatoria:

- cambiar el formato dominante — *toca el mundo real: publica_en_nombre_del_cliente*
- publicar más o menos — *toca el mundo real: publica_en_nombre_del_cliente*


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Google Ads `google-ads` — estado `oauth_ready`
- Meta Ads (Facebook/Instagram) `meta-ads` — estado `oauth_ready`
- TikTok Ads `tiktok-ads` — estado `stub`
- LinkedIn Ads `linkedin-ads` — estado `stub`

**Cuándo deja de intentarlo y habla una persona.**

- una publicación genera respuesta negativa sostenida
- la cuenta pierde alcance de forma brusca: puede ser una restricción de la plataforma

**Coste para el cliente.** 850 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `email_marketing_premium` — Email Marketing Premium

**Resultado de negocio.** Se juzga por `conversiones_por_envio`, vigilando `tasa_de_clic`, `tasa_de_baja`, `tasa_de_rebote`, `quejas_de_spam`. Por debajo de un 12 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Email y ciclo de vida — Qué se le dice a cada contacto según en qué momento está. KPIs del departamento: entregabilidad, apertura, conversión por secuencia, bajas.

**Qué se le pregunta al cliente.**

- `ofertas` — ¿Qué ofertas o promociones tienes activas?
- `lista_de_correo` — ¿Tu lista de correo de dónde salió y cuánta gente hay? ¿Te dieron permiso para escribirles?
- `momentos_del_cliente` — ¿En qué momentos concretos quieres que le llegue algo? Compró, se registró, lleva tiempo sin volver…

**Qué se mide y quién lo aporta.**

- `crm` *(lo mide el sistema)* — Datos de su embudo comercial: qué entra, qué convierte, qué se pierde.
- `salud_de_envio` *(lo mide el sistema)* — ¿Cuánta gente abre tus correos, y cuántos rebotan o te marcan como spam?
- `rendimiento_de_correo` *(lo mide el sistema)* — Qué conversión, bajas y quejas generan los envíos
- `buyer_personas` *(lo aporta NELVYON)* — ¿Quién decide la compra, y qué le preocupa?
- **Muestra mínima:** 500 envíos en el periodo. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `EmailMarketingPremiumAgent`, 8 pasos encadenados:

1. Auditoría de lista y segmentación (LLM)
2. Estrategia de automatizaciones y secuencias (LLM)
3. 10 emails asunto, preheader, body, CTA (LLM)
4. Optimización A/B y personalización (LLM)
5. QA deliverability y rendering (LLM)
6. Report ejecutivo con KPIs (LLM, Markdown)
7. Genera HTML responsive por email (plantilla determinista)
8. Empaqueta campaña de emails en ZIP descargable

**Cuentas que hace además de escribir.**

- `legibilidad` — Dice si el texto se entiende a la primera
- `salud-de-la-lista` — Dice si a esta lista se le puede escribir y en qué estado está

**Contra qué se revisa lo que produce.**

Rúbrica `email`, 4 comprobaciones:

- `tiene-baja` *(bloqueante)* — Todo correo puede dejar de recibirse
- `asunto-honesto` *(bloqueante)* — El asunto no engaña para que se abra
- `hay-consentimiento` *(bloqueante)* — A esta lista se le puede escribir
- `segmentado` *(aviso)* — No se manda lo mismo a toda la base

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.412 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- probar otro asunto
- afinar a quién se le manda

Con aprobación humana obligatoria:

- espaciar o juntar los envíos — *toca el mundo real: contacta_personas*
- quitar a quien lleva meses sin abrir — *toca el mundo real: es_irreversible*


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Klaviyo `klaviyo` — estado `planned`
- Mailchimp `mailchimp` — estado `planned`
- Amazon SES `amazon-ses` — estado `live`

**Cuándo deja de intentarlo y habla una persona.**

- las quejas de spam suben: eso pone en riesgo el dominio del cliente
- la tasa de rebote sube de golpe: la lista puede estar contaminada
- la tasa de baja se dispara: se está molestando a la gente

**Coste para el cliente.** 600 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `contenido_copywriting_premium` — Contenido y Copywriting Premium

**Resultado de negocio.** Se juzga por `conversiones_asistidas`, vigilando `lecturas_completas`, `tiempo_en_pagina`, `comparticiones`. Por debajo de un 20 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Copywriting — Lo que se dice: titulares, textos, guiones, correos. KPIs del departamento: textos aprobados a la primera, conversión de las piezas escritas.

**Qué se le pregunta al cliente.**

- `knowledge` — Documentación, manuales y material propio del cliente.
- `cuanto_tiempo_puedes_dedicar` — ¿Cuánto tiempo puedes dedicarle tú a la semana, siendo realista?
- `que_te_hace_citable` — ¿Qué datos, cifras o hechos propios tenéis que nadie más pueda dar?

**Qué se mide y quién lo aporta.**

- `rendimiento_del_contenido` *(lo mide el sistema)* — Qué piezas se leen, cuáles convierten y cuáles no las ve nadie
- `buyer_personas` *(lo aporta NELVYON)* — ¿Quién decide la compra, y qué le preocupa?
- `keywords` *(lo aporta NELVYON)* — ¿Por qué palabras quieres que te encuentren?
- **Muestra mínima:** 6 piezas publicadas. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `ContenidoCopywritingPremiumAgent`, 8 pasos encadenados:

1. Auditoría de voz y competidores (LLM)
2. Calendario 90d y topic clusters (LLM)
3. 15 piezas de contenido (LLM)
4. SEO on-page y meta copy (LLM)
5. QA tono y legibilidad (LLM)
6. Report tráfico y engagement (LLM, Markdown)
7. Genera índice HTML y piezas de contenido (plantilla determinista)
8. Empaqueta bundle de contenido en ZIP descargable

**Cuentas que hace además de escribir.**

- `calendario-viable` — Dice si el calendario cabe en las horas que el cliente tiene
- `legibilidad` — Dice si el texto se entiende a la primera
- `hueco-de-contenido` — Dice qué busca la gente que el cliente no responde

**Contra qué se revisa lo que produce.**

Rúbrica `contenido`, 4 comprobaciones:

- `cabe-en-el-tiempo-del-cliente` *(aviso)* — El calendario se puede cumplir
- `no-todo-el-contenido-vende` *(aviso)* — No todas las piezas son para vender
- `responde-a-alguien-concreto` *(aviso)* — El contenido sabe a quién le habla
- `aporta-algo-que-no-esta-en-todas-partes` *(aviso)* — Dice algo que el cliente sabe y otros no

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.41 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- cambiar el ángulo de los temas
- cambiar el formato
- actualizar lo que ya funciona


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Ninguna. El trabajo de esta disciplina se entrega sin leer de una plataforma ajena.

**Cuándo deja de intentarlo y habla una persona.**

- tres ciclos sin que ninguna pieza pase de la media

**Coste para el cliente.** 750 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `video_multimedia_premium` — Video y Multimedia Premium

**Resultado de negocio.** Se juzga por `rendimiento_de_la_pieza`, vigilando `uso_de_la_pieza`, `sustituciones`, `coherencia_reportada`. Por debajo de un 20 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Creatividad — Las piezas visuales: anuncios, imágenes, vídeo, diseño. KPIs del departamento: creatividades producidas, rendimiento por creatividad.

**Qué se le pregunta al cliente.**

- `lo_que_la_marca_no_hace` — ¿Hay algo que tu marca no haría nunca? Tono, colores, temas, comparaciones…
- `donde_se_usa_esto` — ¿Dónde se va a ver? Redes, escaparate, feria, web, packaging…
- `que_material_hay_grabado` — ¿Tenéis material grabado, fotos o accesos que se puedan reutilizar?
- `quien_sale_y_quien_no` — ¿Quién puede aparecer en cámara y quién prefiere no salir?

**Qué se mide y quién lo aporta.**

- `rendimiento_de_las_piezas` *(lo mide el sistema)* — Qué piezas se usan de verdad y cuáles rinden mejor donde se usan
- **Muestra mínima:** 5 usos de la pieza. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `VideoMultimediaPremiumAgent`, 7 pasos encadenados:

1. Benchmarks de video en sector (LLM)
2. Plan de producción y storyboards (LLM)
3. 5 guiones listos para producir (LLM)
4. Hooks, retención y CTAs (LLM)
5. QA producción y branding (LLM)
6. Report vistas y conversión (LLM, Markdown)
7. Generación real de video marketing (Runway)

**Cuentas que hace además de escribir.**

- `contraste-de-color` — Dice si el texto sobre el fondo se lee

**Contra qué se revisa lo que produce.**

Rúbrica `creatividad`, 5 comprobaciones:

- `una-pieza-por-canal` *(aviso)* — La pieza está hecha para el sitio donde se va a ver
- `hay-fuente-de-los-materiales` *(bloqueante)* — Se sabe de dónde salen las imágenes y las tipografías
- `se-puede-leer-lo-que-pone` *(aviso)* — El texto sobre la imagen se lee
- `respeta-lo-que-la-marca-no-hace` *(bloqueante)* — No propone lo que la marca tiene prohibido
- `sabe-donde-se-va-a-ver` *(aviso)* — La pieza se diseña para donde se va a usar

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.429 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- iterar sobre la pieza que mejor rinde
- retirar lo que nadie usa


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Ninguna. El trabajo de esta disciplina se entrega sin leer de una plataforma ajena.

**Cuándo deja de intentarlo y habla una persona.**

- la marca del cliente ha cambiado y las piezas ya no encajan

**Coste para el cliente.** 1400 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `3d_contenido_inmersivo_premium` — 3D e Inmersivo Premium

**Resultado de negocio.** Se juzga por `rendimiento_de_la_pieza`, vigilando `uso_de_la_pieza`, `sustituciones`, `coherencia_reportada`. Por debajo de un 20 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Creatividad — Las piezas visuales: anuncios, imágenes, vídeo, diseño. KPIs del departamento: creatividades producidas, rendimiento por creatividad.

**Qué se le pregunta al cliente.**

- `lo_que_la_marca_no_hace` — ¿Hay algo que tu marca no haría nunca? Tono, colores, temas, comparaciones…
- `donde_se_usa_esto` — ¿Dónde se va a ver? Redes, escaparate, feria, web, packaging…
- `que_hay_que_representar` — ¿Que producto o espacio hay que recrear, y tienes planos, medidas o fotos?
- `donde_se_va_a_ver_en_3d` — ¿Se va a ver en la web, en el movil, con gafas o en una pantalla de feria?

**Qué se mide y quién lo aporta.**

- `rendimiento_de_las_piezas` *(lo mide el sistema)* — Qué piezas se usan de verdad y cuáles rinden mejor donde se usan
- **Muestra mínima:** 5 usos de la pieza. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `TresDInmersivoPremiumAgent`, 7 pasos encadenados:

1. Viabilidad 3D / AR / VR sector (LLM)
2. Roadmap activos y formatos (LLM)
3. Especificaciones 5 escenas 3D (LLM)
4. Performance web 3D (LLM)
5. QA cross-browser y carga (LLM)
6. Report impacto y roadmap (LLM, Markdown)
7. Generación real de modelo 3D (Meshy)

**Cuentas que hace además de escribir.**

- `contraste-de-color` — Dice si el texto sobre el fondo se lee

**Contra qué se revisa lo que produce.**

Rúbrica `creatividad`, 5 comprobaciones:

- `una-pieza-por-canal` *(aviso)* — La pieza está hecha para el sitio donde se va a ver
- `hay-fuente-de-los-materiales` *(bloqueante)* — Se sabe de dónde salen las imágenes y las tipografías
- `se-puede-leer-lo-que-pone` *(aviso)* — El texto sobre la imagen se lee
- `respeta-lo-que-la-marca-no-hace` *(bloqueante)* — No propone lo que la marca tiene prohibido
- `sabe-donde-se-va-a-ver` *(aviso)* — La pieza se diseña para donde se va a usar

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.436 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- iterar sobre la pieza que mejor rinde
- retirar lo que nadie usa


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Ninguna. El trabajo de esta disciplina se entrega sin leer de una plataforma ajena.

**Cuándo deja de intentarlo y habla una persona.**

- la marca del cliente ha cambiado y las piezas ya no encajan

**Coste para el cliente.** 1600 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `fotografia_producto_premium` — Fotografía de Producto Premium

**Resultado de negocio.** Se juzga por `rendimiento_de_la_pieza`, vigilando `uso_de_la_pieza`, `sustituciones`, `coherencia_reportada`. Por debajo de un 20 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Creatividad — Las piezas visuales: anuncios, imágenes, vídeo, diseño. KPIs del departamento: creatividades producidas, rendimiento por creatividad.

**Qué se le pregunta al cliente.**

- `catalogo` — ¿Cuántas referencias tienes, y cuáles son las que de verdad te dan el dinero?
- `donde_se_usa_esto` — ¿Dónde se va a ver? Redes, escaparate, feria, web, packaging…
- `que_hay_que_representar` — ¿Que producto o espacio hay que recrear, y tienes planos, medidas o fotos?
- `que_material_hay_grabado` — ¿Tenéis material grabado, fotos o accesos que se puedan reutilizar?

**Qué se mide y quién lo aporta.**

- `rendimiento_de_las_piezas` *(lo mide el sistema)* — Qué piezas se usan de verdad y cuáles rinden mejor donde se usan
- **Muestra mínima:** 5 usos de la pieza. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `FotografiaProductoPremiumAgent`, 7 pasos encadenados:

1. Benchmarks fotográficos sector (LLM)
2. Plan fotográfico y shot list (LLM)
3. Brief iluminación y retoque (LLM)
4. Optimización web imágenes (LLM)
5. QA color y fondos (LLM)
6. Report CTR y tiempo en página (LLM, Markdown)
7. Generación real de assets fotográficos (DALL-E 3)

**Cuentas que hace además de escribir.**

- `contraste-de-color` — Dice si el texto sobre el fondo se lee

**Contra qué se revisa lo que produce.**

Rúbrica `creatividad`, 5 comprobaciones:

- `una-pieza-por-canal` *(aviso)* — La pieza está hecha para el sitio donde se va a ver
- `hay-fuente-de-los-materiales` *(bloqueante)* — Se sabe de dónde salen las imágenes y las tipografías
- `se-puede-leer-lo-que-pone` *(aviso)* — El texto sobre la imagen se lee
- `respeta-lo-que-la-marca-no-hace` *(bloqueante)* — No propone lo que la marca tiene prohibido
- `sabe-donde-se-va-a-ver` *(aviso)* — La pieza se diseña para donde se va a usar

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.409 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- iterar sobre la pieza que mejor rinde
- retirar lo que nadie usa


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Ninguna. El trabajo de esta disciplina se entrega sin leer de una plataforma ajena.

**Cuándo deja de intentarlo y habla una persona.**

- la marca del cliente ha cambiado y las piezas ya no encajan

**Coste para el cliente.** 900 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `diseno_grafico_creatividades_premium` — Diseño Gráfico Premium

**Resultado de negocio.** Se juzga por `rendimiento_de_la_pieza`, vigilando `uso_de_la_pieza`, `sustituciones`, `coherencia_reportada`. Por debajo de un 20 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Creatividad — Las piezas visuales: anuncios, imágenes, vídeo, diseño. KPIs del departamento: creatividades producidas, rendimiento por creatividad.

**Qué se le pregunta al cliente.**

- `lo_que_la_marca_no_hace` — ¿Hay algo que tu marca no haría nunca? Tono, colores, temas, comparaciones…
- `donde_se_usa_esto` — ¿Dónde se va a ver? Redes, escaparate, feria, web, packaging…
- `que_hay_que_conservar` — ¿Hay algo de la imagen actual que NO se pueda tocar? Logo, color, nombre…

**Qué se mide y quién lo aporta.**

- `rendimiento_de_las_piezas` *(lo mide el sistema)* — Qué piezas se usan de verdad y cuáles rinden mejor donde se usan
- `creatividades` *(lo aporta NELVYON)* — Creatividades disponibles y su rendimiento.
- **Muestra mínima:** 5 usos de la pieza. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `DisenoGraficoPremiumAgent`, 6 pasos encadenados:

1. Auditoría visual de marca y benchmarks (LLM)
2. Sistema visual: paleta, tipografía, grid (LLM)
3. Brief creativo 10 piezas (LLM)
4. Optimización multicanal y responsive (LLM)
5. QA WCAG y consistencia visual (LLM)
6. Report ejecutivo diseño (LLM, Markdown)

**Cuentas que hace además de escribir.**

- `contraste-de-color` — Dice si el texto sobre el fondo se lee

**Contra qué se revisa lo que produce.**

Rúbrica `creatividad`, 5 comprobaciones:

- `una-pieza-por-canal` *(aviso)* — La pieza está hecha para el sitio donde se va a ver
- `hay-fuente-de-los-materiales` *(bloqueante)* — Se sabe de dónde salen las imágenes y las tipografías
- `se-puede-leer-lo-que-pone` *(aviso)* — El texto sobre la imagen se lee
- `respeta-lo-que-la-marca-no-hace` *(bloqueante)* — No propone lo que la marca tiene prohibido
- `sabe-donde-se-va-a-ver` *(aviso)* — La pieza se diseña para donde se va a usar

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.411 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- iterar sobre la pieza que mejor rinde
- retirar lo que nadie usa


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Ninguna. El trabajo de esta disciplina se entrega sin leer de una plataforma ajena.

**Cuándo deja de intentarlo y habla una persona.**

- la marca del cliente ha cambiado y las piezas ya no encajan

**Coste para el cliente.** 650 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `consultoria_automatizacion_premium` — Consultoría y Automatización Premium

**Resultado de negocio.** Se juzga por `conversiones`, vigilando `velocidad_de_carga`, `errores_por_sesion`, `sesiones`, `valor_medio_pedido`. Por debajo de un 10 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Estrategia — Decide qué se hace por este cliente y en qué orden, a partir de sus objetivos. KPIs del departamento: objetivos con plan asignado, planes revisados tras medir resultados.

**Qué se le pregunta al cliente.**

- `lo_que_hacen_a_mano` — ¿Qué hacéis a mano cada semana que os come tiempo?
- `herramientas_que_usais` — ¿Qué programas usáis a diario y cuáles NO se pueden tocar?
- `quien_lo_va_a_usar` — ¿Quién va a usar esto en el día a día, y con qué nivel de manejo?
- `que_datos_tienen_que_viajar` — ¿Qué información tiene que pasar de un sitio a otro, y en qué dirección?

**Qué se mide y quién lo aporta.**

- `rendimiento_de_la_operacion` *(lo mide el sistema)* — Cuánto tiempo se ahorra y qué procesos siguen atascados
- **Muestra mínima:** 500 sesiones en el periodo. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `ConsultoriaAutomatizacionPremiumAgent`, 6 pasos encadenados:

1. Auditoría de procesos (LLM)
2. Roadmap automatización 90 días (LLM)
3. 5 flujos n8n/Zapier/Make (LLM)
4. KPIs y ROI (LLM)
5. QA flujos y fallbacks (LLM)
6. Report ahorro horas y ROI (LLM, Markdown)

**Cuentas que hace además de escribir.**

- `donde-esta-el-cuello-de-botella` — Dice en qué paso del embudo se pierde más y qué arreglarlo valdría
- `plan-de-integracion` — Dice qué partes de una integración necesitan cola, reintento o idempotencia

**Contra qué se revisa lo que produce.**

Rúbrica `estrategia`, 3 comprobaciones:

- `el-plan-cabe-en-el-presupuesto` *(bloqueante)* — Lo que se propone se puede pagar
- `no-repite-lo-que-ya-fallo` *(bloqueante)* — No propone otra vez lo que al cliente ya le salió mal
- `prioriza` *(aviso)* — Dice qué va primero

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.481 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- acelerar la carga
- arreglar los errores que ve el usuario
- quitar pasos del proceso de compra


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Google Analytics 4 `google-analytics-4` — estado `live`

**Cuándo deja de intentarlo y habla una persona.**

- las conversiones caen a cero: eso no es conversión, es algo roto
- los errores por sesión se disparan

**Coste para el cliente.** 1100 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `integraciones_apis_premium` — Integraciones y APIs Premium

**Resultado de negocio.** Se juzga por `conversiones`, vigilando `velocidad_de_carga`, `errores_por_sesion`, `sesiones`, `valor_medio_pedido`. Por debajo de un 10 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Operaciones — Que el trabajo encolado se ejecute, se reintente y no se pierda. KPIs del departamento: trabajos en dead_letter, tiempo medio en cola, trabajos rescatados.

**Qué se le pregunta al cliente.**

- `lo_que_hacen_a_mano` — ¿Qué hacéis a mano cada semana que os come tiempo?
- `herramientas_que_usais` — ¿Qué programas usáis a diario y cuáles NO se pueden tocar?
- `que_datos_tienen_que_viajar` — ¿Qué información tiene que pasar de un sitio a otro, y en qué dirección?
- `que_pasa_si_falla_la_conexion` — Si una conexión se cae media hora, ¿qué no puede perderse?

**Qué se mide y quién lo aporta.**

- `rendimiento_de_la_operacion` *(lo mide el sistema)* — Cuánto tiempo se ahorra y qué procesos siguen atascados
- **Muestra mínima:** 500 sesiones en el periodo. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `IntegracionesApisPremiumAgent`, 6 pasos encadenados:

1. Ecosistema y gaps de integración (LLM)
2. Arquitectura API, webhooks, auth (LLM)
3. Especificaciones 5 integraciones (LLM)
4. Caching, retry, circuit breakers (LLM)
5. QA contratos y seguridad tokens (LLM)
6. Report plazo e impacto (LLM, Markdown)

**Cuentas que hace además de escribir.**

- `plan-de-integracion` — Dice qué partes de una integración necesitan cola, reintento o idempotencia

**Contra qué se revisa lo que produce.**

Rúbrica `estrategia`, 3 comprobaciones:

- `el-plan-cabe-en-el-presupuesto` *(bloqueante)* — Lo que se propone se puede pagar
- `no-repite-lo-que-ya-fallo` *(bloqueante)* — No propone otra vez lo que al cliente ya le salió mal
- `prioriza` *(aviso)* — Dice qué va primero

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.436 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- acelerar la carga
- arreglar los errores que ve el usuario
- quitar pasos del proceso de compra


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Google Analytics 4 `google-analytics-4` — estado `live`

**Cuándo deja de intentarlo y habla una persona.**

- las conversiones caen a cero: eso no es conversión, es algo roto
- los errores por sesión se disparan

**Coste para el cliente.** 1250 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `mantenimiento_web_premium` — Mantenimiento Web Premium

**Resultado de negocio.** Se juzga por `conversiones`, vigilando `velocidad_de_carga`, `errores_por_sesion`, `sesiones`, `valor_medio_pedido`. Por debajo de un 10 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Web — Que la web exista, funcione y se pueda cambiar. KPIs del departamento: disponibilidad, velocidad, incidencias.

**Qué se le pregunta al cliente.**

- `que_tiene_que_hacer_la_web` — Cuando alguien entra en tu web, ¿qué quieres que haga exactamente?
- `herramientas_que_usais` — ¿Qué programas usáis a diario y cuáles NO se pueden tocar?
- `quien_lo_va_a_usar` — ¿Quién va a usar esto en el día a día, y con qué nivel de manejo?

**Qué se mide y quién lo aporta.**

- `rendimiento_del_sitio` *(lo mide el sistema)* — Cuánta gente entra, cuánta convierte y a qué velocidad carga
- **Muestra mínima:** 500 sesiones en el periodo. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `MantenimientoWebPremiumAgent`, 6 pasos encadenados:

1. Auditoría técnica, CWV, seguridad (LLM)
2. Plan mantenimiento mensual (LLM)
3. Checklist 30 puntos (LLM)
4. Performance LCP/CLS/INP (LLM)
5. Uptime, alertas, contingencia (LLM)
6. Report SLA y salud (LLM, Markdown)

**Cuentas que hace además de escribir.**

- `plan-de-integracion` — Dice qué partes de una integración necesitan cola, reintento o idempotencia

**Contra qué se revisa lo que produce.**

Rúbrica `web`, 4 comprobaciones:

- `destino-declarado` *(bloqueante)* — Los botones llevan a algún sitio
- `texto-alternativo` *(aviso)* — Las imágenes se pueden leer sin verlas
- `formulario-pide-lo-justo` *(aviso)* — El formulario no ahuyenta con preguntas de más
- `una-idea-por-pantalla` *(aviso)* — Cada pantalla pide una sola cosa

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.425 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- acelerar la carga
- arreglar los errores que ve el usuario
- quitar pasos del proceso de compra


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Google Analytics 4 `google-analytics-4` — estado `live`

**Cuándo deja de intentarlo y habla una persona.**

- las conversiones caen a cero: eso no es conversión, es algo roto
- los errores por sesión se disparan

**Coste para el cliente.** 450 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `reputacion_online_orm_premium` — Reputación y ORM Premium

**Resultado de negocio.** Se juzga por `valoracion_media`, vigilando `resenas_nuevas`, `tiempo_de_respuesta`, `resenas_sin_responder`. Por debajo de un 5 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Reputación — Qué se dice del cliente y cómo se responde. KPIs del departamento: valoración media, reseñas respondidas, tiempo de respuesta.

**Qué se le pregunta al cliente.**

- `donde_te_resenan` — ¿Dónde te dejan reseñas y quién responde ahora mismo?
- `quejas_que_se_repiten` — ¿De qué se queja la gente una y otra vez? ¿Hay algo que prefieras que no se conteste en público?
- `quien_puede_responder_en_publico` — ¿Quién puede responder en vuestro nombre y qué tiene que aprobar alguien antes?
- `que_resenas_son_ciertas` — De lo que os critican, ¿qué es verdad y estáis arreglando?
- `donde_te_mencionan_ya` — ¿En qué sitios ajenos a vosotros ya se os nombra? (prensa, directorios, socios, foros)

**Qué se mide y quién lo aporta.**

- `rendimiento_de_reputacion` *(lo mide el sistema)* — Qué valoración media y qué reseñas nuevas hay
- **Muestra mínima:** 10 reseñas en el periodo. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `ReputacionOrmPremiumAgent`, 6 pasos encadenados:

1. Auditoría reputación y sentimiento (LLM)
2. Plan ORM 90 días y crisis (LLM)
3. 10 plantillas de respuesta (LLM)
4. Monitoreo y SEO reputacional (LLM)
5. QA escalación y SLA (LLM)
6. Report score reputación (LLM, Markdown)

**Cuentas que hace además de escribir.**

- `clasificar-resenas` — Separa las reseñas por lo que se repite y por gravedad

**Contra qué se revisa lo que produce.**

Rúbrica `reputacion`, 3 comprobaciones:

- `no-discute-en-publico` *(bloqueante)* — No se discute con un cliente insatisfecho
- `no-la-misma-respuesta-a-todos` *(aviso)* — No se contesta con plantilla a todas las reseñas
- `no-pide-borrar-la-resena` *(bloqueante)* — No se le pide a nadie que quite lo que escribió

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.431 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- avisar al cliente de lo que se repite en las quejas

Con aprobación humana obligatoria:

- responder más rápido — *toca el mundo real: publica_en_nombre_del_cliente*
- pedir reseña a quien ha quedado contento — *toca el mundo real: contacta_personas*


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Ninguna. El trabajo de esta disciplina se entrega sin leer de una plataforma ajena.

**Cuándo deja de intentarlo y habla una persona.**

- una queja se repite: eso no lo arregla una respuesta, lo arregla el cliente
- aparece una reseña con acusación grave

**Coste para el cliente.** 1000 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `formacion_capacitacion_digital_premium` — Formación Digital Premium

**Resultado de negocio.** Se juzga por `conversiones_asistidas`, vigilando `lecturas_completas`, `tiempo_en_pagina`, `comparticiones`. Por debajo de un 20 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Contenido — Qué se publica, sobre qué y con qué frecuencia. KPIs del departamento: piezas publicadas, tráfico por pieza.

**Qué se le pregunta al cliente.**

- `quien_lo_va_a_usar` — ¿Quién va a usar esto en el día a día, y con qué nivel de manejo?
- `que_tienen_que_saber_hacer` — Al terminar la formacion, ¿que tienen que ser capaces de hacer solos?
- `cuanto_tiempo_de_formacion` — ¿Cuanto tiempo puede dedicar el equipo, y en que formato? Presencial, en video, poco a poco…

**Qué se mide y quién lo aporta.**

- `rendimiento_del_contenido` *(lo mide el sistema)* — Qué piezas se leen, cuáles convierten y cuáles no las ve nadie
- **Muestra mínima:** 6 piezas publicadas. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `FormacionCapacitacionPremiumAgent`, 6 pasos encadenados:

1. Diagnóstico formativo y benchmarks (LLM)
2. Plan formativo 90 días y LMS (LLM)
3. 5 cursos con temario y evaluaciones (LLM)
4. Gamificación y learning paths (LLM)
5. QA pedagógico y accesibilidad (LLM)
6. Report ROI formativo (LLM, Markdown)

**Cuentas que hace además de escribir.**

- `calendario-viable` — Dice si el calendario cabe en las horas que el cliente tiene

**Contra qué se revisa lo que produce.**

Rúbrica `contenido`, 4 comprobaciones:

- `cabe-en-el-tiempo-del-cliente` *(aviso)* — El calendario se puede cumplir
- `no-todo-el-contenido-vende` *(aviso)* — No todas las piezas son para vender
- `responde-a-alguien-concreto` *(aviso)* — El contenido sabe a quién le habla
- `aporta-algo-que-no-esta-en-todas-partes` *(aviso)* — Dice algo que el cliente sabe y otros no

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.431 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- cambiar el ángulo de los temas
- cambiar el formato
- actualizar lo que ya funciona


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Ninguna. El trabajo de esta disciplina se entrega sin leer de una plataforma ajena.

**Cuándo deja de intentarlo y habla una persona.**

- tres ciclos sin que ninguna pieza pase de la media

**Coste para el cliente.** 550 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `influencer_marketing_premium` — Influencer Marketing Premium

**Resultado de negocio.** Se juzga por `alcance_util`, vigilando `tasa_de_interaccion`, `seguidores_netos`, `clics_al_sitio`. Por debajo de un 20 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Social media — Presencia y conversación en las redes donde están sus clientes. KPIs del departamento: alcance, interacción, tiempo de respuesta a comentarios.

**Qué se le pregunta al cliente.**

- `presupuestos` — ¿Cuánto puedes invertir al mes, y en qué?
- `con_quien_no_quieres_aparecer` — ¿Con qué tipo de perfiles NO quieres que se te asocie?
- `colaboraciones_previas` — ¿Has trabajado ya con creadores? ¿Qué tal fue y qué pagaste?

**Qué se mide y quién lo aporta.**

- `rendimiento_de_campanas` *(lo mide el sistema)* — Qué cuesta una adquisición y qué devuelve la inversión
- `rendimiento_social` *(lo mide el sistema)* — Qué alcance útil y qué interacción tienen las publicaciones
- **Muestra mínima:** 8 publicaciones en el periodo. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `InfluencerMarketingPremiumAgent`, 6 pasos encadenados:

1. Mapa de influencers y engagement (LLM)
2. Plan macro/micro/nano y presupuesto (LLM)
3. Brief 5 campañas (LLM)
4. UTM, descuentos, atribución (LLM)
5. Compliance FTC y contratos (LLM)
6. Report alcance y CPM (LLM, Markdown)

**Cuentas que hace además de escribir.**

- `reparto-de-presupuesto` — Dice en cuántos canales se puede estar de verdad con el presupuesto que hay

**Contra qué se revisa lo que produce.**

Rúbrica `social`, 3 comprobaciones:

- `adaptado-a-la-red` *(aviso)* — Cada red tiene sus límites
- `no-el-mismo-post-en-todas` *(aviso)* — No se publica lo mismo en todas las redes
- `calendario-realista` *(aviso)* — La frecuencia cabe en el tiempo que el cliente tiene

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.437 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- cambiar la franja de publicación
- cambiar el reparto entre temas

Con aprobación humana obligatoria:

- cambiar el formato dominante — *toca el mundo real: publica_en_nombre_del_cliente*
- publicar más o menos — *toca el mundo real: publica_en_nombre_del_cliente*


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Google Ads `google-ads` — estado `oauth_ready`
- Meta Ads (Facebook/Instagram) `meta-ads` — estado `oauth_ready`
- TikTok Ads `tiktok-ads` — estado `stub`
- LinkedIn Ads `linkedin-ads` — estado `stub`

**Cuándo deja de intentarlo y habla una persona.**

- una publicación genera respuesta negativa sostenida
- la cuenta pierde alcance de forma brusca: puede ser una restricción de la plataforma

**Coste para el cliente.** 1500 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `landing_premium` — Landing Page Premium

**Resultado de negocio.** Se juzga por `tasa_de_conversion`, vigilando `abandono_por_paso`, `tiempo_hasta_conversion`, `valor_medio`. Por debajo de un 8 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** CRO y experimentación — Que de las visitas que ya hay salgan más clientes. KPIs del departamento: experimentos concluidos, mejora de conversión demostrada.

**Qué se le pregunta al cliente.**

- `donde_se_atascan` — ¿En qué paso se te cae la gente? ¿Qué te dicen que les frena?
- `que_tiene_que_hacer_la_web` — Cuando alguien entra en tu web, ¿qué quieres que haga exactamente?

**Qué se mide y quién lo aporta.**

- `trafico_actual` *(lo mide el sistema)* — ¿Cuánta gente entra en tu web al mes y cuántos acaban comprando o dejando sus datos?
- `rendimiento_del_sitio` *(lo mide el sistema)* — Cuánta gente entra, cuánta convierte y a qué velocidad carga
- **Muestra mínima:** 1000 visitas por variante. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `LandingPremiumAgent`, 8 pasos encadenados:

1. Analiza el brief de la landing (LLM)
2. Propone arquitectura visual de conversión (LLM)
3. Genera copy hero, prueba social y formulario (LLM)
4. SEO on-page de la landing (LLM)
5. Checklist QA CRO (LLM)
6. Reporte de entrega landing (LLM, markdown)
7. Genera index.html + CSS (plantilla determinista)
8. Empaqueta landing en ZIP descargable

**Cuentas que hace además de escribir.**

- `economia-de-unidad` — Dice si cada venta deja dinero o lo pierde
- `muestra-necesaria` — Dice cuánto tráfico hace falta para que un experimento concluya
- `legibilidad` — Dice si el texto se entiende a la primera
- `contraste-de-color` — Dice si el texto sobre el fondo se lee

**Contra qué se revisa lo que produce.**

Rúbrica `web`, 4 comprobaciones:

- `destino-declarado` *(bloqueante)* — Los botones llevan a algún sitio
- `texto-alternativo` *(aviso)* — Las imágenes se pueden leer sin verlas
- `formulario-pide-lo-justo` *(aviso)* — El formulario no ahuyenta con preguntas de más
- `una-idea-por-pantalla` *(aviso)* — Cada pantalla pide una sola cosa

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.342 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- probar otro titular
- quitar campos del formulario
- cambiar el orden de los pasos
- cambiar la llamada a la acción


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Google Analytics 4 `google-analytics-4` — estado `live`

**Cuándo deja de intentarlo y habla una persona.**

- el tráfico no da para alcanzar significación en un plazo razonable
- dos experimentos seguidos dan resultados contradictorios

**Coste para el cliente.** 950 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `funnel_premium` — Funnel Multi-paso Premium

**Resultado de negocio.** Se juzga por `tasa_de_conversion`, vigilando `abandono_por_paso`, `tiempo_hasta_conversion`, `valor_medio`. Por debajo de un 8 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Embudos y landing — El camino desde el clic hasta la conversión. KPIs del departamento: conversión del embudo, abandono por paso.

**Qué se le pregunta al cliente.**

- `ofertas` — ¿Qué ofertas o promociones tienes activas?
- `lista_de_correo` — ¿Tu lista de correo de dónde salió y cuánta gente hay? ¿Te dieron permiso para escribirles?
- `momentos_del_cliente` — ¿En qué momentos concretos quieres que le llegue algo? Compró, se registró, lleva tiempo sin volver…
- `donde_se_atascan` — ¿En qué paso se te cae la gente? ¿Qué te dicen que les frena?
- `cuando_un_contacto_es_bueno` — ¿En qué se nota que un contacto merece la pena antes de llamarle?

**Qué se mide y quién lo aporta.**

- `crm` *(lo mide el sistema)* — Datos de su embudo comercial: qué entra, qué convierte, qué se pierde.
- `trafico_actual` *(lo mide el sistema)* — ¿Cuánta gente entra en tu web al mes y cuántos acaban comprando o dejando sus datos?
- `rendimiento_de_correo` *(lo mide el sistema)* — Qué conversión, bajas y quejas generan los envíos
- `rendimiento_del_sitio` *(lo mide el sistema)* — Cuánta gente entra, cuánta convierte y a qué velocidad carga
- `buyer_personas` *(lo aporta NELVYON)* — ¿Quién decide la compra, y qué le preocupa?
- **Muestra mínima:** 1000 visitas por variante. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `FunnelPremiumAgent`, 8 pasos encadenados:

1. Análisis de mercado y oportunidad del funnel (LLM)
2. Arquitectura de páginas del funnel (LLM)
3. Estrategia de oferta y copy por etapa (LLM)
4. CRO multi-paso: opt-in, oferta, cierre (LLM)
5. SEO y tracking del funnel (LLM)
6. Reporte ejecutivo del funnel (LLM, Markdown)
7. Genera paso1–3 HTML + JS de navegación (plantilla determinista)
8. Empaqueta funnel en ZIP descargable

**Cuentas que hace además de escribir.**

- `donde-esta-el-cuello-de-botella` — Dice en qué paso del embudo se pierde más y qué arreglarlo valdría
- `economia-de-unidad` — Dice si cada venta deja dinero o lo pierde
- `muestra-necesaria` — Dice cuánto tráfico hace falta para que un experimento concluya
- `salud-de-la-lista` — Dice si a esta lista se le puede escribir y en qué estado está

**Contra qué se revisa lo que produce.**

Rúbrica `cro`, 3 comprobaciones:

- `hipotesis-antes-que-cambio` *(bloqueante)* — Cada experimento dice qué espera y por qué
- `hay-trafico-para-concluir` *(bloqueante)* — El experimento puede llegar a una conclusión
- `criterio-fijado-antes` *(bloqueante)* — El criterio de éxito se fija antes de empezar

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.358 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- probar otro titular
- quitar campos del formulario
- cambiar el orden de los pasos
- cambiar la llamada a la acción


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Google Analytics 4 `google-analytics-4` — estado `live`

**Cuándo deja de intentarlo y habla una persona.**

- el tráfico no da para alcanzar significación en un plazo razonable
- dos experimentos seguidos dan resultados contradictorios

**Coste para el cliente.** 1050 €.

**Lo que este contrato todavía no puede declarar.**

- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `crm_captacion_premium` — CRM y Captación Premium

**Resultado de negocio.** Se juzga por `leads_cualificados`, vigilando `tasa_de_cualificacion`, `tiempo_hasta_primer_contacto`, `cierres`, `coste_por_lead`. Por debajo de un 15 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Captación — Conseguir contactos cualificados. KPIs del departamento: leads, leads cualificados, coste por lead cualificado.

**Qué se le pregunta al cliente.**

- `de_donde_llegan_los_contactos` — ¿Por dónde te llegan los contactos hoy y cuántos al mes?
- `cuando_un_contacto_es_bueno` — ¿En qué se nota que un contacto merece la pena antes de llamarle?
- `quien_llama_y_cuando` — ¿Quién contacta con un lead nuevo, en cuánto tiempo y por qué canal?
- `por_que_se_pierden` — De los que no compran, ¿por qué motivos se caen?
- `cuanto_tarda_en_comprar` — Desde que alguien os conoce hasta que compra, ¿cuánto suele pasar?

**Qué se mide y quién lo aporta.**

- `rendimiento_del_embudo_comercial` *(lo mide el sistema)* — Cuántos contactos entran, cuántos se cualifican y cuántos cierran
- **Muestra mínima:** 40 leads en el periodo. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `CrmCaptacionPremiumAgent`, 6 pasos encadenados:

1. Diagnostico del embudo comercial (LLM)
2. Criterio de cualificacion con reglas justificadas (LLM)
3. Secuencias de contacto por tramo (LLM)
4. Enrutado, SLA y medicion (LLM)
5. QA de consentimiento y datos personales (LLM)
6. Informe de captacion (LLM, Markdown)

**Cuentas que hace además de escribir.**

- `donde-esta-el-cuello-de-botella` — Dice en qué paso del embudo se pierde más y qué arreglarlo valdría

**Contra qué se revisa lo que produce.**

Rúbrica `crm`, 3 comprobaciones:

- `sin-duplicados` *(aviso)* — Un contacto, una ficha
- `cada-lead-tiene-dueno` *(aviso)* — Alguien es responsable de cada contacto
- `cualificacion-explicada` *(aviso)* — Se dice por qué un lead es bueno

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.365 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- afinar qué contacto se considera bueno
- reducir el tiempo hasta el primer contacto
- cambiar qué se pregunta al captar

Con aprobación humana obligatoria:

- reactivar contactos antiguos — *toca el mundo real: contacta_personas*


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- HubSpot CRM `hubspot-crm` — estado `planned`
- Salesforce `salesforce-crm` — estado `planned`
- Klaviyo `klaviyo` — estado `planned`
- Mailchimp `mailchimp` — estado `planned`
- Amazon SES `amazon-ses` — estado `live`

**Cuándo deja de intentarlo y habla una persona.**

- el coste por lead cualificado supera lo que deja un cliente
- ventas dice que los leads no sirven: eso no lo arregla más volumen

**Coste para el cliente.** **Sin decidir.** No es facturable.

**Lo que este contrato todavía no puede declarar.**

- **Precio** — `BUSINESS_DECISION_REQUIRED`. el servicio es nuevo y nadie ha decidido cuánto vale. Hay un importe puesto para que las estructuras que lo rodean funcionen, y `precioFacturable()` devuelve `null` para que ese importe no llegue nunca a una pasarela.
- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `analitica_atribucion_premium` — Analítica y Atribución Premium

**Resultado de negocio.** Se juzga por `cobertura_de_medicion`, vigilando `discrepancia_entre_fuentes`, `conversiones_sin_origen`, `eventos_perdidos`. Por debajo de un 10 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Analítica y atribución — Saber qué pasó de verdad y a qué se debió. KPIs del departamento: objetivos con línea base, acciones con resultado atribuido.

**Qué se le pregunta al cliente.**

- `que_cuenta_como_conversion` — ¿Qué acción cuenta como una conversión para ti? ¿Y cuánto vale una?
- `que_se_esta_midiendo_ya` — ¿Qué herramientas de medición tenéis puestas y desde cuándo?
- `cuanto_tarda_en_comprar` — Desde que alguien os conoce hasta que compra, ¿cuánto suele pasar?

**Qué se mide y quién lo aporta.**

- `salud_de_la_medicion` *(lo mide el sistema)* — Si las etiquetas miden bien, si hay huecos y si los números cuadran entre herramientas
- **Muestra mínima:** 500 sesiones medidas. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `AnaliticaAtribucionPremiumAgent`, 6 pasos encadenados:

1. Auditoria del estado de la medicion (LLM)
2. Plan de medicion y diccionario de eventos (LLM)
3. Modelo de atribucion y ventana (LLM)
4. Cuadro de mando y alertas (LLM)
5. QA de contradicciones y doble conteo (LLM)
6. Informe de fiabilidad de los datos (LLM, Markdown)

**Cuentas que hace además de escribir.**

- `cuadran-las-fuentes` — Dice cuánto discrepan dos formas de contar lo mismo y si eso es tolerable

**Contra qué se revisa lo que produce.**

Rúbrica `analitica`, 4 comprobaciones:

- `compara-con-algo` *(aviso)* — Un número solo no dice nada
- `no-confunde-correlacion-con-causa` *(bloqueante)* — No atribuye un resultado a una acción sin más
- `el-cero-no-se-presenta-como-caida` *(bloqueante)* — Un cero repentino se trata como medición rota, no como desplome
- `el-porcentaje-lleva-denominador` *(aviso)* — Ningún porcentaje se presenta sin decir sobre cuántos

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.325 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- arreglar las etiquetas que no disparan
- unificar qué cuenta como conversión
- ajustar la ventana de atribución al ciclo real
- etiquetar bien el origen de las campañas


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Google Analytics 4 `google-analytics-4` — estado `live`
- Google Ads `google-ads` — estado `oauth_ready`
- Meta Ads (Facebook/Instagram) `meta-ads` — estado `oauth_ready`
- TikTok Ads `tiktok-ads` — estado `stub`
- LinkedIn Ads `linkedin-ads` — estado `stub`
- Google Search Console `google-search-console` — estado `live`
- SEMrush `semrush` — estado `stub`

**Cuándo deja de intentarlo y habla una persona.**

- las fuentes discrepan más de un 30 %: no se puede informar de nada con eso
- hay conversiones que nadie sabe de dónde vienen y son mayoría

**Coste para el cliente.** **Sin decidir.** No es facturable.

**Lo que este contrato todavía no puede declarar.**

- **Precio** — `BUSINESS_DECISION_REQUIRED`. el servicio es nuevo y nadie ha decidido cuánto vale. Hay un importe puesto para que las estructuras que lo rodean funcionen, y `precioFacturable()` devuelve `null` para que ese importe no llegue nunca a una pasarela.
- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.

---

## `inteligencia_mercado_premium` — Inteligencia de Mercado Premium

**Resultado de negocio.** Se juzga por `decisiones_informadas`, vigilando `hallazgos_accionables`, `hallazgos_confirmados`, `tiempo_hasta_el_hallazgo`. Por debajo de un 25 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Inteligencia de mercado — Qué está pasando en el sector del cliente y qué buscan sus compradores. KPIs del departamento: hallazgos que cambiaron un plan. **Estado: planeado.** Necesita fuentes de datos de mercado que hoy no están conectadas; sin ellas produciría opinión, no inteligencia.

**Qué se le pregunta al cliente.**

- `contra_quien_compites_de_verdad` — Cuando un cliente no te elige a ti, ¿a quién elige?
- `que_decision_hay_que_tomar` — ¿Qué decisión estáis intentando tomar con esta investigación?
- `donde_quieres_mirar` — ¿Qué mercado, zona o segmento hay que estudiar?

**Qué se mide y quién lo aporta.**

- `movimientos_del_mercado` *(lo mide el sistema)* — Qué hacen los competidores, qué precios mueven y qué está cambiando
- **Muestra mínima:** 5 hallazgos con fuente. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `InteligenciaMercadoPremiumAgent`, 6 pasos encadenados:

1. Encuadre: que decision hay que tomar (LLM)
2. Mapa competitivo verificable (LLM)
3. Hallazgos con fuente y origen (LLM)
4. Implicaciones ancladas a hallazgos (LLM)
5. QA adversarial del informe (LLM)
6. Informe de mercado (LLM, Markdown)

**Cuentas que hace además de escribir.**

- `concentracion-del-mercado` — Dice si un mercado está repartido o dominado, con la cuenta a la vista

**Contra qué se revisa lo que produce.**

Rúbrica `investigacion`, 5 comprobaciones:

- `cada-hallazgo-lleva-fuente` *(bloqueante)* — Ningún hallazgo se afirma sin decir de dónde sale
- `distingue-medido-de-estimado` *(bloqueante)* — Una cifra estimada se presenta como estimada
- `el-competidor-se-puede-identificar` *(bloqueante)* — Cada competidor citado se puede localizar
- `responde-a-la-decision-que-se-iba-a-tomar` *(bloqueante)* — El informe contesta a la pregunta por la que se encargó
- `no-generaliza-desde-cuatro-casos` *(aviso)* — No se saca una conclusión de mercado de una muestra minúscula

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.37 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- estrechar la pregunta de investigación
- cambiar de dónde se saca la información
- profundizar en un solo competidor


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Ninguna. El trabajo de esta disciplina se entrega sin leer de una plataforma ajena.

**Cuándo deja de intentarlo y habla una persona.**

- la investigación no cambia ninguna decisión: entonces no hacía falta
- los datos que harían falta no son públicos ni comprables

**Coste para el cliente.** **Sin decidir.** No es facturable.

**Lo que este contrato todavía no puede declarar.**

- **Precio** — `BUSINESS_DECISION_REQUIRED`. el servicio es nuevo y nadie ha decidido cuánto vale. Hay un importe puesto para que las estructuras que lo rodean funcionen, y `precioFacturable()` devuelve `null` para que ese importe no llegue nunca a una pasarela.
- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.
- **Departamento responsable (Inteligencia de mercado)** — `REAL_PROVIDER_REQUIRED`. Necesita fuentes de datos de mercado que hoy no están conectadas; sin ellas produciría opinión, no inteligencia.

---

## `geo_ai_search_premium` — Visibilidad en Buscadores de IA Premium

**Resultado de negocio.** Se juzga por `menciones_en_respuestas_de_ia`, vigilando `senales_de_entidad`, `citas_con_enlace`, `cobertura_de_preguntas`. Por debajo de un 20 % de variación no se toca nada: sería reaccionar a ruido.

**Quién responde.** Visibilidad en buscadores de IA — Que los asistentes de IA citen al cliente cuando alguien pregunta por lo que vende. KPIs del departamento: menciones en respuestas de IA, señales de entidad reconocidas. **Estado: planeado.** Medir visibilidad en respuestas de IA exige consultar modelos de terceros de forma repetida, y eso genera coste externo que hoy no está autorizado.

**Qué se le pregunta al cliente.**

- `que_te_preguntarian_a_ti` — Si alguien le preguntara a una IA por lo que vendes, ¿qué preguntaría?
- `que_te_hace_citable` — ¿Qué datos, cifras o hechos propios tenéis que nadie más pueda dar?
- `donde_te_mencionan_ya` — ¿En qué sitios ajenos a vosotros ya se os nombra? (prensa, directorios, socios, foros)

**Qué se mide y quién lo aporta.**

- `menciones_en_respuestas_de_ia` *(lo mide el sistema)* — Con qué frecuencia se cita al cliente en las respuestas de los asistentes
- `senales_de_entidad` *(lo aporta NELVYON)* — Dónde aparece la empresa como entidad reconocible y con qué datos
- **Muestra mínima:** 20 preguntas comprobadas. Por debajo de ahí no se concluye: no se sabe.

**Cómo se hace el trabajo.**

Agente `GeoAiSearchPremiumAgent`, 6 pasos encadenados:

1. Inventario de preguntas reales (LLM)
2. Auditoria de senales de entidad (LLM)
3. Contenido citable con dato propio (LLM)
4. Marcado y plan de refuerzo (LLM)
5. QA: nada de prometer posiciones (LLM)
6. Informe de visibilidad en IA (LLM, Markdown)

**Cuentas que hace además de escribir.**

- `hueco-de-contenido` — Dice qué busca la gente que el cliente no responde

**Contra qué se revisa lo que produce.**

Rúbrica `geo`, 5 comprobaciones:

- `no-promete-aparecer-en-la-ia` *(bloqueante)* — No se garantiza salir citado en un asistente
- `las-preguntas-son-preguntas` *(aviso)* — Se trabaja sobre preguntas completas, no sobre palabras clave
- `responde-antes-de-enrollarse` *(aviso)* — La respuesta aparece al principio, no al final
- `aporta-algo-que-no-esta-en-otros-cien-sitios` *(bloqueante)* — Hay al menos un dato propio que justifique la cita
- `el-esquema-declara-lo-que-el-texto-dice` *(bloqueante)* — Los datos estructurados no contradicen al contenido

Además, las 9 comunes a todo entregable: `tiene-contenido`, `sin-marcadores-de-plantilla`, `sin-promesas-sin-respaldo`, `sin-url-simulada`, `sin-metricas-inventadas`, `sin-fuentes-inventadas`, `sin-relleno`, `es-accionable`, `sin-mezcla-de-clientes`.

**Personalización, medida ejecutando el agente.** Veredicto **PERSONALIZA** — cobertura 1 (qué parte de lo que distingue al cliente llega a la instrucción), separación 0.321 (cuánto de lo que produce es propio de ese cliente y no común a los cinco).

**Qué se puede mover solo y qué no.**

Sin aprobación humana, porque no tocan nada fuera:

- responder directamente la pregunta que se hace
- añadir un dato propio que nadie más tenga
- reforzar las señales de entidad de la empresa
- marcar los datos con esquema


Toda acción hacia fuera cruza las siete puertas del puente de ejecución, en cualquier
caso. Este apartado dice cuáles ni siquiera llegan a pedirlo.

**Conexiones que le sirven.**

- Google Search Console `google-search-console` — estado `live`
- SEMrush `semrush` — estado `stub`

**Cuándo deja de intentarlo y habla una persona.**

- no se puede medir: comprobar menciones exige consultar modelos de terceros de forma repetida, y eso genera coste externo
- los asistentes citan a un competidor con peor contenido: hay una señal de entidad que falta

**Coste para el cliente.** **Sin decidir.** No es facturable.

**Lo que este contrato todavía no puede declarar.**

- **Precio** — `BUSINESS_DECISION_REQUIRED`. el servicio es nuevo y nadie ha decidido cuánto vale. Hay un importe puesto para que las estructuras que lo rodean funcionen, y `precioFacturable()` devuelve `null` para que ese importe no llegue nunca a una pasarela.
- **SLA de entrega** — `BUSINESS_DECISION_REQUIRED`. un plazo comprometido es una obligación comercial, no una propiedad del código. La maquinaria para vigilarlo existe (la sala de máquinas detecta trabajos atascados); lo que falta es la cifra que Daniel decida poder cumplir.
- **Verificación en producción** — `PRODUCTION_REQUIRED`. nada se ha desplegado. Todo lo que dice este documento está medido en local.
- **Departamento responsable (Visibilidad en buscadores de IA)** — `REAL_PROVIDER_REQUIRED`. Medir visibilidad en respuestas de IA exige consultar modelos de terceros de forma repetida, y eso genera coste externo que hoy no está autorizado.

---

## Lo que este documento NO dice

- **Que el trabajo sea bueno.** Dice que hay quien lo hace, con qué pasos, contra qué
  rúbrica se revisa y con qué cifra se juzga. Que el resultado sirva a un cliente real
  no se sabrá hasta que haya un cliente real.
- **Que se haya ejecutado en producción.** Nada se ha desplegado.
- **Que los precios sean los definitivos.** Cuatro están sin decidir y marcados como tales.
