# Automatizaciones IA — SOP operativo

**SKU:** `NELVYON-AUTO`  
**Versión SOP:** 1.0  
**Fase:** SERVICES-PHASE-2  
**Referencia QA:** `SERVICES_QA_MASTER.md` · Tiers: `NELVYON_SERVICE_TIERS.md`

---

## Resumen

Consultoría y despliegue de automatizaciones marketing/operaciones con IA: diagnóstico, diseño de flujos, prototipos funcionales y documentación.

| Tier | Automatizaciones | Plazo | Revisiones |
|------|------------------|-------|------------|
| **Starter** | Diagnóstico + 1 flujo piloto | 8–10 D | 1 |
| **Professional** | Diagnóstico + 3 flujos + playbook | 10–15 D | 2 |
| **Premium** | 5 flujos + formación + 30d soporte | 25–35 D | 4 |

---

## 1. Briefing cliente

**Empresa:** _______________ **Contacto ops:** _______________ **Fecha:** _______________

### A. Contexto

1. Tamaño equipo y roles involucrados:
2. Herramientas actuales (CRM, email, sheets, Slack, etc.):
3. Procesos manuales más dolorosos (top 3):
4. Horas/semana estimadas en tareas repetitivas:

### B. Objetivos

5. Objetivo automatización (ahorro tiempo, errores, velocidad lead, etc.):
6. KPI éxito (ej. -10h/semana, <5% error rate):
7. Presupuesto herramientas iPaaS mensual: _______________

### C. Datos y compliance

8. Datos personales involucrados: [ ] Sí [ ] No — tipos: ___
9. ¿GDPR / sector regulado? [ ] Sí [ ] No
10. Sistemas que **no** se pueden tocar:

### D. Alcance

11. Flujos prioritarios (describir):
12. Tier: [ ] Starter [ ] Professional [ ] Premium
13. ¿Acceso APIs/webhooks cliente? [ ] Sí [ ] Parcial [ ] No

**Firma:** _______________

---

## 2. Proceso paso a paso

### Fase 0 — Intake (D0–2) · Account

Brief · NDA si datos sensibles · OS `AUTO-[CLIENTE]` · kick-off 60 min · mapa herramientas.

### Fase 1 — Discovery (D2–5) · Consultor

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 1.1 | Entrevistas 2–3 stakeholders (30 min c/u) | Notas |
| 1.2 | Mapa procesos AS-IS (Miro) | Diagrama |
| 1.3 | Cuantificar tiempo/costo/error por proceso | Hoja ROI |
| 1.4 | Identificar quick wins vs proyectos largos | Matriz impacto/esfuerzo |

### Fase 2 — Diseño TO-BE (D5–8) · Consultor

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 2.1 | Diseñar flujos objetivo (trigger → IA → acción → humano) | Diagrama TO-BE |
| 2.2 | Seleccionar stack: Make / Zapier / n8n / webhooks NELVYON | Doc arquitectura |
| 2.3 | Prompts IA versionados por paso (sin PII en logs) | Playbook prompts |
| 2.4 | Matriz riesgos + rollback | PDF |
| 2.5 | **Aprobación cliente** scope flujos | Email SOW |

### Fase 3 — Prototipo (D8–12) · Consultor + técnico

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 3.1 | Implementar flujo piloto #1 en sandbox | Scenario export |
| 3.2 | Test 10 casos normales + 5 edge cases | Log tests |
| 3.3 | Alertas error (email/Slack) | Config doc |
| 3.4 | Flujos 2–3 (professional) o hasta 5 (premium) | Exports |

### Fase 4 — Documentación (D10–14) · Consultor

| Paso | Acción |
|------|--------|
| 4.1 | SOP operación por flujo (quién supervisa excepciones) |
| 4.2 | Manual rollback |
| 4.3 | Informe consultoría ejecutivo + roadmap 90d |

### Fase 5 — QA (D12–15) · QA + Consultor

Checklist §5 · prueba rollback · QA G3 · sin PII en prompts test expuestos.

### Fase 6 — Handoff (D15–18) · Account

Sesión formación 2h (premium) · transferencia cuentas iPaaS · OS entregables · 30d soporte premium.

---

## 3. Entregables exactos

| # | Entregable | Starter | Pro | Premium |
|---|------------|---------|-----|---------|
| E1 | Informe diagnóstico + ROI | ✅ | ✅ | ✅ ampliado |
| E2 | Diagramas AS-IS / TO-BE | ✅ | ✅ | ✅ |
| E3 | Flujos implementados (export JSON) | 1 | 3 | 5 |
| E4 | Playbook prompts IA | 1 caso | 3 | 5 |
| E5 | Matriz riesgos + rollback | ✅ | ✅ | ✅ |
| E6 | SOP operación por flujo | 1 | 3 | 5 |
| E7 | Roadmap automatización 90d | Resumen | ✅ | ✅ detallado |
| E8 | Sesión formación grabada | — | 1h | 2h |
| E9 | Soporte 30d post-launch | — | — | ✅ |

---

## 4. Criterios de aceptación

| ID | Criterio |
|----|----------|
| A1 | Cada flujo ejecuta caso feliz 10/10 tests |
| A2 | Edge case documentado con owner humano |
| A3 | Alerta error dispara en fallo simulado |
| A4 | Rollback probado y documentado |
| A5 | ROI estimado documentado (horas/semana) |
| A6 | Sin PII en prompts a terceros sin base legal |
| A7 | Cliente puede operar flujo sin consultor (SOP claro) |
| A8 | Nº flujos según tier entregados |

---

## 5. Checklist QA

- [ ] 🔴 Cada flujo tiene owner humano excepciones
- [ ] 🔴 Logs/alertas en fallo
- [ ] 🔴 Rollback probado
- [ ] 🔴 PII sanitizado en prompts y logs
- [ ] 🔴 Credenciales en vault, no en export JSON cliente
- [ ] 🟠 No duplica CRM workflow sin justificación
- [ ] 🟠 Rate limits APIs documentados
- [ ] 🟡 Coste OpenAI/iPaaS estimado mensual
- [ ] 🔴 `/os/consultoria-automatizacion-premium/preview` revisado
- [ ] 🔴 QA G3 APROBADO

---

## 6. Riesgos frecuentes

| Riesgo | Mitigación |
|--------|------------|
| Scope infinito procesos | Matriz impacto; límite tier |
| API cliente inestable | Retry + alertas; SLA cliente |
| IA alucina en clasificación | Human-in-the-loop paso crítico |
| GDPR violación | Review datos Fase 0; DPA si necesario |
| Cliente no mantiene flujos | Formación + SOP simple |
| Dependencia consultor | Exports + documentación propiedad cliente |

---

## 7. Herramientas recomendadas

| Categoría | Herramientas |
|-----------|--------------|
| NELVYON | ConsultoriaAutomatizacionPremiumAgent, workflow_engine (referencia), webhooks |
| iPaaS | Make, Zapier, n8n |
| IA | OpenAI API (prompts versionados) |
| Diseño proceso | Miro, FigJam |
| Docs | Notion, Google Docs |
| OS | `/os/consultoria-automatizacion-premium/preview` |

---

## 8. Tiempos

| Tier | Plazo |
|------|-------|
| **Starter** | 8–10 D |
| **Professional** | 10–15 D |
| **Premium** | 25–35 D |

---

## 9. Perfil freelancer ideal

- **Rol:** Automation consultant / solutions architect
- **Experiencia:** 4+ años marketing ops o RevOps
- **Skills:** iPaaS, APIs REST, prompt engineering, process mapping
- **Plus:** CRM (HubSpot, Pipedrive) — sin modificar SaaS NELVYON
- **Soft skills:** Traducir técnico a negocio para C-level

---

## 10. Uso dentro de NELVYON OS

```
1. /os/clientes → cliente
2. /os/proyectos → "AUTO [Área — ej. Lead routing]"
3. /os/tareas:
   T1 Discovery | T2 Diseño TO-BE | T3 Build flujos | T4 Docs | T5 QA | T6 Handoff
4. /os/entregables:
   - D1 Informe diagnóstico PDF (client_visible)
   - D2 Exports flujos ZIP/JSON (client_visible — sin secrets)
   - D3 Playbook prompts PDF (client_visible)
   - D4 Roadmap 90d (client_visible)
5. Agent opcional: ConsultoriaAutomatizacionPremiumAgent → borrador informe (internal)
6. QA: /os/consultoria-automatizacion-premium/preview
```

---

*SOP v1.0 — NELVYON SERVICES Phase 2 · Automatizaciones IA*
