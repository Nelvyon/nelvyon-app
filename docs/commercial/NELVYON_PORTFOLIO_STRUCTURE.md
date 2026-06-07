# NELVYON — Estructura de portfolio

**Versión:** 1.0  
**Objetivo:** Organizar evidencias de proyectos para ventas, deck y web (cuando aplique)  
**Ubicación sugerida:** `Drive/NELVYON-PORTFOLIO/` o DAM interno

---

## 1. Principios

| Principio | Regla |
|-----------|-------|
| **Un caso = una carpeta** | Naming estándar |
| **Evidencia > opinión** | Capturas, URLs live, métricas |
| **Permiso primero** | Autorización cliente antes de público |
| **Actualizar anual** | Archivar proyectos > 3 años salvo hito |

---

## 2. Estructura raíz

```
NELVYON-PORTFOLIO/
├── _templates/              # Case study vacío, permisos
├── _by-service/             # Índice cruzado por SKU
│   ├── web/
│   ├── landing/
│   ├── seo/
│   ├── google-ads/
│   ├── meta-ads/
│   ├── branding/
│   └── ...
├── _by-sector/              # Índice por industria
│   ├── saas/
│   ├── ecommerce/
│   ├── servicios/
│   └── ...
└── projects/
    └── [AÑO]-[CLIENTE-SLUG]/
```

---

## 3. Carpeta proyecto (obligatoria)

```
projects/2026-acme-corp/
├── 00-meta/
│   ├── case-study.pdf          # Desde NELVYON_CASE_STUDY_TEMPLATE
│   ├── client-permission.pdf   # Email o formulario OK publicar
│   ├── services.json           # SKUs, tiers, fechas (texto libre)
│   └── nps-score.txt
├── 01-summary/
│   ├── one-liner.txt           # 1 frase resultado
│   └── tags.txt                # sector, servicios, tier
├── 02-visuals/
│   ├── hero.png                # 1200×630 OG / portfolio card
│   ├── before-after/           # Si aplica rebrand
│   ├── web-desktop-full.png
│   ├── web-mobile-375.png
│   ├── landing-desktop.png
│   ├── ads-creative-01.png
│   └── logo-kit-preview.png
├── 03-video/                   # Opcional
│   └── walkthrough-loom.mp4
├── 04-metrics/
│   ├── results-summary.pdf     # Tabla métricas
│   ├── ga4-screenshot.png
│   └── ads-manager-screenshot.png
├── 05-links/
│   └── urls.txt                # Live URLs (verificar antes de pitch)
└── 06-internal/                # NO público
    ├── proposal-redacted.pdf
    └── lessons-learned.md
```

---

## 4. Naming conventions

| Tipo | Patrón | Ejemplo |
|------|--------|---------|
| Carpeta proyecto | `[AÑO]-[cliente-slug]` | `2026-verdenova-energia` |
| Captura web | `[tipo]-[viewport].png` | `landing-mobile-375.png` |
| Creatividad ad | `[plataforma]-[n]-[formato].png` | `meta-01-1080x1080.png` |
| Case study | `case-study-[cliente-slug].pdf` | |

**Slug:** minúsculas, guiones, sin acentos.

---

## 5. Evidencias mínimas por servicio

| Servicio | Mínimo portfolio | Ideal |
|----------|------------------|-------|
| **Web** | Desktop + mobile Home, URL live | +1 interior, PageSpeed score |
| **Landing** | Mobile above-fold, URL, form OK | +CR métrica 30d |
| **Logo** | Master sobre blanco/negro | Kit variantes |
| **Branding** | Portada brand book + mockup | 3 aplicaciones |
| **Ecommerce** | PLP + PDP + checkout | Venta test screenshot |
| **SEO** | Informe extracto 1 pág | GSC trending |
| **Google/Meta Ads** | Screenshot campaña + creatividad | CPL/ROAS 30d |
| **TikTok** | Video 9:16 thumbnail + Ads Manager | Hook frame 0s |
| **Chatbot** | Widget en contexto web | Métrica sesiones |
| **Automation** | Diagrama flujo TO-BE | ROI horas ahorradas |

---

## 6. Índice maestro (Sheet / Notion)

Columnas recomendadas:

| Columna | Ejemplo |
|---------|---------|
| ID | 2026-acme |
| Cliente | Acme Corp |
| Sector | SaaS B2B |
| Servicios | WEB-PRO, SEO-PRO |
| Tier max | Professional |
| Fecha cierre | 2026-03-15 |
| NPS | 9 |
| Público | Sí / Anónimo / No |
| Hero image path | link |
| Case study | link PDF |
| One-liner | "Web + SEO → +40% tráfico orgánico 6m" |
| Usar en pitch | SaaS, Growth bundle |

---

## 7. Flujo: proyecto → portfolio

| Paso | Cuándo | Quién |
|------|--------|-------|
| 1. Capturar assets en entrega | Handoff | Freelancer + AM |
| 2. Pedir permiso publicación | Cierre | AM |
| 3. Redactar case study | ≤ 14d post-cierre | AM + Marketing |
| 4. QA portfolio (métricas reales) | Antes publicar | Sales Lead |
| 5. Subir a `_by-service` y `_by-sector` | Publicar | Marketing |
| 6. Enlazar en CRM oportunidad sector | Ongoing | Sales |

---

## 8. Uso en ventas

| Situación | Qué extraer |
|-----------|-------------|
| Propuesta sector energía | Case study + hero mismo sector |
| Objeción "¿han hecho landing?" | 2–3 capturas `_by-service/landing/` |
| Deck slide 10 | One-liner + métrica 3 proyectos top NPS |
| Premium pitch | Solo tier Premium o NPS ≥ 8 |

---

## 9. Redacción pública (web / LinkedIn)

**Incluir siempre:**
- Sector (o anónimo)  
- Servicio y resultado  
- Métrica si hay permiso  

**Nunca sin permiso:**
- Nombre cliente  
- Presupuesto ads  
- Capturas con PII (emails leads, dashboards con revenue exacto)

---

## 10. Mantenimiento

| Frecuencia | Acción |
|------------|--------|
| Mensual | Verificar URLs live en `05-links/` |
| Trimestral | Top 5 casos por NPS → actualizar deck |
| Anual | Archivar `projects/` > 3 años a `_archive/` |

---

*Portfolio Structure v1.0 — NELVYON Commercial*
