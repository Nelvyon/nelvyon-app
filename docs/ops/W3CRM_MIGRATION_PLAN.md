# W3CRM → NELVYON SaaS — Plan de migración (Fase 1)

> **Estado:** AUDITORÍA COMPLETA · sin cambios de UI de producto · `claimReady: false` · sin canary · sin deploy prod
> **Fecha:** 2026-07-30
> **Origen legal:** ThemeForest / Envato — autor **Dexignzone** — ZIP `crm-react-next-js-admin-dashboard-template-2026-01-09-12-10-44-utc.zip` (nombre interno del paquete: `NextJs-W3CRM-v1.0-04_Dec_2024`)
> **Extract local (fuera de build):** `.reference/w3crm/` (**gitignored**, dos niveles de ZIP anidado ya descomprimidos: `doc.zip` + `package.zip` → `package/`)
> **Supersede parcialmente:** `docs/ops/DASHFORGE_MIGRATION_PLAN.md` (ADR-074) queda **en pausa**; W3CRM pasa a ser la plantilla de referencia visual principal por instrucción explícita del usuario. Ver §0.2.

---

## 0. Hallazgo crítico (expectativa vs realidad técnica)

### 0.1 Qué es W3CRM realmente

A diferencia de DashForge (un *AI dashboard builder* de un solo módulo), **W3CRM sí es un admin multi-módulo completo**: 97 pantallas repartidas en 13 grupos de rutas (`(dashboard)`, `(apps)`, `(ecommerce)`, `(cms)`, `(email)`, `(table)`, `(charts)`, `(widget)`, `(forms)`, `(plugins)`, `(aikit)`, `(bootstrap)`, `(error)`), con HR, finanzas, tareas, proyectos, clientes, ecommerce, CMS, email, calendario, IA (AIKit) y un kit de componentes Bootstrap. En volumen de pantallas es el candidato más parecido a NELVYON de los dos ZIPs auditados.

### 0.2 El conflicto de stack es real y severo — más que con DashForge

| Dimensión | W3CRM | NELVYON (`apps/web`) | Compatibilidad |
|---|---|---|---|
| Next.js | **14.2.17** | **15.5.6** | Downgrade prohibido por reglas del usuario (nunca romper arquitectura) |
| React | **18.3.1** | **19.2.7** | `react-bootstrap`, `rsuite`, `@hello-pangea/dnd` fijan peers en React ≤18 → **conflicto de peer deps real** si se instalan tal cual |
| Lenguaje | **JavaScript** (`.jsx`, sin tipos) | **TypeScript 5.9** estricto | Todo el código fuente debe reescribirse, no solo "traducirse" |
| Sistema de estilos | **Bootstrap 5 + SCSS compilado** (`assets/css/style.css`, 1.3 MB) + **rsuite** (su propio CSS reset) + **LESS** (nouislider) | **Tailwind CSS v4**, sin Bootstrap, sin reset ajeno | Importar el CSS de W3CRM tal cual **rompe** el reset/tokens de Tailwind v4 → dos sistemas visuales en paralelo, expresamente prohibido por el usuario (regla "no mantengas dos sistemas visuales diferentes") |
| Navegación / sidebar | Array estático `MenuList` (`layouts/nav/Menu.jsx`) + clases jQuery-style (`mm-collapse`, `deznav`) sin gating de permisos | `SaasSidebar.tsx`: React state, `next-intl`, `filterSaasNavForPermissions` (RBAC real), grupos colapsables, foco/aria, active glow | El sidebar de NELVYON ya es más avanzado funcionalmente que el de la plantilla; solo interesa el **inventario de secciones**, no el código |
| Gráficas | `recharts@2.13.3` (mismo major que NELVYON `2.15.4`), + `react-apexcharts`, `react-chartjs-2`, `react-sparklines` | `recharts@2.15.4` únicamente | `recharts` es reutilizable como **patrón** (mismo major); Apex/Chart.js/Sparklines añadirían dependencias nuevas — evaluar caso a caso, no arrastrar las 3 librerías |
| Tablas | `react-table@7` (deprecado, sin mantenimiento activo desde 2022) | Tablas hand-rolled en Tailwind | No usar `react-table` v7; el patrón visual (columnas, filtros, paginación) es útil, la librería no |
| Formularios | `formik` + `yup` | Sin librería de formularios (controlado manual) | Sin conflicto duro, pero introduce dependencia nueva no justificada por 1 módulo — evaluar solo si aporta valor claro |
| Editor rich text | `@ckeditor/ckeditor5` | **TipTap** (ya integrado en campañas/web-builder) | **No sustituir** TipTap — regla explícita "no reescribas sin justificación sólida" |
| i18n | Strings hardcoded en inglés, sin sistema | `next-intl` con 6 locales (`es,en,de,fr,it,pt`) | Todo texto de W3CRM debe re-traducirse vía `next-intl`, no copiarse literal |
| Branding en código | Comentario de autoría en `style.css` ("Name: W3CRM · Author: Dexignzone · https://themeforest.net/user/dexignzone"), `<title>` "W3CRM - React Nextjs Admin Dashboard Template" en `layout.jsx`, README `crm-next` | — | Ninguna referencia debe llegar al build de producto (ver §5) |
| Licencia | Envato Market (ThemeForest, autor Dexignzone) | — | Uso interno legal (ZIP adquirido); prohibido dejar branding visible; no redistribuir el ZIP ni el código fuente de la plantilla |

**Consecuencia directa de la propia regla del usuario** ("si hay conflicto entre W3CRM y NELVYON, adapta W3CRM, nunca rompas NELVYON" + "no mantengas dos sistemas visuales diferentes" + "nunca rompas arquitectura"):

> **No es viable ni permitido importar literalmente el código JSX/SCSS/rsuite de W3CRM al `apps/web` de producto.** Hacerlo exigiría degradar React 19→18 y Next 15→14 (rompe NELVYON, prohibido) o convivir con dos sistemas de CSS (Bootstrap + Tailwind, prohibido explícitamente).
>
> La única estrategia que cumple **todas** las reglas del usuario simultáneamente es: **usar W3CRM como referencia de composición visual y de arquitectura de información (qué pantallas, qué secciones, qué patrones de tabla/kanban/calendario/chart, qué jerarquía), y reconstruir cada pantalla nativamente en Tailwind v4 + TypeScript + React 19 dentro de NELVYON**, replicando fielmente look&feel, densidad de información, componentes y flujos — sin copiar ficheros fuente de la plantilla al árbol de producto. El resultado visual debe parecer W3CRM (o mejor); el código no puede ser W3CRM.
>
> Esto es coherente con la instrucción "extender componentes SOLO cuando sea imposible reutilizar la plantilla": aquí la reutilización 1:1 de código es imposible por el conflicto de stack documentado arriba; lo que sí se reutiliza al 100 % es el **diseño** (estructura, spacing, jerarquía, patrones de UI) de cada pantalla W3CRM, pieza a pieza, módulo a módulo.

**Este punto requiere confirmación explícita del usuario antes de iniciar Fase 2** (ver §9 — pregunta abierta). No se ha copiado ni adaptado ningún componente todavía.

---

## 1. Auditoría de la plantilla W3CRM

### 1.1 Dependencias declaradas (`package.json`)

```
next@^14.2.17 · react@^18.3.1 · react-dom@^18.3.1
react-bootstrap@^2.10.5 · rsuite@^5.74.2                     (sistemas UI/CSS — no importables)
recharts@^2.13.3 · react-apexcharts@^1.5.0 · react-chartjs-2@^5.2.0 · react-sparklines@^1.7.0
react-table@^7.8.0                                            (deprecado)
formik@^2.4.6 · yup@^1.4.0
@ckeditor/ckeditor5-build-classic · @ckeditor/ckeditor5-react (editor — no sustituye TipTap)
@fullcalendar/{react,daygrid,timegrid,interaction}            (calendario — patrón útil)
@hello-pangea/dnd                                              (drag&drop kanban — patrón útil, pin React 18 en su versión actual)
react-select · react-datepicker · react-time-picker · nouislider-react · react-range-slider-input
react-color · react-linear-gradient-picker                    (color pickers)
react-csv · react-dropzone-uploader · react-nestable · lightgallery · sweetalert2 · react-toastify
react-svg-worldmap · react-scroll · react-countup · react-highlight
```

Ninguna dependencia es instalable tal cual en `apps/web` sin romper el árbol de peers de React 19 / Next 15 (la mayoría fija `peerDependencies: react ^16 || ^17 || ^18`).

### 1.2 Inventario de pantallas por grupo de ruta (97 `page.jsx`)

| Grupo | Pantallas | Relevancia para NELVYON |
|---|---|---|
| `(dashboard)` | dashboard (light/dark), home, employee, core-hr, finance, task, task-summary, performance, project, reports, manage-client, blog-1, svg-icon | **Alta** — dashboard ejecutivo, listas de tareas/proyectos → patrón para `workflows`, `citas`, `reportes` |
| `(apps)` | contacts, customer, customer-profile, user, user-roles, add-role, app-profile(-2), edit-profile, post-details | **Alta** — `crm` (contacts/customer), `team`/`settings` (user/roles/profile) |
| `(ecommerce)` | ecom-product-{grid,list,detail,order,checkout}, ecom-invoice, ecom-customers | **Media** — `store`, `facturas`, `erp-purchases/inventory` |
| `(cms)` | blog, blog-category, content, add-content/blog/email, email-template, menu | **Media** — `web-builder`, `formularios`, contenido editorial |
| `(email)` | app-calender, email-compose, email-inbox, email-read | **Alta** — `calendar`, `inbox`, `campanias` |
| `(aikit)` | auto-write, chatbot, fine-tune-models, import, prompt, repurpose, rss, scheduled, setting | **Alta** — `ai`, `agentes`, `chat`, `copywriter`, `autopilot` (el grupo más alineado 1:1 con IA NELVYON) |
| `(table)` | table-bootstrap-basic, table-filtering, table-sorting | **Transversal** — patrón de tabla para casi todos los módulos de listado |
| `(charts)` | chart-{apexchart,chartjs,rechart,sparkline} | **Transversal** — `reportes`, `attribution`, `benchmark`, KPIs de dashboard |
| `(widget)` | widget-basic | **Baja** — catálogo de tarjetas/KPIs, útil como referencia visual |
| `(forms)` | form-{ckeditor,element,pickers,validation,wizard} | **Transversal** — patrón para `formularios`, `encuestas`, onboarding, wizards |
| `(plugins)` | uc-{lightgallery,nestable,noui-slider,select2,sweetalert,toastr} | **Baja** — utilidades puntuales (drag-order, alerts, toasts) |
| `(bootstrap)` | 17 páginas de catálogo de componentes UI (accordion, alert, badge, button, card, modal, tab, typography…) | **Transversal** — catálogo de referencia de componentes; se reconstruye como librería Tailwind propia, no se copia |
| `(error)` | páginas 400/403/404/500/503 + lock screen | **Baja** — NELVYON ya tiene sus propios error states |

### 1.3 Datos y branding

- Todo el contenido de las pantallas (`HomeComponent.jsx` y sus 11 subcomponentes: `CardWidget`, `ProjectOverviewTab`, `ToDoList`, `EarningBlog`, `ActiveProjects`, `ActiveUserMap`, `ChatElementBlog`, `BestSellerTable`, `UpcomingBlog`, `ProjectStatusBlog`, `EmployeesTableList`) es **100 % mock data hardcodeada** en el propio JSX — nombres, avatares, cifras de ventas, mapas de usuarios activos ficticios.
- Branding detectado: `<title>` "W3CRM - React Nextjs Admin Dashboard Template" en `src/app/layout.jsx`; comentario de autoría "Dexignzone / themeforest.net/user/dexignzone" en cabecera de `style.css`; README genérico `crm-next`.
- No se detectaron strings "Envato/DesignZone/Codervent/Dexignzone" dentro de los componentes `.jsx` (búsqueda `Select-String` sin resultados) — el branding vive solo en metadata (`<title>`, CSS header, README, doc.zip), lo que facilita su eliminación total si en algún momento se decide extraer literal código.

---

## 2. Auditoría NELVYON SaaS (re-verificación, 2026-07-30)

| Métrica | Valor |
|---|---|
| Stack | Next **15.5.6** · React **19.2.7** · TypeScript **5.9.3** · Tailwind **v4** (`@tailwindcss/postcss`) |
| Rutas `page.tsx` bajo `/saas/*` | **97** |
| Nav canónica `SAAS_NAV_ITEMS` (`saasNav.ts`) | **69** ítems visibles en **6** grupos: `principal`, `comunicacion`, `captacion`, `gestion`, `ia`, `cuenta` |
| APIs `api/saas/**/route.ts` | **237** |
| Shell | `SaasShellLayout` + `SaasSidebar` — dark glass `#020817`, acento `#0084ff`, `backdrop-blur`, glow states, safe-area PWA, i18n `next-intl`, RBAC (`filterSaasNavForPermissions`) |
| Auth | Cookie `nelvyon_token` httpOnly + `requireSaasContext` + middleware + CSRF |
| Charts actuales | `recharts@2.15.4` (uso limitado) |
| Tablas actuales | Hand-rolled en Tailwind, sin librería de terceros |
| Editores isla | TipTap (campañas/web-builder), XYFlow (workflows) — **no tocar** |
| i18n | 6 locales completos (`apps/web/messages/*.json`) vía `next-intl` |

**Conclusión de auditoría NELVYON:** el shell/sidebar actual ya es funcionalmente superior al de W3CRM (RBAC real, i18n, accesibilidad, PWA). Lo que NELVYON necesita de W3CRM no es "un sidebar que funcione" — es **densidad visual, patrones de pantalla ricos (kanban, calendario, tablas avanzadas, wizards, catálogo de componentes) y un lenguaje visual más "producto enterprise"** que el actual diseño dark-glass minimalista, aplicado consistentemente a los 69 módulos reales.

---

## 3. Mapa módulo NELVYON ↔ pantalla/patrón W3CRM ↔ conflictos

| Grupo nav | Módulos NELVYON (id) | Pantalla/patrón W3CRM de referencia | Conflicto principal | Estado |
|---|---|---|---|---|
| **principal** | dashboard, setup, inbox, crm, pipeline, calendar | `(dashboard)/dashboard` (KPI+tabs+tablas), `(apps)/contacts`+`customer`, `(email)/email-inbox`+`app-calender` | Mock data 100 % en origen → debe sustituirse por `/api/saas/dashboard`, `/api/saas/crm/*` reales; kanban de pipeline no existe en W3CRM tal cual (usa `@hello-pangea/dnd` en Task board) | **dashboard: DONE (§12)** · resto **PLAN** |
| **comunicacion** | campanias, deliverability, sms, social, whatsapp, dialer, secuencias | `(email)/email-compose`+`email-inbox`+`email-read` | No hay pantallas nativas SMS/WhatsApp/dialer/social — solo patrón de lista+detalle de email reutilizable como base compositiva | **PLAN (parcial)** |
| **captacion** | publicidad, seo, reputacion, funnels, web-builder | `(cms)/content`, `(cms)/menu`, `(aikit)/repurpose`+`rss` | Sin pantallas ads/SEO dedicadas; TipTap ya cubre web-builder, no sustituir por CKEditor | **PLAN (parcial)** |
| **gestion** | workflows, formularios, citas, helpdesk, prospecting, snippets, countdown, objetos, encuestas, documentos, facturas, qr, ab-testing, lms, store, affiliates, loyalty, memberships, erp-* | `(table)/*`, `(forms)/*`, `(ecommerce)/ecom-*`, `(dashboard)/task`+`task-summary`+`project` | Editor de workflows es XYFlow (isla, no tocar); resto son listados/formularios — buen fit con patrón tabla+wizard de W3CRM | **PLAN** |
| **ia** | pack-store, data-playbooks, brief-to-launch, compliance, benchmark, ai, autopilot, agentes, chat, copywriter | `(aikit)/*` completo (auto-write, chatbot, prompt, scheduled, repurpose, rss, fine-tune-models, setting, import) | **El grupo mejor alineado** — misma intención de producto (IA generativa/automatización); reconstruir sin Clerk/OpenAI demo, conectado a `private-ai`/orchestrator real | **PLAN (prioritario)** |
| **cuenta** | team, billing, settings, security, integraciones, webhooks, api-keys, white-label, auditoria, subcuentas, partner, marketplace, pwa, herramientas, comunidades, reportes, attribution, entregables, lead-scoring | `(apps)/user`+`user-roles`+`add-role`+`app-profile*`, `(charts)/*`, `(bootstrap)/*` (catálogo) | Roles/perfil sin RBAC real en origen (estático) → debe conectarse a `useSaasPermissions`; charts son el mejor input para `reportes`/`attribution`/`benchmark` | **PLAN** |

**Nota de completitud:** los 69 ítems de `saasNav.ts` quedan cubiertos por este mapa a nivel de grupo; el detalle pantalla-a-pantalla (1:1) se resolverá módulo por módulo en Fase 6, documentando cada migración individualmente como exige el usuario ("cada módulo... integrado, funcional, conectado, probado, documentado antes de pasar al siguiente").

---

## 4. Qué se puede aprovechar realmente de W3CRM (y cómo)

| Aprovechable | Naturaleza | Cómo se lleva a NELVYON |
|---|---|---|
| Estructura de secciones del dashboard (KPI row + tabs proyecto + to-do + earnings + mapa actividad + tabla top) | Composición/IA de pantalla | Reimplementar grid equivalente en Tailwind v4 dentro de `/saas/dashboard`, con datos de `/api/saas/dashboard` |
| Patrón Kanban (`@hello-pangea/dnd`) para tareas/pipeline | Patrón de interacción | Evaluar instalar `@hello-pangea/dnd` (sí es compatible con React 19 en su versión reciente — verificar en Fase 2) para `pipeline`/`workflows`; si no compatible, construir DnD nativo con `dnd-kit` (ya evaluado en otros módulos) |
| Catálogo de componentes Bootstrap (accordion, badge, modal, tabs, progress…) | Referencia visual únicamente | Reconstruir como librería propia `features/nelvyon-ui/` en Tailwind v4 con la misma jerarquía visual (radios, sombras, spacing), sin Bootstrap classes |
| AIKit (auto-write, chatbot, scheduler, prompt, fine-tune, RSS, repurpose) | Composición de pantalla + flujo UX | Base de diseño para `ai`, `agentes`, `chat`, `copywriter`, `autopilot` — conectado a APIs reales de `private-ai`/orchestrator, sin Clerk/OpenAI/mocks |
| Wizard de formularios (`form-wizard`) | Patrón UX | Útil para onboarding y creación de packs/workflows multi-paso |
| Calendario FullCalendar | Patrón de composición (no la librería en sí, evaluar conflicto de versión) | `citas`, `calendar` — evaluar si `@fullcalendar/react` es compatible con React 19 antes de decidir instalarla o construir vista propia |
| Tablas con filtro/orden/paginación | Patrón visual y de interacción | Diseño de tabla enterprise propia en Tailwind (no `react-table` v7, deprecado) |
| Paleta y densidad "admin enterprise" | Lenguaje visual | Fase 3 de branding: mapear a azul/negro/blanco NELVYON manteniendo la densidad de información, no el dark-glass ultra minimalista actual |

---

## 5. Eliminación de branding y datos demo (checklist para cuando se ejecute Fase 2+)

- [ ] Ningún `<title>`/metadata con "W3CRM", "Dexignzone", "ThemeForest", "Envato", "crm-next"
- [ ] Ningún comentario de autoría en CSS/JS generado
- [ ] Cero mock data literal (nombres, avatares, cifras) copiado de `HomeComponent`/subcomponentes
- [ ] Cero import de `.reference/w3crm/**` desde código de producto (`apps/web/src/**`, `backend/**`)
- [ ] `.reference/w3crm/` confirmado en `.gitignore` (ya cubierto por la entrada genérica `.reference/` añadida en el audit CTO previo)
- [ ] Grep CI recurrente `W3CRM|Dexignzone|ThemeForest|Codervent|Envato` sobre `apps/web/src` y `apps/web/public` antes de cada commit de esta migración

---

## 6. Riesgos

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Interpretar "usar W3CRM como base real" como "importar el código fuente literal" | **Crítica** | Este documento + confirmación explícita del usuario (§9) antes de tocar componentes |
| Downgrade accidental de React/Next para "hacer caber" una dependencia de W3CRM | **Crítica** | Ninguna dependencia de W3CRM se instala sin verificar peer-deps contra React 19 / Next 15 primero; si no compatible, se descarta o se busca alternativa mantenida |
| Doble sistema de CSS (Bootstrap + Tailwind) si se copian estilos SCSS | **Crítica** | Prohibido por regla explícita del usuario; ningún `.scss`/`.less`/`rsuite.css` entra al bundle de producto |
| `react-table@7` deprecado introducido por "parecerse a la plantilla" | Alta | Descartado; tablas se construyen nativas Tailwind |
| Mezclar mock data de W3CRM en pantallas reales durante la migración pieza a pieza | Alta | Cada pantalla se conecta a su API real antes de marcarse como migrada; empty states profesionales mientras no haya datos |
| Migración parcial deja rutas con shell antiguo y nuevo a la vez | Media | Igual que en plan DashForge: flag/dual-path temporal solo en dev/staging, nunca en prod, hasta completar el módulo |
| Fatiga de alcance (69 módulos) sin cierre real de ninguno | Alta | Migrar por lotes pequeños con checklist de calidad (tsc/lint/build/vitest/smoke) tras cada módulo, como exige el usuario — nunca acumular |

---

## 7. Orden de commits previsto (cuando se autorice Fase 2)

1. **docs:** este plan + ADR (este commit)
2. **ui-kit:** primitives Tailwind propias inspiradas en `(bootstrap)` de W3CRM → `features/nelvyon-ui/`
3. **branding:** tokens de color/tipografía NELVYON aplicados al kit
4. **dashboard ejecutivo** (`/saas/dashboard`) con composición inspirada en `(dashboard)/dashboard`
5. **CRM** (`crm`, `pipeline`) inspirado en `(apps)/contacts`+`customer`+ kanban
6. **comunicación** (`inbox`, `campanias`, `secuencias`) inspirado en `(email)/*`
7. **IA NELVYON** (`ai`, `agentes`, `chat`, `copywriter`, `autopilot`) inspirado en `(aikit)/*`
8. **gestión/analítica** (tablas, calendario, reportes) inspirado en `(table)`, `(charts)`, `(email)/app-calender`
9. **administración** (`team`, `settings`, `security`, `billing`) inspirado en `(apps)/user*`
10. **responsive / mobile WebView**
11. **a11y + rendimiento**
12. **tests** (tsc/lint/vitest/playwright por módulo migrado)
13. **docs vivas** finales
14. **staging** (solo con autorización CEO para prod)

Ningún paso se marca como cerrado sin ejecutar TypeScript + ESLint + Build + Vitest + smoke test del módulo correspondiente, deteniéndose a corregir ante cualquier fallo (regla explícita del usuario).

---

## 8. Criterios de "COMPLETADO" (no declarar antes)

- [ ] Los 69 ítems de `saasNav.ts` migrados a la nueva composición visual, conectados a sus APIs reales
- [ ] Cero código fuente de `.reference/w3crm/` importado en `apps/web/src/**`
- [ ] Cero branding W3CRM/Dexignzone/ThemeForest/Envato visible o en metadata
- [ ] Cero mock data / cifras inventadas en pantallas de producto
- [ ] Un único sistema visual (Tailwind v4) en todo `/saas/*`, sin Bootstrap/rsuite residual
- [ ] tsc / ESLint / build / Vitest / Playwright SaaS en verde en cada fase
- [ ] Auth, RBAC, CSRF, multi-tenancy verificados sin regresión
- [ ] Responsive desktop/tablet/móvil/WebView APK validado
- [ ] Staging estable; producción solo con autorización expresa del CEO
- [ ] `claimReady` sigue `false`; IA canary sigue `KILL`; sin gasto publicitario activado

---

## 9. Pregunta abierta para el usuario (bloqueante para Fase 2)

Dado el hallazgo del §0.2, antes de mover una sola línea de código se necesita confirmación sobre el criterio de "reutilización":

- **Opción A (recomendada):** "Reutilizar W3CRM" significa reutilizar su **diseño, composición e inventario de pantallas** al máximo detalle posible, reconstruido nativamente en Tailwind v4 + TypeScript + React 19 dentro de NELVYON. Cero código fuente de la plantilla llega a `apps/web/src`. Este es el único camino que no rompe React 19/Next 15/Tailwind v4 ni crea dos sistemas visuales.
- **Opción B:** Instalar librerías puntuales de W3CRM que resulten compatibles tras verificación de peers (p. ej. una versión de `@hello-pangea/dnd` o `@fullcalendar/react` que soporte React 19), evaluadas caso por caso en Fase 2, sin tocar el sistema de estilos base (sigue siendo 100 % Tailwind v4, nunca Bootstrap/rsuite).
- **Opción C:** Detener la migración y solicitar una plantilla nativa en Tailwind/shadcn (evitaría el 100 % de los conflictos de stack, pero no es lo que se ha pedido).

Se recomienda **Opción A + evaluación selectiva bajo Opción B** para casos concretos (kanban, calendario) donde una librería mantenida y compatible aporte valor real sin duplicar sistemas visuales.

---

## 10. Evidencia Fase 2 — Módulo Dashboard ejecutivo (2026-07-30)

| Verificación | Resultado |
|---|---|
| `pnpm -C apps/web exec tsc --noEmit` | **PASS** (0 errores) |
| `pnpm -C apps/web exec eslint src/app/saas/dashboard/page.tsx src/features/saas-shell/components/SaasDashboardWidgets.tsx` | **PASS** (0 warnings/errores) |
| `pnpm -C apps/web exec vitest run backend/saas backend/email src/features/saas-crm` | **PASS** — 195 test files (2 skipped) · 2464 tests passed (4 skipped) |
| `pnpm -C apps/web build` | **PASS** — 312 páginas generadas, incluye `/saas/dashboard`; sin errores de compilación (solo warning preexistente no relacionado de `@opentelemetry/instrumentation`) |
| Librerías W3CRM evaluadas | `@hello-pangea/dnd@18.0.1` (peer `react ^18\|\|^19` ✅) y `@fullcalendar/react@7.0.2` (peer `react ^17\|\|^18\|\|^19` ✅) — compatibles con React 19 en sus versiones actuales; **no instaladas aún**, reservadas para los módulos `pipeline`/`citas`/`calendar` cuando se aborden |
| Archivos modificados | `apps/web/src/features/saas-shell/components/SaasDashboardWidgets.tsx` (nuevo) · `apps/web/src/app/saas/dashboard/page.tsx` (solo capa visual: headers, KPI tiles con icono, avatares de actividad) |
| Funcionalidad preservada | Fetches reales (`/api/saas/dashboard`, `/layout`, `/competitor-gap`, `/geo-visibility`, `/reports/generate`) · drag-reorder de widgets · checklist de activación · pipeline comercial · export ZIP · redirect 401/404→onboarding — **sin cambios de comportamiento** |
| Branding/mock data | Cero — todo el contenido sigue viniendo de las mismas APIs reales; los iconos añadidos son glifos genéricos, no assets de plantilla |
| `claimReady` / canary | `false` / `KILL` — sin cambios |

---

## 11. Rollback

- Fase 1 (documentación) — revert trivial (`git revert`) sin impacto en producto
- Fase 2 (dashboard) — revert del commit de widgets restaura `StatCard`/headers ad-hoc previos; ningún cambio de API/DB que revertir
- `.reference/w3crm/` puede eliminarse en cualquier momento sin afectar `apps/web`/`backend` (ya gitignored, no forma parte del build)
- No hay migraciones DB ni cambios de API en esta fase

---

## 12. Próximo paso EXACTO

**Ya no bloqueado — usuario confirmó §9 Opción B** (reconstrucción nativa + evaluación caso a caso de librerías compatibles con React 19, sin tocar el sistema de estilos base) **y arranque por Dashboard ejecutivo**.

### 11.1 Decisión de arquitectura tomada en Fase 2 (dashboard)

Auditoría adicional de NELVYON reveló que ya existen **dos** sistemas de componentes: `design-system/components/` (tokens CSS-var, usado por `/os/*`, no aplicado al shell SaaS) y el propio lenguaje visual hardcoded de `SaasShellLayout.tsx` (`DarkCard`, `StatCard`, `GradientText`, `#020817`/`#0084ff`). Crear una tercera carpeta `features/nelvyon-ui/` habría introducido un **tercer** sistema — contradice la regla del usuario "no mantengas dos sistemas visuales diferentes" (aquí, tres). Decisión: los nuevos primitivos inspirados en W3CRM viven junto al shell SaaS existente, en `apps/web/src/features/saas-shell/components/SaasDashboardWidgets.tsx`, usando el mismo lenguaje de tokens hardcoded ya establecido. Cero carpeta nueva de "kit" aislado; cero código fuente de plantilla importado.

### 11.2 Módulo 1 — Dashboard ejecutivo (COMPLETADO, ver §12)

1. ✅ `SaasDashboardWidgets.tsx`: `SaasWidgetHeader` (header consistente eyebrow+título+acción), `KpiTile` (KPI con icono, inspirado en el patrón de tarjeta de `(dashboard)/dashboard` de W3CRM), `SaasAvatarBubble` (burbuja de iniciales con color determinista, inspirada en las filas de actividad/empleados de W3CRM).
2. ✅ `/saas/dashboard/page.tsx` reconectado a los mismos widgets/APIs reales (`/api/saas/dashboard`, `/layout`, `/competitor-gap`, `/geo-visibility`, `/reports/generate`) — cero mock data, cero funcionalidad eliminada (drag-reorder de widgets, checklist, pipeline comercial, exportación de informes intactos).
3. ✅ tsc / ESLint / `pnpm build` (312 páginas) / Vitest (195 files · 2464 tests) — **todo PASS**.

### 11.3 Próximo módulo a decidir con el usuario

Candidatos siguientes por orden de prioridad del plan (§7): **CRM/Pipeline** (uso diario) o **IA NELVYON** (mejor alineación con `(aikit)`). No iniciar sin confirmación para respetar "trabaja módulo por módulo, no todo de golpe".
