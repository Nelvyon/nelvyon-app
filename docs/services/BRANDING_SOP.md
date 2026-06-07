# Branding — SOP operativo

**SKU:** `NELVYON-BRAND`  
**Versión SOP:** 1.0  
**Fase:** SERVICES-PHASE-2  
**Referencia QA:** `SERVICES_QA_MASTER.md` · Tiers: `NELVYON_SERVICE_TIERS.md`

---

## Resumen

Sistema de identidad de marca: estrategia, voz, paleta, tipografía, aplicaciones y brand book.

| Tier | Alcance | Plazo | Revisiones |
|------|---------|-------|------------|
| **Starter** | Identidad esencial (logo lite + colores + voz) | 7–10 D | 1 |
| **Professional** | Brand book completo + aplicaciones digitales | 10–15 D | 2 |
| **Premium** | Sistema multicanal + submarcas + workshop | 20–30 D | 4 |

---

## 1. Briefing cliente

**Marca:** _______________ **Mercado:** _______________ **Fecha:** _______________

### A. Estrategia

1. ¿Empresa nueva o rebrand? [ ] Nueva [ ] Rebrand [ ] Extensión línea
2. Propuesta de valor actual (o deseada):
3. Competidores directos (5):
4. Diferenciador clave vs competencia:
5. Objetivo branding (reconocimiento, premium, confianza, etc.):

### B. Audiencia

6. Segmentos prioritarios (máx. 3):
7. Arquetipo cliente ideal:
8. Mercados geográficos e idiomas:

### C. Alcance

9. ¿Incluye logo? [ ] Sí [ ] No (ya existe) [ ] LOGO_SOP aparte
10. Canales aplicación: [ ] Web [ ] Social [ ] Email [ ] Print [ ] Packaging [ ] Presentaciones
11. Tier: [ ] Starter [ ] Professional [ ] Premium
12. Submarcas/productos (premium): _______________

### D. Restricciones

13. Elementos heredados obligatorios (logo viejo, color corporativo grupo):
14. Restricciones legales sector:
15. Fecha lanzamiento identidad: _______________

**Firma:** _______________

---

## 2. Proceso paso a paso

### Fase 0 — Intake (D0–2) · Account

Brief validado · OS `BRAND-[CLIENTE]` · kick-off 45 min · asignar strategist + diseñador.

### Fase 1 — Discovery (D2–4) · Strategist

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 1.1 | Workshop cliente 60–90 min (premium: presencial/virtual) | Acta |
| 1.2 | Moodboard competencia + aspiracional | Figma/Miro |
| 1.3 | Entrevistas stakeholders (premium, 2–3) | Notas |
| 1.4 | Síntesis insights | Doc discovery |

### Fase 2 — Estrategia de marca (D4–7) · Strategist + copy

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 2.1 | Posicionamiento (frame: para quién, qué ofrece, por qué creer) | Deck estrategia |
| 2.2 | Arquitectura de marca (monolítica / endorsed / plural) | Diagrama |
| 2.3 | Personalidad + tono de voz (5 atributos) | Guía voz v0 |
| 2.4 | **Aprobación cliente** estrategia | Email |

### Fase 3 — Identidad visual (D7–12) · Diseñador

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 3.1 | Logo o evolución logo (coordinar LOGO_SOP si aplica) | Kit logo |
| 3.2 | Paleta primaria/secundaria/neutra + HEX/RGB/CMYK | Tokens |
| 3.3 | Sistema tipográfico (titular + cuerpo) + licencias | Spec |
| 3.4 | Iconografía, fotografía, grid (professional+) | Sección brand book |
| 3.5 | Aplicaciones mockup: web header, social, tarjeta | Figma |
| 3.6 | **Ronda revisión** visual | Comentarios |

### Fase 4 — Brand book (D10–14) · Diseñador + strategist

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 4.1 | Compilar brand book PDF 20–40 pp según tier | PDF |
| 4.2 | Do/don't ejemplos voz (5 pares) | En book |
| 4.3 | Matriz aplicaciones por canal | Tabla |
| 4.4 | Plantilla presentación (pro/premium) | PPT/Slides |

### Fase 5 — Premium (D15–25)

Submarcas, packaging lite, guía campañas, sesión formación equipo 2h.

### Fase 6 — QA y handoff (D final)

Checklist §5 · QA G3 · OS entregables · sesión handoff 60 min · 14d soporte correcciones menores.

---

## 3. Entregables exactos

| # | Entregable | Starter | Pro | Premium |
|---|------------|---------|-----|---------|
| E1 | Documento estrategia (10–15 pp) | Resumen | Completo | Completo + workshops |
| E2 | Brand book PDF | 15 pp | 25–35 pp | 40+ pp |
| E3 | Tokens diseño (JSON/CSS opcional) | Básico | ✅ | ✅ |
| E4 | Kit logo (si en scope) | Lite | Completo | + submarcas |
| E5 | Plantilla presentación | — | ✅ | ✅ custom |
| E6 | Mockups aplicaciones | 2 | 5 | 10+ |
| E7 | Guía tono voz standalone | ✅ | ✅ | ✅ + ejemplos campaña |
| E8 | Sesión formación | — | — | 2h grabada |

---

## 4. Criterios de aceptación

| ID | Criterio |
|----|----------|
| A1 | Posicionamiento diferenciado y comprensible en 30 segundos |
| A2 | Paleta con contraste WCAG AA en combinaciones principales |
| A3 | Tipografías con licencia documentada |
| A4 | Tono de voz con ejemplos do/don't aplicables |
| A5 | Brand book navegable con índice y versión |
| A6 | Coherencia visual entre mockups canales |
| A7 | Cliente firmó aprobación estrategia antes de visual final |
| A8 | Disclaimer trademark firmado |

---

## 5. Checklist QA

- [ ] 🔴 Estrategia alineada con brief (no genérica)
- [ ] 🔴 Paleta HEX/RGB documentada
- [ ] 🔴 Contraste AA texto/fondo principal
- [ ] 🔴 Logo legible pequeño + monocromo
- [ ] 🔴 5 ejemplos do/don't voz
- [ ] 🟠 Iconografía coherente con personalidad
- [ ] 🟠 Mockups actualizados con tokens finales
- [ ] 🟡 `/app/branding/policy` revisado si afecta tenant (interno)
- [ ] 🔴 `/os/branding-premium/preview` checklist OK
- [ ] 🔴 QA G3 APROBADO

---

## 6. Riesgos frecuentes

| Riesgo | Mitigación |
|--------|------------|
| Rebrand sin alineación dirección | Workshop obligatorio pro/premium |
| Tipografía sin licencia web | Verificar Google Fonts / licencia |
| Brand book solo estética sin estrategia | Gate aprobación Fase 2 |
| Conflicto con whitelabel tenant | Revisar policy antes de entrega |
| Cliente usa colores fuera de paleta post-handoff | Do/don't explícitos |

---

## 7. Herramientas recomendadas

| Categoría | Herramientas |
|-----------|--------------|
| NELVYON | BrandingPremiumAgent, whitelabel policy, `/os/branding-premium/preview` |
| Estrategia | Miro, Notion, slide deck |
| Diseño | Figma, Illustrator, Coolors, Frontify (referencia) |
| QA | WebAIM contrast checker, WhatFontIs |
| Colaboración | Loom, Google Drive |

---

## 8. Tiempos

| Tier | Plazo |
|------|-------|
| **Starter** | 7–10 D |
| **Professional** | 10–15 D |
| **Premium** | 20–30 D |

---

## 9. Perfil freelancer ideal

- **Strategist:** 5+ años brand strategy, facilitación workshop, B2B/B2C
- **Diseñador:** identity systems, brand books, Figma avanzado
- **Equipo mínimo pro:** 1 strategist + 1 diseñador senior
- **Idiomas:** ES nativo; EN para marcas exportadoras

---

## 10. Uso dentro de NELVYON OS

```
1. /os/clientes → cliente
2. /os/proyectos → "BRAND [Marca]"
3. /os/tareas:
   T1 Discovery | T2 Estrategia | T3 Identidad visual | T4 Brand book | T5 QA | T6 Handoff
4. /os/entregables:
   - D1 Estrategia PDF (internal hasta aprobada)
   - D2 Brand book PDF (client_visible)
   - D3 Tokens/kit ZIP (client_visible)
5. Coordinación: si LOGO_SOP paralelo, mismo cliente OS, proyectos vinculados en descripción
6. QA interno: /os/branding-premium/preview + /app/branding/policy (solo lectura ops)
```

---

*SOP v1.0 — NELVYON SERVICES Phase 2 · Branding*
