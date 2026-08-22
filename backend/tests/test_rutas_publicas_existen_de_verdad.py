"""Las rutas que el middleware declara publicas tienen que existir.

DE DONDE VIENE
--------------
`middleware/tenant.py` decide que es publico comparando el path con cadenas
escritas a mano:

    def _is_dialer_public(path, method):
        return method == "POST" and path == "/api/dialer/webhook/twilio"

Si un router cambia de prefijo, esa cadena deja de casar y el webhook empieza a
recibir 401 del middleware. No hay error, no hay traza, no hay despliegue rojo:
el proveedor externo recibe 401, reintenta, y acaba desactivando el endpoint.
Un webhook inalcanzable tiene exactamente la misma pinta que un webhook al que
nadie escribe.

El fallo simetrico es igual de malo: una ruta publica NUEVA que nadie anade a la
lista queda exigiendo un inquilino que el proveedor no puede aportar.

QUE COMPRUEBAN ESTAS PRUEBAS
----------------------------
    1. Cada path que el middleware declara publico EXISTE en la aplicacion.
    2. Cada webhook publico conocido sigue estando declarado.

La primera se descubrio por accidente: sondeando produccion escribi
`/api/v1/dialer/webhook/twilio` en vez de `/api/dialer/webhook/twilio`, recibi un
401 y lo tome por un defecto del producto. No lo era —mi path estaba mal— pero
demostro que un 401 del middleware y una ruta inexistente son indistinguibles
desde fuera.
"""
from __future__ import annotations

import re

import pytest


def _paths_de_la_app() -> set[str]:
    """Los paths REALES, sacados del esquema que genera la propia aplicacion.

    `app.routes` no vale: esta version de FastAPI difiere el montaje y expone
    envoltorios `_IncludedRouter` cuyo `.path` es `None`. Leerlo daba 207
    entradas casi todas vacias y esta prueba declaraba inexistentes rutas que
    responden en produccion — un guard que falla en bloque no informa mas que
    uno que pasa en blanco.

    El esquema es la fuente canonica: 885 paths, con sus prefijos ya aplicados.
    Que en produccion el endpoint `/openapi.json` este deshabilitado no importa;
    aqui se genera en proceso.
    """
    from main import app

    return set(app.openapi().get("paths", {}))


def _literales_del_middleware() -> list[tuple[str, int]]:
    """Los paths que `middleware/tenant.py` compara con `==` o `startswith`."""
    import pathlib

    fuente = (pathlib.Path(__file__).resolve().parents[1] / "middleware" / "tenant.py")
    texto = fuente.read_text(encoding="utf-8")
    fuera = []
    for m in re.finditer(r"""path\s*(?:==|\.startswith\()\s*\(?\s*["']([^"']+)["']""", texto):
        fuera.append((m.group(1), texto[:m.start()].count("\n") + 1))
    # Los que van en tuplas: `path in ("/a", "/b")`
    for m in re.finditer(r"""path\s+in\s+\(([^)]*)\)""", texto):
        linea = texto[:m.start()].count("\n") + 1
        for p in re.findall(r"""["']([^"']+)["']""", m.group(1)):
            fuera.append((p, linea))
    return fuera


def test_todo_path_publico_del_middleware_existe_en_la_aplicacion():
    """Si un router cambia de prefijo, el middleware deja de reconocerlo.

    El sintoma es un 401 al proveedor externo, que reintenta y acaba
    desactivando el endpoint. Ninguna traza, ningun despliegue rojo.
    """
    paths = _paths_de_la_app()
    literales = _literales_del_middleware()
    assert len(literales) >= 10, (
        f"solo se extrajeron {len(literales)} paths del middleware: si su forma "
        f"cambio, esta prueba estaria pasando sin mirar nada")

    #: Ficheros servidos como estaticos, no rutas de la API: no aparecen en el
    #: esquema por definicion. Se declaran para que la exencion sea visible.
    ESTATICOS = {"/static/widget.js", "/widget.js"}

    huerfanos = []
    for literal, linea in literales:
        if literal in ESTATICOS:
            continue
        if literal.endswith("/"):
            # prefijo: basta con que alguna ruta cuelgue de el
            if not any(p.startswith(literal) for p in paths):
                huerfanos.append(f"tenant.py:{linea} {literal}")
        elif literal not in paths:
            # puede ser un prefijo sin barra final
            if not any(p.startswith(literal) for p in paths):
                huerfanos.append(f"tenant.py:{linea} {literal}")

    assert not huerfanos, (
        f"el middleware declara publicos paths que la aplicacion no sirve: "
        f"{huerfanos}. O sobran, o —peor— un router cambio de prefijo y su "
        f"webhook esta recibiendo 401 sin que nada lo diga.")


#: Webhooks entrantes que DEBEN ser publicos: los llama un proveedor externo que
#: no tiene JWT ni cabecera de inquilino. Si uno deja de estarlo, deja de
#: funcionar en silencio.
WEBHOOKS_QUE_DEBEN_SER_PUBLICOS = [
    ("/api/dialer/webhook/twilio", "POST"),
    ("/api/sms/webhook/twilio", "POST"),
    ("/api/instagram-dm/webhook", "POST"),
    ("/api/fb-messenger/webhook", "POST"),
    ("/api/tiktok-dm/webhook", "POST"),
    ("/api/text2pay/webhook", "POST"),
    # Encontrados el 2026-08-21: los seis devolvian 401 en PRODUCCION a Meta,
    # Amazon, Zoom y Signaturit. Rutas correctas, con firma y atribucion, y
    # completamente inalcanzables.
    ("/api/whatsapp/webhook", "POST"),
    ("/api/whatsapp/webhook", "GET"),
    ("/api/helpdesk/inbound/email", "POST"),
    ("/api/helpdesk/inbound/whatsapp", "POST"),
    ("/api/bookings/webhook/zoom", "POST"),
    ("/api/contracts/webhook", "POST"),
    ("/api/monitoring/ses/bounce-webhook", "POST"),
]


@pytest.mark.parametrize("path,metodo", WEBHOOKS_QUE_DEBEN_SER_PUBLICOS)
def test_los_webhooks_entrantes_siguen_siendo_publicos(path, metodo):
    """Lo que decide el middleware, preguntado al middleware."""
    from middleware.tenant import _is_public

    assert _is_public(path, metodo), (
        f"{metodo} {path} ya no es publico. Lo llama un proveedor externo sin "
        f"JWT: recibira 401, reintentara y acabara desactivando el endpoint.")


@pytest.mark.parametrize("path,metodo", WEBHOOKS_QUE_DEBEN_SER_PUBLICOS)
def test_esos_webhooks_existen(path, metodo):
    """Control de la anterior: declararlo publico no sirve si no existe.

    Las dos juntas son lo que importa. Por separado, cada una puede estar en
    verde mientras el webhook no funciona.
    """
    assert path in _paths_de_la_app(), (
        f"{path} esta declarado publico pero la aplicacion no lo sirve")


def test_ninguna_ruta_publica_de_escritura_quedo_sin_declarar():
    """El fallo simetrico: un webhook nuevo que nadie anadio a la lista.

    Recorre las rutas cuyo path contiene `webhook` o `/inbound/` y comprueba que
    el middleware las reconoce. Una que no lo haga exigira un inquilino que el
    proveedor no puede aportar.
    """
    from main import app
    from middleware.tenant import _is_public

    # Del ESQUEMA, no de `app.routes`: ahi los paths vienen vacios y este guard
    # recorria una lista sin ninguna coincidencia. Pasaba siempre, mirando nada.
    esquema = app.openapi().get("paths", {})
    revisadas = 0
    sin_declarar = []
    for path, operaciones in esquema.items():
        if not re.search(r"webhook|/inbound/", path):
            continue
        if "{" in path:
            continue          # los parametros no se comparan literalmente
        for verbo in operaciones:
            metodo = verbo.upper()
            if metodo not in ("POST", "GET"):
                continue
            revisadas += 1
            if not _is_public(path, metodo):
                sin_declarar.append(f"{metodo} {path}")

    assert revisadas >= 8, (
        f"solo se revisaron {revisadas} rutas de webhook: si el esquema dejo de "
        f"exponerlas, este guard estaria pasando sin mirar nada")

    # Los de `/api/v1/...` que exigen autenticacion a proposito no son webhooks
    # entrantes: se declaran aqui para que la exencion sea visible.
    #: Rutas de GESTION de webhooks —listar entregas, crear endpoints, reenviar—
    #: que usa un humano autenticado desde el producto. No las llama ningun
    #: proveedor, asi que exigir inquilino es correcto. Se declaran para que la
    #: distincion entre «webhook entrante» y «pantalla de webhooks» sea explicita.
    ESPERADOS_PRIVADOS = {
        "POST /api/v1/webhooks", "GET /api/v1/webhooks",
        "POST /api/v1/automation/webhooks", "GET /api/v1/automation/webhooks",
        "GET /api/webhooks/deliveries", "GET /api/webhooks/endpoints",
        "GET /api/webhooks/events", "POST /api/webhooks/endpoints",
        "POST /api/webhooks/retry", "POST /api/webhooks/test",
        "GET /api/v1/entities/automation_webhooks",
        "GET /api/v1/entities/automation_webhooks/all",
        "POST /api/v1/entities/automation_webhooks",
        "POST /api/v1/entities/automation_webhooks/batch",
    }
    reales = [x for x in sin_declarar if x not in ESPERADOS_PRIVADOS]
    assert not reales, (
        f"estas rutas parecen webhooks entrantes y el middleware NO las trata "
        f"como publicas: {sorted(reales)}. Si son privadas de verdad, declaralas "
        f"en ESPERADOS_PRIVADOS a proposito.")


# ═══════════════════════════════════════════════════════════════════════════
# Publico no significa abierto
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.asyncio
@pytest.mark.parametrize("ruta", [
    "/api/whatsapp/webhook",
    "/api/helpdesk/inbound/whatsapp",
    "/api/bookings/webhook/zoom",
    "/api/contracts/webhook",
])
async def test_abrirlos_no_los_deja_sin_defensa(client, ruta):
    """El control de la correccion anterior, y el que importa.

    Quitar el 401 del middleware seria un agujero si no hubiera nada detras. Lo
    hay: cada una verifica la firma del proveedor antes de tocar nada. Un cuerpo
    sin firma tiene que ser rechazado por la RUTA —4xx o 503— y no aceptado.

    Si esto pasara a 2xx, abrir la ruta habria dejado a cualquiera inyectar
    mensajes, tickets, citas o firmas de contrato.
    """
    r = await client.post(ruta, json={"cualquier": "cosa"})
    assert r.status_code >= 400, (
        f"{ruta} acepto un cuerpo SIN firma y devolvio {r.status_code}: abrirla "
        f"al middleware la dejo sin ninguna defensa")
    assert r.status_code != 401, (
        f"{ruta} sigue devolviendo 401: el proveedor externo no puede aportar "
        f"inquilino, asi que el webhook sigue siendo inalcanzable")
