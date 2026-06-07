# Ecommerce — SOP operativo

**SKU:** `NELVYON-ECOM`  
**Versión SOP:** 1.0  
**Fase:** SERVICES-PHASE-2  
**Referencia QA:** `SERVICES_QA_MASTER.md` · Tiers: `NELVYON_SERVICE_TIERS.md`

---

## Resumen

Tienda online funcional: catálogo, checkout, pagos Stripe y operación básica post-launch.

| Tier | SKUs | Plazo | Revisiones |
|------|------|-------|------------|
| **Starter** | hasta 10 | 12–18 D | 1 |
| **Professional** | hasta 25 | 20–35 D | 2 |
| **Premium** | hasta 100 | 45–60 D | 4 |

---

## 1. Briefing cliente

**Tienda:** _______________ **Modelo:** [ ] D2C [ ] B2B [ ] Mixto **Fecha:** _______________

### A. Negocio

1. Descripción productos y ticket medio:
2. Mercado y moneda: _______________
3. ¿Físico + digital? [ ] Solo físico [ ] Digital [ ] Mixto
4. Objetivo lanzamiento (fecha): _______________

### B. Catálogo

5. Nº productos aproximado: ___
6. Variantes (talla, color): [ ] Sí [ ] No
7. ¿Cliente provee CSV? [ ] Sí [ ] NELVYON carga manual
8. Fotos producto: [ ] Cliente [ ] NELVYON coordina [ ] Stock

### C. Operación

9. Envíos: zonas, costes, plazos, transportistas:
10. Impuestos (IVA, OSS): [ ] Cliente configura [ ] Asesor cliente
11. Políticas devolución (resumen):
12. Email notificaciones pedidos: _______________

### D. Técnico

13. Dominio tienda: _______________
14. Stripe: [ ] Cuenta existente [ ] Crear nueva — email: ___
15. Integraciones: [ ] GA4 [ ] Meta pixel [ ] Google Merchant [ ] ERP ___
16. Tier: [ ] Starter [ ] Professional [ ] Premium
17. Marca: [ ] Existe brand book [ ] BRANDING_SOP pendiente

**Firma:** _______________

---

## 2. Proceso paso a paso

### Fase 0 — Intake (D0–2) · Account

Validar brief · accesos Stripe · OS `ECOM-[CLIENTE]` · kick-off 60 min.

### Fase 1 — Arquitectura catálogo (D2–5) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 1.1 | Taxonomía categorías y filtros | Diagrama |
| 1.2 | Plantilla PDP/PLP/cart/checkout (wire) | Figma |
| 1.3 | Reglas envío e impuestos documentadas | Spec |
| 1.4 | **Aprobación** arquitectura | Email |

### Fase 2 — Diseño (D5–10) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 2.1 | UI tienda alineada marca | Figma high-fi |
| 2.2 | Estados: vacío, error pago, agotado | Frames |
| 2.3 | Mobile checkout prioritario | Prototype |
| 2.4 | **Revisión** diseño | OK cliente |

### Fase 3 — Build (D10–18) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 3.1 | Crear tienda NELVYON Store Builder | Proyecto |
| 3.2 | Import/carga productos según tier | CSV log |
| 3.3 | Configurar variantes, precios, stock | Screenshots |
| 3.4 | Stripe test mode — compra prueba | Receipt test |
| 3.5 | Emails transaccionales verificados | Capturas |
| 3.6 | URL staging | Link OS |

### Fase 4 — Contenido y legal (D12–20) · Freelancer + cliente

| Paso | Acción |
|------|--------|
| 4.1 | Páginas legal: envíos, devoluciones, privacidad, términos |
| 4.2 | Copy micro UX (carrito, checkout, thank-you) |
| 4.3 | SEO básico categorías y PDP |

### Fase 5 — QA (D18–22) · Freelancer + QA

| Paso | Acción |
|------|--------|
| 5.1 | Compra guest + cuenta registrada |
| 5.2 | Mobile checkout completo |
| 5.3 | Checklist §5 + QA G3 |

### Fase 6 — Go-live (D22–28+) · Freelancer

Stripe live · DNS · SSL · GA4 · informe go-live · handoff manual operación.

### Fase 7 — Premium (D30–60)

Catálogo ampliado, descuentos, analítica avanzada, Merchant Center setup.

---

## 3. Entregables exactos

| # | Entregable | Starter | Pro | Premium |
|---|------------|---------|-----|---------|
| E1 | Tienda URL live HTTPS | ✅ | ✅ | ✅ |
| E2 | Catálogo cargado (N SKU) | 10 | 25 | 100 |
| E3 | Stripe live conectado | ✅ | ✅ | ✅ |
| E4 | Políticas legales publicadas | ✅ | ✅ | ✅ |
| E5 | Manual operación pedidos/catálogo | PDF 8 pp | PDF 15 pp | PDF 25 pp + vídeo |
| E6 | Plantillas email transaccional doc | ✅ | ✅ | ✅ |
| E7 | Export catálogo CSV backup | ✅ | ✅ | ✅ |
| E8 | Informe analytics baseline 14d | — | — | ✅ |
| E9 | Google Merchant feed (premium) | — | — | ✅ |

---

## 4. Criterios de aceptación

| ID | Criterio |
|----|----------|
| A1 | Compra test exitosa modo live (reembolso posterior) |
| A2 | Email confirmación pedido recibido |
| A3 | Checkout mobile sin pasos rotos |
| A4 | N SKUs publicados según tier |
| A5 | Políticas legales accesibles desde footer checkout |
| A6 | Stock y precios correctos en PDP muestra |
| A7 | Cliente puede añadir producto sin soporte NELVYON (manual) |
| A8 | Premium: Merchant o analítica según brief cumplido |

---

## 5. Checklist QA

- [ ] 🔴 Compra guest OK
- [ ] 🔴 Compra con cuenta OK (si habilitada)
- [ ] 🔴 Stripe live (no test keys en prod)
- [ ] 🔴 Precios con IVA correcto o documentado
- [ ] 🔴 Envío calculado o flat rate según spec
- [ ] 🔴 Imágenes ratio consistente
- [ ] 🟠 404 y búsqueda sin resultados diseñados
- [ ] 🟠 Carrito abandonado email (si activo)
- [ ] 🟡 PageSpeed PDP mobile documentado
- [ ] 🔴 `/os/ecommerce-premium/preview` revisado
- [ ] 🔴 QA G3 APROBADO

---

## 6. Riesgos frecuentes

| Riesgo | Mitigación |
|--------|------------|
| Stripe no verificado | Iniciar KYC cliente en intake |
| Fotos producto tardías | Placeholder solo staging; no go-live |
| Impuestos mal configurados | Cliente/asesor firma spec impuestos |
| Catálogo > tier | Change request o upgrade tier |
| Devoluciones no definidas | Bloquear go-live sin política |

---

## 7. Herramientas recomendadas

| Categoría | Herramientas |
|-----------|--------------|
| NELVYON | Store Builder, EcommercePremiumAgent, Stripe |
| Diseño | Figma, Photoshop (packshots) |
| Ops | Stripe Dashboard, GA4 |
| QA | BrowserStack, tarjetas test Stripe |
| OS | `/os/ecommerce-premium/preview` |

---

## 8. Tiempos

| Tier | Plazo |
|------|-------|
| **Starter** | 12–18 D |
| **Professional** | 20–35 D |
| **Premium** | 45–60 D |

---

## 9. Perfil freelancer ideal

- **Rol:** Ecommerce implementer / Shopify-experienced
- **Experiencia:** 4+ años D2C, catálogos reales
- **Skills:** Stripe, UX checkout, CSV import, políticas tienda
- **Plus:** Coordinación fotografía producto

---

## 10. Uso dentro de NELVYON OS

```
1. /os/clientes → cliente
2. /os/proyectos → "ECOM [Tienda]"
3. /os/tareas:
   T1 Arquitectura | T2 Diseño | T3 Build | T4 Legal | T5 QA | T6 Go-live | T7 Handoff
4. /os/entregables:
   - D1 Spec catálogo (internal)
   - D2 URL staging (internal)
   - D3 Tienda live + manual PDF (client_visible)
   - D4 Backup CSV (client_visible)
5. QA: /os/ecommerce-premium/preview
6. Vincular proyecto BRAND/LOGO en OS si identidad previa
```

---

*SOP v1.0 — NELVYON SERVICES Phase 2 · Ecommerce*
