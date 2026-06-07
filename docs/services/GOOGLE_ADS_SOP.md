# Google Ads — SOP operativo

**SKU:** `NELVYON-GADS`  
**Versión SOP:** 1.0  
**Fase:** SERVICES-PHASE-1  
**Referencia QA:** `SERVICES_QA_MASTER.md`

---

## Resumen

Estrategia, configuración y lanzamiento de campañas Google Ads (Search / PMax / Display según brief) con tracking verificado.

| Tier | Alcance | Plazo | Revisiones |
|------|---------|-------|------------|
| **Standard** | Setup 1 cuenta + hasta 2 campañas | 5–8 días laborables | 2 |
| **Premium** | Setup + 30d optimización + reporting | 12–15 días setup + 30d monitor | 4 |

---

## 1. SOP paso a paso

### Fase 0 — Intake (Día 0–2) · Account

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 0.1 | Brief §3 completo | Brief firmado |
| 0.2 | Acceso Google Ads **Editor o Admin** en cuenta cliente | Invitación aceptada |
| 0.3 | Confirmar landing final live (LANDING_SOP o URL cliente) | URL test |
| 0.4 | OS proyecto `GADS-[CLIENTE]-[MES]` | Creado |
| 0.5 | Kick-off 45 min: objetivos, CPA/ROAS, presupuesto | Acta |

### Fase 1 — Auditoría cuenta (Día 2–3) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 1.1 | Revisar estructura existente o cuenta nueva | Screenshot árbol |
| 1.2 | Verificar facturación activa | Billing OK |
| 1.3 | Auditar conversiones GA4 ↔ Ads | Diagnóstico |
| 1.4 | Revisar políticas sector (restricciones) | Nota compliance |
| 1.5 | Informe auditoría 2–3 pp | PDF |

### Fase 2 — Estrategia (Día 3–4) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 2.1 | Definir tipo campaña (Search / PMax / Display) | Strategy doc |
| 2.2 | Estructura: campañas → ad groups → keywords | Diagrama |
| 2.3 | Presupuesto diario y calendario lanzamiento | Tabla |
| 2.4 | KPI primario (CPA, ROAS, leads) y secundarios | KPI sheet |
| 2.5 | **Aprobación cliente** estrategia | Email |

### Fase 3 — Tracking (Día 4–5) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 3.1 | Configurar / validar conversiones primarias | Tag Assistant |
| 3.2 | Enhanced conversions si aplica | Doc |
| 3.3 | UTM convention en URLs finales | Tabla |
| 3.4 | Vincular GA4 property | Screenshot |
| 3.5 | Test conversión de prueba (form submit) | Video Loom |

### Fase 4 — Setup campañas (Día 5–7) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 4.1 | Crear campañas naming convention `[CLIENTE]-[TIPO]-[OBJ]` | Ads Editor export |
| 4.2 | Keywords + match types + negativas iniciales | Lista CSV |
| 4.3 | RSA: mín. 8 headlines + 4 descriptions por ad group | Captura |
| 4.4 | Extensiones: sitelinks, callouts, structured snippets | Captura |
| 4.5 | Audiencias observación (si aplica) | Doc |
| 4.6 | Opcional: AdsPremiumAgent creatividades borrador | ZIP internal |

### Fase 5 — QA pre-launch (Día 7–8) · Freelancer + QA

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 5.1 | Checklist §5 completo | Firmado |
| 5.2 | Preview anuncios políticas Google | Policy center clean |
| 5.3 | Landing mobile speed spot check | PSI |
| 5.4 | Informe QA G3 | APROBADO |

### Fase 6 — Launch (Día 8) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 6.1 | Activar campañas presupuesto acordado | Screenshot live |
| 6.2 | Monitor 72h: impresiones, clics, conversiones | Informe 72h |
| 6.3 | Ajustes urgentes (tracking roto, 0 impresiones) | Changelog |

### Fase 7 — Premium optimización (Día 9–45) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 7.1 | Informe semana 2 y 4 | PDF |
| 7.2 | Negativas, pujas, RSA tests según datos | Log cambios |
| 7.3 | Informe final 30 días + recomendaciones | PDF entregable |

### Fase 8 — Handoff · Account

| Paso | Acción |
|------|--------|
| 8.1 | Pack §4 + sesión 45 min explicar cuenta |
| 8.2 | OS entregables published |

---

## 2. Brief de cliente

**Cuenta Google Ads ID:** _______________ **Presupuesto mensual:** _______________

### A. Objetivos

1. Objetivo: [ ] Leads [ ] Ventas [ ] Tráfico [ ] Brand [ ] Otro ___
2. CPA objetivo o ROAS objetivo: _______________
3. Presupuesto diario máximo aprobado: _______________
4. Geo targeting: _______________
5. Idiomas anuncio: _______________

### B. Oferta y landing

6. URL landing final: _______________
7. Propuesta valor en 1 frase:
8. Restricciones claims (sector regulado): _______________

### C. Tracking

9. GA4 property ID: _______________
10. Conversiones a medir (lista priorizada):
11. ¿Cuenta nueva o existente? [ ] Nueva [ ] Existente — limpiar estructura: [ ] Sí [ ] No

### D. Creatividades

12. ¿Cliente provee assets? [ ] Sí [ ] NELVYON redacta RSA
13. Extensiones deseadas: [ ] Tel [ ] Sitelinks [ ] Formulario lead

### E. Accesos y tier

14. Email invitación Ads admin: _______________
15. Tier: [ ] Standard setup [ ] Premium + 30d optimización
16. Fecha lanzamiento deseada: _______________

**Firma:** _______________

---

## 3. Entregables exactos

| # | Entregable | Standard | Premium |
|---|------------|----------|---------|
| E1 | Documento estrategia Google Ads | ✅ | ✅ |
| E2 | Estructura campaña (export Editor/screenshots) | ✅ | ✅ |
| E3 | Lista keywords + negativas iniciales | ✅ | ✅ |
| E4 | Set RSA documentado | ✅ | ✅ |
| E5 | Informe setup tracking | ✅ | ✅ |
| E6 | Informe 72h post-launch | ✅ | ✅ |
| E7 | Naming convention doc | ✅ | ✅ |
| E8 | Informe semana 2 | — | ✅ |
| E9 | Informe semana 4 | — | ✅ |
| E10 | Informe final 30 días + plan siguiente mes | — | ✅ |

---

## 4. Criterios de aceptación

| ID | Criterio |
|----|----------|
| A1 | Campañas live con presupuesto acordado |
| A2 | Conversiones primarias registran en Ads + GA4 (test verificado) |
| A3 | URLs finales = landing acordada con UTMs |
| A4 | Sin advertencias críticas políticas bloqueando entrega |
| A5 | Estructura naming documentada y entendible por cliente |
| A6 | RSA cumple mínimos Google (headlines/descriptions) |
| A7 | Premium: informes 30d entregados en fechas acordadas |

---

## 5. Checklist de calidad

- [ ] 🔴 Billing activo en cuenta
- [ ] 🔴 Conversiones primarias = acción negocio real (no pageview)
- [ ] 🔴 Landing alineada con intención keywords principal
- [ ] 🔴 Presupuesto diario ≤ máximo brief
- [ ] 🔴 Geo e idioma correctos
- [ ] 🟠 Lista negativas iniciales aplicada
- [ ] 🟠 Extensiones configuradas
- [ ] 🟠 Sin solapamiento cannibalización campañas
- [ ] 🟡 Audiencias observación añadidas
- [ ] 🔴 `/os/ads-premium/preview` revisado
- [ ] 🔴 QA G3 APROBADO

---

## 6. Herramientas obligatorias

| Herramienta | Uso |
|-------------|-----|
| Google Ads + Ads Editor | Setup |
| Google Keyword Planner | Research |
| GA4 + Tag Assistant | Tracking |
| NELVYON `google_ads_service` | API si credenciales prod |
| NELVYON `ads_agent_service` | Briefing → estrategia |
| NELVYON AdsPremiumAgent | Creatividades borrador |
| `apps/web/src/features/publicidad/api.ts` | Status/reporting interno |
| `/os/ads-premium/preview` | QA interno |
| Looker Studio (opcional) | Reporting cliente |

**Nota:** Sin `GOOGLE_ADS_*` / OAuth tokens, API opera en mock — **setup manual en Ads UI obligatorio**.

---

## 7. Tiempos

| | Standard | Premium |
|---|----------|---------|
| Setup total | 5–8 D | 12–15 D |
| Monitor optimización | — | 30 D calendario |
| Informes premium | — | Sem 2, 4, final |

---

## 8. Perfil freelancer ideal

- **Rol:** Google Ads specialist
- **Certificación:** Google Ads Search o Performance Max deseable
- **Experiencia:** 3+ años; gestión ≥ 3k€/mes presupuesto
- **Skills:** RSA, PMax, conversion tracking GA4, negativas
- **Portfolio:** Casos CPA/ROAS documentados

---

## 9. Riesgos frecuentes

| Riesgo | Mitigación |
|--------|------------|
| Tracking roto post-launch | Fase 3 obligatoria; test conversión |
| Landing lenta / no mobile | PSI antes launch; coordinar LANDING/WEB |
| Cuenta suspendida políticas | Brief restricciones; preview policy |
| Cliente cambia presupuesto diario | Acta kick-off firmado |
| Mock API confundido con live | Verificar impresiones reales 72h |
| Sin acceso admin | No kick-off |

---

## 10. Flujo dentro de NELVYON OS

```
1. /os/clientes → cliente
2. /os/proyectos → "Google Ads [Campaña]"
3. /os/tareas:
   T1 Auditoría | T2 Estrategia | T3 Tracking | T4 Setup | T5 QA | T6 Launch | T7 Reporting (premium)
4. /os/entregables:
   - D1 Estrategia PDF (internal → client_visible)
   - D2 Export estructura + keywords CSV
   - D3 Informes 72h / 30d (client_visible)
5. Producto: /publicidad rutas internas (sin modificar código)
6. QA: /os/ads-premium/preview
7. Coordinación: proyecto OS vinculado a landing URL en descripción proyecto
```

---

*SOP v1.0 — NELVYON SERVICES · Google Ads*
