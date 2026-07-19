# Estándar definitivo de calidad — NELVYON

> Vigente desde **2026-07-16** (ADR-019). **Misión permanente** del proyecto.  
> Regla Cursor: `.cursor/rules/enterprise-quality.mdc` (`alwaysApply`).

## Objetivo

Llevar **todo** NELVYON (OS, SaaS, IA, infra, seguridad, UX, CI) al máximo nivel de calidad **demostrable**.  
El éxito no se mide por cantidad de archivos ni por bloques marcados, sino por evidencia reproducible.

## Criterio de aceptación de código

Trabaja como Principal Engineer de un producto usado a gran escala.  
Una implementación se acepta solo si es objetivamente **más** limpia, simple, rápida, segura, mantenible, escalable, coherente, resiliente u observable — o elimina duplicidad/deuda con beneficio claro.  
Si lo actual ya cumple ese nivel → **no cambiar**.

Cada mejora debe justificar: **beneficio · coste · riesgo · evidencia**.

## Checklist de cierre de bloque

Arquitectura · modularidad · cohesión · acoplamiento · seguridad · rendimiento · a11y/UX · observabilidad · resiliencia · mantenibilidad · documentación real · tests · integración · benchmarks · rollback · feature flags · CI/CD · migraciones · APIs · DB · ausencia de P0/P1.

Antes de cerrar: auditoría crítica propia — intenta romper el cambio.

## Prohibido

Código duplicado evitable · documentación ficticia · placeholders · TODO/FIXME innecesarios · hacks · mocks silenciosos · soluciones provisionales · deuda técnica evitable · vendor copy · dependencias innecesarias · complejidad sin justificar · reescrituras masivas sin justificación sólida · “funciona” como criterio suficiente.

## Evidencia por mejora

| Requisito | Cuándo |
|-----------|--------|
| Build / lint / typecheck | Siempre si aplica |
| Tests + integración | Paths críticos y regresiones del área |
| Seguridad | Authz, tenant, ingress/egress, secretos |
| Benchmark | Latencia/throughput/VRAM/CWV cuando el cambio lo afecta |
| Docs vivas | HANDOVER + CHANGELOG + área afectada (solo estado real) |
| Motivo | Breve, técnico; ADR si es estructural |
| Rollback / flag | Si el riesgo de regresión es material |

## Declaraciones

- **Prohibido** declarar un bloque “perfecto” o NELVYON “terminado” sin evidencia.
- **Cerrado** = funciona E2E · integrado · probado · securizado · observable · documentado · rollback · **sin P0/P1** · sin mejora objetiva de alto impacto razonable pendiente sin justificar.
