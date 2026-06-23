# Biblioteca ideal Nelvyon — visión 12–18 meses

## Principio

**Semillas ilimitadas (Envato/MonsterONE) + bloques nativos excelentes + IA = percepción de infinitas plantillas.**

El cliente no elige «tema 247 de ThemeForest». Elige sector + objetivo; Nelvyon resuelve la mejor composición.

---

## Volúmenes objetivo (18 meses)

| Capa | Cantidad | Notas |
|------|----------|-------|
| **Bloques nativos** | 120 | Hero, pricing, form, map, menu, gallery… |
| **Landings** | 400 | ~10 por sector prioritario |
| **Funnels** | 80 | 2–4 por vertical |
| **Secuencias email** | 150 | 3–7 emails cada una |
| **Emails sueltos** | 500 | Incluye variantes A/B |
| **Creatividades ads** | 300 | Meta, Google, LinkedIn, TikTok |
| **Páginas SEO/content** | 200 | Local, pillar, categoría |
| **Automation recipes** | 100 | Con plantillas enlazadas |
| **Secciones informe** | 60 | Packs + CEO metrics |
| **Sectores** | 40+ | Ver taxonomy.ts |
| **Idiomas** | 6 | es, en, pt, fr, de, it |

Constantes en código: `LIBRARY_TARGET_18M` en `taxonomy.ts`.

---

## Organización interna

```
apps/web/src/lib/template-library/
├── types.ts              # Taxonomía canónica
├── taxonomy.ts           # Sectores, servicios, metas
├── registry.ts           # Query + resolve + stats
├── license.ts            # Licencias seed
├── seed-sources.ts       # Mapa compras P0/P1/P2
├── blocks/catalog.ts     # Bloques renderizables
├── compositions/         # Landings, emails, funnels, ads…
├── ingest/               # Manifests Aceternity, futuros ingestores
└── packBridge.ts         # Integración packs
```

### Tags y búsqueda

| Dimensión | Ejemplos |
|-----------|----------|
| `service` | seo, ads, email, landing… |
| `kind` | block, landing, funnel… |
| `sector` | restaurant, saas_b2b… |
| `vertical` | local, ecommerce, creator |
| `pack_ids` | local-business-growth |
| `tags` | reservas, cart, demo, dark-mode |
| `languages` | es, en |
| `scores` | quality, conversion, speed, premium |

### Estados

| Status | Significado |
|--------|-------------|
| `active` | Cliente puede recibir |
| `review` | QA pendiente |
| `seed_only` | Solo referencia interna |
| `deprecated` | Reemplazada |

---

## Consumo por OS y packs

```
Pack kickoff(intake)
    → resolvePackTemplateBundle(pack_id, sector)
    → landing + email_seq + ads + seo + funnel + automation
    → IA personaliza copy en props de bloques
    → BlockRenderer / SES / informe
    → Portal entregables
```

**«Infinitas» plantillas** = `resolveTemplate` + alternates + recombinación bloques + variación IA.

API operativa:
- `GET /api/platform/template-library?action=stats`
- `GET /api/platform/template-library?action=pack-bundle&pack_id=local-business-growth&sector=dental`
- `GET /api/platform/template-library?service=landing&sector=restaurant`

---

## Relación con estrategia 30–50 bloques

| Fase | Bloques | Landings | Fuentes |
|------|---------|----------|---------|
| **Fin de semana** | 25 | 18 | Aceternity + nativo |
| **Mes 1** | 50 | 60 | + Envato P0 local/SaaS |
| **Mes 3** | 80 | 150 | + MonsterONE P1 |
| **Mes 6** | 100 | 250 | Ingestión automatizada |
| **Mes 12–18** | 120 | 400 | Escala + IA generativa |

Los **30–50 bloques excelentes** son el núcleo; las 400 landings son **composiciones** de ese núcleo, no 400 diseños desde cero.

---

## Ventaja vs HubSpot/GHL

| Ellos | Nelvyon |
|-------|---------|
| Catálogo estático de temas | Composición dinámica + pack |
| Usuario elige plantilla | Pack resuelve por sector |
| Misma plantilla para todos | IA + intake personalizan |
| Sin informe ejecutivo | Cada pack = informe + entregables |

---

## Estado actual (implementado)

| Métrica | Valor |
|---------|-------|
| Bloques catálogo | 25 |
| Landings nativas | 18 |
| Funnels | 6 |
| Email sequences | 6 |
| Ads | 6 |
| SEO pages | 3 |
| Automation recipes | 4 |
| Report sections | 2 |
| Seeds Aceternity (internos) | 4 |

Ver stats en vivo: `GET /api/platform/template-library?action=stats`

Tests: `pnpm exec vitest run src/lib/template-library`
