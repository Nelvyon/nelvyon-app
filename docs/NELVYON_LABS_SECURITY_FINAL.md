# NELVYON-LABS — Seguridad (gates de preparación)

> Generado: 2026-07-15T18:30:58.232Z  
> **No se ha ejecutado Trivy/Gitleaks sobre los 461 clones en esta fase** (Fase 0: no competir con soak).  
> Gates aplicados por metadatos de catálogo + política preventiva.

## Bloqueos automáticos aplicados

- `privateModeCompatible=false` → DESCARTADO POR INCOMPATIBILIDAD
- `risk=critical` → DESCARTADO POR SEGURIDAD
- Copyleft / Unknown → DESCARTADO POR LICENCIA (también gate de seguridad legal)

## Descartados por seguridad

_Ninguno con risk=critical en catálogo labs._

## Checklist obligatorio ANTES de integrar cada ganador (Fase 3)

1. Resolver LICENSE en árbol local (SBOM)
2. Gitleaks en repo clonado
3. Trivy/Grype en imagen/deps si Docker
4. Revisar telemetría / llamadas externas
5. Confirmar PRIVATE_MODE (allowlist)
6. No secretos en repo
7. Pin de release / commit SHA
8. Adaptador con privilegios mínimos

## Riesgos residuales

- Clones grandes (HandBrake, etc.) no escaneados aún
- Searxng/Blender descartados en Windows — si se usan, solo via Docker aislado
- Ganadores AGPL no existen en cola de merge (bloqueados)

## Estado

**Security prep gate:** PASS para documentación/decisión  
**Security integration gate:** PENDING por ganador, post-Router
