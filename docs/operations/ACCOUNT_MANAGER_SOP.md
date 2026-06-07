# Account Manager SOP

**Versión:** 1.0  
**Owner:** Account Manager (AM)  
**Alcance:** Relación cliente durante proyecto(s) activos y entre proyectos

---

## 1. Objetivo

Ser el **único punto de contacto** del cliente: proteger scope, calendario, calidad percibida y satisfacción, coordinando freelancer y QA sin exponer fricción interna.

---

## 2. Responsabilidades core

| Área | Acción |
|------|--------|
| **Comunicación** | Updates semanales cliente; consolidar feedback |
| **Scope** | Change requests formales; alinear SOW |
| **Cronograma** | Hitos, recordatorios revisiones, pausas SLA |
| **Calidad** | No entregar sin G3; gestionar expectativas |
| **OS / Drive** | Trazabilidad entregables y tareas |
| **Escalación** | L1 interno; L2 Ops Lead si bloqueo |

---

## 3. Cadencia operativa

### Semanal (proyecto activo)

| Día | AM hace |
|-----|---------|
| Lunes | Revisar tareas OS + estado freelancer; plan semana |
| Miércoles | Check async freelancer; desbloquear accesos |
| Viernes | Email cliente: progreso, próximo hito, asks pendientes |

### Por hito

| Hito | AM hace |
|------|---------|
| Pre-revisión cliente | Empaquetar entregable; contexto en email |
| Post-feedback cliente | Triangular cambios vs tier; plazo respuesta |
| Pre-QA | Verificar G2 completo antes enviar a QA |
| Post-QA G3 | Preparar handoff G4 |
| Entrega | Email handoff + portal si aplica |

---

## 4. Gestión revisiones cliente

Según tier (`NELVYON_SERVICE_TIERS.md`):

| Tier | Rondas | SLA respuesta cliente | SLA implementación |
|------|--------|----------------------|-------------------|
| Starter | 1 | 5 D laborables | 3 D |
| Professional | 2 | 5 D | 3 D |
| Premium | 4 | 3 D | 2 D |

**Reglas AM:**

1. Feedback fuera de rondas → change order o siguiente fase comercial.  
2. Cliente no responde → email D+3 y D+5; pausa SLA documentada.  
3. Consolidar feedback en un doc por ronda (no 15 emails sueltos al freelancer).

---

## 5. Change Request (CR)

Plantilla mínima:

```markdown
## CR-[N] — [CLIENTE] — [FECHA]
Solicitud: ...
Impacto scope: ...
Impacto plazo: +__ D
Impacto precio: +__ €
Aprobación cliente: [ ] Sí [ ] No
```

Sin CR firmado → no asignar trabajo extra al freelancer.

---

## 6. Comunicación cliente — reglas

| Hacer | No hacer |
|-------|----------|
| Un hilo email por proyecto | Múltiples AM sin coordinación |
| Resumen ejecutivo + detalle adjunto | Enviar checklist interno crudo |
| Confirmar por escrito aprobaciones | Aprobaciones verbales sin acta |
| Traducir técnico a negocio | Exponer conflictos freelancer-QA |
| Horario laborable + urgencias definidas | WhatsApp 24/7 salvo contrato premium |

---

## 7. Coordinación freelancer

| Frecuencia | Touchpoint |
|------------|------------|
| Diario (producción activa) | Async Slack/email si bloqueo |
| Semanal | Sync 15 min |
| Pre-QA | Revisión checklist G2 |
| Post-proyecto | Scorecard input (`FREELANCER_SCORECARD.md`) |

AM **no** sustituye QA técnico — solo valida completitud administrativa G2.

---

## 8. Health score cuenta (mensual)

| Señal | Verde | Ámbar | Rojo |
|-------|-------|-------|------|
| Respuesta cliente | < 3 D | 3–7 D | > 7 D |
| NPS último proyecto | ≥ 8 | 6–7 | < 6 |
| Incidencias abiertas | 0 | 1–2 | > 2 |
| Pago | Al día | 7d retraso | > 7d |

Rojo → escalación Ops Lead + plan recuperación.

---

## 9. Uso NELVYON OS (AM)

| Tarea | Ruta / acción |
|-------|---------------|
| Ver cliente | `/os/clientes/{id}` |
| Actualizar proyecto | `/os/proyectos/{id}` |
| Marcar tareas | `/os/tareas` → completed |
| Publicar entregable | `/os/entregables` → workflow → published |
| Invitar portal | Panel portal en detalle cliente |
| Upload evidencias | Entregable upload |

OS es **registro y entrega** — no sustituye Drive para trabajo creativo.

---

## 10. Criterios de éxito AM

| ID | Criterio |
|----|----------|
| AM1 | Cliente recibe update semanal en proyectos activos |
| AM2 | 0 entregas sin G3 |
| AM3 | CR documentados para todo scope extra |
| AM4 | NPS capturado en cada cierre |
| AM5 | Handoff H6 a Sales 60d antes fin contrato recurrente |

---

## 11. Riesgos frecuentes

| Riesgo | Mitigación |
|--------|------------|
| AM absorbe trabajo freelancer | Límites rol; CR si fuera SOW |
| Cliente bypass AM → freelancer | Política canal único |
| Promesa fecha sin QA buffer | Cronograma incluye 2–3 D QA |
| Portal no usado | Capacitar en kick-off |

---

*Account Manager SOP v1.0*
