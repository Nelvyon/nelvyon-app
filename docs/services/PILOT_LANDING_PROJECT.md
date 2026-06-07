# Piloto interno SERVICES-PHASE-1 — Landing Page

**Versión:** 1.0  
**Servicio:** Landing pages (`NELVYON-LANDING`)  
**Tipo:** Piloto interno (cliente ficticio, proceso real)  
**Referencias:** `LANDING_SOP.md`, `SERVICES_QA_MASTER.md`  
**Estado código:** OS/SaaS congelado — solo ejecución operativa.

---

## 1. Propósito del piloto

Validar de punta a punta el sistema SERVICES Phase 1:

- Brief → producción freelancer → QA NELVYON → entrega → **aprobación/rechazo en portal cliente**
- Trazabilidad en NELVYON OS (cliente, proyecto, tareas, entregables)
- Sin código nuevo; sin cliente comercial real (equipo NELVYON actúa como cliente)

**Éxito del piloto** = flujo completo documentado con evidencias y lecciones aprendidas para el segundo piloto comercial.

---

## 2. Cliente ficticio

| Campo | Valor |
|-------|-------|
| **Nombre comercial** | VerdeNova Energía |
| **Sector** | Instalación placas solares residenciales (España) |
| **Propuesta de valor** | Ahorro 40% factura luz + instalación en 21 días + financiación 0% |
| **Contacto ficticio** | Elena Morales — Directora Comercial |
| **Email piloto** | `elen.morales.pilot@nelvyon.test` *(usar email real del revisor que simula cliente)* |
| **Web existente** | `https://verdenova-pilot.nelvyon.test` *(staging o dominio test)* |

> **Nota piloto:** Crear el cliente en OS con nombre **VerdeNova Energía**. El email de invitación portal debe ser uno que controles (tu bandeja), para probar approve/reject.

---

## 3. Objetivo del proyecto

| Elemento | Definición |
|----------|------------|
| **Nombre proyecto OS** | `LANDING-VerdeNova-LeadGen-Q2-2026` |
| **Objetivo negocio** | Captar leads cualificados (solicitud estudio gratuito) |
| **KPI piloto** | Formulario enviado + thank-you OK + 1 aprobación portal |
| **Fuente tráfico simulada** | Meta Ads (campaña ficticia “Verano sin factura”) |
| **Tier contratado** | **Standard** (1 landing, 2 rondas revisión, sin A/B) |
| **CTA único** | “Solicitar estudio gratuito” |

---

## 4. Briefing completo (rellenado — listo para kick-off)

### A. Oferta

1. **Producto/servicio:** Instalación fotovoltaica residencial llave en mano.  
2. **Precio:** Desde 4.900 € (financiación 60 meses sin intereses — sujeto a estudio).  
3. **Promoción:** “Verano 2026: estudio gratuito + simulación ahorro en 48 h”.  
4. **Objetivo conversión:** [x] Lead form — campos: Nombre, Email, Teléfono, Código postal.

### B. Audiencia

5. **Perfil:** Propietarios vivienda unifamiliar, 35–65 años, factura luz > 80 €/mes, España peninsular.  
6. **Objeción #1:** “Es caro y no sé si amortiza.”  
7. **Fuente tráfico:** [x] Meta Ads (simulada en piloto).

### C. Contenido y marca

8. **Headline deseado (orientativo):** “Reduce tu factura de la luz hasta un 40%”.  
9. **Prueba social:** “+320 instalaciones en 2025” · Valoración 4,8/5 Google · Logos certificación (placeholder).  
10. **Assets:** Logo VerdeNova (PNG ficticio en Drive piloto), foto tejado solar stock.  
11. **Referencias landing:**  
    - https://www.sunhero.es/ (estructura clara)  
    - https://www.holaluz.com/ (tono cercano)  
    - Evitar: páginas con 5 CTAs distintos.

### D. Técnico

12. **URL destino piloto:** `https://[TU-DOMINIO]/pilot/verdenova-estudio` o subdominio staging.  
13. **Destino leads:** Email `piloto-landing@nelvyon.com` o webhook test.  
14. **Pixels piloto:** [x] Meta (pixel test) [x] GA4 (property test) — documentar IDs en handoff.  
15. **Tier:** [x] Standard.

### E. Legal

16. **Claims permitidos:** Ahorro estimado con disclaimer “según consumo y ubicación”.  
17. **Claims prohibidos:** “Gratis la instalación”, garantías legales no verificadas.  
18. **Sector regulado:** No.

**Aprobación brief piloto:** Account NELVYON — fecha: _______________

---

## 5. Tareas a crear en NELVYON OS

Crear en orden tras cliente **VerdeNova Energía**:

### 5.1 Cliente

| Acción | Ruta | Datos |
|--------|------|-------|
| Crear cliente | `/os/clientes/nuevo` | Nombre: VerdeNova Energía · Status: active · Email contacto: elen.morales.pilot@… |

### 5.2 Proyecto

| Campo | Valor |
|-------|-------|
| Ruta | `/os/proyectos/nuevo` |
| Nombre | `LANDING-VerdeNova-LeadGen-Q2-2026` |
| Cliente | VerdeNova Energía |
| Status | active |
| Descripción | Piloto SERVICES Phase 1 · Landing lead gen Meta · Tier Standard |

### 5.3 Tareas (una por fase SOP)

Crear en `/os/tareas/nuevo`, vinculadas al proyecto y cliente:

| ID | Título tarea | Fase SOP | Responsable | Plazo relativo |
|----|--------------|----------|-------------|----------------|
| T1 | Estrategia y outline landing | Fase 1 | Freelancer | Día 1–2 |
| T2 | Copy landing + thank-you | Fase 2 | Freelancer | Día 2–4 |
| T3 | Diseño UI (Figma) | Fase 3 | Freelancer | Día 4–6 |
| T4 | Build + staging URL | Fase 4 | Freelancer | Día 6–8 |
| T5 | QA interno + Loom test | Fase 5 | Freelancer + QA | Día 8–9 |
| T6 | Launch URL producción piloto | Fase 6 | Freelancer | Día 9–10 |
| T7 | Invitación portal + publicar entregable | Account | Día 10 | Account |
| T8 | Revisión cliente portal (simulada) | Cliente piloto | Día 10–11 | Tú (como Elena) |

Marcar cada tarea `completed` al cerrar la fase y adjuntar enlace Drive/OS en descripción.

### 5.4 Entregables OS (`/os/entregables`)

| ID | Título entregable | Tipo | Visibility inicial | Cuándo |
|----|-------------------|------|--------------------|--------|
| D1 | Estrategia 1 pág VerdeNova | PDF | internal | Tras T1 |
| D2 | Copy completo landing | PDF/DOC | internal | Tras T2 |
| D3 | Figma diseño aprobado | Link + PDF | internal | Tras T3 |
| D4 | URL staging landing | URL en descripción | internal | Tras T4 |
| D5 | **Pack final landing live** | URL + ZIP assets | **client_visible** | Tras T6 + QA G3 |
| D6 | Informe handoff UTMs/pixels | PDF | client_visible | Con D5 |

**Workflow entregable D5 (operador OS):**

1. Crear entregable vinculado a proyecto VerdeNova.  
2. Subir ZIP evidencias si aplica (`/os/entregables/{id}` → upload).  
3. En detalle entregable, ejecutar workflow: **Enviar a revisión** → **Entregar** → **Aprobar (interno)** → **Publicar**.  
4. Confirmar: `visibility = client_visible`, `status = published`.  
5. Solo entonces el portal muestra “Pending your review”.

---

## 6. Entregables esperados (pack piloto)

Alineados con `LANDING_SOP.md` §3:

| # | Entregable | Criterio mínimo piloto |
|---|------------|------------------------|
| E1 | Documento estrategia 1 pág | Avatar, objeción, CTA, framework copy |
| E2 | Copy completo + thank-you | Headline, bullets, FAQ 3 preguntas, CTA |
| E3 | Figma mobile + desktop | 1 frame móvil 375px aprobado internamente |
| E4 | URL landing HTTPS live | Formulario funcional |
| E5 | Thank-you page | Mensaje confirmación + expectativa 48h |
| E6 | Guía UTMs (tabla) | 3 UTMs ejemplo campaña Meta |
| E7 | Video Loom test conversión | 2 min, submit real visible |

**Ubicación:** carpeta Drive `PILOT-VerdeNova-LANDING/` + entregables D1–D6 en OS.

---

## 7. Checklist QA aplicable

### 7.1 Gates globales (`SERVICES_QA_MASTER.md`)

- [ ] G0 Brief §4 completo  
- [ ] G1 Cliente + proyecto + 8 tareas OS creadas  
- [ ] G2 Checklist landing freelancer sin 🔴 abiertos  
- [ ] G3 Informe QA NELVYON = APROBADO  
- [ ] G4 D5 published + email handoff  
- [ ] G5 Aceptación portal documentada  

### 7.2 Checklist landing (`LANDING_SOP.md` §5)

- [ ] 🔴 Mensaje oferta claro en 5 segundos  
- [ ] 🔴 Un solo CTA principal  
- [ ] 🔴 Mobile-first sin roturas (375px)  
- [ ] 🔴 Formulario probado — lead recibido  
- [ ] 🔴 HTTPS activo  
- [ ] 🟠 Prueba social presente (+320 instalaciones)  
- [ ] 🟠 FAQ responde objeción “amortización”  
- [ ] 🟠 Política privacidad enlazada  
- [ ] 🟡 OG tags básicos  
- [ ] 🔴 QA G3 APROBADO  
- [ ] 🔴 Entregable D5 en OS publicado  

### 7.3 Ítems críticos transversales (C1–C8)

| ID | Piloto VerdeNova — verificar |
|----|------------------------------|
| C1 | Landing coincide con brief (un CTA, lead form) |
| C2 | Colores/logo VerdeNova coherentes |
| C3 | Mobile verificado en dispositivo real |
| C4 | Privacidad enlazada (form captura datos) |
| C5 | GA4/pixel documentados en E6 |
| C6 | Sin credenciales en ZIP público |
| C7 | Copy ES sin errores graves |
| C8 | Handoff: URL + cómo ver leads |

---

## 8. Criterios de éxito del piloto

| # | Criterio | Evidencia |
|---|----------|-----------|
| S1 | 8 tareas OS creadas y ≥ 6 completadas | Screenshots OS |
| S2 | URL landing live con form OK | Loom E7 |
| S3 | QA G3 firmado APROBADO | PDF informe QA |
| S4 | Entregable D5 `published` + `client_visible` | Detalle OS |
| S5 | Usuario portal invitado y activo | Invite aceptada |
| S6 | **Aprobación o rechazo** ejecutada en portal | Status `approved_by_client` o `changes_requested` |
| S7 | Si rechazo: feedback visible en OS + segunda publicación | Historial review |
| S8 | Tiempo total ≤ 12 días laborables (tolerancia piloto) | Log fechas |
| S9 | Post-mortem 1 pág completado | §12 este doc |

**Piloto GO** si S1–S6 cumplidos. S7 deseable (probar ambos caminos en dos entregables si hay tiempo).

---

## 9. Tiempos estimados (piloto Standard)

| Fase | Días laborables | Acumulado |
|------|-----------------|-----------|
| Setup OS + brief (Account) | 0,5 | D0 |
| T1 Estrategia | 1,5 | D1–2 |
| T2 Copy | 2 | D2–4 |
| T3 Diseño | 2 | D4–6 |
| T4 Build | 2 | D6–8 |
| T5 QA | 1,5 | D8–9 |
| T6 Launch + T7 Portal | 1 | D9–10 |
| T8 Revisión cliente | 1 | D10–11 |
| **Total** | **10–11 D** | |

Buffer piloto: +2 D para imprevistos → **máx. 12 D**.

---

## 10. Qué debe hacer el freelancer

1. **Leer** `LANDING_SOP.md` completo antes del kick-off.  
2. **Asistir** kick-off 30 min (Account explica piloto interno).  
3. **Ejecutar** fases 1–6 del SOP para VerdeNova según brief §4.  
4. **Documentar** en Drive cada entregable E1–E7.  
5. **Actualizar** tareas T1–T6 en OS con links y estado completed.  
6. **Completar** checklist §7.2 y enviar a QA antes de launch.  
7. **Grabar** Loom E7 (submit formulario de punta a punta).  
8. **No** publicar D5 como `client_visible` — eso lo hace Account tras QA G3.  
9. **Participar** en post-mortem §12 (15 min).

**Freelancer piloto sugerido:** copy+diseño híbrido con experiencia landing Meta lead gen.

---

## 11. Qué debe revisar NELVYON antes de entregar al cliente piloto

Responsable: **QA Lead** (distinto del freelancer). Revisar **antes** de T7 (publicar portal):

### Bloqueantes (no publicar si falla)

| Revisión | Qué mirar |
|----------|-----------|
| Scope | Una landing, un CTA, campos brief §4.D |
| Conversión | Loom E7: lead llega a destino |
| Mobile | 375px sin scroll horizontal |
| Legal | Disclaimer ahorro; sin claims prohibidos §4.E |
| Marca | Logo/colores VerdeNova aplicados |
| OS | D5 en draft/in_review — **no** published hasta QA OK |
| Seguridad | URL HTTPS; sin API keys en entregables |

### Revisión Account (antes handoff)

- [ ] Invitación portal creada: `/os/clientes/{id}` → Panel Portal → Invitar `elen.morales.pilot@…`  
- [ ] Email invite recibido; enlace `{FRONTEND}/client/accept-invite?token=…` funciona  
- [ ] Workflow D5 completo hasta `published`  
- [ ] Email handoff al “cliente” con URL landing + enlace portal  

### Plantilla informe QA (copiar)

```markdown
## QA Piloto VerdeNova — [FECHA]
Resultado: [ ] APROBADO [ ] RECHAZADO
Revisor: ___
Loom E7 revisado: [ ]
Checklist §7.2: __/11 ítems OK
Bloqueantes: ninguno / listar
```

---

## 12. Cómo usar el portal cliente para aprobar / rechazar

Flujo para el revisor interno que **simula** a Elena Morales (cliente ficticio).

### Paso A — Activar cuenta portal

1. Account crea invite en `/os/clientes/{verdenova-id}` → **Invitar portal**.  
2. Abrir email en bandeja de prueba.  
3. Ir a `/client/accept-invite?token=...`  
4. Definir contraseña y nombre **Elena Morales**.  
5. Login en `/client/sign-in` → redirección a `/portal`.

### Paso B — Ver entregable pendiente

1. En `/portal` o `/portal/deliverables` localizar **Pack final landing live** (D5).  
2. Badge esperado: **“Pending your review”** (`status = published`).  
3. Abrir `/portal/deliverables/{id}` — debe mostrar título, descripción, URL landing (si en descripción o metadata).

### Paso C — Aprobar

1. En panel revisión, opcional: comentario “Aprobado piloto — CTA claro”.  
2. Pulsar **Aprobar**.  
3. Verificar: status → `approved_by_client`; badge “Approved”.  
4. En OS (operador): entregable refleja `approved_by_client` y `client_reviewed_at`.

### Paso D — Rechazar (rama alternativa — recomendado probar en D6 o segunda versión)

1. Usar entregable de prueba o republicar D5 v2 tras reset manual en piloto.  
2. Pulsar **Rechazar** — **obligatorio** texto feedback, ej.:  
   > “El titular no menciona financiación 0%. Ajustar hero y FAQ.”  
3. Verificar: status → `changes_requested`; feedback visible en portal y metadata OS.  
4. Freelancer corrige → operador republica (`published` de nuevo) → cliente re-aprueba.

### APIs (referencia ops, no ejecutar manual salvo debug)

| Acción | Método | Ruta |
|--------|--------|------|
| Aprobar | POST | `/api/v1/portal/deliverables/{id}/approve` |
| Rechazar | POST | `/api/v1/portal/deliverables/{id}/reject` |

### Errores frecuentes portal

| Síntoma | Causa | Solución |
|---------|-------|----------|
| No aparece entregable | No `client_visible` o no `published` | Completar workflow operador |
| No botones approve/reject | Status no es `published` | Publicar desde OS |
| 404 en portal | Portal user de otro `client_id` | Invite en cliente VerdeNova correcto |
| Reject falla | Feedback vacío | Mínimo 10 caracteres |

---

## 13. Calendario sugerido (piloto)

| Día | Hito |
|-----|------|
| L | Brief validado + OS cliente/proyecto/tareas + kick-off |
| M–X | Estrategia + copy |
| J–L | Diseño Figma |
| M–X | Build staging |
| J | QA G3 + correcciones |
| V | Launch + invite portal + publicar D5 |
| L+1 | Aprobar/rechazar en portal + post-mortem |

---

## 14. Post-mortem piloto (completar al cierre)

| Pregunta | Respuesta |
|----------|-----------|
| ¿Tiempo real vs estimado? | |
| ¿Cuántos ítems checklist fallaron primera vez? | |
| ¿Portal approve/reject sin fricción? | |
| ¿Qué faltó en el brief? | |
| ¿SOP LANDING_SOP.md claro para freelancer? | |
| ¿Cambios sugeridos documentación? | |
| **Veredicto:** GO Phase 1 comercial / repetir piloto | |

**Responsable post-mortem:** Account NELVYON  
**Fecha cierre piloto:** _______________

---

## 15. Enlaces rápidos

| Recurso | Ruta |
|---------|------|
| SOP Landing | `docs/services/LANDING_SOP.md` |
| QA Master | `docs/services/SERVICES_QA_MASTER.md` |
| Master Plan | `docs/SERVICES_MASTER_PLAN.md` |
| Portal approvals | `docs/OS_PHASE1_PORTAL_APPROVALS.md` |
| Portal UI | `docs/OS_PHASE1_PORTAL_UI.md` |
| OS clientes | `/os/clientes` |
| OS entregables | `/os/entregables` |
| Portal cliente | `/portal` |

---

*Piloto interno v1.0 — NELVYON SERVICES Phase 1 · Landing VerdeNova*
