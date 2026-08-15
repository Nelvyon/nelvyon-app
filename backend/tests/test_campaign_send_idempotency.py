"""
Una campana no puede enviarse dos veces.

DEUDA CERRADA. `send_campaign` leia `campaign.status` y lo escribia despues, en
dos pasos:

    if campaign.status == "sending": raise
    campaign.status = "sending"; commit

Dos defectos en ese hueco:

  * dos peticiones concurrentes leian ambas `draft`, ambas pasaban la
    comprobacion y ambas enviaban — cada contacto recibia el correo dos veces;
  * `sent` no estaba cubierto, asi que una campana ya completada podia
    reenviarse entera.

La auditoria de intencion (`result="attempt"`) hacia los duplicados
DETECTABLES; esto los hace imposibles. El reclamo es ahora un UPDATE
condicional cuyo `rowcount` decide, igual que `_consume_month_usage`.
"""
from __future__ import annotations

import pytest
import pytest_asyncio
from sqlalchemy import select, text

from models.campaigns import Campaigns
from services.campaign_sender import ESTADOS_NO_REENVIABLES, CampaignSenderService

UID = "test-user-00000000-0000-0000-0000-000000000001"

#: Las campanas de este fichero se quedan en estados NO TERMINALES a proposito
#: (`draft`, `sending`), que es justo lo que el plan limita: "maximo 10
#: campanas no terminales". Sin limpiarlas, agotaban la cuota del workspace 1 y
#: tests posteriores no podian crear campanas — un fallo dependiente del orden
#: que no era de ellos.
MARCA = "idem-test-campaign"


@pytest_asyncio.fixture(autouse=True)
async def _limpia_campanas(db_session):
    yield
    await db_session.execute(
        text("DELETE FROM campaigns WHERE name = :n"), {"n": MARCA}
    )
    await db_session.commit()


async def _campana(db, estado: str = "draft") -> int:
    fila = Campaigns(
        user_id=UID, workspace_id=1, name=MARCA, subject="s", type="email",
        content="<p>x</p>", status=estado,
    )
    db.add(fila)
    await db.commit()
    await db.refresh(fila)
    return fila.id


@pytest.mark.asyncio
async def test_una_campana_ya_enviada_no_se_reenvia(db_session):
    """El agujero que `sending` no cubria."""
    cid = await _campana(db_session, "sent")
    servicio = CampaignSenderService(db_session)
    with pytest.raises(ValueError, match="already sent"):
        await servicio.send_campaign(cid, UID, 1)


@pytest.mark.asyncio
async def test_una_campana_en_curso_sigue_rechazandose(db_session):
    cid = await _campana(db_session, "sending")
    servicio = CampaignSenderService(db_session)
    with pytest.raises(ValueError, match="already being sent"):
        await servicio.send_campaign(cid, UID, 1)


@pytest.mark.asyncio
async def test_una_campana_inexistente_sigue_dando_not_found(db_session):
    """El reclamo fallido no puede confundir 'no existe' con 'ya enviada'."""
    servicio = CampaignSenderService(db_session)
    with pytest.raises(ValueError, match="not found"):
        await servicio.send_campaign(999_999, UID, 1)


@pytest.mark.asyncio
async def test_una_campana_de_otro_workspace_no_se_alcanza(db_session):
    cid = await _campana(db_session, "draft")
    servicio = CampaignSenderService(db_session)
    with pytest.raises(ValueError, match="not found"):
        await servicio.send_campaign(cid, UID, 999)


@pytest.mark.asyncio
async def test_el_reclamo_es_atomico_y_solo_lo_gana_uno(db_session):
    """
    La propiedad central, comprobada sobre el UPDATE real y no sobre el
    servicio entero: dos reclamos sobre la misma campana `draft` y solo uno
    puede ver `rowcount = 1`.
    """
    from sqlalchemy import update

    cid = await _campana(db_session, "draft")

    async def reclamar() -> int:
        r = await db_session.execute(
            update(Campaigns)
            .where(
                Campaigns.id == cid,
                Campaigns.status.notin_(ESTADOS_NO_REENVIABLES),
            )
            .values(status="sending")
        )
        await db_session.commit()
        return int(r.rowcount or 0)

    primero = await reclamar()
    segundo = await reclamar()
    assert primero == 1, "el primer reclamo deberia ganar"
    assert segundo == 0, "el segundo reclamo tambien gano: no es atomico"


@pytest.mark.asyncio
async def test_una_campana_borrador_si_se_envia(db_session):
    """
    Contraprueba: los rechazos de arriba no pueden venir de haber roto el envio.
    Sin contactos el servicio marca `failed`, pero llega a reclamar la campana,
    que es lo que aqui se afirma.
    """
    cid = await _campana(db_session, "draft")
    servicio = CampaignSenderService(db_session)
    await servicio.send_campaign(cid, UID, 1)

    estado = (
        await db_session.execute(select(Campaigns.status).where(Campaigns.id == cid))
    ).scalar_one()
    assert estado != "draft", "la campana no llego a reclamarse"


def test_el_servicio_no_volvio_al_patron_leer_y_escribir():
    """Regresion de forma: el reclamo tiene que seguir siendo un UPDATE."""
    from pathlib import Path

    src = (Path(__file__).resolve().parent.parent / "services" / "campaign_sender.py").read_text(
        encoding="utf-8"
    )
    i = src.index("async def send_campaign")
    cuerpo = src[i : src.index("# 3.", i)]
    assert "update(Campaigns)" in cuerpo, "el reclamo dejo de ser un UPDATE condicional"
    assert "rowcount" in cuerpo, "el reclamo ya no decide por rowcount"
    assert 'campaign.status = "sending"' not in cuerpo, "volvio la escritura tras la lectura"
