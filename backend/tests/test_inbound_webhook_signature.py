"""
Un webhook de pago sin firma es un boton de "marcar como pagado".

HALLAZGO: `POST /api/text2pay/webhook` aceptaba cualquier cuerpo. Un POST con

    {"type": "payment_intent.succeeded",
     "data": {"object": {"metadata": {"text2pay_id": "<id>"}}}}

ponia ese pago en `paid` sin que nadie hubiese pagado. El webhook canonico
(`routers/stripe_webhook.py`) ya verificaba la firma sobre el cuerpo CRUDO
desde hacia tiempo; este era la excepcion.

Se verifica sobre `request.body()` y no sobre `request.json()` a proposito:
reserializar el JSON cambia los bytes y la firma dejaria de casar.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import time

import pytest
from httpx import AsyncClient

SECRETO_DE_PRUEBA = b"whsec_test_placeholder"
RUTA = "/api/text2pay/webhook"


def _evento(pid: str) -> bytes:
    return json.dumps(
        {
            "id": "evt_prueba",
            "object": "event",
            "type": "checkout.session.completed",
            "data": {"object": {"metadata": {"text2pay_id": pid}}},
        }
    ).encode()


def _cabecera_firmada(cuerpo: bytes, secreto: bytes = SECRETO_DE_PRUEBA) -> dict:
    marca = str(int(time.time()))
    firma = hmac.new(secreto, f"{marca}.".encode() + cuerpo, hashlib.sha256).hexdigest()
    return {"Content-Type": "application/json", "stripe-signature": f"t={marca},v1={firma}"}


async def _crear_pago(client: AsyncClient, auth_headers: dict) -> str:
    r = await client.post(
        "/api/text2pay/create",
        json={"lead_phone": "+34600111222", "amount": 9, "description": "Cobro de prueba", "channel": "sms"},
        headers=auth_headers,
    )
    assert r.status_code in (200, 201), r.text
    return r.json()["id"]


@pytest.mark.asyncio
async def test_sin_firma_no_se_marca_como_pagado(client: AsyncClient, auth_headers: dict):
    """El caso exacto del hallazgo."""
    pid = await _crear_pago(client, auth_headers)
    r = await client.post(RUTA, content=_evento(pid), headers={"Content-Type": "application/json"})
    assert r.status_code == 400, f"{r.status_code} {r.text[:150]}"

    estado = await client.get(f"/api/text2pay/payments/{pid}", headers=auth_headers)
    assert estado.json().get("status") != "paid", "el pago quedo cobrado sin firma"


@pytest.mark.asyncio
async def test_una_firma_de_otro_secreto_no_vale(client: AsyncClient, auth_headers: dict):
    """Firmar con cualquier cosa no basta: tiene que ser NUESTRO secreto."""
    pid = await _crear_pago(client, auth_headers)
    cuerpo = _evento(pid)
    r = await client.post(RUTA, content=cuerpo, headers=_cabecera_firmada(cuerpo, b"otro_secreto"))
    assert r.status_code == 400

    estado = await client.get(f"/api/text2pay/payments/{pid}", headers=auth_headers)
    assert estado.json().get("status") != "paid"


@pytest.mark.asyncio
async def test_manipular_el_cuerpo_invalida_la_firma(client: AsyncClient, auth_headers: dict):
    """
    Se firma un cuerpo y se envia otro: es lo que haria quien intercepte una
    entrega legitima y le cambie el id del pago.
    """
    pid = await _crear_pago(client, auth_headers)
    otro = await _crear_pago(client, auth_headers)
    cabeceras = _cabecera_firmada(_evento(pid))
    r = await client.post(RUTA, content=_evento(otro), headers=cabeceras)
    assert r.status_code == 400

    estado = await client.get(f"/api/text2pay/payments/{otro}", headers=auth_headers)
    assert estado.json().get("status") != "paid"


@pytest.mark.asyncio
async def test_con_firma_valida_si_se_procesa(client: AsyncClient, auth_headers: dict):
    """Contraprueba: los 400 no vienen de un endpoint roto."""
    pid = await _crear_pago(client, auth_headers)
    cuerpo = _evento(pid)
    r = await client.post(RUTA, content=cuerpo, headers=_cabecera_firmada(cuerpo))
    assert r.status_code == 200, r.text[:150]

    estado = await client.get(f"/api/text2pay/payments/{pid}", headers=auth_headers)
    assert estado.json().get("status") == "paid"


def test_la_firma_se_comprueba_sobre_el_cuerpo_crudo():
    """
    Regresion de forma: con `request.json()` los bytes cambian al reserializar y
    la verificacion dejaria de ser fiable.
    """
    from pathlib import Path

    src = (Path(__file__).resolve().parent.parent / "routers" / "text2pay.py").read_text(
        encoding="utf-8"
    )
    i = src.index("async def stripe_webhook")
    cuerpo = src[i : i + 2000]
    assert "await request.body()" in cuerpo
    assert "construct_event" in cuerpo
    assert "await request.json()" not in cuerpo
