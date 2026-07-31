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

**Usuario confirmó CRM/Pipeline como módulo 2** (ver §13).

---

## 13. Módulo 2 — CRM / Pipeline (2026-07-30)

### 13.1 Hallazgo crítico previo a migrar: bug de contraste sistémico (causa raíz, no cosmético)

Auditoría de `/saas/crm`, `/saas/pipeline` y de los componentes `features/saas-deals/*` (usados también por el Dashboard vía `CommercialPipelineSection`) reveló que **todos** los componentes basados en tokens semánticos (`NelvyonDsCard`, `NelvyonDsBadge`, `NelvyonDsButton`, `NelvyonDsSectionHeader`, `core/ui/Badge`, `core/ui/pageStatus`, ...) renderizaban **rotos** dentro del shell oscuro de `/saas/*`:

- `SaasShellLayout` fuerza fondo `#020817` pero **nunca** activa el scope `.dark` de Tailwind; los componentes de `design-system/components` usan variables CSS (`--card`, `--foreground`, `--border`, `--muted-foreground`) que solo tienen valores definidos en `:root` (tema claro) → tarjetas blancas y texto oscuro sobre fondo casi negro, contraste roto en decenas de pantallas.
- Verificación adicional (compilación aislada con `@tailwindcss/postcss` sobre el `globals.css` real): las clases `text-destructive`, `bg-destructive`, `text-warning`, `bg-warning`, `text-success`, `bg-success` (y sus variantes `-foreground`) **no generaban ninguna regla CSS** — Tailwind v4 las rechaza como "unknown utility class" porque `--color-destructive`/`--color-success`/`--color-warning` nunca se registraron en el bloque `@theme inline`. Estas clases se usan en **~150 archivos** de todo el producto (badges de estado, botones de peligro, banners de error/warning, `core/ui/Badge.tsx`, etc.) — es decir, todos los estados de éxito/aviso/error del SaaS eran invisibles de forma silenciosa, en cualquier página, clara u oscura.

**Corrección aplicada (causa raíz, no parche visual por componente):**

1. `apps/web/src/app/globals.css`: se registran los tokens que faltaban (`--destructive-foreground`, `--success`, `--success-foreground`, `--warning`, `--warning-foreground`) en `:root` y en `@theme inline` (`--color-*`), y se añade un bloque `.dark { ... }` que redefine `--background/--foreground/--card/--card-foreground/--popover/--secondary/--muted/--accent/--border/--input/--ring/--destructive/--success/--warning` con la paleta oscura NELVYON (`#020817`/`#0b1428`/`#0084ff`), activable vía el `@custom-variant dark (&:where(.dark, .dark *))` ya existente en el archivo.
2. `apps/web/src/features/saas-shell/components/SaasShellLayout.tsx`: se añade la clase `dark` al contenedor raíz del shell SaaS. Efecto: **todas** las páginas `/saas/*` que usan `NelvyonDsCard`/`NelvyonDsBadge`/`NelvyonDsButton`/`NelvyonDsSectionHeader` (no solo CRM/Pipeline) pasan a renderizar con la paleta oscura correcta, sin tocar ni un archivo de componente.
3. Verificación empírica (no solo razonamiento): compilación real de `globals.css` con `@tailwindcss/postcss` confirmando que `text-destructive`/`text-warning`/`text-success` generan reglas válidas tras el fix, y captura de pantalla de una réplica estática de `NelvyonDsCard` + las 5 variantes de `NelvyonDsBadge` + las 4 variantes de `NelvyonDsButton` + `NelvyonDsSectionHeader` dentro de un contenedor `.dark` — todas legibles con buen contraste (evidencia adjunta en el informe de entrega del chat, no versionada por ser un artefacto temporal de verificación).
4. Riesgo: cambio de alcance amplio (afecta toda `/saas/*`), pero de naturaleza puramente aditiva en CSS (ninguna clase/valor existente se elimina, solo se registran tokens que antes no generaban ninguna regla) — el "antes" era roto en todos los casos observados, por lo que no hay regresión posible sobre un estado que funcionara.
5. Pendiente de verificación real (no bloqueante para cerrar este módulo, documentado honestamente): no se hizo una captura de pantalla autenticada de `/saas/crm` o `/saas/pipeline` en vivo porque el entorno local no tiene `DATABASE_URL` configurado (confirmado por warnings de los propios tests). Recomendación: validar visualmente en el primer despliegue a staging.

### 13.2 Migración funcional — Pipeline: kanban real reactivado

`features/saas-deals/components/DealsKanban.tsx`, `DealFormModal.tsx`, `DealDetailPanel.tsx` (drag-and-drop HTML5 nativo, CRUD completo, ya con tests) existían **completos y probados pero sin usar en ninguna pantalla real** (solo referenciados por su propio test). Se decidió **reutilizar y wire-in** en vez de reescribir (evita duplicar la lógica que ya vive en `/saas/pipeline` de forma manual):

- `apps/web/src/app/saas/pipeline/page.tsx`, pestaña **Deals**: sustituida la lista plana por `DealsKanban` (6 columnas por etapa, drag-and-drop, botones ◀/▶ de fallback), con `DealDetailPanel` (ver/editar/eliminar) y `DealFormModal` (crear/editar) cableados a los mismos fetches ya existentes en la página (`/api/saas/deals`, `/api/saas/deals/:id/stage`, `/api/saas/crm/contacts`). No se introduce React Query en esta página (mantiene el patrón `fetch` + `load()` ya usado por el resto de pestañas de este archivo); `DealDetailPanel`/`DealFormModal` sí usan sus hooks React Query internos (`useDeleteSaasDeal`, `useCreateSaasDeal`, `useUpdateSaasDeal`) ya existentes, con `onSuccess`/`onDeleted` refrescando el estado local de la página.
- No se instala `@hello-pangea/dnd`: el kanban nativo ya cubre el caso de uso sin dependencia nueva.
- `features/saas-deals/components/DealsKpiRow.tsx` y `CommercialKpiRow.tsx` (esta última usada por el Dashboard vía `CommercialPipelineSection`) se actualizan al mismo patrón de `KpiTile`/`SaasWidgetHeader` que el Dashboard (icono + valor, glow en el KPI principal) en vez de `NelvyonDsCard` plano — consistencia visual con el módulo 1.
- Resto de componentes `saas-deals` (`StageDistributionPanel`, `CommercialActivityPanels`, `ContactDealsContextPanel`, `CommercialPipelineSection`) y las páginas `/saas/crm`, `/saas/pipeline` (pestañas forecast/playbooks/quotes/contratos) **no requieren cambios de código**: ya usaban `NelvyonDsCard`/`NelvyonDsBadge`/tokens semánticos, y quedan corregidos automáticamente por el fix de §13.1.

### 13.3 Evidencia

| Verificación | Resultado |
|---|---|
| `pnpm -C apps/web exec tsc --noEmit` | **PASS** (0 errores) |
| `pnpm -C apps/web exec eslint <archivos modificados>` | **PASS** (0 errores/warnings en código; 1 warning esperado de ESLint ignorando `.css`) |
| `pnpm -C apps/web exec vitest run backend/saas src/features/saas-deals` | **PASS** — incluye `DealsKanban.test.tsx` (drag-and-drop, click, fallback de botones) sin modificar — 2449 tests passed, 4 skipped |
| `pnpm -C apps/web build` | **PASS** — build de producción completo, sin errores |
| Verificación empírica del fix de tokens | Compilación aislada de `globals.css` con `@tailwindcss/postcss` confirmando generación de reglas para `text-destructive/success/warning` tras el fix (fallaban con "unknown utility class" antes) + captura de pantalla de mockup estático con las clases reales de `NelvyonDsCard`/`Badge`/`Button`/`SectionHeader` dentro de `.dark` |
| Funcionalidad preservada | CRUD de deals, cambio de etapa, presupuestos, playbooks, contratos, forecast — sin cambios de comportamiento salvo la pestaña Deals (antes lista plana, ahora kanban con las mismas acciones) |
| Branding/mock data | Cero — mismas APIs reales (`/api/saas/deals`, `/api/saas/crm/contacts`, `/api/saas/playbooks`, `/api/saas/quotes`, `/api/saas/contracts`) |
| `claimReady` / canary | `false` / `KILL` — sin cambios |

### 13.4 Pendiente / riesgo conocido

- Verificación visual en un entorno con `DATABASE_URL` real (staging) recomendada antes de considerar el módulo 100 % cerrado a nivel de producto, aunque la corrección de CSS está verificada empíricamente a nivel de compilación y con mockup estático.
- `DealsKpiRow` (fila de KPIs de deals) sigue sin usarse en ninguna pantalla real tras este módulo (se dejó corregida visualmente pero no se forzó su integración en `/saas/pipeline` para no duplicar la banda de KPIs ya existente en esa página) — candidato a consolidación futura si se decide unificar ambas.
- Bug pre-existente y no relacionado (no corregido, fuera de alcance): `tone={statusTone[c.status] ?? "default"}` en la pestaña Contratos de `/saas/pipeline` usa `"default"` como tono de fallback, que no es un valor válido de `NelvyonDsBadgeProps["tone"]` (solo compila porque `Record<string, Tone>` no fuerza el tipo del operando derecho de `??`); efecto real: badge sin color de tono cuando el status no está en el mapa. Anotado para corrección en una pasada de limpieza específica. **→ Corregido 2026-07-31, commit `8974e873`, ver §14.0.**

---

## 14. Módulo 3 — IA NELVYON (2026-07-31)

### 14.0 Deuda previa cerrada antes de iniciar el módulo

Fallback `"default"` inválido en badge de Contratos (§13.4) corregido a `"neutral"` en `apps/web/src/app/saas/pipeline/page.tsx`. Gates: `tsc` PASS, `eslint` PASS, `vitest backend/saas + src/features/saas-deals` 2449 passed/4 skipped, `build` PASS. Commit `8974e873` (separado, antes del módulo 3). Entrada movida a `KNOWN_ISSUES.md` → Historial resuelto.

### 14.1 Alcance real auditado

Inventario real de IA en `saasNav.ts` (grupo `ia`, subconjunto "asistencia conversacional/generativa" pedido explícitamente por el usuario — el resto del grupo `ia` — `pack-store`, `data-playbooks`, `brief-to-launch`, `compliance`, `benchmark` — es un motor de packs/growth distinto y queda para un módulo posterior):

| Ruta | API real | Estado previo | Acción |
|---|---|---|---|
| `/saas/ai` (Panel IA) | `private-ai/{router-health,agents,metrics}`, `mcp`, `shared-memory`, `orchestrator`, `ai-agents` (status/workflows/runtime/canaries/leaderboard) | Funcional pero con **sistema visual propio** (divs `border-white/10`, sin `NelvyonDs*`) — inconsistente con el resto de `/saas/*` ya migrado | Reescrito con `NelvyonDsCard/Badge/SectionHeader/StatusDot` + `KpiTile` (mismo patrón que Dashboard/CRM) |
| `/saas/autopilot` | `GET/PATCH /api/saas/autopilot`, `POST /api/saas/autopilot/run`, `GET /api/saas/entregables` | Funcional, mismo problema: hardcode `white/10`/`#0084ff` en vez de tokens `NelvyonDs*` | Reescrito con `NelvyonDsCard/Badge/Button` + `KpiTile`; lógica y API sin cambios |
| `/saas/agentes` | `POST /api/saas/agentes/execute`, `GET /api/saas/agentes/runs` | Ya usaba `NelvyonDs*` (correcto); **el historial de ejecuciones se pedía a la API pero nunca se renderizaba** (solo se usaba `runs.length` para un contador) | Añadida sección real "Historial de ejecuciones" (colapsable) con datos reales de `saas_agent_runs`, sin tocar la API |
| `/saas/chat` | `GET/POST /api/saas/chat` | Ya usaba `NelvyonDs*` (correcto visualmente); **bug funcional real**: `GET` leía historial de `saas_chat_messages` pero `POST` nunca lo persistía → el historial estaba siempre vacío y se perdía al recargar; además esas conversaciones quedaban fuera del export/delete GDPR (`SaasGdprService` sí lee `saas_chat_messages`) | Causa raíz corregida (ver §14.2) — historial real cargado al entrar, botón "Nueva conversación" (`DELETE`) |
| `/saas/copywriter` | `GET/POST /api/saas/ai-copy` | Ya usaba `NelvyonDs*`, consistente | Sin cambios — auditado, ya cumple el estándar visual y funcional |
| `/saas/knowledge-base` | `GET/POST/DELETE /api/saas/knowledge-base` | **Ruta huérfana**: página real y funcional (CRUD de artículos/categorías de centro de ayuda), conectada a API real con `requireSaasContext`, pero **ausente de `saasNav.ts`** (inaccesible desde el sidebar) y con `activeId="herramientas"` (bug — resaltaba el ítem equivocado en el menú) | Añadida a `saasNav.ts` (grupo `gestion`, junto a `helpdesk` — es un centro de ayuda para clientes, no un corpus de entrenamiento IA separado) + `activeId` corregido a `"knowledge-base"` + traducciones en los 6 locales |

**Nota de honestidad de alcance:** el usuario pidió incluir "Prompts", "Configuración de modelos" y "Herramientas IA" como áreas de IA NELVYON. Se auditó el inventario real (`saasNav.ts`, `/api/saas/*`) y **no existe** ninguna pantalla ni API real independiente para una librería de prompts, un editor de configuración de modelos, o un catálogo de "herramientas IA" distinto del ya existente `/saas/herramientas` (que es widget/pixel embed, no relacionado con IA). La configuración de modelos y el consumo/analítica IA reales sí existen y se exponen — dentro del **Panel IA** (`router-health` = qué modelo/router está activo y certificado; `private-ai/metrics` = consumo real: `agentRuns`, `openClawDispatches`) — por lo que se integraron ahí en vez de crear pantallas nuevas sin API real detrás (regla no negociable: "no UI sin API real detrás"). No se ha creado ninguna pantalla, tabla ni endpoint ficticio para rellenar hueco.

### 14.2 Fix funcional — historial de chat persistido (causa raíz)

`apps/web/src/app/api/saas/chat/route.ts` POST generaba la respuesta llamando directamente a OpenAI (system prompt de marketing) pero **nunca invocaba `SaasChatService`**, mientras que GET sí leía de `saas_chat_messages` vía `getHistory`. Efecto real: el asistente de marketing nunca guardaba nada, el historial visible en la UI se perdía en cada recarga, y esas conversaciones no eran alcanzables por el export/delete GDPR (`SaasGdprService.exportUserData`/`deleteUserData` sí operan sobre `saas_chat_messages`).

**Corrección:**

1. `backend/saas/SaasChatService.ts`: nuevo método `saveExchange(userId, tenantId, userContent, assistantContent)` — persiste el turno user+assistant ya generado sin volver a invocar el LLM (la ruta ya tiene su propia respuesta de OpenAI con su propio prompt).
2. `apps/web/src/app/api/saas/chat/route.ts`: POST llama a `saasChatService.saveExchange(...)` tras obtener la respuesta de OpenAI (best-effort, con `catch` que solo loguea — un fallo de persistencia no debe romper la respuesta al usuario); nuevo `DELETE` que expone `clearHistory` (ya existente en el servicio, sin uso previo) para permitir "Nueva conversación".
3. `apps/web/src/app/saas/chat/page.tsx`: al montar, `GET /api/saas/chat` carga el historial real (si existe) en vez de arrancar siempre con el saludo genérico; botón "🗑 Nueva conversación" llama a `DELETE` y resetea el estado local.
4. Test añadido: `backend/saas/__tests__/saasChat.test.ts` → `saveExchange inserta mensaje user y assistant sin invocar el LLM`.

Sin mocks, sin datos ficticios, misma tabla/API ya existente y ya cubierta por el flujo GDPR — solo se cierra el hueco entre lo que el `GET` prometía servir y lo que el `POST` realmente guardaba.

### 14.3 Evidencia

| Verificación | Resultado |
|---|---|
| `pnpm -C apps/web exec tsc --noEmit` | **PASS** (0 errores) |
| `pnpm -C apps/web exec eslint <archivos modificados>` | **PASS** (0 errores/warnings) |
| `pnpm -C apps/web exec vitest run backend/saas src/features/saas-shell` | **PASS** — 2446 tests passed, 4 skipped (incluye el nuevo test de `saveExchange`) |
| `pnpm -C apps/web build` | **PASS** — build de producción completo |
| Smoke de rutas (servidor productivo local, sin `DATABASE_URL`) | `GET /saas/{ai,autopilot,agentes,chat,copywriter,knowledge-base}` → `307` (redirect a login, esperado sin sesión) · `GET /api/saas/{chat,autopilot,agentes/runs,knowledge-base,private-ai/router-health}` → `401` (esperado, sin crash 500) |
| Verificación visual autenticada en staging | **BLOCKED_ENVIRONMENT** — sin `DATABASE_URL`/sesión local; mismo hallazgo que en el módulo 2 (§13.4). Recomendado en el primer despliegue a staging |
| Funcionalidad preservada | RBAC (`requireSaasContext` + permiso por endpoint), multi-tenancy (`tenant_id`/`ctx.tenant.id` en cada query), canary IA apagado, `claimReady=false` — sin cambios |
| Branding/mock data | Cero — mismas APIs reales, ninguna pantalla nueva sin backend real |

### 14.4 Pendiente / riesgo conocido

- Verificación visual autenticada en staging (igual que módulo 2, no bloqueante para cerrar el módulo a nivel de código).
- "Prompts library" y "editor de configuración de modelos" dedicados no existen como funcionalidad real — documentado en §14.1 como decisión consciente (no crear pantallas sin API real detrás), no como trabajo pendiente oculto.

---

## 15. Módulo 4 — Comunicación: inbox, campañas, secuencias, SMS, WhatsApp, dialer, deliverability (2026-07-31)

### 15.1 Alcance real auditado

Grupo `comunicacion` de `saasNav.ts` + `inbox`/`deliverability` (grupo `principal`, canal directo de comunicación). `social` (redes sociales) queda excluido de este módulo por orden explícito del usuario — corresponde al módulo 5 "Marketing y redes sociales".

| Ruta | API real | Estado previo | Acción |
|---|---|---|---|
| `/saas/inbox` | `GET/PATCH /api/saas/inbox`, `/[id]/{messages,assign,suggest}`, `/agent` | Ya usaba `NelvyonDs*`+tokens semánticos, estados loading/error/empty completos — el módulo mejor migrado de los 7 auditados | Ajuste menor de coherencia: KPI de SLA (Abiertas/En riesgo/Incumplido) migrado de `NelvyonDsCard` manual a `KpiTile` (mismo patrón que el resto de módulos) |
| `/saas/whatsapp` | `GET/POST /api/saas/whatsapp`, `/templates`, `/catalog` | Ya usaba `NelvyonDs*`, tabs, sync Meta, estados completos | Sin cambios — auditado, cumple el estándar |
| `/saas/dialer` | `GET/POST /api/saas/dialer`, `/a2p`, `dialerAdvancedApi` (power/parallel/voicemail) | Ya usaba `NelvyonDs*`, 3 tabs, estados completos | Sin cambios — auditado, cumple el estándar |
| `/saas/campanias` | `GET/POST /api/saas/campanias`, `/[id]/{launch,pause,stats,recipients}` | Sistema visual propio (`DarkCard`, `text-white`, `bg-[#0084ff]` literal) heredado de antes del fix de contraste del módulo 2; **bug de datos**: `openRate` de cada fila calculado como `(0 / sentCount) * 100` (numerador hardcodeado en `0`) pese a que el backend ya devuelve `openedCount`/`clickedCount` reales | Reescrito con `NelvyonDsCard/Badge/Button/SectionHeader`+`KpiTile`; tipo `Campania` del frontend ampliado con `openedCount`/`clickedCount`; `openRate` real por fila. `CampaniaTemplateQuickLaunch` alineado a tokens semánticos (antes texto blanco hardcodeado dentro de una card ya migrada) |
| `/saas/sms` | `GET/POST /api/saas/sms` | Visualmente ya usaba `NelvyonDs*`, pero **con datos ficticios**: `load()` descartaba la respuesta real de la API y asignaba `campaigns: []` hardcodeado; el modal "Nueva campaña SMS" llamaba a una acción (`create_campaign`) que el backend nunca implementó (siempre 400); el modal "Enviar SMS único" enviaba `{to, body}` cuando la API espera `{to, message}` (siempre fallaba) | Ver §15.2 — fix de causa raíz de extremo a extremo (backend + API + frontend) |
| `/saas/secuencias` | `GET/POST /api/saas/sequences`, `/[id]/{steps,enroll,reply-hook}`, `/templates` | Backend 100 % real (`SaasSequencesService`/`SaasSequenceTemplatesService`, sin mocks) pero UI con clases hardcodeadas (`bg-[#0d1117]`, `text-white/40`, etc.) desde antes del fix de contraste | Reescrito con `NelvyonDs*`+`KpiTile` (secuencias/activas/inscritos); lógica y API sin cambios — no había bugs funcionales, solo deuda visual |
| `/saas/deliverability` | `GET/POST /api/saas/deliverability` | Backend real (`SaasDeliverabilityService`, cálculo de bounce/health score sobre `saas_campania_recipients`) pero UI hardcodeada sin manejo de errores (fallo silencioso = "Cargando métricas…" indefinido) ni feedback de éxito tras guardar IP/avanzar warm-up | Reescrito con `NelvyonDs*`+`KpiTile`; añadido manejo de error explícito y confirmación visual de éxito en ambas acciones |

### 15.2 Fix funcional — historial real de SMS (causa raíz, backend + API + frontend)

`backend/db/migrations/419_sms_log.sql` ya crea `saas_sms_log` (tenant-scoped, con índice por `tenant_id, created_at`) y `SaasSmsService.send()` ya escribe ahí en cada envío (`logSms`) — pero **ningún método leía esa tabla de vuelta** y la página `/saas/sms` sustituía la respuesta real de `GET /api/saas/sms` por un array vacío hardcodeado, mostrando siempre "Sin campañas SMS" sin importar el histórico real. Además existía un "Nueva campaña SMS" que llamaba a `POST /api/saas/sms` con `{action:"create_campaign"}` — acción no soportada por el backend (el `POST` solo entiende `{to, message}` para envío único o `{recipients[]}`, bloqueado) — y el modal de envío único enviaba el campo `body` en vez de `message`, por lo que ese envío tampoco funcionaba nunca.

**Corrección:**

1. `backend/saas/SaasSmsService.ts`: nuevo método `listRecent(tenantId, limit)` — lee `saas_sms_log` ordenado por fecha, límite acotado a `[1, 200]`.
2. `apps/web/src/app/api/saas/sms/route.ts`: `GET` ahora incluye `messages: SaasSmsLogEntry[]` (mismo contrato de forma que `/api/saas/{whatsapp,dialer}`).
3. `apps/web/src/app/saas/sms/page.tsx`: reescrita para consumir el historial real (Enviados/Fallidos/Total + lista, igual patrón que WhatsApp/Dialer) en vez de un concepto de "campaña" sin respaldo backend; el modal de envío único corregido a `{to, message}`.
4. Tests añadidos: `backend/saas/__tests__/SaasSmsService.test.ts` → `listRecent` mapea filas a camelCase y acota el límite a `[1,200]`.

Sin mocks nuevos — al contrario, se elimina el único mock que existía en este módulo (`campaigns: []` hardcodeado) y se expone un dato ya persistido en producción pero nunca leído.

### 15.3 Evidencia

| Verificación | Resultado |
|---|---|
| `pnpm -C apps/web exec tsc --noEmit` | **PASS** (0 errores) |
| `pnpm -C apps/web exec eslint <archivos modificados>` | **PASS** (0 errores/warnings) |
| `pnpm -C apps/web exec vitest run backend/saas backend/email src/features/saas-crm` | **PASS** — 195 test files, 2467 passed / 4 skipped (incluye los 2 tests nuevos de `listRecent`) |
| `pnpm -C apps/web build` | **PASS** — build de producción completo (312 páginas) |
| Smoke de rutas (servidor productivo local, sin `DATABASE_URL`) | `GET /saas/{campanias,sms,secuencias,deliverability,whatsapp,dialer,inbox}` → `307` (redirect a login, esperado sin sesión) · `GET /api/saas/{campanias,sms,sequences,deliverability,whatsapp,dialer,inbox}` → `401` (esperado, sin crash 500) |
| Verificación visual autenticada en staging | **BLOCKED_ENVIRONMENT** — sin `DATABASE_URL`/sesión local; mismo hallazgo que módulos 2 y 3 |
| Funcionalidad preservada | RBAC (`requireSaasContext`+permiso por endpoint), multi-tenancy (`tenant_id` en cada query), canary IA apagado, `claimReady=false` — sin cambios. `campanias.launch`/`campanias.write`/`isViewer` (`SaasCan`/`SaasPermissionDenied`) intactos |
| Branding/mock data | Cero — y se elimina el único mock real detectado en el módulo (`campaigns: []` de `/saas/sms`) |

### 15.4 Pendiente / riesgo conocido

- Verificación visual autenticada en staging (igual que módulos 2 y 3, no bloqueante para cerrar el módulo a nivel de código).
- `SaasSmsService` sigue sin un concepto real de "campaña SMS" (solo envío único + log) — si el negocio necesita campañas masivas de SMS en el futuro, requiere diseño de producto explícito (tabla de campaña, audiencia, límites legales de bulk ya existentes en `sendBulk`), no se ha inventado esa funcionalidad en esta pasada.

---

## 16. Módulo 5 — Automatizaciones y workflows (2026-07-31)

### 16.1 Alcance real auditado

Grupo `gestion` de `saasNav.ts` (ítem `workflows`), con sus dos pantallas reales: `/saas/workflows` (builder clásico trigger→condición→acción, backend `SaasWorkflowService`, 16 triggers/17 acciones/24+ plantillas oficiales) y `/saas/workflows/editor` (editor visual drag-and-drop sobre `@xyflow/react`, backend `DragDropWorkflowService`, tabla `dragdrop_workflows`). El builder clásico ya era una implementación real y extensa (sin mocks, backend completo con runs/versiones/recipes) — el trabajo se centró en homogeneizar tokens visuales y corregir un defecto funcional grave en el editor visual.

### 16.2 Hallazgo funcional de causa raíz — editor visual inutilizable más allá de una demo fija

`DragDropWorkflowService` (backend 100% real, cubierto por `dragDropWorkflow.test.ts`: `createWorkflow`/`updateWorkflow`/`getWorkflow`/`listWorkflows`/`deleteWorkflow`/`attachTenant`/`publishAsSaasWorkflow`/`executeWorkflow`) expone capacidad completa para guardar, listar, recuperar y borrar flujos visuales por usuario, y publicarlos como `SaasWorkflow` real. La página `/saas/workflows/editor` auditada:

1. **Nunca llamaba a `GET /api/saas/workflows/visual`** (ya implementado y funcional en el route handler) — el editor siempre arrancaba con exactamente los mismos 2 nodos hardcodeados (`Trigger: contact_created` → `Action: send_email`), sin ninguna forma de recuperar un flujo guardado anteriormente. Guardar funcionaba (creaba filas reales en `dragdrop_workflows`), pero esas filas eran efectivamente inaccesibles desde la UI salvo reescribiendo la URL/API a mano.
2. **No existía ninguna forma de añadir nodos** — el lienzo de ReactFlow solo permitía conectar los 2 nodos fijos con una arista; no había paleta ni botón para insertar un nuevo trigger o acción, ni para cambiar el tipo de un nodo existente. En la práctica, el "editor visual de workflows" solo podía publicar siempre la misma combinación fija `contact_created → send_email`, independientemente de lo que el usuario intentara construir.
3. **`deleteWorkflow` (ya implementado y testeado en el servicio) no estaba expuesto por ninguna API** — no había manera de borrar un flujo visual creado por error.

**Corrección** (usa exclusivamente capacidad de backend ya real y probada, cero funcionalidad de negocio nueva inventada):

- Nuevo `GET`/`DELETE /api/saas/workflows/visual/[id]` (`apps/web/src/app/api/saas/workflows/visual/[id]/route.ts`), permisos `workflows.read`/`workflows.delete` (ya existentes en `saasRbac.ts`), llamando a `getWorkflow`/`deleteWorkflow` del servicio ya testeado.
- `/saas/workflows/editor` reescrito: panel "Mis flujos" (lista real vía `GET /api/saas/workflows/visual`, cargar/eliminar), botones "+ Nodo trigger" / "+ Nodo acción" que insertan nodos reales en el lienzo, panel de configuración del nodo seleccionado con selector de tipo. El catálogo de acciones del selector se limita deliberadamente a los **4 tipos que `publishAsSaasWorkflow` mapea explícitamente** (`send_email`, `notify`, `add_tag`, `webhook_out`) — el resto de tipos de acción existentes en `WorkflowAction` degradarían en silencio a `notify` al publicar, y ofrecerlos en el editor visual habría sido introducir una nueva mentira funcional, no corregir una. Los 16 triggers se ofrecen completos porque `publishAsSaasWorkflow` los pasa sin remapear.
- Sin cambios en `DragDropWorkflowService`, `SaasWorkflowService` ni en el modelo de datos — el fix es 100% de exposición/consumo de una capacidad de backend preexistente, igual que el patrón de `SaasSmsService.listRecent` en el módulo 4.

### 16.3 Fixes de consistencia visual (`/saas/workflows`)

El builder clásico ya usaba en su mayoría `NelvyonDsCard/Badge/Button/SectionHeader`, pero conservaba clases Tailwind hardcodeadas heredadas de antes del fix de contraste del módulo 2: KPIs de estado (`all/active/paused/draft/archived`) en `NelvyonDsCard` manual → migrados a `KpiTile`; banners de aviso SES/Twilio y de resultado del "Kit arranque Nelvyon" en `yellow-500`/`green-500`/`red-500` literales → tokens `warning`/`success`/`destructive`; botones de acción por fila (Activar/Pausar/Eliminar) en `green-500`/`yellow-500`/`red-500` literales → mismos tokens semánticos; puntos de estado de los runs en el panel de detalle (`bg-green-400`/`bg-red-400`/`bg-yellow-400`) → `NelvyonDsStatusDot`; enlace "Editor visual" con `border-white/20`/`text-white` hardcodeado → tokens `border-border`/`text-foreground`. Eliminada además una constante `_panels` muerta (definida y nunca usada) detectada durante la auditoría. Cero cambios de comportamiento en el builder clásico — API, RBAC, condiciones, versiones y ejecución de runs intactos.

### 16.4 Evidencia

| Verificación | Resultado |
|---|---|
| `pnpm -C apps/web exec tsc --noEmit` | **PASS** (0 errores) |
| `pnpm -C apps/web exec eslint <archivos modificados>` | **PASS** (0 errores/warnings) |
| `pnpm -C apps/web exec vitest run backend/saas/__tests__/dragDropWorkflow.test.ts backend/saas/__tests__/saasWorkflow*` | **PASS** — 8 test files, 92 passed |
| `pnpm -C apps/web exec vitest run backend/saas backend/email src/features/saas-crm` | **PASS** — 195 test files, 2467 passed / 4 skipped |
| `pnpm -C apps/web build` | **PASS** — build de producción completo (312 páginas), incluye `/api/saas/workflows/visual/[id]` |
| Smoke de rutas (servidor productivo local, sin `DATABASE_URL`) | `GET /saas/{workflows,workflows/editor}` → `307` · `GET/DELETE /api/saas/workflows/{,recipes,visual,visual/:id}` → `401` (esperado, sin sesión, sin 500) |
| Verificación visual autenticada en staging | **BLOCKED_ENVIRONMENT** — sin `DATABASE_URL`/sesión local; mismo hallazgo que módulos 2, 3 y 4 |
| Funcionalidad preservada | RBAC (`workflows.read/write/delete/execute`), scoping por `user_id` en `dragdrop_workflows` (diseño preexistente: borrador personal hasta `attachTenant`+publish, momento en el que pasa a `saas_workflows` con `tenant_id`) sin cambios · canary IA apagado · `claimReady=false` |
| Branding/mock data | Cero — el editor visual pasa de un demo fijo de 2 nodos a una herramienta real de construcción de flujos sobre datos 100% del backend |

### 16.5 Pendiente / riesgo conocido

- Verificación visual autenticada en staging (igual que módulos 2, 3 y 4, no bloqueante para cerrar el módulo a nivel de código).
- El editor visual publica siempre en estado `draft` (comportamiento preexistente de `publishAsSaasWorkflow`, sin cambios) — el usuario debe activarlo manualmente desde `/saas/workflows` tras publicar; el mensaje de estado del editor ahora lo indica explícitamente.
- El catálogo de acciones del editor visual queda limitado a 4 tipos por el motivo explicado en §16.2; ampliar `publishAsSaasWorkflow` para soportar más tipos (p. ej. `send_sms`, `create_task`) sería una mejora de producto legítima pero está fuera del alcance de esta migración visual (requiere decisión de negocio sobre qué configuración por defecto usar para cada tipo nuevo).
