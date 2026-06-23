# NELVYON — Template Library Production (MonsterONE)

**Versión:** 1.0  
**Fecha:** 2026-06-08  
**Alcance:** Infraestructura documental y registro para 500–700 plantillas premium  
**Fuera de alcance:** SaaS, OS core, Portal, producción Railway, pipelines autónomos existentes

---

## 1. Objetivo

Preparar el catálogo profesional de plantillas **MonsterONE** antes de integrarlas en pipelines autónomos. Este frente es **solo registro + procedimiento**; no modifica `registry.json`, `loadRegistry.ts` ni selectores de Phase K/L.

| Artefacto | Ruta |
|-----------|------|
| Registro producción | `backend/autonomous/templates/template_registry_production.json` |
| Almacenamiento fuentes | `templates/monsterone/` (raíz repo, fuera de git hasta `.gitignore` explícito) |
| Registro lab (existente) | `backend/autonomous/templates/registry.json` — **no tocar** |

---

## 2. Estructura de registro

Cada plantilla es un objeto con campos fijos:

```json
{
  "template_id": "",
  "name": "",
  "category": "",
  "sector": "",
  "source": "MonsterONE",
  "stack": "",
  "quality_score": 0,
  "conversion_score": 0,
  "speed_score": 0,
  "premium_score": 0,
  "tags": [],
  "status": "active"
}
```

### Categorías permitidas

`Landing` · `Corporate` · `SaaS` · `Ecommerce` · `Restaurant` · `Dental` · `Legal` · `Fitness` · `RealEstate` · `Beauty` · `Coaching` · `Solar` · `Branding` · `Logos` · `SocialMedia` · `Ads` · `PitchDecks`

### Convención `template_id`

```
{category-kebab}-monster-{sector-kebab}-{nnn}
```

Ejemplos:

- `landing-monster-dental-014`
- `ads-monster-fitness-003`
- `pitchdecks-monster-saas-007`

Reglas:

- Minúsculas, guiones, sin espacios.
- `nnn` = secuencia de 3 dígitos por par categoría+sector.
- Único en todo el archivo `templates[]`.

### Campo `sector`

| Valor | Cuándo usar |
|-------|-------------|
| `Restaurant`, `Dental`, `Legal`, … | Plantilla claramente sectorial |
| `general` | Transversal / multipropósito |
| `SaaS` | Solo si categoría ≠ `SaaS` pero sector B2B software |

### Campo `stack`

Valores en `allowed_stacks` del JSON (ej. `html-css-js`, `react`, `figma`, `pptx`). Un valor por plantilla (el stack **principal** de entrega).

### Campo `status`

| Status | Significado |
|--------|-------------|
| `review` | Importada, sin puntuar o bajo umbral |
| `active` | Puntuada y apta para catálogo producción |
| `deprecated` | Sustituida por versión mejor |
| `suspended` | Problema de licencia, QA grave o retirada MonsterONE |

---

## 3. Importación manual desde MonsterONE

### 3.1 Prerrequisitos

- Suscripción MonsterONE activa y licencia documentada por descarga.
- Espacio local: ~2–8 GB para 500–700 packs (según categoría).
- No subir zips masivos a git sin política LFS; usar `templates/monsterone/` local o storage externo.

### 3.2 Flujo por plantilla (15–30 min)

| Paso | Acción |
|------|--------|
| 1 | Descargar pack desde MonsterONE (ZIP / FIG / PSD / etc.) |
| 2 | Crear carpeta: `templates/monsterone/{Category}/{Sector}/{template_id}/` |
| 3 | Copiar `source.zip` (original sin modificar) |
| 4 | Generar `preview.png` (screenshot 1440×900 o export MonsterONE) |
| 5 | Crear `metadata.json` local con: URL MonsterONE, fecha descarga, licencia, autor pack |
| 6 | Clasificar categoría + sector + stack (§4) |
| 7 | Puntuar (§5) — cuatro scores 0–100 |
| 8 | Añadir entrada en `template_registry_production.json` → array `templates` |
| 9 | Validar JSON: `node -e "JSON.parse(require('fs').readFileSync('backend/autonomous/templates/template_registry_production.json'))"` |
| 10 | Si scores ≥ umbral `min_active` → `status: "active"`; si no → `review` |

### 3.3 Importación por lotes (50–100 plantillas)

1. Agrupar descargas por **categoría** MonsterONE (Landings, Corporate, etc.).
2. Asignar operador + revisor (dos personas: uno importa, otro valida scores).
3. Registrar lote en hoja temporal (CSV opcional) con columnas = campos del schema.
4. Script manual recomendado (futuro): merge CSV → JSON; **hoy:** edición directa del JSON o generador externo.
5. Objetivo semanal sugerido: **80–120 plantillas** clasificadas + puntuadas para llegar a 500–700 en 5–8 semanas.

### 3.4 Estructura de carpetas

```
templates/monsterone/
├── Landing/
│   ├── Restaurant/
│   │   └── landing-monster-restaurant-001/
│   │       ├── source.zip
│   │       ├── preview.png
│   │       └── metadata.json
│   └── Dental/
├── Corporate/
├── Ads/
└── ...
```

---

## 4. Clasificación

### 4.1 Árbol de decisión

```
¿Es una sola página con CTA principal?
  → Sí → Landing (o categoría sectorial Landing-like: Restaurant, Dental, … si el pack es 100% sector)
  → No → ¿Multi-página corporativo?
    → Sí → Corporate (o SaaS si es product-led B2B)
    → No → ¿Tienda / catálogo / checkout?
      → Sí → Ecommerce
      → No → ¿Creatividades paid / banners?
        → Sí → Ads o SocialMedia (static/video)
        → No → ¿Deck presentación?
          → Sí → PitchDecks
          → No → Branding / Logos según entregable
```

### 4.2 Mapeo MonsterONE → categoría NELVYON

| Tipo pack MonsterONE (típico) | Categoría NELVYON |
|------------------------------|-------------------|
| Landing / One page | `Landing` o sector (`Restaurant`, `Dental`, …) |
| Business / Agency / Corporate | `Corporate` |
| SaaS / App / Startup | `SaaS` |
| Shop / Woo / Shopify HTML | `Ecommerce` |
| Restaurant / Food | `Restaurant` |
| Medical / Dental | `Dental` |
| Lawyer / Legal | `Legal` |
| Gym / Fitness | `Fitness` |
| Real estate | `RealEstate` |
| Spa / Beauty | `Beauty` |
| Coach / Course | `Coaching` |
| Solar / Energy | `Solar` |
| Brand kit / Identity | `Branding` |
| Logo pack | `Logos` |
| Instagram / Social kit | `SocialMedia` |
| Google / Meta ad templates | `Ads` |
| Pitch / Investor deck | `PitchDecks` |

### 4.3 Tags recomendados

Usar `tags` para búsqueda futura, no duplicar categoría:

- Layout: `hero-video`, `hero-split`, `long-form`, `one-page`
- Estilo: `dark-mode`, `minimal`, `luxury`, `playful`
- Función: `booking`, `lead-form`, `pricing-table`, `testimonials`
- Técnico: `heavy-js`, `lightweight`, `rtl-ready`, `multipage`

---

## 5. Puntuación (0–100)

Puntuación **manual** en importación. Sin datos de conversión reales hasta Phase M+ (no inventar métricas).

### 5.1 `quality_score` — QA visual y técnico

| Rango | Criterio |
|-------|----------|
| 90–100 | Sin roturas responsive; tipografía consistente; assets organizados; sin enlaces rotos en demo |
| 75–89 | Ajustes menores (spacing, imágenes placeholder) |
| 60–74 | Requiere refactor antes de usar |
| &lt; 60 | No activar; `status: review` o descarte |

Checklist rápido (10 ítems, +10 cada uno si cumple): responsive, jerarquía visual, contraste AA, favicon, meta básicos, rutas assets relativas, sin malware/skus raros, readme/licencia, preview representativo, código legible.

### 5.2 `conversion_score` — CRO estimado (sin tráfico real)

| Señal | Puntos máx |
|-------|------------|
| CTA above the fold claro | 25 |
| Formulario o booking visible | 25 |
| Prueba social (testimonios, logos) | 20 |
| Urgencia/oferta entendible en 5 s | 15 |
| Thank-you / next step definido | 15 |

### 5.3 `speed_score` — Proxy rendimiento (sin Lighthouse obligatorio en import)

| Señal | Puntos máx |
|-------|------------|
| Peso ZIP &lt; 5 MB (HTML) o &lt; 15 MB (con video) | 30 |
| JS externo mínimo / defer | 25 |
| Imágenes no excesivas (&lt; 2 MB hero) | 25 |
| Fuentes ≤ 2 familias | 20 |

Opcional: Lighthouse local en 3 plantillas/lote → ajustar ±10.

### 5.4 `premium_score` — Percepción marca premium

| Señal | Puntos máx |
|-------|------------|
| Paleta coherente (≤ 5 colores activos) | 25 |
| Espaciado y grid profesional | 25 |
| Fotografía/ilustración alta calidad | 25 |
| Microcopy sin lorem ipsum en demo | 25 |

### 5.5 Umbrales (definidos en JSON)

| Umbral | Uso |
|--------|-----|
| `min_active` | quality ≥ 75, premium ≥ 70 → puede pasar a `active` |
| `pipeline_ready` | quality ≥ 85, conversion ≥ 70, speed ≥ 65, premium ≥ 80 → candidata futura pipeline |

**Regla honesta:** scores iniciales son **opinión experta + checklist**, no ROI. Actualizar solo tras proyectos reales (`template_outcomes` / Phase M).

---

## 6. Uso futuro en pipelines autónomos

Hoy **no está cableado**. Relación con sistema existente:

| Componente actual | Rol | Relación con producción |
|-------------------|-----|-------------------------|
| `registry.json` | Lab Phase K — slices, baseline_scores | Catálogo reducido (~24 IDs) |
| `loadRegistry.ts` | Carga solo `registry.json` | No lee `template_registry_production.json` |
| `pipelineTemplateSelector.ts` | Elige template en pipeline C/H | Usa rankings + registry |
| `template_registry_production.json` | **Nuevo** — catálogo MonsterONE masivo | Pendiente migración |

### 6.1 Migración planificada (sin implementar ahora)

1. **Fase ingest:** mantener producción separada hasta ≥ 200 `active`.
2. **Fase map:** script futuro convierte entrada producción → `TemplateRegistryEntry` (id, category, sectors, baseline_scores).
3. **Fase select:** `pipelineTemplateSelector` acepta `REGISTRY_PATH` env apuntando a producción o merge dual.
4. **Fase learn:** outcomes reales ajustan scores (no sobrescribir baseline hasta n ≥ 5 usos).

### 6.2 Selección prevista (pseudoflujo)

```
Brief autónomo (sector + categoría + objetivo)
  → Filtrar templates[] donde status=active AND category match
  → Filtrar por sector (exacto o general)
  → Ordenar por weighted_score = 0.3*quality + 0.3*conversion + 0.2*speed + 0.2*premium
  → Excluir si quality_score < 85 (pipeline_ready)
  → Top 1 = template_id para wrapper landing/builder
  → Registrar outcome en Phase M para recalibrar
```

### 6.3 Compatibilidad con `TEMPLATE_LIBRARY_MASTER.md`

| MASTER (plan) | PRODUCTION (este doc) |
|---------------|------------------------|
| 24 plantillas P0 live | 500–700 MonsterONE registradas |
| IDs internos (`landing-cro-v3`) | IDs `*-monster-*` |
| Origen creada/comprada | Origen `MonsterONE` unificado |

Convivencia: plantillas MASTER siguen en `registry.json` hasta sustitución explícita por equivalente MonsterONE puntuado.

---

## 7. Volumen objetivo 500–700

| Categoría | Objetivo mínimo | Notas |
|-----------|-----------------|-------|
| Landing | 120 | Incluye sectoriales Restaurant/Dental/… |
| Corporate | 80 | Multi-página |
| SaaS | 40 | Product-led |
| Ecommerce | 50 | |
| Restaurant | 35 | |
| Dental | 30 | |
| Legal | 30 | |
| Fitness | 30 | |
| RealEstate | 30 | |
| Beauty | 30 | |
| Coaching | 30 | |
| Solar | 25 | |
| Branding | 40 | |
| Logos | 50 | |
| SocialMedia | 60 | |
| Ads | 50 | |
| PitchDecks | 30 | |
| **Total** | **~780 techo** | Priorizar **500 active** con scores válidos |

Ajustar hacia 700 eliminando duplicados visuales (&gt; 85% similitud → deprecar uno).

---

## 8. Control de calidad del registro

### Validación manual antes de commit JSON

```powershell
cd c:\Users\Asus\Downloads\app_v181
node -e "const r=require('./backend/autonomous/templates/template_registry_production.json'); const ids=r.templates.map(t=>t.template_id); if(new Set(ids).size!==ids.length) throw new Error('duplicate template_id'); console.log('OK', ids.length, 'templates');"
```

### Checklist por entrada

- [ ] `template_id` único y kebab-case
- [ ] `category` en lista permitida
- [ ] `source` = `MonsterONE`
- [ ] Scores 0–100 enteros
- [ ] Carpeta `templates/monsterone/...` existe con `source.zip` + `preview.png`
- [ ] `status` coherente con scores (`min_active`)

---

## 9. Qué no hace este frente

- No despliega plantillas a CDN ni Supabase.
- No altera `registry.json` ni pipelines Phase C–P.
- No integra con OS publish ni portal.
- No asume conversiones, clientes ni compras futuras de packs no descargados.

---

## 10. Referencias

| Documento | Uso |
|-----------|-----|
| `TEMPLATE_LIBRARY_MASTER.md` | Plan maestro 24 P0 |
| `TEMPLATE_FACTORY_ROADMAP.md` | Factory y scoring avanzado |
| `AUTONOMOUS_QA_RUBRICS.md` | Umbral QA ≥ 85 en pipeline |
| `template_registry_production.json` | Registro operativo MonsterONE |

---

*Infraestructura documental v1.0 — lista para carga masiva sin cambios en código de pipeline.*
