# Client Onboarding SOP

**Versión:** 1.0  
**Owner:** Account Manager  
**Entrada:** Handoff H1 Sales (`SALES_SOP.md`)  
**Salida:** Kick-off listo → `PROJECT_DELIVERY_SOP.md`

---

## 1. Objetivo

Activar al cliente en **≤ 5 días laborables** post-firma: accesos, brief, estructura proyecto y kick-off agendado.

---

## 2. Proceso paso a paso

### Día 0–1 — Bienvenida

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 0.1 | Email bienvenida: AM asignado, próximos pasos, calendario | Email `06-comms/` |
| 0.2 | Crear carpeta Drive `[CLIENTE]-[AÑO]/` estructura estándar | Link compartido |
| 0.3 | Crear cliente en NELVYON OS `/os/clientes/nuevo` | ID cliente |
| 0.4 | Reunión bienvenida 30 min (expectativas, comunicación, contactos) | Acta |

### Día 1–3 — Administrativo

| Paso | Acción |
|------|--------|
| 1.1 | Verificar contrato/SOW archivado en `00-admin/` |
| 1.2 | Datos facturación confirmados |
| 1.3 | NDA / DPA si datos sensibles (chatbot, automation) |
| 1.4 | Canal comunicación acordado: email + opcional Slack |

### Día 2–4 — Brief y accesos (Gate G0)

| Paso | Acción |
|------|--------|
| 2.1 | Enviar brief SOP del servicio contratado (`docs/services/*_SOP.md` §brief) |
| 2.2 | Matriz accesos mínimos (`SERVICES_QA_MASTER.md` §6) |
| 2.3 | Perseguir completitud brief — recordatorio D+2 |
| 2.4 | Validar tier contratado vs brief (sin scope extra) |
| 2.5 | **Gate G0:** brief firmado + accesos críticos OK |

### Día 3–5 — Setup proyecto

| Paso | Acción |
|------|--------|
| 3.1 | Crear proyecto OS `/os/proyectos` naming `[SERVICIO]-[CLIENTE]-[FECHA]` |
| 3.2 | Crear tareas según SOP servicio (plantilla por SKU) |
| 3.3 | Asignar freelancer; confirmar disponibilidad y lectura SOP |
| 3.4 | Agendar kick-off 45–60 min (cliente decisor + operativo + freelancer) |
| 3.5 | Invitación portal cliente si entrega incluye approve/reject (`/os/clientes/{id}`) |

### Día 5 — Kick-off

| Paso | Acción |
|------|--------|
| 4.1 | Ejecutar kick-off: repasar brief, cronograma, revisiones, riesgos |
| 4.2 | Acta kick-off firmada por email |
| 4.3 | Estado proyecto: `KICKOFF` → `PRODUCCIÓN` |
| 4.4 | **Handoff H2** a freelancer (`PROJECT_DELIVERY_SOP.md`) |

---

## 3. Checklist onboarding

- [ ] 🔴 Cliente OS creado
- [ ] 🔴 Proyecto OS creado
- [ ] 🔴 Carpeta Drive con permisos cliente (carpetas acordadas)
- [ ] 🔴 Brief SOP completo y firmado (G0)
- [ ] 🔴 Accesos críticos recibidos o plan B documentado
- [ ] 🔴 Freelancer asignado y confirmado
- [ ] 🔴 Kick-off realizado con acta
- [ ] 🟠 Portal invite enviada si aplica
- [ ] 🟠 Contacto facturación verificado

---

## 4. Email plantilla bienvenida (esqueleto)

```
Asunto: Bienvenido a NELVYON — próximos pasos [CLIENTE]

Hola [NOMBRE],

Gracias por confiar en NELVYON. Tu Account Manager es [AM] ([email]).

Próximos pasos:
1. Completar brief adjunto antes del [FECHA]
2. Compartir accesos según checklist
3. Kick-off agendado: [FECHA/HORA]

Carpeta proyecto: [LINK DRIVE]

Saludos,
[AM]
```

---

## 5. Criterios de éxito

| ID | Criterio |
|----|----------|
| O1 | Onboarding ≤ 5 D laborables post-firma |
| O2 | G0 aprobado antes kick-off |
| O3 | Kick-off con decisor presente o poder delegado escrito |
| O4 | Handoff H2 entregado al freelancer |

---

## 6. Riesgos frecuentes

| Riesgo | Mitigación |
|--------|------------|
| Cliente lento en brief | SLA pausa cronograma; recordatorios |
| Accesos bloqueados (Ads, GSC) | Lista priorizada D0; no kick-off sin plan |
| Mismatch expectativa venta | Releer SOW en kick-off con cliente |
| Freelancer sin slot | Confirmar disponibilidad antes prometer fecha kick-off |

---

## 7. SLA onboarding

| Hito | SLA |
|------|-----|
| Email bienvenida | 24h post-firma |
| Brief enviado | 48h post-firma |
| Kick-off agendado | ≤ 5 D post-firma |
| Cliente OS | 48h post-firma |

---

*Client Onboarding SOP v1.0*
