# DENTAL_AGENT — Agentes autónomos sector Dentistas

**Sector ID:** `dental`  
**Scoring autonomía:** **82/100**  
**Sensibilidad:** Alta | **Regulado:** Sí | **ESCALATE_OPERATOR:** Sí tras QA pass

---

## Perfil cliente ideal

Clínica dental privada 1–3 sedes, España/LATAM, ticket medio €150–800, 2+ sillones, recepción digital, captación Google/Instagram, sin call center dedicado.

## Dolores principales

1. Huecos en agenda y no-shows (15–25% citas)
2. Consultas WhatsApp sin filtrar (precio/tratamiento/dolor)
3. Web antigua sin CTA reserva online
4. Pocas reseñas Google vs competencia local
5. Pacientes comparan precio sin entender valor clínico

## Ofertas ganadoras

| Oferta | Tier | CTA |
|--------|------|-----|
| Primera visita / revisión gratuita | Starter | Reservar cita |
| Blanqueamiento pack verano | Pro | Solicitar valoración |
| Ortodoncia invisible consulta sin compromiso | Pro | Agendar estudio |
| Urgencias dentales mismo día | Premium | Llamar ahora |

## Landings recomendadas

- **Framework:** PAS (miedo dolor → solución sin dolor → prueba social → CTA único)
- **Secciones:** Hero + beneficios 3 + tratamientos destacados + equipo + reseñas + FAQ + mapa
- **Plantilla:** `landing-cro-v2-health`, `aceternity-clinic`
- **CTA único:** Reservar cita / Primera visita gratis

## Estructura SEO

| Tipo | Keywords ejemplo |
|------|------------------|
| Local | dentista [ciudad], clínica dental [barrio] |
| Tratamiento | implantes dentales [zona], ortodoncia invisible [ciudad] |
| Intención | blanqueamiento dental precio, dentista urgencias |
| Schema | LocalBusiness + MedicalBusiness + FAQ |

## Campañas Google Ads

- **Search:** tratamientos high-intent + extensión llamada + ubicación
- **RSA:** 3 anuncios por tratamiento (implantes, ortodoncia, blanqueamiento)
- **Extensiones:** llamada, ubicación, enlaces sitelink (tratamientos, equipo, contacto)
- **Negativas:** empleo, curso, universidad, barato gratis sin intención

## Campañas Meta Ads

- **Objetivo:** Leads formulario cita
- **Creatividades:** Testimonios video (sin claims médicos), antes/después moderado
- **Audiencias:** 3–8 km clínica, intereses salud dental, lookalike pacientes
- **Retargeting:** visitantes web 30d sin conversión

## Chatbot recomendado

- **Nombre:** Asistente [Clínica]
- **Tono:** Cercano profesional
- **FAQs mín:** 15 (Starter) — horarios, tratamientos generales, seguros, ubicación, parking
- **Prohibido:** Diagnóstico, prescripción, precio exacto sin cita
- **Handoff:** Recepción email/teléfono en horario
- **Disclaimer:** "Información orientativa, no sustituye consulta médica"
- **Plantilla:** `chatbot-dental-v1`

## Automatizaciones recomendadas

1. Recordatorio cita SMS 24h + 2h antes
2. Reseña Google automática post-visita (48h)
3. Nurturing ortodoncia (secuencia 5 emails)
4. No-show → reagendar WhatsApp

## Objeciones típicas

| Objeción | Respuesta chatbot/copy |
|----------|------------------------|
| ¿Duele? | Técnicas de sedación/anestesia, confort del equipo |
| ¿Cuánto cuesta? | Valoración personalizada en primera visita |
| ¿Aceptáis seguro? | Listar mutuas; confirmar en recepción |

## QA específico

| ID | Check | Bloqueante |
|----|-------|------------|
| DEN-QA-01 | Disclaimer sanitario visible | Sí |
| DEN-QA-02 | Sin diagnóstico en chatbot | Sí |
| DEN-QA-03 | CTA único reserva | Sí |
| DEN-QA-04 | Política privacidad RGPD | Sí |
| DEN-QA-05 | Sin promesa resultado garantizado | Sí |

## Plantillas necesarias

- `landing-cro-v2-health`
- `chatbot-dental-v1`
- `aceternity-clinic`
- Email: recordatorio cita, post-visita reseña

## Compliance

- Revisión operador + responsable clínico antes de publicar
- No claims "100% sin dolor" ni resultados garantizados
- Colegio profesional / depósito legal según país
