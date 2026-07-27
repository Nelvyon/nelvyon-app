# Production RAG schema prep verification (Option A)

| Campo | Valor |
|-------|-------|
| Fecha | 2026-07-27T16:13:27.221Z |
| Role | nelvyon_local_ai_app |
| Canary/AI | NOT activated |
| OpenAI | OFF |
| Verdict | **PASS** |

| Check | Result | Detail |
|-------|--------|--------|
| role_nonsuperuser | PASS | user=nelvyon_local_ai_app superuser=off |
| required_tables | PASS | local_ai_audit,local_ai_config,local_ai_ingest_jobs,local_ai_memory,local_ai_rag_chunks,local_ai_rag_documents |
| rls_force_on_core_tables | PASS | [{"relname":"local_ai_memory","relrowsecurity":true,"relforcerowsecurity":true},{"relname":"local_ai_rag_chunks","relrowsecurity":true,"relforcerowsecurity":true},{"relname":"local_ai_rag_documents","relrowsecurity":true,"relforcerowsecurity":true}] |
| rls_a_cannot_count_b | PASS | cross_tenant_rows=0 |
| rls_a_reads_own | PASS | own_rows=1 |
