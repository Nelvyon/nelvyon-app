"""Ningun SQL castea un parametro con `:nombre::tipo`. Nunca vincula.

EL FALLO QUE ESTO IMPIDE
------------------------
En produccion, borrar un proyecto de tienda devolvia 500 a un administrador
autorizado:

    DELETE FROM os_store_projects WHERE id = :id::uuid AND workspace_id = $1
    parameters: (3,)
    PostgresSyntaxError: syntax error at or near ":"

Se paso `{"id": ..., "ws": ...}` y solo llego uno. La causa esta en como
`sqlalchemy.text()` reconoce los marcadores: `:id::uuid` NO produce un
parametro llamado `id`.

    text("... :id::uuid ... :ws")   ->  parametros {'i', 'ws'}
    text("... :a::uuid, :b")        ->  parametros {'b'}

El nombre queda mutilado —o desaparece— y el valor que se pasa se ignora en
silencio. Lo que llega a PostgreSQL conserva los dos puntos literales, que no
son SQL valido en esa posicion.

La forma correcta es el CAST explicito del estandar, que deja el marcador
intacto:

    text("... CAST(:id AS uuid) ...")  ->  parametros {'id', 'ws'}

ALCANCE REAL
------------
No era un descuido aislado del borrado: el patron aparecia 139 veces en 15
servicios —constructor de tienda y de webs, embudos, afiliados, marketplace,
programador social, landings, chat en vivo, webhooks, plantillas, claves de
API, rendimiento web, OAuth social, GDPR y aprendizaje del portal—. Cada una
era una consulta que fallaba o vinculaba mal en cuanto se ejecutaba.

Por eso este guard barre el repositorio entero en vez de vigilar una consulta.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest
from sqlalchemy.sql import text

RAIZ = Path(__file__).resolve().parent.parent
REPO = RAIZ.parent

#: `:nombre::tipo` — un marcador seguido de un cast de PostgreSQL.
#: No casa `columna::tipo` (sin dos puntos iniciales), que es correcto y comun.
_CAST_SOBRE_MARCADOR = re.compile(r"(?<![:\w]):[a-zA-Z_][a-zA-Z0-9_]*::[a-zA-Z_]")


def _fuentes():
    for raiz in (RAIZ, REPO / "apps" / "web" / "src", REPO / "packages"):
        if not raiz.is_dir():
            continue
        for patron in ("*.py", "*.ts"):
            for f in raiz.rglob(patron):
                partes = f.parts
                if "node_modules" in partes or ".next" in partes:
                    continue
                if "tests" in partes or "__tests__" in partes:
                    continue
                yield f


def test_sqlalchemy_no_vincula_el_patron_roto():
    """La causa raiz, demostrada sobre la propia biblioteca.

    Sin esto el guard seria una regla de estilo. Con esto queda documentado
    POR QUE el patron esta prohibido, y si alguna version futura de SQLAlchemy
    cambiara el comportamiento, este test lo dira.
    """
    roto = text("DELETE FROM t WHERE id = :id::uuid AND ws = :ws")
    assert "id" not in roto._bindparams, (
        "si SQLAlchemy ya vincula `:id::uuid`, revisar si el guard sigue haciendo falta"
    )
    assert "ws" in roto._bindparams

    sin_ninguno = text("INSERT INTO t VALUES (:a::uuid, :b)")
    assert "a" not in sin_ninguno._bindparams


def test_el_cast_explicito_si_vincula():
    """Control positivo de la forma correcta."""
    bueno = text("DELETE FROM t WHERE id = CAST(:id AS uuid) AND ws = :ws")
    assert set(bueno._bindparams) == {"id", "ws"}


def test_el_barrido_ve_ficheros():
    """Control positivo: un glob roto daria verde con cero ficheros."""
    ficheros = list(_fuentes())
    assert len(ficheros) > 200, f"solo {len(ficheros)} fuentes; el barrido esta roto"


def test_ningun_sql_castea_un_marcador_con_dos_puntos():
    """El guard. Cada ocurrencia es una consulta que no vincula lo que cree."""
    culpables = []
    for f in _fuentes():
        texto = f.read_text(encoding="utf-8", errors="replace")
        for n, linea in enumerate(texto.splitlines(), 1):
            if _CAST_SOBRE_MARCADOR.search(linea):
                culpables.append(f"{f.relative_to(REPO).as_posix()}:{n}")
    assert not culpables, (
        f"{len(culpables)} SQL castean un marcador con `:nombre::tipo`, que no "
        f"vincula:\n  " + "\n  ".join(culpables[:25])
        + "\nUsar CAST(:nombre AS tipo)."
    )


def test_el_detector_reconoce_el_sql_exacto_que_fallo():
    """Control negativo con la consulta real de produccion.

    Sin esto, un regex que no casara nada daria verde y el guard seria adorno.
    """
    de_produccion = (
        "DELETE FROM os_store_projects WHERE id = :id::uuid "
        "AND workspace_id = :ws RETURNING id"
    )
    assert _CAST_SOBRE_MARCADOR.search(de_produccion)

    corregida = (
        "DELETE FROM os_store_projects WHERE id = CAST(:id AS uuid) "
        "AND workspace_id = :ws RETURNING id"
    )
    assert not _CAST_SOBRE_MARCADOR.search(corregida)


@pytest.mark.parametrize(
    "sql",
    [
        "SELECT created_at::date FROM t",
        "SELECT (payload->>'n')::int FROM t",
        "SELECT tags::text[] FROM t",
        "WHERE a.id::text = b.ref",
    ],
)
def test_el_detector_no_marca_casts_legitimos(sql):
    """Castear una COLUMNA es correcto y frecuente; el guard no puede estorbarlo."""
    assert not _CAST_SOBRE_MARCADOR.search(sql)
