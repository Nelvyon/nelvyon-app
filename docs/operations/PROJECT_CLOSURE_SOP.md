# Project Closure SOP

**Versión:** 1.0  
**Owner:** Account Manager  
**Entrada:** Proyecto `ENTREGADO` (`PROJECT_DELIVERY_SOP.md`)  
**Salida:** Proyecto `CERRADO` + input renovación

---

## 1. Objetivo

Cerrar formalmente el proyecto: aceptación documentada, facturación final, archivo, lecciones aprendidas y NPS — sin hilos sueltos.

---

## 2. Proceso paso a paso

### Fase 1 — Aceptación formal (D0–5 post-entrega)

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 1.1 | Confirmar aceptación: email cliente, portal `approved_by_client`, o silencio positivo según contrato | Email / OS status |
| 1.2 | Si `changes_requested` portal → resolver o CR antes cierre | Acta |
| 1.3 | Registrar fecha aceptación en `00-admin/` | Log |

### Fase 2 — Soporte post-entrega

| Paso | Acción |
|------|--------|
| 2.1 | Ventana soporte según tier (bugs/evidencias, no scope nuevo) |
| 2.2 | Ticket log en `06-comms/` |
| 2.3 | Cierre soporte → email fin ventana |

### Fase 3 — Administrativo (Gate G5)

| Paso | Acción |
|------|--------|
| 3.1 | Factura final / hito según contrato |
| 3.2 | Confirmar pago o escalación finanzas |
| 3.3 | Scorecard freelancer (`FREELANCER_SCORECARD.md`) |
| 3.4 | NPS cliente (encuesta 3 preguntas) |

### Fase 4 — Archivo proyecto

| Paso | Acción |
|------|--------|
| 4.1 | Mover `04-entregables/` a solo lectura |
| 4.2 | Marcar tareas OS completed |
| 4.3 | Entregables OS estado final coherente |
| 4.4 | Post-mortem interno 15 min si desviación > 15% tiempo o QA rechazado |

### Fase 5 — Handoff renovación

| Paso | Acción |
|------|--------|
| 5.1 | Informe salud cuenta para Sales (`CLIENT_RENEWAL_SOP.md` input) |
| 5.2 | Estado proyecto `CERRADO` |
| 5.3 | AM agenda check-in 30d post-cierre (relación) |

---

## 3. Encuesta NPS (plantilla)

1. ¿Qué probabilidad hay de que recomiendes NELVYON (0–10)?  
2. ¿Qué fue lo mejor del proyecto?  
3. ¿Qué mejorarías?

**Meta:** NPS ≥ 8 en escala 0–10 o promotor 9–10.

---

## 4. Checklist cierre (G5)

- [ ] 🔴 Aceptación formal documentada
- [ ] 🔴 Facturación emitida y pagada (o plan acordado)
- [ ] 🔴 Entregables finales en OS + Drive
- [ ] 🔴 Scorecard freelancer completado
- [ ] 🔴 NPS capturado
- [ ] 🟠 Soporte post-entrega cerrado o transferido
- [ ] 🟠 Post-mortem si aplica
- [ ] 🟠 Handoff H6 a Sales si contrato recurrente

---

## 5. Archivo — estructura final Drive

```
/[CLIENTE]-[SERVICIO]-[AÑO]/
  00-admin/     ← contrato, aceptación, facturas
  04-entregables/  ← finales readonly
  03-qa/        ← informes QA
  05-handoff/   ← manuales cliente
  06-comms/     ← histórico
  99-closure/   ← NPS, post-mortem, scorecard
```

---

## 6. Criterios de éxito cierre

| ID | Criterio |
|----|----------|
| C1 | G5 checklist 100% ítems 🔴 |
| C2 | Sin tickets soporte abiertos fuera scope |
| C3 | NPS registrado |
| C4 | Cierre ≤ 10 D laborables post-aceptación (admin) |

---

## 7. Riesgos frecuentes

| Riesgo | Mitigación |
|--------|------------|
| Cierre sin pago | G5 bloquea archivo formal |
| Cliente pide más tras aceptar | CR nuevo proyecto |
| No scorecard freelancer | AM no cierra hasta completar |
| Pérdida lecciones | Post-mortem obligatorio si desviación |

---

## 8. Portal — estados finales

| Status OS | Significado cierre |
|-----------|-------------------|
| `approved_by_client` | Aceptación explícita — preferido |
| `published` + email aceptación | Válido si contrato lo permite |
| `changes_requested` abierto | **No cerrar** hasta resolver |

---

*Project Closure SOP v1.0*
