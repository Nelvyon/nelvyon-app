# Project Delivery SOP

**Versión:** 1.0  
**Owner:** Account Manager (coord.) + Freelancer (ejec.) + QA Lead (calidad)  
**Entrada:** Kick-off completado (`CLIENT_ONBOARDING_SOP.md`)  
**Salida:** Entrega cliente → `PROJECT_CLOSURE_SOP.md`

---

## 1. Objetivo

Ejecutar el servicio contratado según **SOP servicio específico** (`docs/services/*_SOP.md`) con gates QA y trazabilidad OS/Drive.

---

## 2. Flujo de entrega (resumen)

```
KICKOFF → PRODUCCIÓN (SOP servicio) → G2 auto-QA freelancer
       → QA_INTERNO (G3) → CLIENTE_REVISION (rondas tier)
       → ENTREGADO (G4 handoff)
```

---

## 3. Proceso paso a paso

### Etapa A — Producción · Freelancer

| Paso | Responsable | Referencia |
|------|-------------|------------|
| A.1 | Ejecutar fases SOP servicio | `docs/services/[SKU]_SOP.md` |
| A.2 | Actualizar tareas OS por fase | `/os/tareas` |
| A.3 | Subir WIP a Drive `02-work-in-progress/` | Drive |
| A.4 | Solicitar feedback cliente en hitos SOP | AM coordina |
| A.5 | Completar checklist SOP §QA | G2 |

### Etapa B — QA interno · QA Lead

| Paso | Responsable |
|------|-------------|
| B.1 | Recibir handoff H3 (checklist + evidencias) |
| B.2 | Verificar ítems críticos C1–C8 (`SERVICES_QA_MASTER.md`) |
| B.3 | Completar informe QA plantilla |
| B.4 | Resultado: APROBADO / APROBADO CON OBS / RECHAZADO |
| B.5 | Si RECHAZADO → freelancer corrige → B.1 de nuevo |
| B.6 | Handoff H4 a AM |

**SLA QA:** Starter 5 D · Professional 3 D · Premium 2 D desde recepción G2.

### Etapa C — Entrega cliente · AM

| Paso | Responsable |
|------|-------------|
| C.1 | Empaquetar entregables según SOP servicio §3 |
| C.2 | Publicar entregables OS `client_visible` + workflow published |
| C.3 | Email handoff G4 (URLs, manual, credenciales vault) |
| C.4 | Sesión walkthrough si premium (grabar Loom) |
| C.5 | Estado `ENTREGADO`; iniciar soporte post-entrega contratado |

### Etapa D — Revisiones cliente (si en scope)

| Paso | Responsable |
|------|-------------|
| D.1 | Cliente feedback consolidado por AM |
| D.2 | Freelancer implementa dentro rondas tier |
| D.3 | Re-QA solo si cambio afecta ítems 🔴 |
| D.4 | Portal approve/reject si entregable publicado |

---

## 4. Matriz SOP servicio → documento

| SKU | SOP |
|-----|-----|
| Web | `WEB_SOP.md` |
| Landing | `LANDING_SOP.md` |
| Chatbot | `CHATBOT_SOP.md` |
| SEO | `SEO_SOP.md` |
| Google Ads | `GOOGLE_ADS_SOP.md` |
| Meta Ads | `META_ADS_SOP.md` |
| Logo | `LOGO_SOP.md` |
| Branding | `BRANDING_SOP.md` |
| Ecommerce | `ECOMMERCE_SOP.md` |
| TikTok Ads | `TIKTOK_ADS_SOP.md` |
| Automation | `AUTOMATION_SOP.md` |

---

## 5. Gates obligatorios (no saltar)

| Gate | Bloquea |
|------|---------|
| G0 | Ya validado en onboarding |
| G1 | Ya validado en onboarding |
| G2 | Envío a QA |
| G3 | Entrega cliente |
| G4 | Facturación hito final (si aplica) |

---

## 6. Multi-proyecto mismo cliente

| Regla | Detalle |
|-------|---------|
| Un AM principal | Mismo cliente, múltiples SKUs |
| Proyectos OS separados | Un proyecto por servicio/contrato |
| QA independiente | Por proyecto |
| Comunicación | Un email resumen semanal consolidado |

---

## 7. Incidentes en entrega

| Tipo | Acción |
|------|--------|
| Retraso freelancer | AM informa cliente proactivo; nuevo fecha |
| Bloqueante QA | Freelancer fix; no presionar skip G3 |
| Cliente cambia scope | CR (`ACCOUNT_MANAGER_SOP.md`) |
| Acceso revocado | Pausa proyecto; acta |

---

## 8. Criterios de éxito entrega

| ID | Criterio |
|----|----------|
| D1 | SOP servicio fases completadas |
| D2 | G3 APROBADO |
| D3 | Entregables §3 SOP entregados |
| D4 | Criterios aceptación §4 SOP cumplidos |
| D5 | Cliente confirma recepción o silencio positivo según contrato |

---

## 9. Métricas entrega

| KPI | Meta |
|-----|------|
| En plazo | ≥ 80% |
| QA 1ª pasada | ≥ 70% |
| Retrabajo < 30d | < 10% |

---

## 10. Riesgos frecuentes

| Riesgo | Mitigación |
|--------|------------|
| Entregar sin QA | AM bloqueado sistema ops |
| Evidencias dispersas | Drive + OS naming estándar |
| Desalineación brief | Releer brief en G2 |
| Soporte infinito | Límites tier en handoff |

---

*Project Delivery SOP v1.0*
