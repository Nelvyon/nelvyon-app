# Demo pack X-EXEC · Tanda 1 (v1.1 + V2-A1)

**Objetivo:** un solo guion manual que recorre las **15 pantallas/journeys** del `PHASE_X_EXEC_ELITE_CHECKLIST.md` con el mismo workspace, JWT y datos de staging, validando quick wins QW1–QW5 (Revenue unificado, copy en estados críticos, coherencia tras guardar, vacíos explicativos, sin “momentos feos”).

**Dataset / sesión:** usar **un workspace de staging** con: al menos 1 cliente, 2–3 deals en etapas distintas (una “at risk” por fecha o días en etapa), facturación visible para rol admin/operator, eventos de auditoría si existen, jobs OS si existen. Si falta un bloque de datos, anótalo como “N/A datos” pero **no** marques el ítem de checklist en verde hasta tener datos mínimos.

---

## Preparación (una vez)

1. Abrir staging, **Sign-in** con JWT corto válido para el workspace elegido.
2. Confirmar **workspace activo** en cabecera (mismo durante todo el demo).
3. Anotar rol usado (member / operator / admin) para cruzar con RBAC del checklist.

---

## Guion (orden recomendado — alineado al checklist §1)

| Paso | Ruta | Qué mirar (Tanda 1) |
|------|------|----------------------|
| 1 | Shell / nav | Nav muestra **Revenue** (no “CRM” suelto); módulo activo coherente al entrar en `/crm/*`. |
| 2 | `/` Home | Checklist carga; sin parpadeos confusos tras hidratar sesión. |
| 3 | `/crm/clients` | Lista + CTA **Revenue pipeline (all deals)**; forbidden/error con causa + siguiente paso. |
| 4 | `/crm/clients/{id}` | Bloque **Deals and pipeline for this client** → filtro `?client_id=`; forbidden/error premium. |
| 5 | `/crm/deals?client_id={id}` | Banner “Revenue · deals for one cliente”; enlace a ficha cliente + limpiar filtro; panel pipeline (loading / error / vacío explicado); at-risk y lista coherentes. |
| 6 | `/crm/deals/{id}` | Cliente enlazado o mensaje “not linked”; **Back to deals** preserva `client_id` si aplica; guardar stage/owner/next step → volver a lista y comprobar **mismo dato** sin contradicción. |
| 7 | Onboarding (ruta del checklist) | Coherencia checklist ↔ módulos enlazados. |
| 8 | `/help` | Búsqueda sin resultados → copy explicativo (no “roto”). |
| 9 | Bot v1 (ruta del checklist) | Sin regresiones visibles respecto al shell. |
| 10 | `/billing` | Forbidden/error con causa + acción; si no hay serie de spend, texto **por qué no hay gráfico** y qué hacer. |
| 11 | `/billing/upgrade` | Planes / subscripción activa: errores explícitos; flujo checkout cancelado vs paid (si se puede en staging). |
| 12 | Settings — workspace (ruta del checklist) | RBAC y mensajes claros si algo falla. |
| 13 | `/settings/audit` | Forbidden/error premium; tabla vacía vs filtros sin matches (mensajes distintos). |
| 14 | `/os` | Forbidden/error; snapshot billing sin meters en riesgo → copy explicativo; jobs recientes vacíos → empty explicativo. |
| 15 | Sign-in / sesión | Repetir solo si se cambia JWT o workspace. |

---

## Cierre rápido post-demo (copiar a nota / PR)

- **Pantallas revisadas:** (lista 1–15 sí/no).
- **Checklist:** ítems en verde antes vs después (conteo por pantalla).
- **Copy/UX tocados:** Revenue, deals filtrados por cliente, paneles pipeline/at-risk/OS/billing/help/audit.
- **Demos sin “momentos feos”:** 3–5 pasadas (fechas + responsables).
- **Tanda 2 (solo mejoras medias, sin producto nuevo):** p. ej. métricas más ricas, accesibilidad fina, telemetría de errores, tests E2E staging — **sin** abrir A2/Creator OS/funnels nuevos.
