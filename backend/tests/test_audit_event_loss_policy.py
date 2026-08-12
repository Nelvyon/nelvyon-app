"""
Politica de fallo de la auditoria.

`write_audit_event` capturaba toda excepcion, la degradaba a `warning` y
continuaba. Uno de sus llamantes es `dependencies/workspace.py`, que audita las
DENEGACIONES de autorizacion: un fallo de la tabla borraba el rastro del intento
sin que nadie lo notara.

La politica no puede ser unica, porque los llamantes no lo son:

    denegacion de autorizacion -> best-effort. La decision de seguridad ya se
        tomo bien; una auditoria rota no puede convertir un 403 en un 500. Pero
        el fallo queda como ERROR estructurado, nunca como `warning`.

    side effect sensible -> required. Sin registro no hay efecto, y la auditoria
        va ANTES: auditar despues y fallar dejaria la accion hecha con respuesta
        de error, que es lo que provoca reintentos y duplicados.
"""
from __future__ import annotations

import logging

import pytest

from services.audit_events import (
    AuditPersistError,
    write_audit_event_best_effort,
    write_audit_event_required,
)

EVENTO = dict(
    actor_user_id="u1",
    actor_email="u@test.local",
    workspace_id=7,
    action="delete",
    resource_type="contact",
    resource_id="c1",
    result="DENY",
)


class _DbRota:
    """Persistencia caida: cualquier escritura falla."""

    async def execute(self, *_a, **_k):
        raise RuntimeError("relation security_events is unavailable")

    async def commit(self):
        raise RuntimeError("commit imposible")


@pytest.mark.asyncio
async def test_denegacion_no_se_convierte_en_error_por_auditoria_rota():
    """La propiedad central: auditar mal no puede degradar un 403 a 500."""
    await write_audit_event_best_effort(_DbRota(), **EVENTO)  # no debe lanzar


@pytest.mark.asyncio
async def test_el_fallo_de_auditoria_queda_como_error_no_como_warning(caplog):
    with caplog.at_level(logging.ERROR):
        await write_audit_event_best_effort(_DbRota(), **EVENTO)
    errores = [r for r in caplog.records if r.levelno >= logging.ERROR]
    assert errores, "un fallo de auditoria no puede pasar por debajo de ERROR"
    assert any("audit_event_persist_failed" in r.getMessage() for r in errores)


@pytest.mark.asyncio
async def test_el_registro_de_fallo_permite_reconstruir_el_evento(caplog):
    with caplog.at_level(logging.ERROR):
        await write_audit_event_best_effort(_DbRota(), **EVENTO)
    r = next(x for x in caplog.records if x.levelno >= logging.ERROR)
    assert getattr(r, "audit_actor_user_id", None) == "u1"
    assert getattr(r, "audit_workspace_id", None) == 7
    assert getattr(r, "audit_action", None) == "delete"
    assert getattr(r, "audit_result", None) == "DENY"


@pytest.mark.asyncio
async def test_el_registro_no_filtra_secretos_ni_payload(caplog):
    """Reconstruir el evento no puede convertirse en una fuga."""
    with caplog.at_level(logging.ERROR):
        await write_audit_event_best_effort(
            _DbRota(), **{**EVENTO, "actor_email": "u@test.local"}
        )
    r = next(x for x in caplog.records if x.levelno >= logging.ERROR)
    campos = {k for k in vars(r) if k.startswith("audit_")}
    prohibidos = {"audit_details", "audit_payload", "audit_body", "audit_token"}
    assert not (campos & prohibidos), f"campos sensibles en el log: {campos & prohibidos}"


@pytest.mark.asyncio
async def test_auditoria_obligatoria_si_propaga():
    """Sin registro no puede haber side effect: el llamante debe enterarse."""
    with pytest.raises(AuditPersistError):
        await write_audit_event_required(_DbRota(), **{**EVENTO, "result": "SUCCESS"})


@pytest.mark.asyncio
async def test_las_dos_politicas_no_son_la_misma():
    """Contraprueba: si `required` dejase de propagar, esto lo detecta."""
    await write_audit_event_best_effort(_DbRota(), **EVENTO)
    with pytest.raises(AuditPersistError):
        await write_audit_event_required(_DbRota(), **EVENTO)


def test_la_denegacion_de_workspace_usa_best_effort():
    """
    Regresion del ALTO: si alguien vuelve a `write_audit_event` desnudo, el 403
    pasaria a 500 en cuanto la auditoria fallase.
    """
    from pathlib import Path

    src = (Path(__file__).resolve().parent.parent / "dependencies" / "workspace.py").read_text(
        encoding="utf-8"
    )
    assert "write_audit_event_best_effort(" in src
    assert "await write_audit_event(" not in src
