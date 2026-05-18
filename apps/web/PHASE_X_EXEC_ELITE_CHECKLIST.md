# FASE X-EXEC — Definition of Elite (checklist de trabajo)

**Uso:** validar en staging con datos y roles reales. Cada ítem es binario: marca `[x]` solo si **PASA**; deja `[ ]` si **NO PASA** (anotar nota breve al lado o en issue P0/P1).

**Regla:** no se abren features nuevas en este documento; solo elevación de lo existente a estándar elite real.

---

## 1) Pantallas y journeys (15, lista cerrada)

| # | Pantalla / journey |
|---|---------------------|
| 1 | Shell / nav |
| 2 | Home / checklist |
| 3 | CRM — clients list |
| 4 | CRM — client detail |
| 5 | CRM — deals list |
| 6 | CRM — deals detail |
| 7 | Onboarding checklist |
| 8 | Help |
| 9 | Bot v1 |
| 10 | Billing — overview |
| 11 | Billing — upgrade |
| 12 | Settings — workspace |
| 13 | Audit & security |
| 14 | OS |
| 15 | Sign-in / sesión |

---

## 2) Definition of Elite por pantalla (checks binarios)

*Convención:* 3 UX/visual · 4 Estados · 3 Copy · 2 Performance · 2 RBAC · 2 Confianza/datos · 2 Narrativa comercial = **18 ítems** por pantalla.

---

### 1) Shell / nav

#### UX / visual (3)
- [ ] Jerarquía clara: una intención principal por vista (módulo activo + contenido sin competencia visual).
- [ ] Densidad y spacing coherentes con el resto del producto (sin “aire” incoherente ni muro denso).
- [ ] Navegación indica **dónde estoy** y el camino a los módulos críticos demo (CRM, Billing, Help) sin ambigüedad.

#### Estados (4)
- [ ] Loading del shell no deja pantalla en blanco sin contexto (skeleton o equivalente).
- [ ] Empty no aplica de forma confusa en shell (si no aplica, explícitamente N/A documentado en validación).
- [ ] Error global (si existe) distingue red vs sesión y ofrece **una** acción clara.
- [ ] Forbidden de módulo no se confunde con “bug” (mensaje y tono correctos).

#### Copy (3)
- [ ] Etiquetas de nav son precisas (no genéricas ni internas).
- [ ] No hay strings contradictorios entre nav, título de página y breadcrumb.
- [ ] Cualquier aviso de entorno (staging/demo) es honesto y no suena a producto final si no lo es.

#### Performance percibida (2)
- [ ] Cambio de ruta principal se siente inmediato con feedback continuo (sin parpadeo confuso de layout).
- [ ] No hay “saltos” de contenido tras hidratar sesión/workspace.

#### RBAC / permisos (2)
- [ ] Ítems de nav respetan rol (no se muestra módulo inaccesible como si fuera usable).
- [ ] Si un módulo está oculto por rol, el usuario entiende cómo obtener acceso (admin/rol), sin humo.

#### Confianza / datos (2)
- [ ] Workspace activo es visible/cognoscible donde afecta a datos (sin duda de scope).
- [ ] No hay datos de un workspace mezclados visualmente con otro al cambiar contexto.

#### Narrativa comercial (2)
- [ ] Un vendedor puede recorrer CRM → Deals → Billing sin “disculparse” por la navegación.
- [ ] El shell refuerza producto serio (operación + confianza), no prototipo.

---

### 2) Home / checklist

#### UX / visual (3)
- [ ] Jerarquía: checklist y CTAs siguen un orden de prioridad comercial (activación antes que ruido).
- [ ] Bloques auxiliares no compiten con el checklist en tamaño ni atención.
- [ ] Enlaces/accesos directos son escaneables en <10 s.

#### Estados (4)
- [ ] Loading del checklist no bloquea comprensión de la página.
- [ ] Empty del checklist es específico y da siguiente paso (no “no data”).
- [ ] Error de carga indica causa probable y acción (reintentar, workspace, sesión).
- [ ] Forbidden (si aplica) explica rol/workspace sin tono defensivo.

#### Copy (3)
- [ ] Títulos y descripciones son específicos de NELVYON (no copy plantilla).
- [ ] No se promete automatización o resultado que el backend no garantice.
- [ ] Lenguaje alineado con el resto del producto (mismos términos: workspace, módulo, etc.).

#### Performance percibida (2)
- [ ] La home usable en <2 s percibidos en red “normal” demo (sin spinner eterno).
- [ ] Tras completar un paso, el usuario ve actualización coherente del checklist.

#### RBAC / permisos (2)
- [ ] Pasos que requieren rol superior no se presentan como “rotos”; se explica restricción.
- [ ] CTAs llevan a rutas que el rol puede al menos intentar con mensaje correcto si falla.

#### Confianza / datos (2)
- [ ] Progreso del checklist coincide con backend (no marcar hecho lo no persistido).
- [ ] No hay contradicción entre checklist y estado real en módulos enlazados.

#### Narrativa comercial (2)
- [ ] La home cuenta una historia de activación en 30 s.
- [ ] Encaja en demo “cuenta nueva → valor en minutos” sin saltos.

---

### 3) CRM — clients list

#### UX / visual (3)
- [ ] Lista escaneable; identidad del cliente clara (nombre + contexto mínimo).
- [ ] CTA primaria (crear cliente) y secundaria (deals) no compiten de forma confusa.
- [ ] Layout consistente con otras listas del producto.

#### Estados (4)
- [ ] Loading con skeleton o equivalente.
- [ ] Empty específico con siguiente paso (crear cliente / permisos).
- [ ] Error distingue red vs permiso vs workspace.
- [ ] Forbidden claro para rol sin acceso CRM.

#### Copy (3)
- [ ] Empty y errores sin genérico vacío (“Something went wrong”).
- [ ] Texto de permisos indica quién puede destrabar (admin/rol).
- [ ] Sin promesas de CRM avanzado no soportado.

#### Performance percibida (2)
- [ ] Lista aparece con feedback continuo; refetch no “borra” la lista sin motivo.
- [ ] Scroll y click se sienten inmediatos en demo.

#### RBAC / permisos (2)
- [ ] Crear cliente solo si rol permite; si no, UI coherente (sin CTA engañosa).
- [ ] Ver listado acorde a `crm` view.

#### Confianza / datos (2)
- [ ] Solo clientes del workspace activo.
- [ ] Tras crear cliente (otra pantalla), volver aquí muestra datos coherentes.

#### Narrativa comercial (2)
- [ ] Lista soporta pitch “cuenta base del negocio”.
- [ ] Puente natural hacia Deals sin narrativa rota.

---

### 4) CRM — client detail

#### UX / visual (3)
- [ ] Jerarquía: datos clave arriba; edición agrupada sin competir con lectura.
- [ ] Formularios alineados y con labels claros.
- [ ] Acción primaria de guardar evidente; secundarias discretas.

#### Estados (4)
- [ ] Loading de detalle no vacío confuso.
- [ ] Empty/error de registro inexistente con mensaje claro (404 vs error).
- [ ] Error de guardado con causa + acción.
- [ ] Forbidden de edición explícito si rol no puede mutar.

#### Copy (3)
- [ ] Mensajes de guardado éxito/error concretos.
- [ ] Sin jerga interna (IDs expuestos sin contexto, etc.) salvo que sea útil al usuario.
- [ ] Coherencia con list (mismo nombre de campos).

#### Performance percibida (2)
- [ ] Guardar muestra feedback inmediato y estado final coherente.
- [ ] No hay doble submit confuso (pending claro).

#### RBAC / permisos (2)
- [ ] Campos editables solo si rol puede `crm` edit.
- [ ] Si read-only, la UI no “parece” editable.

#### Confianza / datos (2)
- [ ] Detalle coincide con list para mismos campos.
- [ ] No hay datos de otro cliente/workspace.

#### Narrativa comercial (2)
- [ ] Detalle aguanta “cuenta clave” en demo sin vergüenza.
- [ ] Refuerza datos mínimos para operar (no promete 360 inventado).

---

### 5) CRM — deals list

#### UX / visual (3)
- [ ] Filtros (stage/owner) entendibles sin manual; layout limpio.
- [ ] Lista legible: título, stage, owner, value en equilibrio visual.
- [ ] Paneles (at risk, conversión) no aplastan la lista ni se ven “pegados” sin jerarquía.

#### Estados (4)
- [ ] Loading claro.
- [ ] Empty específico (“no deals”) con siguiente paso honesto.
- [ ] Error con causa + acción.
- [ ] Forbidden de CRM coherente con rol.

#### Copy (3)
- [ ] Explicación honesta si paneles dependen de analytics vacíos o shape distinto.
- [ ] “At risk” define regla en una frase visible (aging / close date), sin humo.
- [ ] Sin prometer scoring avanzado no implementado.

#### Performance percibida (2)
- [ ] Filtros no caen en spinner largo sin feedback.
- [ ] Tras navegar a detalle y volver, lista coherente con lo esperado.

#### RBAC / permisos (2)
- [ ] Mutaciones no expuestas a miembro si no corresponde; copy de solo lectura claro.
- [ ] Filtros usables en rol lectura.

#### Confianza / datos (2)
- [ ] Deals listados son del workspace activo.
- [ ] No contradicción entre badges de riesgo en lista y criterio del panel at risk.

#### Narrativa comercial (2)
- [ ] Lista soporta “pipeline ejecutable” en demo.
- [ ] Conecta con client detail / billing sin saltos incoherentes.

---

### 6) CRM — deals detail

#### UX / visual (3)
- [ ] Secciones distinguibles: resumen, pipeline/accountability, follow-ups.
- [ ] Botón guardar y crear follow-up con jerarquía clara.
- [ ] Campos críticos (stage, owner, next step) no quedan “perdidos” abajo del fold en viewport típico demo.

#### Estados (4)
- [ ] Loading de detalle claro.
- [ ] 404/registro ausente con mensaje explícito.
- [ ] Error en save/follow-up con recuperación clara.
- [ ] Forbidden en mutaciones con explicación de rol.

#### Copy (3)
- [ ] Next step explica convención si vive en `notes` (honestidad > humo).
- [ ] Owner: si es texto libre, copy advierte limitación sin sonar roto.
- [ ] Etapas fijas: copy indica que es set acotado v1 (si aplica), sin vender configurador.

#### Performance percibida (2)
- [ ] Tras guardar pipeline fields, UI refleja valores persistidos sin desfase.
- [ ] Follow-up aparece en lista sin refresh manual confuso.

#### RBAC / permisos (2)
- [ ] Controles deshabilitados u ocultos coherentemente para no-editors.
- [ ] Mensajes de permiso alineados con `crm` edit vs view.

#### Confianza / datos (2)
- [ ] Detail coincide con list para stage/owner/value/next step.
- [ ] Follow-ups listados son del deal y workspace correctos.

#### Narrativa comercial (2)
- [ ] Aguanta demo “deal vivo” (mover etapa, owner, next step, follow-up).
- [ ] No suena a CRM enterprise falso; suena a ejecución disciplined.

---

### 7) Onboarding checklist

#### UX / visual (3)
- [ ] Progreso visible y comprensible de un vistazo.
- [ ] Pasos ordenados sin ruido visual.
- [ ] CTAs llevan a la acción correcta (ruta real).

#### Estados (4)
- [ ] Loading no bloquea lectura del propósito de onboarding.
- [ ] Empty/error con siguiente paso.
- [ ] Error de red vs permiso distinguible.
- [ ] Forbidden coherente si paso requiere rol.

#### Copy (3)
- [ ] Cada paso dice qué gana el usuario (resultado), no solo la tarea.
- [ ] Sin prometer outcomes no medibles en producto.
- [ ] Tono consistente con home.

#### Performance percibida (2)
- [ ] Marcar progreso se siente inmediato y estable.
- [ ] No hay “rebotes” de estado al invalidar queries.

#### RBAC / permisos (2)
- [ ] Pasos que requieren operator/admin no engañan a viewer.
- [ ] Mensajes claros si el usuario no puede completar un paso.

#### Confianza / datos (2)
- [ ] Estado persistido coincide con UI tras refresh.
- [ ] No marca completado lo no verificado por backend.

#### Narrativa comercial (2)
- [ ] Onboarding refuerza autoservicio real.
- [ ] Encaja en demo de activación sin soporte humano.

---

### 8) Help

#### UX / visual (3)
- [ ] Búsqueda y navegación modular escaneables.
- [ ] Jerarquía: buscar → resultado → artículo sin laberinto.
- [ ] Formularios estructurados accesibles y legibles.

#### Estados (4)
- [ ] Loading de búsqueda con feedback.
- [ ] Empty de búsqueda con sugerencias (reformular, otro módulo).
- [ ] Error de búsqueda con acción.
- [ ] Forbidden si alguna ruta help restringida (si aplica) claro.

#### Copy (3)
- [ ] Artículos sin tono genérico; referencian rutas reales del producto.
- [ ] Sin prometer features no existentes.
- [ ] Coherencia terminológica con CRM/Billing/OS.

#### Performance percibida (2)
- [ ] Búsqueda usable en demo sin lag perceptible.
- [ ] Transiciones entre artículos sin pérdida de contexto.

#### RBAC / permisos (2)
- [ ] Help visible según política de producto (member+).
- [ ] Formularios que crean tickets respetan permisos de helpdesk si enlazados.

#### Confianza / datos (2)
- [ ] Enlaces a rutas existentes y correctas.
- [ ] Formularios no “simulan” envío: reflejan resultado real o error honesto.

#### Narrativa comercial (2)
- [ ] Help refuerza reducción de soporte humano.
- [ ] Demo puede resolver duda típica en <60 s.

---

### 9) Bot v1

#### UX / visual (3)
- [ ] Panel compacto; input y respuesta distinguibles.
- [ ] Handoff visualmente claro (cuándo pasa a formulario humano).
- [ ] No compite con help: roles complementarios claros.

#### Estados (4)
- [ ] Loading de respuesta con indicación sutil (sin bloquear UI entera).
- [ ] Empty inicial con ejemplo de pregunta útil.
- [ ] Error con acción (reintentar, abrir help).
- [ ] Forbidden si bot no disponible por rol/módulo (si aplica).

#### Copy (3)
- [ ] Respuestas cortas y accionables; sin “alucinar” capacidades.
- [ ] Handoff honesto en baja confianza.
- [ ] Sin tono marketing vacío.

#### Performance percibida (2)
- [ ] Respuesta en tiempo demo aceptable (definir umbral en sesión, p.ej. <3 s percibidos).
- [ ] No congela navegación.

#### RBAC / permisos (2)
- [ ] No expone acciones fuera de rol vía enlaces sugeridos incorrectos.
- [ ] Si sugiere billing/settings, respeta permisos al enlazar.

#### Confianza / datos (2)
- [ ] No inventa datos de workspace/plan.
- [ ] Referencias a rutas/contexto son correctas.

#### Narrativa comercial (2)
- [ ] Refuerza “primera línea honesta”.
- [ ] No daña credibilidad del producto premium en demo sensible (billing).

---

### 10) Billing — overview

#### UX / visual (3)
- [ ] Resumen plan/usage/invoices con jerarquía clara.
- [ ] Secciones no compiten; riesgo/alertas visibles pero no alarmistas falsos.
- [ ] Explicación de límites enforced vs informativos es visible y calmada.

#### Estados (4)
- [ ] Loading por sección o global coherente.
- [ ] Empty de invoices/usage manejado sin pantalla rota.
- [ ] Error distingue forbidden vs técnico.
- [ ] Forbidden claro para rol sin billing view.

#### Copy (3)
- [ ] No promete bloqueos automáticos donde no hay enforcement.
- [ ] Números con moneda/unidad consistente.
- [ ] Mensajes alineados con upgrade path honesto.

#### Performance percibida (2)
- [ ] Carga inicial usable en demo sin “pantalla a medias” confusa.
- [ ] Tras refresh, totales coherentes con subsecciones.

#### RBAC / permisos (2)
- [ ] Upgrade CTA solo si rol puede actuar comercialmente donde aplique.
- [ ] Lectura vs acción claramente separadas.

#### Confianza / datos (2)
- [ ] Plan/summary/active subscription sin contradicción explícita visible.
- [ ] Usage meters no contradicen texto de límites.

#### Narrativa comercial (2)
- [ ] Billing overview aguanta conversación enterprise de control de gasto.
- [ ] No suena a “dashboard fake”.

---

### 11) Billing — upgrade

#### UX / visual (3)
- [ ] Selección plan/ciclo clara; CTAs primarios evidentes.
- [ ] Estados de verificación/checkout legibles (paid/pending/cancelled/error/forbidden).
- [ ] No hay layout que parezca “placeholder” residual.

#### Estados (4)
- [ ] Loading/redirecting/pending con copy honesto.
- [ ] Paid con confirmación clara y refresh implícito coherente.
- [ ] Cancelled sin dramatismo; error con retry seguro.
- [ ] Forbidden admin-only explícito.

#### Copy (3)
- [ ] No vende resultado antes de verify.
- [ ] Explica qué significa cada estado en lenguaje negocio.
- [ ] Coherente con overview post-checkout.

#### Performance percibida (2)
- [ ] Transición a Stripe y retorno no deja usuario sin señal.
- [ ] Verify no “cuelga” sin feedback.

#### RBAC / permisos (2)
- [ ] Solo admin inicia checkout donde aplique la política producto.
- [ ] Verify accesible según política real (operador vs admin) sin sorpresa en demo.

#### Confianza / datos (2)
- [ ] Tras verify paid, billing refleja estado alineado (sin contradicciones inmediatas).
- [ ] Session/workspace mismatch muestra error claro, no datos mezclados.

#### Narrativa comercial (2)
- [ ] Journey completo vendible sin humano en el día a día.
- [ ] Demo puede cerrar con “compramos / probamos” sin vergüenza.

---

### 12) Settings — workspace

#### UX / visual (3)
- [ ] Secciones (perfil/miembros/actividad) ordenadas y escaneables.
- [ ] Formularios con jerarquía clara.
- [ ] CTAs de invitación/edit no compiten confusamente.

#### Estados (4)
- [ ] Loading por sección coherente.
- [ ] Empty de miembros/actividad manejado con mensaje útil.
- [ ] Error de save con recuperación.
- [ ] Forbidden explícito por rol.

#### Copy (3)
- [ ] Mensajes de permisos alineados con matriz real.
- [ ] Sin prometer controles enterprise no presentes.
- [ ] Invitaciones: errores comunes (email duplicado) con texto claro.

#### Performance percibida (2)
- [ ] Save perfil/invite con feedback inmediato.
- [ ] Lista miembros refresca coherente tras invite.

#### RBAC / permisos (2)
- [ ] Edición solo si rol permite; lectura clara si no.
- [ ] Invite coherente con política operator/admin según producto.

#### Confianza / datos (2)
- [ ] Datos mostrados son del workspace activo.
- [ ] Tras update, UI coincide con backend tras refresh.

#### Narrativa comercial (2)
- [ ] Settings refuerza gobernanza del workspace.
- [ ] Demo puede mostrar “control de equipo” sin vergüenza.

---

### 13) Audit & security

#### UX / visual (3)
- [ ] Tabla legible; filtros comprensibles.
- [ ] Jerarquía: qué es evento, actor, cuándo, resultado.
- [ ] No parece SIEM; mantiene tono “trust view”.

#### Estados (4)
- [ ] Loading claro.
- [ ] Empty de eventos con explicación (puede ser normal).
- [ ] Error con acción.
- [ ] Forbidden por rol claro.

#### Copy (3)
- [ ] Texto que deja claro alcance (workspace audit, no GRC).
- [ ] Sin prometer retención/legal hold si no existe.
- [ ] Actor legible (email/id) sin exponer PII innecesaria en UI si política lo requiere.

#### Performance percibida (2)
- [ ] Lista usable con 100 eventos demo sin scroll infinito confuso.
- [ ] Filtros no congelan UI.

#### RBAC / permisos (2)
- [ ] Lectura acorde a rol esperado en producto.
- [ ] No muestra acciones de escritura si es read-only.

#### Confianza / datos (2)
- [ ] Eventos alineados con workspace activo.
- [ ] Timestamps y status interpretables sin soporte.

#### Narrativa comercial (2)
- [ ] Refuerza confianza enterprise visible.
- [ ] Encaja en pitch “operación seria” sin sobreprometer compliance.

---

### 14) OS

#### UX / visual (3)
- [ ] Health + jobs + playbook con jerarquía operativa.
- [ ] Billing snapshot (si visible) no contradice billing module.
- [ ] Layout consistente con resto de dashboards.

#### Estados (4)
- [ ] Loading coherente por bloques.
- [ ] Empty de jobs/webhooks con guía.
- [ ] Error parcial no destruye toda la vista sin explicación.
- [ ] Forbidden de billing snapshot coherente con rol.

#### Copy (3)
- [ ] Lenguaje de riesgo alineado con enforcement real (sin miedo falso).
- [ ] Sin prometer auto-remediación no existente.
- [ ] CTAs llevan a módulos reales correctos.

#### Performance percibida (2)
- [ ] Overview usable en demo sin esperas largas en cadena.
- [ ] No hay parpadeo al cargar billing optional.

#### RBAC / permisos (2)
- [ ] Snapshot billing oculto/explicado según rol.
- [ ] Acciones sugeridas respetan permisos de automations/billing.

#### Confianza / datos (2)
- [ ] Números de OS no contradicen billing cuando ambos visibles.
- [ ] Jobs sample no presenta datos fuera de workspace.

#### Narrativa comercial (2)
- [ ] OS vende “operación con control”, no “observabilidad enterprise falsa”.
- [ ] Demo puede usar OS como prueba de madurez operativa.

---

### 15) Sign-in / sesión

#### UX / visual (3)
- [ ] Formulario claro; campos y ayuda visibles sin clutter.
- [ ] Jerarquía: autenticar primero; debug segundo (si existe).
- [ ] No parece “página interna” si es entrada comercial.

#### Estados (4)
- [ ] Loading de sign-in no confunde con éxito.
- [ ] Error de token/sesión con causa + acción (reingresar token, workspace).
- [ ] Empty no aplica o está N/A sin confusión.
- [ ] Forbidden/401 paths coherentes post-login.

#### Copy (3)
- [ ] Honestidad explícita del bridge JWT si aún es staging (sin humo enterprise).
- [ ] Sin prometer OIDC final si no está.
- [ ] Mensajes sin tono amateur.

#### Performance percibida (2)
- [ ] Sign-in rápido en demo (sin pasos extra innecesarios).
- [ ] Transición a producto sin parpadeos raros de auth.

#### RBAC / permisos (2)
- [ ] No expone capacidades post-login antes de auth.
- [ ] Debug tools no confunden usuario final si están visibles.

#### Confianza / datos (2)
- [ ] Tras login, workspace y usuario coherentes con expectativa demo.
- [ ] No hay tokens mostrados persistentes de forma insegura en UI (si aplica política).

#### Narrativa comercial (2)
- [ ] Para ICP enterprise: se documenta gap de percepción o se acepta riesgo explícito en demo.
- [ ] Para ICP SMB: narrativa puede ser aceptable sin sonar “hack”.

---

## 3) Tabla global resumen (línea base previa a validación)

**Instrucción:** tras validar cada pantalla en staging, actualiza **Verde/Amarillo/Rojo** según % de checks fallidos y severidad (un fallo en Confianza/datos puede bastar para Rojo aunque el resto pase).

| Pantalla | Verde / Amarillo / Rojo | Quick wins aplicables | Mejoras medias | Bloques serios |
|----------|-------------------------|------------------------|----------------|----------------|
| Shell / nav | Amarillo | Narrativa CRM en nav; copy coherencia títulos; post-hidratación sin salto | Jerarquía micro-layout shell | — |
| Home / checklist | Amarillo | Copy pasos; empty/error; post-save claridad | Reorden CTAs demo | — |
| CRM clients list | Amarillo | CTA deals + copy empty/error | Pulido lista premium | — |
| CRM client detail | Amarillo | Copy save/error; forbidden claro | Jerarquía form/detail | Cuenta clave profunda (fuera X si es feature) |
| CRM deals list | Amarillo | Empty analytics explicativo; copy at risk | Jerarquía paneles/lista | — |
| CRM deals detail | Amarillo | Copy next step/notes honesto; post-mutación coherente | Layout premium secciones | Owner identidad; stages reales; campo next step semántico |
| Onboarding checklist | Amarillo | Copy pasos; error distinción | Flujo demo-ready | — |
| Help | Amarillo | Copy artículos; empty búsqueda | Mapa pregunta→acción por rutas calientes | — |
| Bot v1 | Amarillo | Handoff copy; errores | Panel premium | Riesgo “suena listo” en billing |
| Billing overview | Amarillo | Copy límites; coherencia números | Layout secciones | Divergencias plan/usage si aparecen en datos reales |
| Billing upgrade | Verde / Amarillo | Estados verify copy fino | Edge UX Stripe | Política verify rol si fricción real |
| Settings workspace | Amarillo | Forbidden/save copy | Jerarquía secciones | — |
| Audit & security | Amarillo | Empty/copy alcance | Tabla legibilidad | Retención/legal (fuera scope) |
| OS | Amarillo | Copy riesgo vs enforcement | Layout bloques | — |
| Sign-in / sesión | Rojo (ICP enterprise) / Amarillo (SMB) | Honestidad bridge; errores claros | Presentación entrada comercial | OIDC final (S1; fuera por defecto) |

---

## 4) Tandas de ejecución (post-validación checklist)

### Tanda 1 — Quick wins (ejecutar primero tras marcar fallos en staging)

1. Demo-ready: dataset + roles + guion único (v1.1 + V2-A1) alineado con checklist.  
2. Microcopy premium: Estados (4) + Copy (3) en **Deals list/detail**, **Billing overview**, **Audit**, **Sign-in** (honestidad bridge).  
3. Paneles Deals: empty/error explicativos + coherencia badge/panel at risk.  
4. Post-mutación: Performance (2) + Confianza (2) en deals + billing tras acciones demo.  
5. Shell/nav: Narrativa CRM (items UX 1–3 + Narrativa 1–2) sin nuevas rutas obligatorias.

### Tanda 2 — Mejoras medias

1. Billing/OS: alineación terminológica riesgo vs enforcement (Copy + Confianza).  
2. Deals detail + lists: jerarquía visual premium (UX).  
3. Help/Bot: mapa pregunta→acción en rutas calientes (Narrativa + Copy).  
4. Home/onboarding: reducción fricción cognitiva (UX + Narrativa).

### Tanda 3 — Bloques serios (solo con decisión explícita; no por defecto)

- **S1 — OIDC enterprise final** (sign-in rojo percepción ICP enterprise).  
- **S2 — Owner identidad real** (deals).  
- **S3 — Stagebook real** (etapas por negocio).  
- **S4 — Next step semántico** (si `notes` no alcanza estándar tras Tandas 1–2).

---

## 5) Fuera de scope X-EXEC (explícito)

No ejecutar dentro de X-EXEC salvo decisión explícita aparte:

- **V2-A2** (automatización / secuencias / profundidad comercial nueva).  
- **Creator OS** y vertical creator.  
- **Funnels / CMS** y superficies públicas de captación.  
- **Clipping / video** producto.  
- **Reputación / reviews**.  
- **Messaging nuevo** (SMS/WhatsApp/etc.).  
- **OIDC enterprise final** salvo decisión **S1** (bloque serio; no arranca solo por impulso).

---

**Cierre operativo:** cuando termines la primera pasada de validación en staging, actualiza la tabla global (columna Verde/Amarillo/Rojo) y prioriza Tanda 1 solo sobre ítems `[ ]` con mayor impacto en confianza + demo + percepción premium.
