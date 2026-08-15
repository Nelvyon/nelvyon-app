"""
SQL que solo funciona en SQLite.

`last_insert_rowid()` no existe en PostgreSQL, que es la base de produccion.
Estaba en tres sitios —`web_builder_service.generate`, `.restore` y
`social_auto_publish_service.schedule_posts`— y ninguno fallaba en los tests,
porque los tests corren sobre SQLite. Ese es justo el hueco que este guard
cierra: la suite no puede demostrar portabilidad si solo prueba un motor.

De paso desaparecio un defecto real: `generate` hacia un SELECT posterior a la
insercion y usaba su resultado sin comprobarlo. Cuando no encontraba la fila,
`site["slug"]` reventaba con `TypeError` y el cliente recibia un 500 con la
traza entera. Con `RETURNING` no hay segunda consulta que pueda fallar.
"""
from __future__ import annotations

import ast
import re
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parent.parent

#: Funciones y sintaxis que un motor entiende y el otro no.
SOLO_SQLITE = {
    "last_insert_rowid": "no existe en PostgreSQL; usar RETURNING",
    "AUTOINCREMENT": "PostgreSQL usa SERIAL/IDENTITY",
    "PRAGMA ": "sentencia exclusiva de SQLite",
    "datetime('now'": "PostgreSQL usa NOW() / CURRENT_TIMESTAMP",
}


#: Uso LEGITIMO: despachado por motor. `core/database.py` elige PRAGMA para
#: SQLite y DESCRIBE para el resto, asi que la sentencia exclusiva esta dentro
#: de la rama que le corresponde. Se declara el fichero y por que.
PERMITIDOS = {
    "PRAGMA ": {
        "core/database.py": "rama por motor: PRAGMA para SQLite, DESCRIBE para los demas",
    },
}


def _fuentes():
    for carpeta in ("services", "routers", "core"):
        for f in sorted((RAIZ / carpeta).rglob("*.py")):
            if "__pycache__" in str(f):
                continue
            yield f


def _sin_comentarios(src: str) -> str:
    """Quita comentarios: nombrar el problema al explicarlo no es usarlo."""
    return "\n".join(re.sub(r"#.*$", "", linea) for linea in src.split("\n"))


def test_el_barrido_llega_al_codigo():
    """Sin esto, una ruta mal formada daria cero hallazgos y pareceria limpio."""
    ficheros = list(_fuentes())
    assert len(ficheros) > 100, f"solo {len(ficheros)} ficheros barridos"


@pytest.mark.parametrize("patron,motivo", sorted(SOLO_SQLITE.items()))
def test_ningun_servicio_usa_sql_exclusivo_de_sqlite(patron, motivo):
    culpables = []
    for f in _fuentes():
        rel = str(f.relative_to(RAIZ)).replace("\\", "/")
        if patron not in _sin_comentarios(f.read_text(encoding="utf-8")):
            continue
        motivo_permitido = PERMITIDOS.get(patron, {}).get(rel)
        if motivo_permitido:
            assert len(motivo_permitido) > 20, f"{rel} permitido sin motivo"
            continue
        culpables.append(rel)
    assert culpables == [], f"{patron}: {motivo} · {culpables}"


def test_el_detector_encontraria_el_patron_si_volviese():
    """
    Positivo conocido: cero hallazgos solo vale si el detector detecta. Se le
    da el texto exacto que tenia el codigo antes de la correccion.
    """
    antes = '        site_id_row = await self.session.execute(text("SELECT last_insert_rowid() AS id"))'
    assert "last_insert_rowid" in _sin_comentarios(antes)


@pytest.mark.parametrize("fichero,funcion", [
    ("services/web_builder_service.py", "generate"),
    ("services/web_builder_service.py", "restore_version"),
])
def test_la_insercion_comprueba_que_devolvio_fila(fichero, funcion):
    """
    Usar el resultado de una insercion sin comprobarlo daba un `TypeError` y un
    500 con la traza entera en la respuesta.
    """
    src = (RAIZ / fichero).read_text(encoding="utf-8")
    arbol = ast.parse(src)
    fn = [
        n for n in ast.walk(arbol)
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name == funcion
    ]
    if not fn:
        pytest.skip(f"{funcion} no existe en {fichero}")
    cuerpo = ast.unparse(fn[0])
    assert "mappings().first()" in cuerpo
    assert "is None" in cuerpo, "se usa el resultado de la insercion sin comprobarlo"
