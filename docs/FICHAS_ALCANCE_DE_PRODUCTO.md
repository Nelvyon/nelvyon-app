# Las 8 funciones con deriva esquema↔código — fichas para decidir alcance

**BLOCKED_ON_FOUNDER: ALCANCE_DE_PRODUCTO.** Nada retirado, nada construido.

Cada ficha se apoya en evidencia medida, no en impresión: rutas de API y páginas
contadas sobre el árbol, presencia en catálogo/precios buscada en los ficheros de
marketing y packs, y columnas comparadas contra el catálogo real de producción.

## El matiz que cambia casi todas las recomendaciones

Las 17 columnas que faltan **no están repartidas por igual**. En 6 de las 8
funciones, el **núcleo funciona** y lo roto es un **borde**:

| | Núcleo | Lo que falla |
|---|---|---|
| Reservas | crear/listar/confirmar una cita | solo la **videollamada** |
| Campañas | crear/enviar/medir | solo el **remitente por campaña** |
| Facturas | emitir, IVA, cobrar | solo **guardar el PDF** y **saber cuándo se envió** |
| A/B testing | crear experimento, variantes, ganador | los **metadatos** (hipótesis, meta, reparto) |
| Chatbot | conversación, mensajes, lead | **`workspace_id`** y las métricas del panel |
| Afiliados | registrar clic por `code` | atribuir por `affiliate_id` |

Y en **2** el problema es estructural, no de borde:

| | Por qué |
|---|---|
| **QR** | sin `short_code` **no puede existir** el redirect `/qr/{código}`: el QR dinámico —el producto— no es implementable |
| **Workflows** | faltan `edges_json` **y tres tablas enteras** (`visual_workflow_executions`, `workflow_nodes`, `workflow_trigger_registry`) |

Presentarlas todas como «rotas» habría sido tan inexacto como decir que funcionan.

---

## 1. Reservas / Citas · **COMPLETAR** (borde)

| | |
|---|---|
| **Promete** | agenda de citas con confirmación por token y videollamada |
| **Dónde** | `app/saas/citas/page.tsx` · 2 rutas de API · **80 componentes** |
| **En catálogo** | **SÍ** — `servicios/page.tsx`, 3 páginas de precios, `PackEliteSnapshots` |
| **Esquema tiene** | `booking_date`, `booking_time`, `duration`, `client_*`, `confirmation_token`, `status` |
| **Roto** | `zoom_host_url`, `zoom_join_url` — la reserva **no puede guardar la videollamada que dice crear** |
| **Falta para E2E** | migración con 2–3 columnas de Zoom, o quitar la promesa de videollamada de la UI |
| **Pruebas** | crear cita → confirmar por token → cancelar; y si se conserva Zoom: crear reunión → persistir enlaces → mostrarlos |
| **Impacto** | alto: es de lo más citado en la oferta |

## 2. Campañas de email · **COMPLETAR** (borde)

| | |
|---|---|
| **Promete** | campañas con envío, aperturas, clics y respuestas |
| **Dónde** | **20 rutas** · 5 páginas · **142 componentes** |
| **En catálogo** | **SÍ** — packs de crecimiento, `servicios-page` |
| **Esquema tiene** | `subject`, `content`, `sent_count`, `open_count`, `click_count`, `reply_count`, `scheduled_at` |
| **Roto** | `from_email`, `from_name` — hoy el remitente sale del whitelabel del workspace |
| **Falta para E2E** | decidir si el remitente es **por campaña** (migración) o **por workspace** (quitar del código) |
| **Dependencia** | SES verificado por dominio; ya existe `ses_domain_verified` |
| **Impacto** | alto |

## 3. Facturas · **COMPLETAR** (borde)

| | |
|---|---|
| **Promete** | emitir factura, PDF descargable, seguimiento de cobro y dunning |
| **Dónde** | 7 rutas —incluida `facturas/[id]/pdf`— · 1 página · **49 componentes** |
| **En catálogo** | **SÍ** — páginas de precios y `catalog.ts` |
| **Esquema tiene** | `invoice_number`, `line_items`, `subtotal`, `tax_*`, `total`, `status`, `paid_at` |
| **Roto** | `pdf_path` (dónde quedó el PDF) y `sent_at` (cuándo se envió) |
| **Consecuencia real** | el PDF se genera y **no se puede guardar dónde quedó**; y no se distingue «emitida» de «enviada» |
| **Falta para E2E** | 2 columnas, o guardar el PDF por `storage_key` como los entregables |
| **Impacto** | alto: es facturación |

## 4. A/B testing · **COMPLETAR** (borde)

| | |
|---|---|
| **Promete** | experimentos con variantes, reparto de tráfico y ganador |
| **Dónde** | 7 rutas · 1 página · **34 componentes** |
| **En catálogo** | **SÍ** — `pricing/index.tsx`, `agentCatalog`, `processTemplateRegistry` |
| **Esquema tiene** | `name`, `status`, `channel`, `winner_variant`, `confidence_threshold` |
| **Roto** | `hypothesis`, `metric_goal`, `traffic_split`, `ended_at`, `ai_recommendation`, y `winner_variant_id` (existe `winner_variant`, texto) |
| **Nota** | el **núcleo** —experimento, variantes, ganador— sí está. Falta la **configuración** del experimento |
| **Falta para E2E** | 5 columnas + decidir si `winner_variant` es texto o referencia |
| **Impacto** | medio-alto |

## 5. Chatbot · **COMPLETAR**, y con una decisión de aislamiento

| | |
|---|---|
| **Promete** | widget de chat con captura de lead y escalado |
| **Dónde** | 11 rutas · 2 páginas · 22 componentes |
| **En catálogo** | **SÍ** — `ServiciosPage`, `agentCatalog`, pack de automatización |
| **Esquema tiene** | `chatbot_id`, `session_id`, `messages`, `captured_lead`, `escalated` |
| **Roto** | **`workspace_id`** (la tabla **no tiene columna de inquilino**), `visitor_info`, `last_message_at`, `message_count` |
| **Lo importante** | hoy se acota **indirectamente** por `chatbot_id`. Funciona, pero **no hay segunda red**: si una consulta olvida el join, no hay RLS que lo pare |
| **Falta para E2E** | añadir `workspace_id` + política RLS; el resto son métricas del panel |
| **Impacto** | medio-alto, y es el único con implicación de **aislamiento** |

## 6. Afiliados · **FUSIONAR o COMPLETAR**

| | |
|---|---|
| **Promete** | enlaces de afiliado con clics y conversiones |
| **Dónde** | 3 rutas · **3 páginas duplicadas** (`affiliates`, `afiliados`, `dashboard/affiliates`) · solo 7 componentes |
| **En catálogo** | **NO APARECE** |
| **Roto** | `affiliate_id` — la tabla atribuye por `code` |
| **Nota** | tres páginas para lo mismo sugiere que hay **dos implementaciones a medias**. Antes de completar, fusionarlas |
| **Impacto** | bajo hoy; puede ser alto si el canal de afiliados entra en la oferta |

## 7. QR · **decisión estructural**

| | |
|---|---|
| **Promete** | códigos QR estáticos y **dinámicos** (cambiar el destino sin reimprimir) |
| **Dónde** | 2 rutas · 1 página · 3 componentes |
| **En catálogo** | **NO APARECE** |
| **Esquema tiene** | `name`, `destination_url`, `bg_color`, `color`, `scans`, `last_scanned_at` |
| **Roto** | `short_code`, `qr_type`, `is_dynamic`, `image_base64` |
| **Lo decisivo** | **sin `short_code` no puede existir `/qr/{código}`**. El QR *estático* sí es implementable con lo que hay; el **dinámico no** |
| **Recomendación** | si se vende el dinámico → migración (4 columnas + índice único). Si no → **quedarse con el estático** y quitar el resto |
| **Impacto** | bajo: no aparece en la oferta y tiene la menor presencia en UI |

## 8. Workflows / Automatizaciones · **COMPLETAR** (estructural)

| | |
|---|---|
| **Promete** | editor visual de automatizaciones con nodos y conexiones |
| **Dónde** | **23 rutas** · **6 páginas** · **99 componentes** |
| **En catálogo** | **SÍ** — `servicios/automatizacion`, precios, `agentCatalog` |
| **Esquema tiene** | `nodes_json`, `trigger_type`, `is_active`, `runs_count` |
| **Roto** | `edges_json` **y tres tablas que no existen**: `visual_workflow_executions`, `workflow_nodes`, `workflow_trigger_registry` |
| **Lo decisivo** | **las aristas del grafo no tienen dónde guardarse**: el editor visual puede dibujar conexiones y no persistirlas |
| **Nota** | dos de los `UPDATE` que acoté por inquilino en su día van contra `visual_workflow_executions`, que **no existe**. La corrección era correcta; el código es inalcanzable |
| **Falta para E2E** | 1 columna + 3 tablas + certificar el ciclo completo |
| **Impacto** | **el más alto**: es la función con más superficie del producto y está en el catálogo |

---

## Resumen para decidir

| Función | En la oferta | Superficie UI | Recomendación |
|---|---|---:|---|
| **Workflows** | SÍ | 23 rutas · 99 comp. | **COMPLETAR** — prioridad 1 |
| Campañas | SÍ | 20 rutas · 142 comp. | COMPLETAR (borde) |
| Facturas | SÍ | 7 rutas · 49 comp. | COMPLETAR (borde) |
| Reservas | SÍ | 2 rutas · 80 comp. | COMPLETAR (borde) |
| Chatbot | SÍ | 11 rutas · 22 comp. | COMPLETAR + **aislamiento** |
| A/B testing | SÍ | 7 rutas · 34 comp. | COMPLETAR (config) |
| Afiliados | no | 3 rutas · 7 comp. | **FUSIONAR** las 3 páginas primero |
| QR | no | 2 rutas · 3 comp. | **decidir**: estático (ya sirve) vs dinámico (migración) |

**Ninguna se recomienda retirar.** Seis están en lo que NELVYON vende y las otras
dos tienen un núcleo aprovechable. Retirar una función útil por estar incompleta
sería empobrecer la oferta, que es justo lo contrario del objetivo.

**Coste total si se completan todas**: ~15 columnas y 3 tablas, en 7 migraciones
independientes. Ninguna toca datos existentes —las 8 tablas están **vacías**— así
que el riesgo de la migración es el mínimo posible: es el mejor momento para
hacerlo, antes del primer cliente.
