# DEMO-SEED-ABCD-1 — Seed repetible (A+B+C+D, W1+W2)

## 1) Supuestos verificados

| Elemento | Estado |
|----------|--------|
| Script principal | `scripts/seed_demo_abcd.py` (async, `initialize_database` + tablas ORM) |
| Fixtures JSON previos | `services/mock_data.py` sigue siendo carga opcional al vacío; **no** sustituye este seed ni el `--reset` |
| Usuario demo | Mismo criterio que auth local: `DEMO_SEED_USER_ID` + `DEMO_SEED_USER_EMAIL`, o `ADMIN_USER_ID` + `ADMIN_USER_EMAIL`, o caída a `ADMIN_EMAIL` (p. ej. `admin@local.dev` en README Windows) |
| Workspaces | Slugs fijos `nelvyon-demo-w1` y `nelvyon-demo-w2`; nombres `NELVYON - Workspace A/B`; propietario = `user_id` del demo |
| Idempotencia | Si existe W1 y el contacto marcador `demo-abcd-marker@nelvyon.local`, el script **no** duplica (mensaje stderr). Si existe W1 **sin** marcador, hace reset parcial de esos workspaces y re-sembrá |
| Alcance de borrado (`--reset` o re-seed incompleto) | Solo filas ligadas a los **ids** de esos dos workspaces: mensajes, conversaciones, ejecuciones/reglas workflow, tickets, deals, contacts, campaigns, workflows entidad, miembros, workspaces |

## 2) Riesgos concretos

1. **`DATABASE_URL` distinto entre seed y `uvicorn`**: el seed escribe en la BD que apunte la URL; si el backend usa otro fichero Postgres/SQLite, la UI seguirá vacía.
2. **Usuario distinto**: los workspaces demo se crean bajo el `user_id` resuelto por env; el login debe ser **el mismo email** que ese usuario (p. ej. `ADMIN_EMAIL`), o hay que fijar `DEMO_SEED_*` y autenticarse como ese usuario.
3. **Log “Database not found”** (SQLite): al primer arranque `core/database.py` puede registrar el fichero ausente hasta que `initialize_database` cree el archivo; es ruido conocido, no indica fallo del seed.
4. **SLA breach/warning**: dependen de `created_at` respecto a “ahora” (UTC) y de la lógica del frontend (`SaasHelpdesk.tsx`); si en el futuro cambian los umbrales de prioridad `medium`, revisar los `timedelta` del script.
5. **Stream-token**: el endpoint `POST /api/v1/conversations/{id}/stream-token` exige sesión + workspace; el seed solo crea la conversación; hay que abrir Inbox en el workspace correcto y usar el `conversation_id` real de la BD (o la UI que ya lo llama).

## 3) Diffs por archivo (resumen)

| Archivo | Cambio |
|---------|--------|
| `scripts/seed_demo_abcd.py` | Seed + reset W1/W2; datos W1 (CRM completo, workflow, campañas, inbox, helpdesk SLA); datos W2 reducidos (deal, workflow, campaña, inbox, tickets); nombres ASCII para consolas Windows |
| `DEMO-SEED-ABCD.md` | Este documento |
| `README-dev-Windows.md` | Sección con enlace y comando mínimo |

*(No hay cambios de contratos API, billing ni OS externo.)*

## 4) Comando exacto para cargar / resetear demo

Desde `backend`, con el mismo `DATABASE_URL` que usa `uvicorn` y el venv activado:

**Primera carga o re-seed automático** (si W1 existe pero falta el marcador, el script borra esos workspaces y vuelve a cargar):

```powershell
cd C:\Users\Asus\Downloads\app_v181\backend
.\.venv\Scripts\Activate.ps1
# mismas variables que en README-dev-Windows (JWT, ADMIN_*, DATABASE_URL, etc.)
python scripts/seed_demo_abcd.py
```

**Reset explícito** (borra solo datos de `nelvyon-demo-w1` / `nelvyon-demo-w2` del usuario demo y vuelve a sembrar):

```powershell
python scripts/seed_demo_abcd.py --reset
```

**Opcional** — forzar usuario demo distinto del admin:

```powershell
$env:DEMO_SEED_USER_ID = "mi-demo-id"
$env:DEMO_SEED_USER_EMAIL = "mi-demo@local.dev"
python scripts/seed_demo_abcd.py --reset
```

Salida JSON: `user_id`, `user_email`, ids y slugs de W1/W2.

## 5) Guion corto de demo (5–10 min, A→B→C→D)

**Pre**: Arrancar backend + frontend (`README-dev-Windows.md`). Ejecutar seed. Entrar con el usuario demo (`ADMIN_EMAIL` o el configurado). Abrir siempre `http://127.0.0.1:3000`.

1. **Selector de workspace** → **NELVYON - Workspace A** (W1).
2. **A CRM**: `/saas/crm` — contactos (Alex marcador, Blanca, …), ficha de contacto; **Pipelines** — tres deals en lead / proposal / closed_won; dashboard global con números no cero.
3. **B Workflows / Campaigns**: `/saas/workflows` — workflow “Demo - Workflow entidad” y regla manual; `/saas/campaigns` — borrador + enviada con métricas.
4. **C Inbox**: `/saas/conversations` — hilo “Conversacion demo A-C (W1)”; abrir detalle y comprobar mensajes; si enseñas realtime: desde la UI autenticada el flujo token + SSE (misma sesión y workspace).
5. **D Helpdesk**: `/saas/helpdesk` — tres tickets W1 (breach, warning, en curso) y tarjetas de resumen; SLA en colores.
6. **Cambio a W2**: selector → **NELVYON - Workspace B** — repetir pasos acortados (CRM con deal calificado, workflow/campaña, inbox W2, tickets abierto + resuelto).

## 6) Checklist manual de verificación

- [ ] `DATABASE_URL` idéntico en terminal del seed y del `uvicorn`.
- [ ] Tras `seed_demo_abcd.py`, stderr **no** muestra error de SQL; stdout JSON con `"ok": true`.
- [ ] Login con el **mismo** email que `user_email` del JSON (o el definido en env).
- [ ] W1 visible en selector; slug en BD/API coherente con `nelvyon-demo-w1`.
- [ ] CRM W1: ≥2 contactos visibles; pipeline con deals en **lead**, **proposal**, **closed_won**.
- [ ] Campañas: al menos un **draft** y un **sent**.
- [ ] Inbox W1: conversación con ≥2 mensajes.
- [ ] Helpdesk W1: tickets con etiquetas **[DEMO]** y estados distintos; al menos uno muestra **breach** y otro **warning** en UI.
- [ ] Cambio a W2: contacto Carlos, deal, campaña borrador, conversación W2, 2 tickets.
- [ ] Segunda ejecución **sin** `--reset`: mensaje “Demo ABCD ya presente…”.
- [ ] `python scripts/seed_demo_abcd.py --reset`: datos refrescados, ids pueden cambiar pero slugs fijos se mantienen.
