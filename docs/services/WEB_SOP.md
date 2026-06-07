# Web corporativa — SOP operativo

**SKU:** `NELVYON-WEB`  
**Versión SOP:** 1.0  
**Fase:** SERVICES-PHASE-1  
**Referencia QA:** `SERVICES_QA_MASTER.md`

---

## Resumen

Diseño, desarrollo y publicación de sitio web corporativo multipágina, responsive, SEO on-page y listo para operación del cliente.

| Tier | Páginas | Plazo | Revisiones |
|------|---------|-------|------------|
| **Standard** | 5–7 | 15–25 días laborables | 2 |
| **Premium** | 8–15 | 30–45 días laborables | 4 |

---

## 1. SOP paso a paso

### Fase 0 — Intake (Día 0–2) · Account

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 0.1 | Enviar brief §3 al cliente | Brief firmado en `01-brief/` |
| 0.2 | Validar accesos: dominio, hosting, marca | Checklist accesos G0 |
| 0.3 | Crear cliente + proyecto + tareas en OS | Proyecto `WEB-[CLIENTE]` |
| 0.4 | Asignar freelancer; kick-off call 45 min | Acta kick-off |

### Fase 1 — Arquitectura (Día 2–5) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 1.1 | Auditar referencias y competencia (3–5 sitios) | Nota 1 pág en Drive |
| 1.2 | Proponer sitemap (lista páginas + jerarquía) | `sitemap-v1.pdf` |
| 1.3 | Wireframes low-fi desktop+mobile páginas clave | Figma link |
| 1.4 | **Hito cliente:** aprobación sitemap + wireframes | Email aprobación |

### Fase 2 — Contenido (Día 5–12) · Freelancer + cliente

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 2.1 | Redactar copy por página (o integrar copy cliente) | Doc `copy-[pagina].md` |
| 2.2 | Definir meta title/description por URL | Hoja SEO on-page |
| 2.3 | Seleccionar/implementar imágenes (licencia OK) | Carpeta `assets/` |
| 2.4 | **Ronda revisión 1** copy + estructura | Comentarios Figma/Docs |

### Fase 3 — Diseño UI (Día 10–18) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 3.1 | UI high-fi Home + interior template | Figma |
| 3.2 | Design system lite: color, tipo, botones, cards | Página Figma DS |
| 3.3 | Estados: hover, error form, 404, vacío | Frames Figma |
| 3.4 | **Ronda revisión 2** diseño | Email aprobación |

### Fase 4 — Build (Día 15–22) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 4.1 | Generar base en NELVYON Web Builder o stack acordado | Proyecto builder |
| 4.2 | Implementar páginas según Figma aprobado | URL staging |
| 4.3 | Formulario contacto → email/CRM según brief | Test captura |
| 4.4 | Integrar GA4 + Search Console (propiedad cliente) | Screenshots |
| 4.5 | Schema.org Organization + WebSite | Validador schema |
| 4.6 | Subir entregable staging en OS | `WEB-staging-v1` |

### Fase 5 — QA (Día 20–24) · Freelancer + QA Lead

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 5.1 | Auto-checklist §6 completo | Checklist firmado |
| 5.2 | PageSpeed móvil documentado | Informe PSI |
| 5.3 | QA NELVYON Gate G3 | Informe QA |
| 5.4 | Corregir bloqueantes | Commit/staging actualizado |

### Fase 6 — Publicación (Día 22–25) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 6.1 | DNS / dominio apuntando a hosting | WHOIS/DNS screenshot |
| 6.2 | SSL activo | https OK |
| 6.3 | Redirects www/non-www definidos | Tabla redirects |
| 6.4 | Sitemap.xml + robots.txt | URLs verificadas |
| 6.5 | **Ronda revisión final** cliente | Aceptación email |

### Fase 7 — Handoff (Día 25–28) · Account

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 7.1 | Pack entregables §4 en Drive + OS | Entregable `published` |
| 7.2 | Sesión handoff 60 min (grabada si premium) | Loom link |
| 7.3 | 30 días soporte bugs críticos (no nuevas páginas) | Ticket channel |

---

## 2. Brief de cliente

**Proyecto:** _______________ **Fecha:** _______________  
**Contacto decisor:** _______________ **Email:** _______________

### A. Negocio

1. Descripción empresa y propuesta de valor (3 frases):
2. Público objetivo principal:
3. Principales competidores (URLs):
4. Objetivo del sitio (marca / leads / recruiting / otro):

### B. Alcance

5. Tier: [ ] Standard (5–7 pág) [ ] Premium (8–15 pág)
6. Páginas requeridas (marcar): Home / Empresa / Servicios / Sectores / Casos / Blog / Contacto / Legal / Otras: ___
7. Idiomas: [ ] ES [ ] EN [ ] Otro: ___

### C. Marca y contenido

8. Logo y guía de marca (adjuntar): [ ] Sí [ ] No — ¿crear básico?
9. Paleta y tipografías obligatorias:
10. ¿Quién provee copy? [ ] Cliente [ ] NELVYON [ ] Mixto
11. Referencias web que le gustan (3 URLs):
12. Referencias a evitar:

### D. Técnico

13. Dominio existente: _______________
14. Hosting actual o a contratar: _______________
15. Integraciones: [ ] GA4 [ ] GSC [ ] CRM ___ [ ] Chat widget [ ] Otro ___
16. Formulario contacto destino email: _______________

### E. Legal y plazos

17. Textos legales: [ ] Cliente provee [ ] NELVYON plantilla [ ] Abogado cliente
18. Fecha objetivo lanzamiento: _______________
19. Presupuesto aprobado / tier: _______________

**Firma cliente:** _______________ **Fecha:** _______________

---

## 3. Entregables exactos

| # | Entregable | Formato | Ubicación |
|---|------------|---------|-----------|
| E1 | Sitemap aprobado | PDF | `04-entregables/` + OS |
| E2 | Wireframes | Figma export PDF | Drive |
| E3 | Copy final por página | MD o Google Doc | Drive |
| E4 | UI Figma final | Figma link + export | Drive |
| E5 | Sitio publicado en dominio acordado | URL live | Cliente |
| E6 | Hoja SEO on-page (titles, metas, H1) | XLSX/CSV | Drive |
| E7 | Informe PageSpeed baseline | PDF captura | `03-qa/` |
| E8 | Guía edición básica (CMS/builder) | PDF 5–10 pp | `05-handoff/` |
| E9 | Credenciales y accesos (caja segura) | 1Password / vault | Solo handoff |
| E10 | Backup export código/static | ZIP | OS entregable |

**Premium añade:** E11 sesión grabada handoff; E12 página Blog con 2 artículos semilla.

---

## 4. Criterios de aceptación

El cliente **acepta** el proyecto cuando se cumplen **todos**:

| ID | Criterio | Verificación |
|----|----------|--------------|
| A1 | Todas las páginas del sitemap aprobado están live | Checklist URLs |
| A2 | Sitio usable en móvil 375px sin scroll horizontal | QA móvil |
| A3 | Formulario contacto envía correctamente | Test con email cliente |
| A4 | GA4 recibe page_view en dominio producción | DebugView / tiempo real |
| A5 | Política privacidad y aviso legal accesibles desde footer | Link check |
| A6 | Meta title único por página | Screaming Frog o manual |
| A7 | Cambios de rondas contratadas incorporados o documentados como waiver | Acta |

**Silencio positivo:** si contrato lo indica, 5 días laborables sin objeción tras entrega = aceptado.

---

## 5. Checklist de calidad

### Diseño y UX

- [ ] 🔴 Identidad visual coherente con marca en todas las páginas
- [ ] 🔴 Navegación clara; máximo 7 ítems menú principal
- [ ] 🔴 CTAs visibles en Home above-the-fold (móvil)
- [ ] 🟠 Imágenes optimizadas; sin pixelación evidente
- [ ] 🟠 Estados hover/focus en botones y links
- [ ] 🟡 Animaciones no bloquean lectura ni performance

### Técnico

- [ ] 🔴 HTTPS sin mixed content
- [ ] 🔴 404 personalizado
- [ ] 🔴 Favicon configurado
- [ ] 🔴 robots.txt y sitemap.xml accesibles
- [ ] 🟠 Redirects 301 de URLs antiguas si migración
- [ ] 🟠 Lazy load imágenes below-fold
- [ ] 🟡 Core Web Vitals LCP mobile documentado (objetivo < 2.5s aspiracional)

### SEO on-page

- [ ] 🔴 Un H1 por página
- [ ] 🔴 Title < 60 car; description < 155 car aprox
- [ ] 🟠 Enlaces internos entre páginas relacionadas
- [ ] 🟠 Alt text en imágenes informativas
- [ ] 🟡 Schema Organization validado

### Contenido y legal

- [ ] 🔴 Sin lorem ipsum en producción
- [ ] 🔴 Ortografía revisada idioma acordado
- [ ] 🔴 Datos contacto correctos
- [ ] 🟠 Cookies banner si aplica jurisdicción EU

### OS y proceso

- [ ] 🔴 Entregables subidos a OS con naming estándar
- [ ] 🔴 Informe QA G3 = APROBADO
- [ ] 🟠 Preview `/os/web-premium/preview` revisado si cambios ingeniería

---

## 6. Herramientas obligatorias

| Categoría | Herramienta | Uso |
|-----------|-------------|-----|
| **NELVYON** | Web Builder (`os_web_builder_service`) | Generación y publish |
| **NELVYON** | WebPremiumAgent (opcional) | Borrador acelerado |
| **NELVYON** | `/os/web-premium/preview` | Checklist QA interno |
| Diseño | Figma | Wireframes + UI |
| QA | Google PageSpeed Insights | Performance |
| QA | BrowserStack o dispositivo real | Responsive |
| SEO | Google Search Console | Indexación post-launch |
| Analytics | GA4 | Medición |
| Colaboración | Google Drive + Notion | Archivos proyecto |
| Comms | Email + Loom (premium) | Aprobaciones y handoff |

---

## 7. Tiempos

| Actividad | Standard | Premium |
|-----------|----------|---------|
| **Total proyecto** | 15–25 D | 30–45 D |
| Intake + kick-off | 2 D | 2 D |
| Arquitectura | 3 D | 5 D |
| Contenido | 5 D | 10 D |
| Diseño | 5 D | 10 D |
| Build | 5 D | 10 D |
| QA + publicación | 3 D | 5 D |
| Handoff | 2 D | 3 D |

*D = días laborables. Paralelización contenido/diseño posible tras aprobación wireframes.*

---

## 8. Perfil freelancer ideal

| Campo | Requisito |
|-------|-----------|
| **Título** | Web Designer / Front-end hybrid |
| **Experiencia** | 4+ años sitios corporativos B2B |
| **Portfolio** | 5+ webs live con case study |
| **Skills obligatorias** | Figma, HTML/CSS, responsive, UX writing básico |
| **Skills deseables** | Next.js, SEO on-page, NELVYON Web Builder |
| **Idioma** | ES nativo; EN lectura |
| **Disponibilidad** | Daily async update; sync semanal 30 min |

---

## 9. Riesgos frecuentes

| Riesgo | Señal | Mitigación |
|--------|-------|------------|
| Scope creep páginas | "Solo una página más" | Change request; límite tier |
| Copy retrasado cliente | Fase 2 bloqueada | SLA brief; placeholder solo staging |
| DNS mal configurado | SSL error post-launch | Checklist DNS pre-go-live |
| Marca inconsistente | Cliente sin brand guide | Mini DS acordado en kick-off |
| Migración URLs rotas | Tráfico cae | Mapa 301 antes de switch |
| Formulario spam | Inbox inundado | honeypot/reCAPTCHA si acordado |
| Imágenes sin licencia | Uso stock sin licencia | Banco acordado (Unsplash+ licencia, Shutterstock cliente) |

---

## 10. Flujo dentro de NELVYON OS

```
1. Account → /os/clientes/nuevo → Cliente "Acme Corp"
2. Account → /os/proyectos/nuevo → Proyecto "WEB Acme 2026"
3. PM crea tareas (/os/tareas) por fase SOP:
   - T1 Arquitectura | T2 Contenido | T3 Diseño | T4 Build | T5 QA | T6 Launch
4. Freelancer → entregables (/os/entregables):
   - D1 Sitemap (internal)
   - D2 Staging URL (internal)
   - D3 Pack final ZIP + URL live (client_visible al handoff)
5. Upload evidencias: PageSpeed PDF, checklist QA
6. Workflow entregable: draft → in_review → published (cliente portal si contratado)
7. QA interno: /os/web-premium/preview + SERVICES_QA_MASTER Gate G3
8. Cierre: tarea proyecto completed; soporte 30d vía email/ticket
```

**Nota:** OS está congelado; este flujo usa capacidades existentes sin desarrollo nuevo.

---

*SOP v1.0 — NELVYON SERVICES · Web corporativa*
