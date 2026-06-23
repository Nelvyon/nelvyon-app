# Biblioteca de plantillas por servicio de marketing

Catálogo objetivo para que Nelvyon cubra **todos los servicios** con combinaciones sector × idioma × pack.  
Las cifras «objetivo 18m» son metas; el código vive en `apps/web/src/lib/template-library/`.

---

## Matriz servicio → tipos de plantilla

| Servicio | Landings | Funnels | Emails | Ads | SEO/Contenido | Automatizaciones | Informes |
|----------|----------|---------|--------|-----|---------------|------------------|----------|
| **SEO** | Auditoría, servicio local | Lead magnet → guía | Serie autoridad | — | Pillar, cluster, FAQ schema | Indexación → alerta | Scorecard SEO |
| **Ads** | Destino campaña | Ad → LP → CRM | Post-clic nurture | Meta/Google/LinkedIn/TikTok | — | Gasto → pausar | ROAS dashboard |
| **Email** | Captura newsletter | Drip largo | Welcome, nurture, win-back | — | Newsletter | Trigger comportamiento | Aperturas/clics |
| **Landing** | Todos los verticales | — | — | — | — | Form → CRM | — |
| **Funnel** | Por paso | Completo | Por etapa | Por etapa | — | Por transición | Conversión funnel |
| **Ecommerce** | Colección, oferta | Compra, carrito | Carrito, post-compra | Catálogo, retarget | Categoría | Pedido → review | AOV, recuperación |
| **SaaS B2B** | Demo, trial, pricing | Demo → nurture | B2B sequences | LinkedIn | Case study, pillar | Demo → pipeline | Pipeline velocity |
| **Local** | Reserva, cita, mapa | Search → cita | Welcome local | Local offer | Local service page | Lead → CRM | CEO local |
| **Agencia** | Auditoría, propuesta | Audit → onboarding | Onboarding cliente | Portfolio | Casos de éxito | Lead → deal | Informe cliente |
| **Social** | Bio link | — | — | Stories, reels | Calendario | Publicar → métricas | Engagement |
| **Content** | Lead magnet | Guía → curso | Serie educativa | — | Blog, guía, vídeo | RSS → social | Top content |
| **CRO** | Variante A/B | Test funnel | Test subject | Test creatividad | — | Winner → rollout | Lift report |
| **Analytics** | — | — | — | — | — | — | GA4, atribución |
| **Brand** | Manifiesto | — | Launch | Awareness | About | — | Brand audit |
| **Chatbot** | Widget embed | FAQ → humano | Transcript follow-up | — | — | Intención → tag | CSAT |

---

## Por servicio pack (detalle)

### 1. Crecimiento Local (`local-business-growth`)

**Sectores:** restaurante, café, dental, clínica, legal, gimnasio, belleza, spa, veterinaria, fontanería, electricista, limpieza, hotel, turismo, solar, construcción, fotografía local.

| Tipo | Plantillas por sector (objetivo) | Ejemplos |
|------|----------------------------------|----------|
| Landings | 3–5 × 18 sectores ≈ **60** | Reservas, cita, presupuesto, mapa+horarios |
| Funnels | 2 × sector ≈ **36** | Google → LP → form → CRM |
| Email seq | 4 universales + 2/sector ≈ **40** | Welcome 3, reseña, temporada |
| Ads | 3/sector ≈ **54** | Oferta local, llamada, mapa |
| SEO pages | 2/sector ≈ **36** | Servicio+ciudad, FAQ schema |
| Automation | 3 universales ≈ **12** | Form→CRM, cita→recordatorio |
| Report | 5 secciones | CEO, SEO local, citas, ads, next steps |

**Implementado hoy (nativo):** 8 landings local, 2 funnels, 1 email seq, 2 ads, 1 seo, 2 automations.

---

### 2. Crecimiento Ecommerce (`ecommerce-growth`)

**Sectores:** moda, electrónica, food, belleza, hogar, marketplace.

| Tipo | Objetivo 18m | Ejemplos |
|------|--------------|----------|
| Landings | **30** | Drop, colección, flash sale, bundling |
| Funnels | **18** | Meta catalog → checkout → CRM |
| Email seq | **24** | Carrito 3-step, post-compra, review, VIP |
| Ads | **36** | DPA, retarget, UGC, lookalike |
| SEO | **18** | Categoría, producto, comparativa |
| Automation | **12** | Carrito, pedido, win-back |

**Implementado hoy:** 3 landings ecom, 1 funnel, 1 email seq, 2 ads, 1 seo.

---

### 3. Crecimiento SaaS B2B (`saas-b2b-growth`)

**Sectores:** SaaS B2B, SaaS B2C, agencia, infoproducto, coach, curso.

| Tipo | Objetivo 18m | Ejemplos |
|------|--------------|----------|
| Landings | **24** | Demo, trial, pricing, playbook |
| Funnels | **18** | Demo → nurture → trial → paid |
| Email seq | **20** | Nurture 5, onboarding, expansion |
| Ads | **24** | LinkedIn demo, retarget, ABM |
| SEO/Content | **20** | Pillar, case study, integraciones |
| Automation | **15** | Demo stage, trial expiry, PQL |

**Implementado hoy:** 2 landings SaaS, 1 funnel, 1 email seq, 1 ad, 1 seo, 1 automation.

---

### 4. Packs especializados

| Pack | Landings | Emails | Ads | Funnels | SEO | Recipes |
|------|----------|--------|-----|---------|-----|---------|
| SEO Local | 1 padre + 3 variantes | 1 seq auditoría | — | 1 | **10** | 2 |
| Meta Ads | 3 destino | 1 post-clic | **12** | 2 | — | 2 |
| Email Welcome | — | **15** seq | — | 1 | — | 4 |
| Landing+Funnel | **8** | 2 | 2 | **6** | — | 3 |
| Analytics Insights | — | — | — | — | — | **8** report sections |

---

## Sectores — cobertura objetivo (40+)

Cada sector necesita como mínimo: **1 landing**, **1 funnel**, **1 email seq**, **2 ads** (si aplica paid), **1 seo page**, **1 automation recipe**.

| Grupo | Sectores |
|-------|----------|
| **Local food** | restaurant, cafe, bakery, catering |
| **Salud** | dental, clinic, medical, veterinary, pharmacy |
| **Profesional** | legal, accounting, insurance, consulting |
| **Bienestar** | fitness, gym, beauty, spa, salon |
| **Hogar** | plumber, electrician, cleaning, landscaping, solar, construction |
| **Inmobiliario** | real_estate, property_management |
| **Turismo** | hotel, tourism, wedding, photography |
| **Ecommerce** | fashion, electronics, food, beauty, home, marketplace |
| **Digital** | saas_b2b, saas_b2c, agency, freelancer |
| **Creator** | coach, infoproduct, course, podcast |
| **Otros** | nonprofit, education, tutoring, automotive |

**Combinaciones:** 40 sectores × 6 tipos × 3 variantes ≈ **720 plantillas nativas** a 18 meses (alineado con `LIBRARY_TARGET_18M`).

---

## Automatizaciones «recipe» que requieren plantillas

| Recipe ID | Trigger | Plantillas necesarias |
|-----------|---------|----------------------|
| `form→crm+email` | form_submit | landing form, email welcome |
| `cart-abandon` | cart_idle | email seq 3, ad retarget |
| `demo-requested` | form demo | landing demo, nurture 5, deal stage |
| `webinar-register` | form | squeeze LP, seq 4, tag |
| `review-request` | order_complete | email review, SMS opcional |
| `lead-magnet` | download | content page, seq 3, CRM tag |
| `appointment-reminder` | booking | SMS/email 24h, calendar |
| `pipeline-stage-nurture` | deal_stage | emails por etapa |
| `ga4-anomaly` | metric_drop | report section + email alert |
| `ads-pause-low-roas` | roas_threshold | ad set ref + notify |

---

## Cómo el cliente percibe «infinitas»

1. **Resolve API** — `resolveTemplate({ sector, service, kind, pack_id })` elige la mejor + alternativas.
2. **Composición de bloques** — misma landing = recombinación de 120 bloques.
3. **IA por encima** — copy/imágenes personalizados; plantilla = estructura CRO probada.
4. **Idioma** — misma plantilla `es`/`en` con variantes de copy.

API: `GET /api/platform/template-library?action=resolve&service=landing&kind=landing&sector=restaurant&pack_id=local-business-growth`
