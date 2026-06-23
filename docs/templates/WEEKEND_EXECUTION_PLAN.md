# Plan ejecución exprés — biblioteca de plantillas (fin de semana)

**Objetivo:** base técnica + diseño completo listos **sábado/domingo** para cerrar la empresa con esta parte resuelta.

---

## ✅ Implementado en código (ya)

| Entregable | Ruta |
|------------|------|
| Taxonomía servicios/sectores/tipos | `apps/web/src/lib/template-library/types.ts` |
| Matriz servicios + metas 18m | `taxonomy.ts` |
| Registro + query + resolve | `registry.ts` |
| 25 bloques nativos | `blocks/catalog.ts` |
| 18 landings por sector | `compositions/landing-presets.ts` |
| 6 secuencias + 3 emails | `compositions/email-presets.ts` |
| 6 funnels + 4 automation recipes | `compositions/funnel-presets.ts` |
| 6 ads + 3 SEO + 2 report sections | `compositions/ads-seo-report-presets.ts` |
| Licencias seed | `license.ts` |
| Mapa compras P0/P1/P2 | `seed-sources.ts` |
| Manifest Aceternity | `ingest/aceternity-manifest.ts` |
| Bridge packs | `packBridge.ts` |
| API | `GET /api/platform/template-library` |
| Tests (5 passing) | `__tests__/registry.test.ts` |
| Scripts | `scripts/templates/generate-downloads-table.mts`, `scan-aceternity-seeds.mjs` |
| Tabla descargas | `docs/templates/ENVATO_ACETERNITY_DOWNLOADS_TABLE.md` (**3.552 filas**, 148 sectores) |
| Docs | `docs/templates/*.md` |

### Cómo probar (5 min)

```powershell
cd apps\web
pnpm exec vitest run src/lib/template-library/__tests__/registry.test.ts
node ..\..\scripts\templates\scan-aceternity-seeds.mjs
```

Con app en marcha:
```
GET /api/platform/template-library?action=stats
GET /api/platform/template-library?action=resolve&service=landing&kind=landing&sector=restaurant&pack_id=local-business-growth
```

---

## 📄 Solo diseño/documento (listo)

- Biblioteca completa por servicio y sector → `TEMPLATE_LIBRARY_BY_SERVICE.md`
- Categorías Envato/MonsterONE priorizadas → `ENVATO_MONSTERONE_PURCHASE_MAP.md`
- Visión 12–18 meses → `TEMPLATE_LIBRARY_MASTER_PLAN.md`
- Decisiones de negocio → sección abajo

---

## 🔜 Semana 1 (post-domingo) — construcción Cursor

| Prioridad | Tarea | Esfuerzo |
|-----------|-------|----------|
| Alta | Cablear `packBridge` en `packOrchestrator` kickoff | 2–4 h |
| Alta | Renderizar `composition` → `LandingBlock[]` en production runners | 1 día |
| Alta | 12 bloques nuevos en BlockRenderer (features, logos, map, menu) | 1–2 días |
| Media | Ingestor HTML email Envato → presets | 2 días |
| Media | UI catálogo plantillas en `/packs` o `/dashboard/templates` | 2 días |
| Media | Portar Aceternity proactiv + simplistic → `components/pa` | 2 días |

---

## ❓ Decisiones tuyas antes del domingo

### 1. Presupuesto plantillas externas

| Opción | Coste aprox. | Recomendación |
|--------|--------------|---------------|
| Solo Aceternity (ya tienes) | 0 € extra | Mínimo viable |
| Envato Elements anual | ~170 €/año | **Recomendado P0** |
| MonsterONE anual | ~250 €/año | **Recomendado P0** si priorizas local/ecommerce |
| Ambos Elements + MonsterONE | ~420 €/año | **Ideal** para velocidad |

### 2. Sectores prioritarios (elige 5 para mes 1)

Sugerencia si mercado ES:
1. restaurant / café  
2. dental / clínica  
3. ecommerce moda  
4. SaaS B2B  
5. coach / infoproducto  

### 3. Límites uso plantillas licenciadas

- [ ] Confirmar: **ningún ZIP en repo público GitHub**
- [ ] Storage privado: S3/R2 o carpeta local `templates/monsterone/` gitignored
- [ ] Solo composiciones `nelvyon_owned` en entregables cliente
- [ ] Registrar cuenta Elements/MonsterONE a nombre de la empresa (no personal si posible)

### 4. Idioma lanzamiento

- [ ] **Solo ES** semana 1 (más rápido)  
- [ ] ES + EN desde inicio (doble plantillas)

---

## Checklist domingo noche

- [ ] Tests template-library en verde
- [ ] Leído `ENVATO_MONSTERONE_PURCHASE_MAP.md` — P0 comprado o calendarizado
- [ ] Sectores prioritarios anotados (mensaje a Cursor semana 1)
- [ ] `NEXT_PUBLIC_LEGAL_ENTITY_NAME` en Railway
- [ ] Commit + push librería a GitHub privado

---

## Resumen una frase

**Nelvyon ya tiene el cerebro de la biblioteca (registro, resolve, 70+ plantillas nativas, mapa Envato). El fin de semana cierras decisiones de compra y sectores; la semana 1 convertimos seeds en bloques y packs.**
