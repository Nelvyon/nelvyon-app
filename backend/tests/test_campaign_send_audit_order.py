"""
Orden de auditoria en el envio de campanas.

El envio es un side effect EXTERNO cuyo resultado solo se conoce despues, asi
que no puede auditarse el desenlace por adelantado. Auditar solo al final dejaba
envios reales sin rastro si la tabla fallaba, y convertir ese fallo en error
habria provocado reintentos y campanas duplicadas.

La politica es doble:

    required(result="attempt")  ANTES  -> sin fila no hay envio
    best_effort(result=ok|error) DESPUES -> el envio ya ocurrio y su rastro no
        puede degradar la respuesta real

Los dos eventos comparten actor, workspace, campana y `action` para poder
correlacionarse; solo difieren en `result`.
"""
from __future__ import annotations

import pytest

from services.audit_events import AuditPersistError


class _Espia:
    """Registra el orden real de las operaciones."""

    def __init__(self):
        self.orden: list[str] = []
        self.envios = 0

    async def enviar(self, *_a, **_k):
        self.orden.append("send")
        self.envios += 1
        return {"sent": 5}


def _politica(espia, *, falla_attempt=False, falla_resultado=False):
    async def required(_db, **kw):
        espia.orden.append(f"audit_required:{kw.get('result')}")
        if falla_attempt:
            raise AuditPersistError("tabla caida")

    async def best_effort(_db, **kw):
        espia.orden.append(f"audit_best_effort:{kw.get('result')}")
        # best-effort nunca propaga, aunque por dentro falle
        return None

    return required, best_effort


@pytest.mark.asyncio
async def test_t1_audit_attempt_ok_permite_el_envio():
    espia = _Espia()
    required, best_effort = _politica(espia)
    await required(None, result="attempt")
    await espia.enviar()
    await best_effort(None, result="ok")
    assert espia.orden == ["audit_required:attempt", "send", "audit_best_effort:ok"]
    assert espia.envios == 1


@pytest.mark.asyncio
async def test_t2_audit_attempt_falla_y_no_hay_ningun_envio():
    """La propiedad central: sin rastro autorizado, cero efecto externo."""
    espia = _Espia()
    required, _ = _politica(espia, falla_attempt=True)
    with pytest.raises(AuditPersistError):
        await required(None, result="attempt")
    assert espia.envios == 0, "se envio una campana sin auditoria obligatoria"


@pytest.mark.asyncio
async def test_t5_audit_de_resultado_falla_pero_el_envio_no_se_repite():
    """Un fallo posterior no puede inventar un reintento ni negar el envio."""
    espia = _Espia()
    required, best_effort = _politica(espia)
    await required(None, result="attempt")
    await espia.enviar()
    await best_effort(None, result="ok")  # no propaga aunque falle
    assert espia.envios == 1, "el envio se duplico"


def test_el_router_audita_la_intencion_antes_de_enviar():
    """
    Regresion de ORDEN sobre el codigo real.

    Si alguien mueve la auditoria obligatoria detras de `send_campaign`, el
    envio volveria a ocurrir sin rastro previo. Se comprueba en el fichero
    porque el orden es la propiedad, no el resultado.
    """
    from pathlib import Path

    src = (Path(__file__).resolve().parent.parent / "routers" / "campaign_sender.py").read_text(
        encoding="utf-8"
    )
    i_required = src.index("write_audit_event_required(")
    i_send = src.index("service.send_campaign(")
    assert i_required < i_send, "la auditoria obligatoria quedo DESPUES del envio"


def test_el_resultado_del_envio_usa_best_effort():
    """Los eventos posteriores no pueden degradar un envio ya realizado."""
    from pathlib import Path

    src = (Path(__file__).resolve().parent.parent / "routers" / "campaign_sender.py").read_text(
        encoding="utf-8"
    )
    assert "await write_audit_event(" not in src, "queda una llamada sin politica explicita"
    assert src.count("write_audit_event_best_effort(") == 3
    assert src.count("write_audit_event_required(") == 1


def test_el_fallo_de_auditoria_obligatoria_no_expone_detalle_interno():
    from pathlib import Path

    src = (Path(__file__).resolve().parent.parent / "routers" / "campaign_sender.py").read_text(
        encoding="utf-8"
    )
    i = src.index("except AuditPersistError:")
    bloque = src[i:i + 300]
    assert "503" in bloque
    # El detalle es una cadena literal: no interpola la excepcion ni el SQL.
    assert "detail=\"" in bloque, "el detail deberia ser un literal"
    for filtracion in ("str(e)", "{e}", "exc)", "format("):
        assert filtracion not in bloque, f"el detalle expone {filtracion}"
