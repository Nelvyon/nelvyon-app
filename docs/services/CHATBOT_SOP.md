# Chatbots IA — SOP operativo

**SKU:** `NELVYON-CHATBOT`  
**Versión SOP:** 1.0  
**Fase:** SERVICES-PHASE-1  
**Referencia QA:** `SERVICES_QA_MASTER.md`

---

## Resumen

Asistente conversacional IA embebible en web del cliente: FAQs, captura leads y handoff humano.

| Tier | Canales | Plazo | Revisiones |
|------|---------|-------|------------|
| **Standard** | Web widget | 8–12 días laborables | 2 |
| **Premium** | Web + Messenger/IG DM | 18–25 días laborables | 4 |

---

## 1. SOP paso a paso

### Fase 0 — Intake (Día 0–2) · Account

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 0.1 | Brief §3 + confirmar coste API OpenAI asumido por cliente | Brief firmado |
| 0.2 | Acceso dashboard NELVYON o workspace cliente | Invitación enviada |
| 0.3 | OS proyecto `CHATBOT-[CLIENTE]` | Creado |
| 0.4 | Kick-off 45 min: tono, límites, compliance | Acta |

### Fase 1 — Discovery conversacional (Día 2–4) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 1.1 | Inventariar top 30 preguntas reales (cliente + soporte) | `faq-inventory.xlsx` |
| 1.2 | Definir personalidad bot (nombre, tono, límites) | `persona-1pager.md` |
| 1.3 | Mapear intents: info, lead, soporte, handoff | Diagrama Miro |
| 1.4 | Identificar datos sensibles **prohibidos** en respuestas | Lista roja |
| 1.5 | **Aprobación cliente** persona + intents | Email |

### Fase 2 — Knowledge base (Día 4–7) · Freelancer + cliente

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 2.1 | Curar fuentes: web, PDFs, scripts aprobados | Carpeta `kb-sources/` |
| 2.2 | Redactar respuestas canónicas top 20 FAQs | `kb-responses.md` |
| 2.3 | Definir respuestas fallback y escalación | Doc fallback |
| 2.4 | **Ronda revisión 1** contenido KB | Comentarios cliente |

### Fase 3 — Configuración (Día 7–10) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 3.1 | Crear bot en NELVYON `chatbot_service` / dashboard | ID bot |
| 3.2 | System prompt + behaviors según persona | Export config JSON |
| 3.3 | Flujo captura lead (campos, validación, webhook/CRM) | Test lead |
| 3.4 | Configurar handoff humano (email/livechat si aplica) | Test handoff |
| 3.5 | Generar snippet embed | Código en handoff doc |
| 3.6 | Staging en URL test del cliente | Screenshot |

### Fase 4 — QA conversacional (Día 10–11) · Freelancer + QA

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 4.1 | Ejecutar batería 50 preguntas §Anexo | Hoja resultados |
| 4.2 | Probar edge cases: insultos, off-topic, idioma mixto | Log |
| 4.3 | Verificar consentimiento GDPR si pide email/tel | Copy consent OK |
| 4.4 | Checklist §5 + informe QA G3 | APROBADO |

### Fase 5 — Soft launch (Día 11–12) · Freelancer

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 5.1 | Embed en web staging → 10% tráfico o página test | Analytics |
| 5.2 | Monitor 48h logs; ajustar prompts | Changelog v1.1 |
| 5.3 | Go 100% producción | URL live |

### Fase 6 — Handoff (Día 12–14) · Account

| Paso | Acción | Evidencia |
|------|--------|-----------|
| 6.1 | Pack entregables §4 | OS `client_visible` |
| 6.2 | Formación cliente 2h: editar FAQs, ver leads | Loom + call |
| 6.3 | 14 días tune incluido (ajustes menores prompts) | Ticket log |

### Fase 7 — Premium multicanal (Día 14–25)

| Paso | Acción |
|------|--------|
| 7.1 | Conectar Messenger / Instagram según accesos Meta |
| 7.2 | Unificar tono cross-canal |
| 7.3 | QA 30 preguntas por canal |

---

## 2. Brief de cliente

**Empresa:** _______________ **Web:** _______________

### A. Objetivos

1. Objetivo principal bot: [ ] Leads [ ] FAQ soporte [ ] Pre-venta [ ] Otro ___
2. KPI éxito (ej. 20 leads/mes, -30% tickets L1):
3. Horario handoff humano: _______________

### B. Audiencia y tono

4. Quién habla con el bot (perfil):
5. Tono: [ ] Formal [ ] Cercano [ ] Técnico [ ] Divertido
6. Nombre del bot: _______________
7. Idiomas: [ ] ES [ ] EN [ ] Bilingüe automático

### C. Contenido

8. Top 10 preguntas que debe responder bien:
9. Documentos/fuentes para knowledge base (adjuntar):
10. Temas **prohibidos** (precios custom, diagnóstico médico, etc.):
11. ¿Existe equipo humano de soporte? [ ] Sí [ ] No — email handoff: ___

### D. Técnico

12. URL web embed: _______________
13. CRM destino leads: _______________
14. Campos lead obligatorios: [ ] Nombre [ ] Email [ ] Tel [ ] Empresa [ ] Otro ___
15. Tier: [ ] Standard web [ ] Premium multicanal
16. Sector regulado (salud, legal, finanzas): [ ] Sí [ ] No

### E. Legal

17. Política privacidad URL: _______________
18. Consentimiento explícito datos: [ ] Requerido [ ] No aplica

**Firma:** _______________

---

## 3. Entregables exactos

| # | Entregable | Formato |
|---|------------|---------|
| E1 | Inventario FAQs + intents | XLSX |
| E2 | Persona y guía tono | PDF |
| E3 | Knowledge base curada | MD + fuentes |
| E4 | Bot configurado en NELVYON | ID + dashboard link |
| E5 | Snippet embed código | HTML block |
| E6 | Hoja resultados 50 preguntas QA | XLSX |
| E7 | Manual operación (editar KB, ver leads) | PDF 8–12 pp |
| E8 | Informe métricas 7 días post-launch | PDF |
| E9 | Config export backup | JSON |
| E10 | Guía handoff humano | PDF 2 pp |

**Premium:** E11 Messenger/IG conectado + doc específico canal.

---

## 4. Criterios de aceptación

| ID | Criterio |
|----|----------|
| A1 | ≥ 18/20 preguntas top FAQ responden correctamente (batería §Anexo) |
| A2 | Fallback no entra en loop (>2 veces misma respuesta) |
| A3 | Captura lead envía a destino acordado en < 60s |
| A4 | Handoff humano dispara con frase acordada o botón |
| A5 | Consentimiento visible antes de guardar email si GDPR |
| A6 | Latencia percibida < 8s en 90% preguntas test |
| A7 | Widget visible y funcional en URL producción cliente |
| A8 | Sin alucinaciones en pricing/legal (0 fallos en 10 preguntas trampa) |

---

## 5. Checklist de calidad

- [ ] 🔴 System prompt alinea tono marca
- [ ] 🔴 KB solo fuentes aprobadas por cliente
- [ ] 🔴 No inventa precios, plazos ni garantías no documentadas
- [ ] 🔴 Escalación humana probada
- [ ] 🔴 Embed no rompe layout mobile
- [ ] 🟠 Mensaje bienvenida claro (qué puede/no puede hacer)
- [ ] 🟠 Botón cerrar/minimizar accesible
- [ ] 🟠 Logs revisables por cliente o NELVYON
- [ ] 🟡 Respuesta empática en frustración usuario
- [ ] 🔴 Preview `/os/bots-premium/preview` checklist revisado
- [ ] 🔴 QA G3 APROBADO

---

## 6. Herramientas obligatorias

| Herramienta | Uso |
|-------------|-----|
| NELVYON `chatbot_service` | Runtime bot |
| Dashboard `/dashboard/chatbot` | CRUD, stats, embed |
| BotsPremiumAgent (opcional) | Borrador estrategia |
| `/os/bots-premium/preview` | QA interno |
| OpenAI API (backend) | Inferencia — key en API Railway |
| Miro / FigJam | Mapa intents |
| Google Sheets | Batería 50 preguntas |
| Loom | Evidencia tests |

---

## 7. Tiempos

| | Standard | Premium |
|---|----------|---------|
| **Total** | 8–12 D | 18–25 D |
| Discovery + KB | 4 D | 6 D |
| Config + QA | 4 D | 6 D |
| Launch + handoff | 2 D | 4 D |
| Multicanal | — | 8 D |

---

## 8. Perfil freelancer ideal

- **Rol:** Conversational designer / chatbot implementer
- **Experiencia:** 2+ años bots lead-gen B2B
- **Skills:** Prompt engineering, flow design, GDPR awareness
- **Portfolio:** Bots live con métricas sesión/resolución
- **Plus:** Sector regulado (disclaimers, no consejo médico/legal)

---

## 9. Riesgos frecuentes

| Riesgo | Mitigación |
|--------|------------|
| Alucinaciones pricing | KB estricta; lista roja; test trampa |
| Bot responde fuera horario sin handoff | Mensaje horario + email async |
| Cliente no mantiene KB | Manual edición + 14d tune |
| Coste OpenAI impredecible | Límite tokens; modelo acordado |
| Embed bloqueado por CSP cliente | Coordinar con dev cliente pre-launch |
| Datos personales sin consent | Copy consent obligatorio EU |

---

## 10. Flujo dentro de NELVYON OS

```
1. /os/clientes → cliente
2. /os/proyectos → "CHATBOT [Nombre bot]"
3. /os/tareas:
   T1 Discovery | T2 KB | T3 Config | T4 QA 50q | T5 Launch | T6 Handoff
4. /os/entregables:
   - D1 Estrategia bot PDF (internal)
   - D2 Manual operación (client_visible)
   - D3 Informe métricas 7d (client_visible)
5. Producto técnico: dashboard chatbot (fuera OS shell — congelado)
6. QA: /os/bots-premium/preview + batería 50 preguntas
7. security_events source=os si errores portal (referencia ops)
```

---

## Anexo — Batería 50 preguntas (plantilla)

Categorías: 20 FAQ negocio | 10 edge off-topic | 10 lead capture | 5 handoff | 5 trampa legal/pricing

Registrar: Pregunta | Respuesta esperada | OK/FAIL | Notas

---

*SOP v1.0 — NELVYON SERVICES · Chatbots IA*
