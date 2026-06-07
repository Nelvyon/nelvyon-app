# NELVYON SERVICES — Freelancer Scorecard

**Versión:** 1.0  
**Fase:** SERVICES-PHASE-2  
**Uso:** Evaluar freelancers tras cada proyecto; decisión re-contratación y certificación Partner.

---

## 1. Propósito

Objetivar la calidad del talento externo en entregas NELVYON SERVICES. Un scorecard por proyecto, agregado trimestral para ranking del pool.

**Quién completa:**

| Rol | Cuándo |
|-----|--------|
| QA Lead NELVYON | Tras Gate G3 (calidad) |
| Account / PM | Tras cierre proyecto (comunicación, plazos) |
| Cliente (opcional) | Encuesta 3 preguntas post-entrega |

---

## 2. Dimensiones y pesos

| Dimensión | Peso | Evalúa |
|-----------|------|--------|
| **Calidad** | 35% | Checklist SOP, retrabajo, criterios aceptación |
| **Velocidad** | 15% | Ritmo vs plan SOP |
| **Comunicación** | 20% | Proactividad, claridad, gestión expectativas |
| **Revisiones** | 15% | Eficiencia rondas feedback |
| **Cumplimiento plazos** | 15% | Entrega en fecha acordada |

**Puntuación final:** 0–100 (ponderada).

---

## 3. Escala por dimensión (1–5)

| Score | Calidad | Velocidad | Comunicación | Revisiones | Plazos |
|-------|---------|-----------|--------------|------------|--------|
| **5** | Supera estándar NELVYON | Adelantado sin sacrificar QA | Proactivo, cero sorpresas | 1ª ronda casi perfecta | Antes de fecha |
| **4** | Cumple SOP sin bloqueantes | En plan | Respuesta < 24h laborables | ≤2 rondas según tier | En fecha |
| **3** | Aceptable con observaciones menores | Ligero retraso recuperado | Respuesta 24–48h | Rondas extra justificadas | 1–3 D retraso |
| **2** | Bloqueantes corregidos tarde | Retraso significativo fases | Comunicación reactiva | Muchas idas/vuelta | 4–7 D retraso |
| **1** | Rechazo QA / entrega inaceptable | Paralización proyecto | Ghosting / malentendidos graves | No incorpora feedback | >7 D o incumplimiento |

---

## 4. Plantilla evaluación por proyecto

```markdown
# Scorecard — [FREELANCER] — [PROYECTO] — [FECHA]

**Servicio / SOP:** _______________
**Tier:** Starter / Professional / Premium
**Account:** _______________
**QA Lead:** _______________

## Puntuaciones (1–5)

| Dimensión | Nota | Peso | Ponderado |
|-----------|------|------|-----------|
| Calidad | /5 | 35% | |
| Velocidad | /5 | 15% | |
| Comunicación | /5 | 20% | |
| Revisiones | /5 | 15% | |
| Cumplimiento plazos | /5 | 15% | |
| **TOTAL** | | 100% | **/100** |

## Evidencia calidad
- Checklist SOP: __% ítems OK primera pasada
- QA G3: APROBADO / CON OBS / RECHAZADO
- Retrabajo horas: ___

## Evidencia plazos
- Fecha comprometida: ___
- Fecha entrega real: ___
- Desviación: ___ D

## Evidencia revisiones
- Rondas contratadas: ___
- Rondas usadas: ___
- Motivo rondas extra:

## Comentarios cualitativos
Fortalezas:
Áreas mejora:

## Recomendación
[ ] Certificar Partner  [ ] Re-contratar  [ ] Con reservas  [ ] No renovar
```

---

## 5. Cálculo puntuación final

**Fórmula:**

```
Ponderado dimensión = (Nota / 5) × 100 × Peso%

Puntuación final = Σ ponderados de las 5 dimensiones
```

**Ejemplo:**

| Dimensión | Nota | Peso | Cálculo | Puntos |
|-----------|------|------|---------|--------|
| Calidad | 4 | 35% | 80 × 0.35 | 28.0 |
| Velocidad | 5 | 15% | 100 × 0.15 | 15.0 |
| Comunicación | 4 | 20% | 80 × 0.20 | 16.0 |
| Revisiones | 3 | 15% | 60 × 0.15 | 9.0 |
| Plazos | 4 | 15% | 80 × 0.15 | 12.0 |
| **Total** | | | | **80.0** |

---

## 6. Umbrales y acciones

| Puntuación final | Clasificación | Acción NELVYON |
|------------------|---------------|----------------|
| **90–100** | Elite | Prioridad asignación; candidato Partner certificado |
| **80–89** | Sólido | Re-contratar; pool activo |
| **70–79** | Aceptable | Re-contratar con coaching; revisar SOP con freelancer |
| **60–69** | Riesgo | Solo proyectos Starter; mentoría obligatoria |
| **< 60** | No renovar | Baja del pool; post-mortem interno |

---

## 7. Certificación NELVYON Partner (opcional Phase 2+)

Requisitos acumulados (12 meses):

| Requisito | Umbral |
|-----------|--------|
| Proyectos completados | ≥ 3 |
| Puntuación media | ≥ 85 |
| Ningún proyecto < 70 | Obligatorio |
| Examen checklist SOP servicio | Aprobado ≥ 90% |
| NDA y contrato marco vigente | Sí |

**Beneficios Partner:** asignación prioritaria, badge interno, tarifa acordada pre-negociada.

---

## 8. Agregación trimestral

| Métrica pool | Meta Phase 2 |
|--------------|--------------|
| Media calidad pool | ≥ 4.0/5 |
| % proyectos en plazo | ≥ 80% |
| % freelancers ≥ 80 score | ≥ 60% del pool activo |
| Rotación pool | < 30% bajas por calidad |

**Revisión:** Account + ops — primer lunes trimestre.

---

## 9. Integración operativa (sin código)

1. Guardar scorecard en `Drive/[FREELANCER]/scorecards/`.  
2. Referenciar proyecto OS ID en cabecera.  
3. Vincular informe QA G3 del mismo proyecto.  
4. Actualizar hoja maestro pool (Notion/Sheets): nombre, servicios, media score, estado.

---

## 10. Sesgo y equidad

- Evaluar **hechos** (checklist, fechas, emails), no percepciones vagas.  
- Dos evaluadores si score < 70 o > 95 (calibración).  
- Feedback constructivo obligatorio en áreas mejora antes de “No renovar”.  
- Cliente externo: encuesta opcional; peso máx. 10% adicional sobre comunicación (manual).

---

*Scorecard v1.0 — NELVYON SERVICES Phase 2*
