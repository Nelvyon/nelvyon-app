# PROJECT_STATUS — Estado del proyecto

> Actualizado: **2026-07-22** — SQL SSOT harden · automations **200** · DNS PASS · KI020_PASS · CONDITIONAL_READY · `claimReady: false`

| Capa | Estado | Evidencia |
|------|--------|-----------|
| **Veredicto** | **CONDITIONAL_READY** | Legal + CEO IA · **claimReady false** |
| **Automations BFF** | **OK** | unified 200 · portal-packs PASS |
| **SQL SSOT / mig** | **OK** | ADR-002/039 · 517/518 in `_migrations` · gate ALL_PASS |
| **FastAPI** | **OK** | deploy `0d5a7ce9` · `SKIP_ALEMBIC=1` · shared DB |
| **Web git_sha** | **PENDING restore** | live `git_sha:null` hasta 1× redeploy `--from-source` |
| **app.nelvyon.com** | **OK** | DNS+SSL · live/ready 200 |
| **KI-020** | **PASS** | KI020_PASS (evidencia previa) |
| **IA flags** | **OFF** | OpenAI key revoked · cost 0 |
| **Costes** | **0** | |
