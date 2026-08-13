"""
La integracion pertenece al WORKSPACE, no a quien la conecto.

DECISION DE PRODUCTO (2026-08-12). `oauth_connections` e `integration_whatsapp`
estaban keyed por `user_id`, lo que convertia una credencial personal en la
frontera del inquilino: el equipo comparte workspace pero no la integracion, y
si el empleado que la conecto se va, la integracion se va con el. RBAC se
resuelve por workspace, asi que autorizacion y propiedad hablaban de cosas
distintas.

La migracion 529 anade `workspace_id` (propietario) y `connected_by_user_id`
(actor, solo auditoria), sin borrar ni renombrar nada.

QUE SE PRUEBA AQUI
------------------
Que la resolucion es POR WORKSPACE y que lo ambiguo falla cerrado:

  * A resuelve la suya;
  * A no resuelve la de B;
  * sin integracion no se resuelve nada;
  * una fila con `workspace_id` NULL —la que no se pudo migrar— no se resuelve;
  * una integracion revocada no se resuelve;
  * un fallo de base tampoco abre la puerta.

Los TIPOS de columna los certifica PostgreSQL; aqui se prueba la semantica.
"""
from __future__ import annotations

import pytest
from sqlalchemy import text

from core.ads_integration import resolve_workspace_ads_integration
from core.messaging_integration import resolve_workspace_whatsapp_integration

DDL_OAUTH = """
CREATE TABLE IF NOT EXISTS oauth_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR NOT NULL,
  provider VARCHAR NOT NULL,
  access_token VARCHAR,
  refresh_token VARCHAR,
  external_account_id VARCHAR,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  workspace_id INTEGER,
  connected_by_user_id VARCHAR
)
"""

DDL_WA = """
CREATE TABLE IF NOT EXISTS integration_whatsapp (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR NOT NULL,
  phone_number_id VARCHAR,
  waba_id VARCHAR,
  access_token VARCHAR,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  workspace_id INTEGER,
  connected_by_user_id VARCHAR
)
"""

MIGRACION = "529_integration_workspace_ownership.sql"


@pytest.fixture
async def tablas(db_session):
    await db_session.execute(text(DDL_OAUTH))
    await db_session.execute(text(DDL_WA))
    await db_session.execute(text("DELETE FROM oauth_connections"))
    await db_session.execute(text("DELETE FROM integration_whatsapp"))
    await db_session.commit()
    yield db_session
    await db_session.execute(text("DELETE FROM oauth_connections"))
    await db_session.execute(text("DELETE FROM integration_whatsapp"))
    await db_session.commit()


async def _alta_ads(db, *, ws, provider="snapchat", cuenta="acct-A", token="tok-A",
                    activa=True, usuario="u-conector"):
    await db.execute(
        text(
            "INSERT INTO oauth_connections "
            "(user_id, provider, access_token, external_account_id, is_active, "
            " workspace_id, connected_by_user_id) "
            "VALUES (:u, :p, :t, :c, :a, :ws, :u)"
        ),
        {"u": usuario, "p": provider, "t": token, "c": cuenta,
         "a": 1 if activa else 0, "ws": ws},
    )
    await db.commit()


@pytest.mark.asyncio
async def test_el_workspace_resuelve_su_propia_integracion(tablas):
    await _alta_ads(tablas, ws=1, cuenta="acct-del-1", token="tok-del-1")
    i = await resolve_workspace_ads_integration(1, "snapchat")
    assert i is not None
    assert i.external_account_id == "acct-del-1"
    assert i.access_token == "tok-del-1"


@pytest.mark.asyncio
async def test_un_workspace_no_resuelve_la_integracion_de_otro(tablas):
    """A/B: la propiedad central del aislamiento."""
    await _alta_ads(tablas, ws=1, cuenta="acct-del-1")
    assert await resolve_workspace_ads_integration(2, "snapchat") is None


@pytest.mark.asyncio
async def test_sin_integracion_no_se_resuelve_nada(tablas):
    assert await resolve_workspace_ads_integration(1, "snapchat") is None


@pytest.mark.asyncio
async def test_una_fila_sin_workspace_no_se_resuelve(tablas):
    """
    Las filas que la migracion no pudo atribuir quedan con `workspace_id` NULL.
    Resolverlas seria adivinar el propietario, que es como se le da a un
    inquilino la credencial de otro.
    """
    await _alta_ads(tablas, ws=None, cuenta="acct-huerfana")
    for ws in (1, 2, 3):
        assert await resolve_workspace_ads_integration(ws, "snapchat") is None


@pytest.mark.asyncio
async def test_una_integracion_revocada_no_se_resuelve(tablas):
    await _alta_ads(tablas, ws=1, activa=False)
    assert await resolve_workspace_ads_integration(1, "snapchat") is None


@pytest.mark.asyncio
async def test_el_proveedor_importa(tablas):
    """La credencial de Snapchat no vale para TikTok."""
    await _alta_ads(tablas, ws=1, provider="snapchat")
    assert await resolve_workspace_ads_integration(1, "snapchat") is not None
    assert await resolve_workspace_ads_integration(1, "tiktok") is None


@pytest.mark.asyncio
async def test_una_credencial_incompleta_no_se_resuelve(tablas):
    """Sin cuenta externa o sin token no hay integracion utilizable."""
    await _alta_ads(tablas, ws=1, cuenta="", token="tok")
    assert await resolve_workspace_ads_integration(1, "snapchat") is None


@pytest.mark.asyncio
async def test_sin_workspace_declarado_no_se_resuelve():
    assert await resolve_workspace_ads_integration(None, "snapchat") is None


@pytest.mark.asyncio
async def test_whatsapp_resuelve_por_workspace(tablas):
    await tablas.execute(
        text(
            "INSERT INTO integration_whatsapp "
            "(user_id, phone_number_id, waba_id, access_token, is_active, "
            " workspace_id, connected_by_user_id) "
            "VALUES ('u1', '999', 'waba-1', 'tok-wa', 1, 1, 'u1')"
        )
    )
    await tablas.commit()
    i = await resolve_workspace_whatsapp_integration(1)
    assert i is not None and i.phone_number_id == "999"
    assert await resolve_workspace_whatsapp_integration(2) is None


@pytest.mark.asyncio
async def test_un_fallo_de_base_no_abre_la_puerta(monkeypatch):
    """
    Si la tabla no existe o la base no responde, no hay integracion demostrable.
    Antes esto LANZABA, y el llamante devolvia 500 en vez de cortar con 503.
    """
    from core.database import db_manager

    async def _revienta(*_a, **_k):
        raise RuntimeError("relation oauth_connections does not exist")

    monkeypatch.setattr(db_manager, "async_session_maker", None, raising=False)
    monkeypatch.setattr(db_manager, "ensure_initialized", _revienta, raising=False)
    assert await resolve_workspace_ads_integration(1, "snapchat") is None


def _sql_migracion() -> str:
    from pathlib import Path

    return (
        Path(__file__).resolve().parent.parent / "db" / "migrations" / MIGRACION
    ).read_text(encoding="utf-8")


def test_la_migracion_no_borra_ni_renombra():
    """
    Aditiva por contrato: las filas antiguas siguen legibles y `user_id` sigue
    ahi. Un DROP o un RENAME perderia integraciones en produccion.
    """
    sql = _sql_migracion().upper()
    for destructivo in ("DROP COLUMN", "DROP TABLE", "RENAME", "DELETE FROM", "TRUNCATE"):
        assert destructivo not in sql, f"la migracion 529 hace {destructivo}"
    assert "ADD COLUMN IF NOT EXISTS WORKSPACE_ID" in sql
    assert "CONNECTED_BY_USER_ID" in sql


def test_el_backfill_solo_atribuye_lo_inequivoco():
    """
    Con cero o con varios workspaces la propiedad es ambigua y debe quedar NULL.
    `HAVING COUNT(DISTINCT ...) = 1` es lo que lo garantiza, en las dos tablas.
    """
    assert _sql_migracion().count("HAVING COUNT(DISTINCT u.ws) = 1") == 2, (
        "el backfill dejo de exigir pertenencia unica"
    )


def test_los_resolvedores_no_leen_configuracion_global():
    """
    Regresion del defecto original: si vuelven a mirar el entorno, vuelve el
    fallback corporativo que estos modulos existen para cerrar.
    """
    import ast as _ast
    from pathlib import Path

    raiz = Path(__file__).resolve().parent.parent / "core"
    for fichero in ("ads_integration.py", "messaging_integration.py"):
        arbol = _ast.parse((raiz / fichero).read_text(encoding="utf-8"))
        for n in _ast.walk(arbol):
            if not isinstance(n, (_ast.FunctionDef, _ast.AsyncFunctionDef)):
                continue
            if not n.name.startswith("resolve_"):
                continue
            cuerpo = n.body[1:] if _ast.get_docstring(n) else n.body
            codigo = "\n".join(_ast.unparse(x) for x in cuerpo)
            for prohibido in ("os.environ", "os.getenv"):
                assert prohibido not in codigo, f"{fichero}::{n.name} lee {prohibido}"
