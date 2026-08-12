"""
Los webhooks de Meta aceptaban cualquier cuerpo.

`instagram_dm` y `facebook_messenger` hacian `await request.json()` y lo
pasaban al servicio. Cualquiera podia inyectar mensajes falsos en la bandeja de
un workspace —un DM que nadie envio, con el remitente que quisiera— y el
sistema los trataria como reales: se responden, disparan automatizaciones y
alimentan al agente.

Meta firma con `X-Hub-Signature-256` sobre el cuerpo CRUDO, mismo esquema para
ambos, asi que la verificacion es una sola pieza.
"""
from __future__ import annotations

import hashlib
import hmac
import json

import pytest
from httpx import AsyncClient

from core.meta_webhook_signature import firma_esperada, verificar_firma_meta

SECRETO = "secreto-de-prueba-instagram"
CUERPO = json.dumps({"entry": [{"messaging": [{"sender": {"id": "x"}}]}]}).encode()

RUTAS = [
    ("/api/instagram-dm/webhook", "INSTAGRAM_APP_SECRET"),
    ("/api/fb-messenger/webhook", "FACEBOOK_APP_SECRET"),
]


@pytest.mark.asyncio
@pytest.mark.parametrize("ruta,variable", RUTAS)
async def test_sin_firma_se_rechaza(client: AsyncClient, monkeypatch, ruta, variable):
    """El caso exacto del hallazgo."""
    monkeypatch.setenv(variable, SECRETO)
    r = await client.post(ruta, content=CUERPO, headers={"Content-Type": "application/json"})
    assert r.status_code == 400, f"{ruta}: {r.status_code} {r.text[:120]}"


@pytest.mark.asyncio
@pytest.mark.parametrize("ruta,variable", RUTAS)
async def test_una_firma_de_otro_secreto_se_rechaza(
    client: AsyncClient, monkeypatch, ruta, variable
):
    monkeypatch.setenv(variable, SECRETO)
    ajena = "sha256=" + hmac.new(b"otro-secreto", CUERPO, hashlib.sha256).hexdigest()
    r = await client.post(
        ruta,
        content=CUERPO,
        headers={"Content-Type": "application/json", "X-Hub-Signature-256": ajena},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
@pytest.mark.parametrize("ruta,variable", RUTAS)
async def test_manipular_el_cuerpo_invalida_la_firma(
    client: AsyncClient, monkeypatch, ruta, variable
):
    """Firmar un cuerpo y enviar otro es lo que haria quien intercepte."""
    monkeypatch.setenv(variable, SECRETO)
    firma = firma_esperada(SECRETO, CUERPO)
    otro = json.dumps({"entry": [{"messaging": [{"sender": {"id": "suplantado"}}]}]}).encode()
    r = await client.post(
        ruta,
        content=otro,
        headers={"Content-Type": "application/json", "X-Hub-Signature-256": firma},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
@pytest.mark.parametrize("ruta,variable", RUTAS)
async def test_con_firma_valida_si_se_procesa(
    client: AsyncClient, monkeypatch, ruta, variable
):
    """Contraprueba: los 400 no vienen de un endpoint roto."""
    monkeypatch.setenv(variable, SECRETO)
    r = await client.post(
        ruta,
        content=CUERPO,
        headers={
            "Content-Type": "application/json",
            "X-Hub-Signature-256": firma_esperada(SECRETO, CUERPO),
        },
    )
    assert r.status_code == 200, r.text[:150]


@pytest.mark.asyncio
@pytest.mark.parametrize("ruta,variable", RUTAS)
async def test_sin_secreto_configurado_se_corta(
    client: AsyncClient, monkeypatch, ruta, variable
):
    """
    Aceptar "porque aun no hay secreto" es exactamente el estado en el que
    cualquiera escribe en la bandeja, y no da ningun sintoma.
    """
    monkeypatch.delenv(variable, raising=False)
    r = await client.post(
        ruta,
        content=CUERPO,
        headers={
            "Content-Type": "application/json",
            "X-Hub-Signature-256": firma_esperada(SECRETO, CUERPO),
        },
    )
    assert r.status_code == 503


def test_la_comparacion_de_firmas_es_de_tiempo_constante():
    """Comparar con `==` filtra por tiempo cuantos bytes coincidian."""
    from pathlib import Path

    src = (
        Path(__file__).resolve().parent.parent / "core" / "meta_webhook_signature.py"
    ).read_text(encoding="utf-8")
    assert "hmac.compare_digest(" in src


def test_la_firma_se_calcula_sobre_el_cuerpo_crudo():
    """Con `request.json()` los bytes cambian al reserializar."""
    from pathlib import Path

    for fichero in ("instagram_dm.py", "facebook_messenger.py"):
        src = (
            Path(__file__).resolve().parent.parent / "routers" / fichero
        ).read_text(encoding="utf-8")
        i = src.index("async def receive_webhook")
        cuerpo = src[i : i + 900]
        assert "await request.body()" in cuerpo, fichero
        assert "verificar_firma_meta(" in cuerpo, fichero
        assert "await request.json()" not in cuerpo, fichero
