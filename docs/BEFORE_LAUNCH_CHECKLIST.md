# Antes de lanzar de verdad

Checklist operativa para **NELVYON** antes de facturar clientes y operar en producción sin soporte de desarrollo asistido. Marca cada ítem tras revisarlo con el responsable indicado.

> **Nota:** esto no sustituye asesoramiento legal ni auditoría de seguridad profesional.

---

## A. Legal y comercial (revisar con abogado)

- [ ] **Razón social y CIF** actualizados en `NEXT_PUBLIC_LEGAL_ENTITY_NAME` y textos en `/legal/*`
- [ ] **Términos de servicio** (`/legal/terms`) adaptados a tu jurisdicción, planes y modelo B2B/B2C
- [ ] **Política de privacidad** (`/legal/privacy`) alineada con RGPD y registro de actividades de tratamiento (RAT)
- [ ] **DPA** (`/legal/dpa`) firmado con clientes que traten datos de terceros (agencias, encargados)
- [ ] **AUP** (`/legal/acceptable-use`) comunicada en onboarding y contrato
- [ ] **Política de reembolsos** coherente con Stripe/plan comercial (`/legal/refund-policy`)
- [ ] **Divulgación IA** (`/legal/ai-disclosure`) si aplica EU AI Act / transparencia a usuarios
- [ ] **Cláusulas en contrato/presupuesto:** licencia software propietario, titularidad datos cliente, SLA, confidencialidad
- [ ] **Registro de marcas** «NELVYON» y dominios (`nelvyon.com`, etc.)
- [ ] **Canal de ejercicio de derechos:** `privacy@nelvyon.com` y `legal@nelvyon.com` monitorizados
- [ ] **Edad mínima / menores** — política coherente con tu mercado
- [ ] **Cookies y consentimiento** — banner y política si usas analytics marketing en web pública
- [ ] **Transferencias internacionales** — SCCs con proveedores US (Supabase, Railway, AWS SES, Google, Meta)

---

## B. Infraestructura y seguridad (revisar con responsable técnico / DevOps)

- [ ] **Repositorio privado** en GitHub — sin secretos en historial (`git log`, escaneo secretos)
- [ ] **Variables de entorno** solo en Railway/Supabase — rotación de `JWT_SECRET`, API keys
- [ ] **DATABASE_URL** producción separada de staging — backups automáticos Supabase activados
- [ ] **Prueba de restauración** de backup (al menos una vez)
- [ ] **HTTPS** obligatorio en dominio producción
- [ ] **Copias de seguridad:** política de retención documentada (DB + assets críticos)
- [ ] **Logs:** acceso restringido, retención definida (errores, auth, kickoff packs)
- [ ] **Rate limiting** en auth y APIs sensibles
- [ ] **SES / email:** dominio verificado, DKIM/SPF/DMARC, límites de envío
- [ ] **OAuth Google/Meta:** redirect URIs de producción registradas
- [ ] **GA4_DEMO_FALLBACK=0** en producción (solo datos reales o mensaje claro si no hay GA4)
- [ ] **Monitoring:** alertas uptime (Railway health, `/api/health/live`), Sentry si está configurado
- [ ] **Plan de incidentes:** a quién avisar, cómo pausar servicio, plantilla comunicación a clientes

---

## C. Producto y operación (tú / equipo, sin Cursor en cliente)

- [ ] **Preflight staging OK:** `node scripts/staging-demo-preflight.mjs`
- [ ] **P0 smokes OK:** `node scripts/run-staging-p0-smokes.mjs`
- [ ] **Flujo completo probado:** signup → onboarding (checkbox legal) → pack 1 clic → informe → portal
- [ ] **7+ packs demo** verificados en catálogo `/packs`
- [ ] **Cuenta QA** separada de cuentas cliente reales
- [ ] **Proceso de alta cliente** documentado (quién invita, quién lanza pack, quién entrega)
- [ ] **Soporte:** email/canal definido, SLA interno de respuesta
- [ ] **Facturación Stripe** en modo live probada (plan, webhook, cancelación)
- [ ] **Exportación / baja:** saber cómo exportar datos del cliente y plazos de borrado

---

## D. Día del lanzamiento (5 minutos)

```bash
# 1. Preflight
node scripts/staging-demo-preflight.mjs

# 2. Login manual en producción
# 3. Un kickoff pack demo
# 4. Ver /legal/terms y /legal/privacy cargan
```

Si los tres primeros bloques (A, B, C) están marcados, puedes **aceptar clientes y operar packs** de forma autónoma.

---

## Referencias

- [README.md](../README.md) — visión general
- [TECH_HANDOFF.md](../TECH_HANDOFF.md) — arquitectura, despliegue, nuevos packs
- [STAGING_P0_SMOKES.md](./STAGING_P0_SMOKES.md) — smokes detallados
