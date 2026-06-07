# NELVYON SERVICES — Sistema global de control de calidad

**Versión:** 1.0  
**Fase:** SERVICES-PHASE-1  
**Alcance:** Web, Landing, Chatbot, SEO, Google Ads, Meta Ads  
**Estado OS/SaaS:** congelado — este sistema es **documentación operativa**, no código.

---

## 1. Propósito

Garantizar que **cualquier freelancer** entregue servicios NELVYON con calidad consistente, trazable y aceptable para el cliente, sin depender de memoria tribal.

**Regla de oro:** Ningún proyecto pasa a **Entregado** sin:

1. Checklist del SOP específico al 100% (ítems aplicables).
2. Revisión QA NELVYON (segunda firma).
3. Criterios de aceptación del SOP cumplidos o excepción documentada.

---

## 2. Roles y responsabilidades

| Rol | Responsabilidad |
|-----|-----------------|
| **Account / PM NELVYON** | Intake, brief completo, comunicación cliente, aprobaciones formales |
| **Freelancer asignado** | Ejecución SOP, evidencias, primera auto-QA |
| **QA Lead NELVYON** | Revisión independiente, bloqueo/liberación entrega |
| **Cliente** | Aprobación scope, feedback en rondas contratadas, aceptación final |

---

## 3. Estados del proyecto (operativos)

| Estado | Definición | Quién avanza |
|--------|------------|--------------|
| `INTAKE` | Brief recibido, incompleto | Account bloquea kick-off |
| `KICKOFF` | Brief validado, freelancer asignado | Account |
| `PRODUCCIÓN` | Trabajo activo según SOP | Freelancer |
| `QA_INTERNO` | Auto-checklist + revisión NELVYON | QA Lead |
| `CLIENTE_REVISION` | Ronda feedback cliente (si aplica) | Cliente |
| `ENTREGADO` | Aceptación o silencio positivo según contrato | Account |
| `CERRADO` | Soporte post-entrega finalizado | Account |

---

## 4. Gates de calidad (obligatorios)

### Gate G0 — Intake

- [ ] Brief del SOP completado y firmado digitalmente (email o Doc)
- [ ] Scope Standard/Premium explícito
- [ ] Fechas y rondas de revisión acordadas
- [ ] Accesos mínimos recibidos (ver matriz por servicio)

### Gate G1 — Kick-off

- [ ] Cliente creado en NELVYON OS
- [ ] Proyecto + tareas SOP creadas
- [ ] Carpeta Drive/Notion del proyecto con estructura estándar
- [ ] Freelancer confirmó lectura del SOP

### Gate G2 — Pre-entrega interna

- [ ] Checklist SOP específico completado por freelancer
- [ ] Evidencias subidas (OS entregables + Drive)
- [ ] Sin ítems **Bloqueante** abiertos

### Gate G3 — QA NELVYON

- [ ] Revisor distinto al ejecutor
- [ ] Muestreo 100% ítems críticos (ver §5)
- [ ] Informe QA corto: `APROBADO` / `APROBADO CON OBSERVACIONES` / `RECHAZADO`

### Gate G4 — Entrega cliente

- [ ] Pack entregables según SOP
- [ ] Email handoff con enlaces y próximos pasos
- [ ] Registro en OS entregable `published` o `approved` según visibilidad

### Gate G5 — Cierre

- [ ] Aceptación cliente documentada
- [ ] Horas y desviaciones registradas (mejora continua)
- [ ] Lecciones aprendidas opcional si hubo retrabajo > 15%

---

## 5. Ítems críticos transversales (siempre revisar)

| # | Ítem | Aplica a |
|---|------|----------|
| C1 | Brief coincide con lo entregado (scope) | Todos |
| C2 | Marca respetada (logo, colores, tono) | Web, Landing, Chatbot, Ads |
| C3 | Mobile verificado | Web, Landing, Ads destino |
| C4 | Legal: privacidad/cookies enlazadas si hay captura datos | Web, Landing, Chatbot, Ecom |
| C5 | Tracking/analytics documentado | Web, Landing, Ads |
| C6 | Credenciales y accesos no expuestos en entregables | Todos |
| C7 | Ortografía y consistencia idioma acordado | Todos |
| C8 | Cliente puede operar sin NELVYON (handoff claro) | Todos |

---

## 6. Matriz de accesos mínimos por servicio

| Servicio | Accesos antes de kick-off |
|----------|---------------------------|
| Web corporativa | Dominio/DNS o hosting, assets marca, copy o fuentes |
| Landing pages | Igual + fuente tráfico prevista, objetivo conversión |
| Chatbots IA | Web URL, FAQs, política privacidad, OpenAI coste asumido |
| SEO | GSC + GA4 editor, CMS o FTP si on-page |
| Google Ads | Cuenta Ads editor, GA4, landing final |
| Meta Ads | BM admin, pixel/CAPI, página IG/FB, creatividades o brief |

**Sin accesos → proyecto en `INTAKE`, no en `PRODUCCIÓN`.**

---

## 7. Sistema de severidad en checklist

| Nivel | Símbolo | Acción |
|-------|---------|--------|
| **Bloqueante** | 🔴 | No entregar hasta resolver |
| **Mayor** | 🟠 | Resolver antes de entrega o waiver firmado por Account |
| **Menor** | 🟡 | Documentar; corregir en soporte si contratado |
| **Observación** | 🔵 | Mejora; no bloquea |

---

## 8. Plantilla informe QA (copiar por proyecto)

```markdown
# Informe QA — [SERVICIO] — [CLIENTE] — [FECHA]

**Proyecto OS:** [ID / nombre]
**Freelancer:** [nombre]
**Revisor QA:** [nombre]
**Tier:** Standard / Premium

## Resultado global
[ ] APROBADO  [ ] APROBADO CON OBSERVACIONES  [ ] RECHAZADO

## Checklist SOP
- Ítems totales: __
- Bloqueantes abiertos: __
- Referencia checklist: [enlace Drive/OS]

## Ítems críticos C1–C8
| ID | OK | Notas |
|----|----|-------|
| C1 | | |
...

## Hallazgos
1. ...
2. ...

## Acciones requeridas antes de entrega
- [ ] ...

## Firma revisor
Nombre / Fecha
```

---

## 9. Gestión de revisiones cliente

| Tier | Rondas incluidas | Plazo respuesta cliente | Plazo implementación NELVYON |
|------|------------------|-------------------------|----------------------------|
| Standard | 2 | 5 días laborables | 3 días laborables por ronda |
| Premium | 4 | 3 días laborables | 2 días laborables por ronda |

**Fuera de scope:** change request nuevo → presupuesto aparte.

---

## 9.1 Retrabajo y escalación

| Situación | Acción |
|-----------|--------|
| QA rechaza 2 veces mismo ítem | Escalar a Account + sustituto freelancer |
| Cliente no responde revisiones | Pausar SLA; recordatorio día 3 y 5 |
| Acceso revocado mid-project | Estado `PAUSADO`; facturación según contrato |
| Error legal/compliance (claims, GDPR) | Stop inmediato; revisión Account |

---

## 10. Estructura carpeta proyecto (Drive / Notion)

```
/[CLIENTE]-[SERVICIO]-[AÑO]/
  00-admin/          contrato, brief firmado
  01-brief/          brief + referencias cliente
  02-work-in-progress/
  03-qa/             checklists + informe QA
  04-entregables/    finales versionados
  05-handoff/        manual, credenciales (caja segura)
  06-comms/          emails cliente relevantes
```

---

## 11. Integración con NELVYON OS (sin modificar código)

| Paso operativo | Ruta / objeto OS |
|----------------|------------------|
| Cliente | `/os/clientes` → `os_clients` |
| Proyecto servicio | `/os/proyectos` → vinculado a cliente |
| Tareas por fase SOP | `/os/tareas` → una tarea por fase del SOP |
| Entregables | `/os/entregables` → upload ZIP/PDF/informe |
| Evidencia QA interna | Entregable `internal` + checklist Drive |
| Entrega cliente | Entregable `client_visible` + portal si aplica |
| Preview premium (QA ingeniería) | `/os/web-premium/preview`, `/os/seo-premium/preview`, `/os/ads-premium/preview`, `/os/bots-premium/preview` |

**Convención naming entregables OS:**

`[CLIENTE]-[SERVICIO]-[TIPO]-v[N].[ext]`

Ejemplo: `Acme-WEB-sitemap-v1.pdf`

---

## 12. Índice SOPs Phase 1

| Servicio | Documento |
|----------|-----------|
| Web corporativa | `WEB_SOP.md` |
| Landing pages | `LANDING_SOP.md` |
| Chatbots IA | `CHATBOT_SOP.md` |
| SEO | `SEO_SOP.md` |
| Google Ads | `GOOGLE_ADS_SOP.md` |
| Meta Ads | `META_ADS_SOP.md` |

---

## 13. Métricas QA (revisión mensual)

| Métrica | Meta Phase 1 |
|---------|--------------|
| Entregas sin bloqueante en primera QA | ≥ 70% |
| Retrabajo post-entrega (< 30 días) | < 10% proyectos |
| Tiempo medio QA interno | < 4 h por proyecto |
| Checklist completo archivado | 100% |

---

## 14. Aprobación y excepciones

Solo **Account Manager** puede firmar waiver de ítem 🔴 con:

- Justificación escrita
- Riesgo aceptado por cliente (email)
- Fecha límite corrección si aplica

---

*Sistema QA v1.0 — NELVYON SERVICES Phase 1. Referencia: `docs/SERVICES_MASTER_PLAN.md`.*
