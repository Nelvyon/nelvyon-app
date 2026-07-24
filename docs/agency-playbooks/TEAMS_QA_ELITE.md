# TEAMS QA ÉLITE + AUDITORES

> ADR-051 · `OsEliteQaPolicy.ts` · umbral **≥85** · críticos **≥90**  
> Nunca reducir umbrales. No declarar “cero bugs para siempre”.

## Dimensiones

técnico · creativo · negocio · marca · compliance · evidencia

## Rechazo duro

errores visuales · copy defectuoso · links rotos · datos no verificados · móvil · tracking · promesas falsas · incoherencia de marca · auto-aprobación

## Auditor independiente

- Flag: `NELVYON_PACK_INDEPENDENT_AUDITOR` (default **0**)  
- Puede bloquear publish → `needs_review`  
- Prohibido `self_approve_critical`

## Regresiones

Seed en `QA_ELITE_REGRESSION_SEED` — cada defecto corregido añade check permanente.
