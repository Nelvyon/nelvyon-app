"""Lo que el fundador aparto no puede viajar en el commit que se despliega.

EL AGUJERO QUE CIERRA
---------------------
La puerta ADR-064 es BINARIA. `NELVYON_PROD_MIGRATE_APPROVED=1` habilita
`migrate:prod`, y `migrate:prod` aplica TODAS las migraciones pendientes del
commit desplegado. No existe forma de decirle «estas cinco si, esa no».

Asi que pedir autorizacion para 568/569/570/572/573 con la 571 en el arbol la
aplicaria tambien: una migracion que el fundador aparto explicitamente, dentro
de una ventana que el mismo abrio, sin un solo error en el log. El deploy saldria
verde y el esquema tendria una tabla que nadie autorizo.

POR QUE NO BASTA EL MENSAJE DE COMMIT
--------------------------------------
Los commits de 567 y 572 llevan «NO MERGEAR» en el asunto. Un mensaje no ejecuta
nada: no habria impedido el merge ni el apply. La proteccion tiene que ser que
el fichero NO ESTE, y algo que lo compruebe.

POR QUE SE LEE DE UN DOCUMENTO Y NO DE UNA LISTA EN CODIGO
-----------------------------------------------------------
La lista vive en `APARTADAS.md`, junto al motivo y al comando para recuperarla.
Una constante en un fichero de pruebas se queda sin contexto y acaba borrandose
«porque ya no hace falta». Un documento con la razon escrita se lee antes de
tocarlo.
"""
from __future__ import annotations

import pathlib
import re

import pytest

MIGRACIONES = pathlib.Path(__file__).resolve().parents[1] / "db" / "migrations"
APARTADAS = MIGRACIONES / "APARTADAS.md"


def _apartadas() -> dict[str, str]:
    """Numero -> fichero, leidos de las filas de la tabla de `APARTADAS.md`."""
    texto = APARTADAS.read_text(encoding="utf-8")
    fuera = {}
    for fila in re.findall(r"^\|\s*(\d{3})\s*\|\s*`([^`]+)`\s*\|", texto, re.M):
        fuera[fila[0]] = fila[1]
    return fuera


def test_el_documento_de_apartadas_existe_y_se_deja_leer():
    """Sin esto, borrar el documento dejaria la prueba de abajo en verde vacio.

    Cero apartadas y «no encuentro el documento» se veen igual desde fuera: las
    dos dan una lista vacia y ninguna violacion. Se separan aqui.
    """
    assert APARTADAS.exists(), (
        "falta `db/migrations/APARTADAS.md`: la comprobacion de abajo pasaria "
        "sin mirar nada")
    assert _apartadas(), (
        "el documento no declara ninguna migracion apartada. Si de verdad no "
        "queda ninguna, borra tambien esta bateria explicando por que; si no, "
        "la tabla se rompio y la guardia esta muerta")


@pytest.mark.parametrize("numero", sorted(_apartadas()))
def test_las_migraciones_apartadas_no_estan_en_el_arbol(numero):
    """LA PRUEBA. Presente en el arbol = aplicable en la proxima ventana."""
    presentes = [f.name for f in MIGRACIONES.glob(f"{numero}_*.sql")]
    assert not presentes, (
        f"la migracion {numero} esta apartada y sigue en el arbol: {presentes}. "
        f"La puerta ADR-064 aprueba TODAS las pendientes a la vez, asi que la "
        f"proxima ventana autorizada la aplicaria sin que nadie lo pidiera.")


def test_la_guardia_distingue_una_apartada_de_una_normal():
    """EL CONTROL. Si el glob estuviera mal, no encontraria NADA y aprobaria.

    Se comprueba contra una migracion que SI debe estar: si tampoco la ve, el
    patron de busqueda esta roto y la prueba de arriba no vale nada.
    """
    autorizadas = [f.name for f in MIGRACIONES.glob("568_*.sql")]
    assert autorizadas, (
        "el patron de busqueda no encuentra ni la 568, que si esta en el arbol: "
        "la comprobacion de las apartadas estaria pasando por no mirar bien")
