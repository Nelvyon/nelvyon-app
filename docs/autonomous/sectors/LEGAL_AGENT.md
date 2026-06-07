# LEGAL_AGENT — Agentes autónomos sector Abogados

**Sector ID:** `legal`  
**Scoring autonomía:** **75/100**  
**Sensibilidad:** Alta | **Regulado:** Sí | **ESCALATE_OPERATOR:** Siempre tras QA pass

---

## Perfil cliente ideal

Despacho 2–15 abogados, especialidad clara (laboral, familia, penal, mercantil), zona geográfica definida, facturación €200k–2M, captación digital incipiente.

## Dolores principales

1. Leads de baja calidad (curiosos sin caso)
2. Web genérica sin especialidad diferenciada
3. Miedo cliente al coste inicial
4. Competencia con "abogado gratis" engañoso
5. Seguimiento manual de consultas

## Ofertas ganadoras

| Oferta | Tier | CTA |
|--------|------|-----|
| Consulta inicial 30 min | Starter | Solicitar consulta |
| Guía gratuita del proceso (PDF) | Starter | Descargar guía |
| Honorarios transparentes por fase | Pro | Ver tarifas orientativas |
| Videollamada confidencial | Pro | Agendar llamada |

## Landings recomendadas

- **Framework:** Autoridad + especialidad + casos anonimizados + CTA consulta
- **Secciones:** Hero especialidad + credenciales + proceso 3 pasos + FAQ legal + testimonios + formulario confidencial
- **Plantilla:** `landing-cro-v4-trust`, `proactiv-legal`

## Estructura SEO

| Tipo | Keywords |
|------|----------|
| Local + especialidad | abogado divorcio [ciudad], despacho laboral [zona] |
| Intención | despido improcedente abogado, herencia impugnar |
| Contenido | guías proceso (blog/support) |
| Schema | LegalService + Attorney + FAQ |

## Campañas Google Ads

- Search high-intent por especialidad
- Extensión llamada en horario oficina
- Formulario confidencial (sin datos caso sensible en URL)
- Negativas: gratis, curso abogacía, empleo

## Campañas Meta Ads

- Carousel educativo (5 mitos [especialidad])
- Lead magnet guía PDF
- Retargeting visitantes 14d
- Sin prometer % éxito

## Chatbot recomendado

- Calificación: área legal, urgencia, jurisdicción
- Captura contacto para callback
- **Prohibido:** Asesoramiento jurídico, interpretación leyes, estrategia caso
- Disclaimer: "No constituye asesoramiento legal"
- Plantilla: `chatbot-legal-v1`

## Automatizaciones

1. Email secuencia post-consulta (documentos necesarios)
2. Recordatorio cita videollamada
3. CRM etapas: consulta → estudio → propuesta → firma

## Objeciones típicas

| Objeción | Respuesta |
|----------|-----------|
| ¿Cuánto cuesta? | Honorarios tras estudio inicial del caso |
| ¿Ganaré? | Sin prometer resultado; experiencia en casos similares |
| ¿Cuánto tarda? | Rangos orientativos por tipo de procedimiento |

## QA específico

| ID | Check | Bloqueante |
|----|-------|------------|
| LEG-QA-01 | Disclaimer no asesoramiento | Sí |
| LEG-QA-02 | Sin % éxito ni garantía | Sí |
| LEG-QA-03 | RGPD datos sensibles | Sí |
| LEG-QA-04 | Colegio abogados / normativa publicidad | Sí |

## Plantillas

- `landing-cro-v4-trust`, `chatbot-legal-v1`, guía PDF lead magnet

## Compliance

**ESCALATE_OPERATOR obligatorio** — revisión abogado responsable antes de cualquier publicación.
