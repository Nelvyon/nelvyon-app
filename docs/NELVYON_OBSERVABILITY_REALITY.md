# NELVYON — Observabilidad: qué está **demostrado en este repo** vs qué queda **fuera**

**Audiencia:** operación, SRE, auditoría interna.  
**Regla:** nada de esta lista sustituye Prometheus/Alertmanager/OTEL desplegados en un clúster real.

---

## 1) Comprobado en código + tests (este repositorio)

| Capacidad | Dónde | Cómo se verifica |
|-----------|--------|-------------------|
| Endpoint `/metrics` en formato Prometheus | `routers/metrics.py`, métricas registradas en app | `tests/test_metrics_prometheus_phase9.py`, `tests/test_observability_phase10.py` |
| Contadores HTTP (`http_requests_total` + histograma/latencia según implementación) | `core/http_observability.py` | Tests anteriores + `test_observability_phase10` |
| Contadores de jobs (`job_outcomes_total` + labels) | `core/job_observability.py` + instrumentación en `core/job_queue.py` | `test_metrics_prometheus_phase9`, `test_productive_jobs_phase10` |
| Contratos de payload para jobs `email` / `report` / `webhook` / `cleanup` | `core/job_contracts.py` | `tests/test_job_queue_contracts_phase9.py` |
| Handlers reales con tenant + auditoría (`security_events`) | `core/productive_job_handlers.py`, registro en `core/nelvyon_job_handlers.py` | `tests/test_productive_jobs_phase10.py`, `test_remediation_master_phase5_contracts_helpdesk_jobs.py` |
| Reglas de alerta **definidas** (PromQL) en YAML | `backend/ops/alerts/phase9_alerts.yaml` | `tests/test_observability_phase10.py` (presencia + contenido mínimo) |
| “Simulación” de ratio de fallos de jobs (misma desigualdad que una regla del YAML, sin series temporales) | N/A (solo test) | `test_stub_simulate_job_failure_ratio_alert_fires_like_yaml` |
| Correlación petición ↔ logs (no OTEL) | `middlewares/request_id.py` + `X-Request-ID` | `tests/test_observability_phase10.py` (`test_request_id_roundtrip_for_operational_correlation`) |

---

## 2) No comprobado aquí (requiere entorno / producto externo)

| Tema | Por qué no está en el repo |
|------|----------------------------|
| **Prometheus** scrapeando `/metrics` en runtime prolongado | Hace falta despliegue + ServiceMonitor / scrape config + retención. |
| **Alertmanager** disparando alertas reales (notificaciones, silencios, rutas) | Hace falta integración con AM + reglas cargadas en un Prometheus que lea las series del proceso. |
| **Trazas distribuidas OpenTelemetry** (spans, exportador, sampling) | No hay stack OTEL integrado en el backend de este repo; solo correlación vía `X-Request-ID` y logs estructurados. |
| **On-call 24/7**, **SOC2**, **HA multi-AZ**, **WAF**, **SOC** | Políticas y contratos organizativos / infra — fuera del alcance de `pytest`. |

---

## 3) Cómo usar esto en operación (resumen)

1. Exponer `/metrics` detrás de auth/network según política (en muchos despliegues se usa scrape interno o sidecar).
2. Cargar `ops/alerts/phase9_alerts.yaml` (o equivalente) en la cadena Prometheus del entorno.
3. Si se adopta trazabilidad distribuida, añadir OTEL **además** de (no en sustitución de) `X-Request-ID`.
