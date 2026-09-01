"""Ningun hueco NUEVO entre lo que el codigo escribe y lo que las migraciones crean.

POR QUE EXISTE
--------------
`Base.metadata.create_all` corre en cada arranque y crea lo que falte segun los
modelos. Eso TAPA los huecos de la cadena de migraciones: produccion acaba
teniendo columnas que ninguna migracion crea, el codigo funciona, y nadie se
entera hasta el dia que hay que restaurar desde cero.

Al medirlo aparecieron once, y no todos son lo mismo:

- `security_events.message/metadata`: produccion SI las tiene —vienen de la rama
  antigua de alembic— y la cadena SQL no. Hoy funciona; una restauracion, no.
  Es el caso puro de `create_all` tapando el hueco.
- `campaigns.from_email/from_name` y otros: no estan **en ninguna parte**. El
  INSERT falla hoy, en produccion, con «column does not exist».
- `invoices` y `ab_tests`: el servicio escribe una forma y la tabla tiene otra.
  Tres migraciones crean `invoices` y gana la primera por `IF NOT EXISTS`
  —quedan `invoices_pkey` e `invoices_pkey1`—; existe ademas `saas_invoices`. A
  cual pertenece cada servicio es alcance de producto, no una columna que anadir.

QUE HACE ESTA PRUEBA
--------------------
Un TRINQUETE. Los once estan inventariados en `huecos_conocidos.json` con su
clasificacion y su evidencia. Esta prueba falla si aparece uno que no este ahi.
No los tapa: los fija, para que la lista solo pueda encoger.

Se salta sin una base virgen: hace falta PostgreSQL reconstruido SOLO con las
migraciones, porque la pregunta es «si restauramos hoy, ¿funciona el codigo?» y
eso no se puede responder mirando produccion ni los modelos.

    NELVYON_VIRGEN_DSN=postgresql://.../nelvyon_rec_final
"""
import io
from pathlib import Path
import json
import os
import pathlib
import sys

import pytest

RAIZ = pathlib.Path(__file__).resolve().parents[2]
CERT = RAIZ / "backend" / "db" / "certificacion"
INVENTARIO = CERT / "huecos_conocidos.json"

DSN = os.environ.get("NELVYON_VIRGEN_DSN", "").strip()
sin_base_virgen = pytest.mark.skipif(
    not DSN, reason="sin NELVYON_VIRGEN_DSN (base reconstruida solo con migraciones)")


def _conocidos() -> set:
    datos = json.load(io.open(INVENTARIO, encoding="utf-8"))
    return {(h["tabla"], c) for h in datos["huecos"] for c in h["columnas"]}


def _medidos() -> set:
    sys.path.insert(0, str(CERT))
    import huecos_de_recuperacion as hr  # noqa: E402

    # El DSN entero, no solo el nombre: es la base que quien ejecuta eligio.
    esquema = hr.esquema_virgen(DSN)
    encontrados = set()
    for base in (RAIZ / "backend", RAIZ / "apps" / "web" / "src"):
        for ext in ("*.py", "*.ts", "*.tsx"):
            for f in base.rglob(ext):
                if any(x in str(f) for x in hr.EXCLUIDOS):
                    continue
                cuerpo = hr._sin_comentarios(
                    io.open(f, encoding="utf-8", errors="replace").read(),
                    f.suffix == ".py")
                for tabla, lista in hr.INSERCION.findall(cuerpo):
                    tabla = tabla.lower()
                    if tabla not in esquema:
                        continue
                    for col in hr._columnas_de(lista):
                        if col not in esquema[tabla]:
                            encontrados.add((tabla, col))
    return encontrados


CLASES = {"HUECO_DE_RECUPERACION", "ROTO_HOY", "TABLA_EQUIVOCADA_PROBABLE",
          "CODIGO_MUERTO"}


def test_el_inventario_esta_bien_formado():
    """Control: un inventario vacio o roto haria pasar el trinquete sin mirar."""
    datos = json.load(io.open(INVENTARIO, encoding="utf-8"))
    assert datos["huecos"], "el inventario esta vacio"
    for h in datos["huecos"]:
        assert h["columnas"], h["tabla"]
        assert h["clase"] in CLASES, h
        assert "origen" in h and h["origen"], h["tabla"]


def test_codigo_muerto_es_una_medicion_y_no_una_excusa():
    """`CODIGO_MUERTO` archiva un hueco: hay que DEMOSTRAR que esta muerto.

    Es la clase peligrosa del inventario. Las otras tres dicen "esto esta roto y
    lo sabemos"; esta dice "esto no cuenta". Sin nadie detras seria la escotilla
    obvia: reetiquetar cualquier hueco incomodo y quitarselo de encima.

    Asi que no basta con escribirlo. Se va al arbol y se comprueba que el fichero
    de origen no lo importa NADIE salvo el barril y su propia prueba. Si alguien
    lo conecta manana, esta prueba cae y el hueco vuelve a contar — que es
    exactamente lo que tiene que pasar, porque entonces ya no estara muerto.
    """
    datos = json.load(io.open(INVENTARIO, encoding="utf-8"))
    sys.path.insert(0, str(RAIZ / "backend" / "db" / "certificacion"))
    import huecos_de_recuperacion as hr  # noqa: E402

    muertos = [h for h in datos["huecos"] if h["clase"] == "CODIGO_MUERTO"]
    cerrados = datos.get("_cerrados_al_eliminar_codigo_muerto", {})
    eliminados = cerrados.get("modulos_eliminados", [])

    # HAY UNA SEGUNDA FORMA VALIDA DE NO TENER ENTRADAS `CODIGO_MUERTO`, Y ES
    # MEJOR QUE LA PRIMERA: que el codigo muerto se haya BORRADO.
    #
    # Esta prueba exigia que hubiera al menos una entrada, para que reetiquetar
    # un hueco incomodo como "muerto" no fuera una escotilla silenciosa. La
    # exigencia sigue en pie, pero se cumplia de una sola manera y eso castigaba
    # hacer lo correcto: al retirar InvoicingService y ABTestingService la lista
    # se quedo vacia y esto fallo.
    #
    # Asi que ahora se admiten las dos, y la segunda se comprueba MAS fuerte: no
    # basta con anotar que se borro, hay que demostrar que el fichero no esta.
    assert muertos or eliminados, (
        "no hay entradas CODIGO_MUERTO ni constancia de que se eliminara ninguna: "
        "esta prueba se quedo sin objeto")

    for rel in eliminados:
        assert not (RAIZ / rel).exists(), (
            f"`{rel}` figura como eliminado y sigue en el arbol. O vuelve al "
            "inventario con su clase, o se borra de verdad.")

    for h in muertos:
        assert h.get("vivo") is False, h["tabla"]
        assert len(h.get("nota", "")) > 80, f"{h['tabla']}: sin diagnostico escrito"

        modulo = Path(h["origen"]).stem          # p.ej. `InvoicingService`
        citas = []
        for base in (RAIZ / "backend", RAIZ / "apps" / "web" / "src"):
            for ext in ("*.ts", "*.tsx"):
                for f in base.rglob(ext):
                    if any(x in str(f) for x in hr.EXCLUIDOS):
                        continue
                    if f.name.startswith(modulo):        # el propio fichero
                        continue
                    if f.name == "index.ts":             # el barril
                        continue
                    if "__tests__" in str(f) and modulo in f.name:
                        continue                         # su prueba unitaria
                    if modulo in io.open(f, encoding="utf-8",
                                         errors="replace").read():
                        citas.append(str(f.relative_to(RAIZ)))

        assert not citas, (
            f"{modulo} esta inventariado como CODIGO_MUERTO pero lo cita: "
            f"{sorted(set(citas))[:5]}. Si algo lo usa, NO esta muerto y su hueco "
            "vuelve a contar como hueco de recuperacion.")


@sin_base_virgen
def test_no_hay_huecos_fuera_del_inventario():
    """El trinquete: la lista solo puede encoger."""
    nuevos = sorted(_medidos() - _conocidos())
    assert not nuevos, (
        f"huecos de recuperacion NUEVOS: {nuevos}. El codigo escribe columnas que "
        "la cadena oficial de migraciones no crea; una restauracion desde cero "
        "fallaria ahi.")


@sin_base_virgen
def test_el_inventario_no_se_queda_obsoleto():
    """Lo contrario tambien importa: un hueco arreglado sale de la lista.

    Un inventario que solo crece se convierte en una lista que nadie lee. Si una
    entrada ya no reproduce, hay que quitarla — y enterarse de que se arreglo.
    """
    resueltos = sorted(_conocidos() - _medidos())
    assert not resueltos, (
        f"estos huecos ya no reproducen y siguen inventariados: {resueltos}. "
        "Quitalos de huecos_conocidos.json.")
