# BLOQUE 4 — estado vivo

> GENERADO. No se edita a mano: sale de
> `backend/db/certificacion/capacidades_operacion_estado.json` mediante
> `backend/db/certificacion/estado_bloque4.py`.

**13/13 certificadas · 0 bloqueadas · 0 pendientes**

De las certificadas: **8 `FIXED_CERTIFIED`** (habia un defecto y se corrigio) y **5 `PASS_CERTIFIED`** (ya estaba bien y queda protegida).

Contador inviolable: 13 + 0 + 0 = 13

El denominador se DERIVA de 104 modulos de operacion del arbol mediante
`capacidades_operacion.py`. Un guardian falla si un modulo queda huerfano
o si una capacidad se queda sin modulos.

## Certificadas (13)

- `cobros_y_suscripciones` — FIXED_CERTIFIED · DINERO · 16 modulos
- `colas_y_reintentos` — FIXED_CERTIFIED · EJECUCION · 4 modulos
- `correo_saliente` — FIXED_CERTIFIED · SALIDA · 14 modulos
- `derechos_del_titular` — PASS_CERTIFIED · OPERACION · 2 modulos
- `idempotencia_y_fallidos` — FIXED_CERTIFIED · ENTRADA · 3 modulos
- `integraciones_salientes` — FIXED_CERTIFIED · SALIDA · 16 modulos
- `oauth_de_proveedores` — PASS_CERTIFIED · IDENTIDAD · 7 modulos
- `observabilidad` — PASS_CERTIFIED · OPERACION · 8 modulos
- `salud_y_disponibilidad` — PASS_CERTIFIED · OPERACION · 5 modulos
- `tareas_programadas` — PASS_CERTIFIED · EJECUCION · 16 modulos
- `webhooks_de_canal` — FIXED_CERTIFIED · ENTRADA · 3 modulos
- `webhooks_de_inquilino` — FIXED_CERTIFIED · ENTRADA · 3 modulos
- `webhooks_de_pago` — FIXED_CERTIFIED · ENTRADA · 7 modulos

## Bloqueadas (0)

_ninguna._

## Pendientes (0)

_ninguna._
