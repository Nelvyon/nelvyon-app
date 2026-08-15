"""
Las URLs prefirmadas caducan, y su vida la decidimos nosotros.

`services/storage.py` enviaba `expires_in: 0` al servicio OSS externo. La duda
era si eso significaba "sin caducidad" —una URL permanente a un fichero de
cliente— o "usa el default del servidor".

Se resolvio SIN llamar al servicio, con el contrato del propio repositorio:
`FileUpDownResponse.expires_at` es un campo OBLIGATORIO (`Field(...)`), asi que
el servicio devuelve siempre una caducidad. Si `0` significara "nunca", no
podria rellenarlo. La lectura peligrosa queda descartada.

Aun asi se manda un valor explicito, el mismo que ya usa el modulo hermano
`os_deliverable_storage`: la vida de la URL debe ser una decision de NELVYON y
no un default ajeno que puede cambiar sin avisar.
"""
from __future__ import annotations

import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent


def test_el_ttl_es_explicito_y_finito():
    from services.storage import TTL_URL_PREFIRMADA_SEG

    assert 0 < TTL_URL_PREFIRMADA_SEG <= 3600, "un TTL de cero o enorme es el defecto"


def test_ya_no_se_manda_cero():
    """Regresion del valor original."""
    src = (RAIZ / "services" / "storage.py").read_text(encoding="utf-8")
    codigo = "\n".join(re.sub(r"#.*$", "", l) for l in src.split("\n"))
    assert '"expires_in": 0' not in codigo


def test_las_dos_urls_llevan_el_mismo_ttl():
    """Subida y descarga: dejar una sin acotar valdria lo mismo que ninguna."""
    src = (RAIZ / "services" / "storage.py").read_text(encoding="utf-8")
    assert src.count('"expires_in": TTL_URL_PREFIRMADA_SEG') == 2


def test_coincide_con_el_modulo_hermano():
    """
    Dos TTL distintos para el mismo tipo de recurso solo generan preguntas. Si
    algun dia divergen, que sea una decision y no un descuido.
    """
    from services.os_deliverable_storage import DEFAULT_SIGNED_URL_TTL_SEC
    from services.storage import TTL_URL_PREFIRMADA_SEG

    assert TTL_URL_PREFIRMADA_SEG == DEFAULT_SIGNED_URL_TTL_SEC


def test_la_respuesta_exige_caducidad():
    """
    Esta es la evidencia que descarta "sin caducidad": el modelo de respuesta
    declara `expires_at` como obligatorio. Si dejara de serlo, el razonamiento
    de arriba ya no se sostendria y habria que revisarlo.
    """
    from schemas.storage import FileUpDownResponse

    campo = FileUpDownResponse.model_fields["expires_at"]
    assert campo.is_required(), (
        "`expires_at` dejo de ser obligatorio: revisar si `expires_in` puede "
        "significar 'sin caducidad'"
    )
