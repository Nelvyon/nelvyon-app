# Landing pages — SOP operativo

**SKU:** `NELVYON-LANDING`  
**Versión SOP:** 1.0  
**Fase:** SERVICES-PHASE-1  
**Referencia QA:** `SERVICES_QA_MASTER.md`

---

## Resumen

Página de conversión única (una oferta, un CTA) optimizada para campañas paid u orgánicas.

| Tier | Variantes | Plazo | Revisiones |
|------|-----------|-------|------------|
| **Standard** | 1 landing | 5–10 días laborables | 2 |
| **Premium** | 1 landing + variante B (A/B) | 12–18 días laborables | 4 |

---

## 1. SOP paso a paso

### Fase 0 — Intake (Día 0–1) · Account

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 0.1 | Brief §3 completado | `01-brief/` |
| 0.2 | Confirmar fuente tráfico y objetivo conversión | Nota kick-off |
| 0.3 | OS: cliente + proyecto `LANDING-[CLIENTE]-[CAMPAÑA]` | Proyecto creado |
| 0.4 | Kick-off 30 min | Acta |

### Fase 1 — Estrategia (Día 1–2) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 1.1 | Definir avatar, objeción #1, promesa, CTA único | Doc `strategy-1pager.md` |
| 1.2 | Elegir framework copy (AIDA / PAS / BAB) | Nota en strategy |
| 1.3 | Outline secciones above/below fold | Bullet list |
| 1.4 | **Aprobación cliente** outline (email) | Email |

### Fase 2 — Copy (Día 2–4) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 2.1 | Headline + subheadline (3 opciones → 1 final) | Doc copy |
| 2.2 | Bullets beneficios, prueba social, FAQ corto | Doc copy |
| 2.3 | CTA primario + microcopy botón | Doc copy |
| 2.4 | Thank-you page copy | Doc copy |
| 2.5 | **Ronda revisión 1** copy | Comentarios |

### Fase 3 — Diseño (Día 4–6) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 3.1 | Wire mobile-first | Figma |
| 3.2 | UI high-fi desktop + mobile | Figma |
| 3.3 | Variante B (premium): headline/CTA alternativo | Figma frame B |
| 3.4 | **Ronda revisión 2** diseño | Email OK |

### Fase 4 — Build (Día 6–8) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 4.1 | Implementar en NELVYON Landing Builder | Proyecto builder |
| 4.2 | Formulario + validación campos | Test submit |
| 4.3 | Thank-you redirect / página | URL OK |
| 4.4 | Pixels: Meta + Google (si brief) | Events doc |
| 4.5 | UTM convention documentada | Tabla UTMs |
| 4.6 | URL staging compartida | Link en OS |

### Fase 5 — QA (Día 8–9) · Freelancer + QA

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 5.1 | Checklist §5 completo | Firmado |
| 5.2 | Test conversión end-to-end | Video Loom 2 min |
| 5.3 | Informe QA G3 | APROBADO |

### Fase 6 — Launch (Día 9–10) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 6.1 | Publicar URL final (subdominio o path) | Live URL |
| 6.2 | Conectar campaña ads si aplica | Screenshot ads |
| 6.3 | Entrega pack §4 | OS + Drive |

### Fase 7 — Post-launch (Premium Día 11–18) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 7.1 | Baseline 7 días: sesiones, CR, fuente | Informe corto |
| 7.2 | Recomendación iteración A/B | 1 pág |
| 7.3 | Implementar ganador si acordado | v2 live |

---

## 2. Brief de cliente

**Campaña:** _______________ **Fecha:** _______________

### A. Oferta

1. Producto/servicio promocionado:
2. Precio / modelo (si aplica):
3. Promoción limitada (sí/no, detalle):
4. Objetivo conversión: [ ] Lead form [ ] Demo [ ] Compra [ ] Llamada [ ] Otro ___

### B. Audiencia

5. Perfil ideal (demografía, dolor, deseo):
6. Objeción principal que frena compra:
7. Fuente tráfico prevista: [ ] Google Ads [ ] Meta [ ] Email [ ] Orgánico [ ] Otro ___

### C. Contenido y marca

8. Headline deseado (si existe):
9. Prueba social disponible (logos, testimonios, cifras):
10. Assets: logo, imágenes, vídeo [ ] adjuntar
11. Referencias landing que admira (URLs):

### D. Técnico

12. Dominio / subdominio destino: _______________
13. CRM o email destino leads: _______________
14. Pixels: [ ] Meta [ ] Google [ ] GA4 [ ] LinkedIn [ ] Ninguno
15. Tier: [ ] Standard [ ] Premium (A/B)

### E. Legal

16. Claims permitidos / prohibidos:
17. Sector regulado: [ ] Sí [ ] No — detalle: ___

**Firma:** _______________

---

## 3. Entregables exactos

| # | Entregable | Formato |
|---|------------|---------|
| E1 | Documento estrategia 1 pág | PDF |
| E2 | Copy completo landing + thank-you | Google Doc |
| E3 | Figma diseño aprobado | Link + PDF export |
| E4 | URL landing producción | HTTPS live |
| E5 | URL thank-you | HTTPS live |
| E6 | Guía UTMs y pixels | PDF 2 pp |
| E7 | Video test conversión | Loom |
| E8 | Informe baseline 7d (premium) | PDF |

---

## 4. Criterios de aceptación

| ID | Criterio |
|----|----------|
| A1 | Un solo CTA principal coherente con brief |
| A2 | Formulario captura leads en destino acordado |
| A3 | CTA visible sin scroll en viewport 375×667 |
| A4 | Tiempo carga documentado < 3s mobile (medición PSI) |
| A5 | Pixels disparan evento lead/submit si contratados |
| A6 | Copy sin claims prohibidos en brief |
| A7 | Variante B live y tráfico spliteable (premium) |

---

## 5. Checklist de calidad

- [ ] 🔴 Mensaje oferta claro en 5 segundos
- [ ] 🔴 Un objetivo conversión; sin menú distractor
- [ ] 🔴 Mobile-first sin roturas
- [ ] 🔴 Formulario probado con email real cliente
- [ ] 🔴 HTTPS activo
- [ ] 🟠 Prueba social creíble y verificable
- [ ] 🟠 Imágenes comprimidas WebP/optimizado
- [ ] 🟠 FAQ responde objeción #1 del brief
- [ ] 🟠 Política privacidad enlazada si captura datos
- [ ] 🟡 Open Graph tags para compartir
- [ ] 🔴 QA G3 APROBADO
- [ ] 🔴 Entregable OS publicado

---

## 6. Herramientas obligatorias

| Herramienta | Uso |
|-------------|-----|
| NELVYON Landing Builder | Build + publish |
| LandingPremiumAgent (opcional) | Borrador copy/HTML |
| Figma | Diseño |
| PageSpeed Insights | Performance |
| Meta Pixel Helper / Tag Assistant | Pixels |
| Google Drive | Archivos |
| Loom | Evidencia QA |

---

## 7. Tiempos

| | Standard | Premium |
|---|----------|---------|
| **Total** | 5–10 D | 12–18 D |
| Estrategia + copy | 3 D | 4 D |
| Diseño + build | 3 D | 5 D |
| QA + launch | 2 D | 3 D |
| Optimización post-datos | — | 5 D |

---

## 8. Perfil freelancer ideal

- **Rol:** Copywriter conversión + diseñador landing
- **Experiencia:** 3+ años performance / CRO
- **Portfolio:** Landings con métricas CR o CPL reales
- **Skills:** Headlines, mobile UX, form optimization
- **Plus:** Experiencia ads (sabe alinear mensaje con campaña)

---

## 9. Riesgos frecuentes

| Riesgo | Mitigación |
|--------|------------|
| Múltiples CTAs compiten | Un CTA; secundario solo scroll largo |
| Mensaje no match ad | Aprobar outline con copy ads |
| Pixel no dispara | Test antes de gastar presupuesto |
| CR bajo post-launch | Premium incluye iteración; Standard = informe recomendaciones |
| Claims legales | Brief sección E obligatoria |

---

## 10. Flujo dentro de NELVYON OS

```
1. /os/clientes → cliente existente o nuevo
2. /os/proyectos → "LANDING [Campaña Q2]"
3. /os/tareas → T1 Estrategia | T2 Copy | T3 Diseño | T4 Build | T5 QA | T6 Launch
4. /os/entregables → D1 Strategy PDF | D2 Staging | D3 Live URL (client_visible)
5. Upload: Loom test, checklist QA
6. Portal cliente (opcional): entregable published para ver URL + informe
7. Sin preview OS dedicado landing — usar web-premium checklist como referencia CRO
```

---

*SOP v1.0 — NELVYON SERVICES · Landing pages*
