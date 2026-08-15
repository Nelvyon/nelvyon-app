"""
Un reintento de webhook saliente tiene que ser reconocible como tal.

DEFECTO: `handle_contract_webhook` lanza ante un 5xx del receptor, la cola
reintenta y la MISMA entrega vuelve a salir — sin nada en la peticion que
permita al receptor distinguirla de un evento nuevo. Un fallo transitorio suyo
se convertia en un efecto duplicado suyo (un pedido creado dos veces, un aviso
enviado dos veces), causado por nosotros.

No se puede resolver en su lado si no le damos la identidad. Se le da:
`Idempotency-Key` con el id del job, que NO cambia entre reintentos, y
`X-Nelvyon-Delivery-Attempt`, informativo — deduplicar es por la clave.
"""
from __future__ import annotations

import pytest

from core.productive_job_handlers import _clave_de_entrega


def test_la_clave_no_cambia_entre_reintentos():
    """La propiedad central. Mismo job, distinto intento, misma clave."""
    base = {"url": "http://x/y", "method": "POST", "payload": {"a": 1}, "_job_id": "j-1"}
    assert _clave_de_entrega({**base, "_attempt": 1}) == _clave_de_entrega({**base, "_attempt": 3})


def test_dos_jobs_distintos_no_comparten_clave():
    """Si todo colisionase, el receptor descartaria eventos legitimos."""
    a = _clave_de_entrega({"url": "http://x", "method": "POST", "_job_id": "j-1"})
    b = _clave_de_entrega({"url": "http://x", "method": "POST", "_job_id": "j-2"})
    assert a != b


def test_sin_job_id_la_clave_sale_del_contenido_y_sigue_siendo_estable():
    """Un handler invocado a mano no puede quedarse sin identidad."""
    p = {"url": "http://x/y", "method": "POST", "payload": {"a": 1}}
    assert _clave_de_entrega(p) == _clave_de_entrega(dict(p))
    assert _clave_de_entrega(p) != _clave_de_entrega({**p, "url": "http://x/z"})


def test_la_clave_no_depende_del_reloj_ni_del_azar():
    """
    Lo que arruinaria la propiedad sin que ningun test obvio lo notase: derivar
    la clave de la hora o de un aleatorio la haria distinta en cada reintento.
    """
    p = {"url": "http://x", "method": "POST", "payload": {"n": 1}}
    muestras = {_clave_de_entrega(dict(p)) for _ in range(50)}
    assert len(muestras) == 1, f"la clave varia entre llamadas identicas: {muestras}"


def test_el_numero_de_intento_no_entra_en_la_clave():
    p = {"url": "http://x", "method": "POST"}
    assert _clave_de_entrega({**p, "_attempt": 1}) == _clave_de_entrega({**p, "_attempt": 9})


@pytest.mark.asyncio
async def test_la_entrega_lleva_la_cabecera_y_el_reintento_la_repite(monkeypatch):
    """
    Prueba de extremo a extremo del handler, sin red: dos ejecuciones del MISMO
    job deben salir con la misma `Idempotency-Key`.
    """
    import httpx

    from core import productive_job_handlers as handlers

    enviadas: list[dict] = []

    class _Respuesta:
        status_code = 200

    class _Cliente:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_a):
            return False

        async def post(self, _url, json=None, headers=None):
            enviadas.append(dict(headers or {}))
            return _Respuesta()

    monkeypatch.setattr(httpx, "AsyncClient", lambda **_k: _Cliente())

    async def _acceso(*_a, **_k):
        return True

    monkeypatch.setattr(handlers, "_actor_has_workspace_access", _acceso)

    payload = {
        "url": "http://receptor.local/hook",
        "method": "POST",
        "payload": {"evento": "x"},
        "workspace_id": 1,
        "actor_user_id": "u1",
        "_job_id": "job-abc",
    }
    await handlers.handle_contract_webhook({**payload, "_attempt": 1})
    await handlers.handle_contract_webhook({**payload, "_attempt": 2})

    assert len(enviadas) == 2
    claves = [h.get("Idempotency-Key") for h in enviadas]
    assert claves[0] == claves[1] == "job_job-abc", claves
    assert enviadas[0]["X-Nelvyon-Delivery-Attempt"] == "1"
    assert enviadas[1]["X-Nelvyon-Delivery-Attempt"] == "2"


def test_la_cola_inyecta_una_identidad_estable():
    """
    Sin esto la clave caeria al hash de contenido y dos jobs con el mismo
    contenido se confundirian. Ademas el payload persistido no debe mutarse.
    """
    from pathlib import Path

    src = (Path(__file__).resolve().parent.parent / "core" / "job_queue.py").read_text(
        encoding="utf-8"
    )
    assert '"_job_id": job.id' in src, "la cola dejo de inyectar el id del job"
    assert "{**job.payload" in src, "se estaria mutando el payload persistido"
