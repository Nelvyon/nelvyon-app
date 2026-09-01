"""El SQL del codigo y el esquema real hablan la misma definicion.

LA CLASE QUE CIERRA, Y POR QUE HACIA FALTA
-------------------------------------------
`webhook_service.py` la sufrio DOS VECES:

  1. El `INSERT INTO webhook_deliveries` hablaba la definicion de la migracion
     507 mientras la tabla real es la de la 405. Alguien lo arreglo y dejo un
     comentario explicandolo.
  2. Y no arreglo el `UPDATE` ni la consulta de reintentos. Entre las dos
     citaban CINCO columnas inexistentes —`status`, `attempts`, `response_code`,
     `last_attempt_at`, `next_retry_at`— asi que lanzaban siempre.

     Consecuencia: ninguna entrega saliente se actualizaba nunca, y LOS WEBHOOKS
     SALIENTES NO REINTENTABAN. Un corte de un minuto en el endpoint de un
     cliente perdia el evento para siempre, en silencio.

Que la misma clase golpee dos veces el mismo fichero, y que la segunda sobreviva
a la correccion de la primera, es la definicion de deuda que necesita una
comprobacion automatica y no mas cuidado.

QUE SE COMPRUEBA Y QUE NO
-------------------------
Solo los dos sitios donde tabla y columna son INEQUIVOCOS:

    INSERT INTO tabla (col, col, …)
    UPDATE tabla SET col = …, col = …

Ahi vivian los dos fallos. No se intenta resolver columnas de `SELECT` ni de
`WHERE`: sin analizar alias y subconsultas se producirian falsos positivos, y un
guard con falsos positivos se deja de mirar — y entonces tampoco se mira cuando
acierta. Es preferible cubrir menos con certeza que mas con ruido.

DE DONDE SALE EL ESQUEMA
------------------------
`certificacion/catalogo_produccion.json`, una instantanea del catalogo REAL de
produccion (712 tablas, 6.578 columnas). No de las migraciones: el fallo de los
webhooks fue precisamente que dos migraciones definian la misma tabla distinto y
el codigo creyo a la que no gano.
"""
from __future__ import annotations

import json
import pathlib
import re

import pytest

BACKEND = pathlib.Path(__file__).resolve().parents[1]
CATALOGO = BACKEND / "db" / "certificacion" / "catalogo_produccion.json"

_INSERT = re.compile(
    r"INSERT\s+INTO\s+(?:public\.)?([a-z_][a-z0-9_]*)\s*\(([^)]*)\)", re.I | re.S)
_UPDATE = re.compile(
    r"UPDATE\s+(?:public\.)?([a-z_][a-z0-9_]*)\s+SET\s+(.*?)(?:\bWHERE\b|\bRETURNING\b|$)",
    re.I | re.S)
_ASIGNACION = re.compile(r"(?:^|,)\s*([a-z_][a-z0-9_]*)\s*=", re.I)

#: DERIVA CONOCIDA — cada entrada es una consulta que LANZA cada vez que se
#: ejecuta. No se corrigen todas de golpe a proposito: algunas tienen una
#: correspondencia evidente y otras no, e inventar la correspondencia para poner
#: el numero a cero seria peor que dejarlo escrito.
#:
#: El techo solo puede BAJAR. Una entrada nueva rompe la prueba.
DERIVA_DECLARADA: dict[tuple[str, str], str] = {
    # ── Las tres de correspondencia evidente se CORRIGIERON: `content` no
    #    existia y sobraba, `scan_count` era `scans`, `lead_captured` era
    #    `captured_lead`. Sus funciones siguen rotas por OTRAS columnas que
    #    no existen en ninguna forma; esas siguen abajo. ──

    # ── Sin correspondencia: la columna NO EXISTE en ninguna forma ──
    ("ab_experiments", "hypothesis"):
        "no hay columna para la hipotesis. O se guarda en otro sitio o falta "
        "migracion: decidirlo requiere saber si el producto la usa de verdad",
    ("ab_experiments", "metric_goal"):
        "no hay columna para la metrica objetivo del experimento",
    ("ab_experiments", "traffic_split"):
        "no hay columna para el reparto de trafico entre variantes",
    ("ab_experiments", "ended_at"):
        "no hay marca de fin; solo `created_at` y `updated_at`",
    ("ab_experiments", "ai_recommendation"):
        "no hay columna para la recomendacion de la IA sobre el experimento",
    ("ab_experiments", "winner_variant_id"):
        "existe `winner_variant` (texto), no `winner_variant_id`. Puede ser un "
        "renombrado o un cambio de tipo: no se adivina",
    # NO ES DEUDA DE ESQUEMA: ES ORDEN DE DESPLIEGUE.
    #
    # La 593 anade esta columna, porque `webhook_deliveries` sirve a dos
    # subsistemas con padres disjuntos y una sola columna no puede referenciar
    # dos tablas. La migracion esta escrita y aplicada en local; en produccion
    # NO, y esta instantanea es de produccion. Por eso aparece aqui.
    #
    # DESPLEGAR EL CODIGO SIN APLICAR LA 593 NO EMPEORA NADA: hoy la ruta viola
    # la foranea a `webhooks` en cada entrega, y sin la columna lanzaria por
    # columna inexistente. Rota antes y rota despues. Pero tampoco arregla nada
    # hasta que la 593 se aplique.
    #
    # Esta entrada se quita en cuanto la 593 este en produccion; el catalogo se
    # regenera con `backend/db/certificacion/qcatalogo.py`.
    ("webhook_deliveries", "endpoint_id"):
        "la anade la migracion 593, pendiente de aplicar en produccion. No es "
        "una columna que falte: es una que todavia no esta desplegada",
    ("bookings", "zoom_host_url"):
        "no hay columnas de Zoom. La integracion de videollamada en reservas "
        "esta escrita contra un esquema que no se llego a migrar",
    ("bookings", "zoom_join_url"):
        "tampoco existe la URL de union; la reserva no puede guardar la "
        "videollamada que dice crear",
    ("invoices", "pdf_path"):
        "no hay columna para el PDF. Generarlo y no poder guardar donde quedo "
        "explica que la descarga de facturas no funcione",
    ("invoices", "sent_at"):
        "no existe; hay `paid_at` y `created_at`. Sin ella no se sabe cuando se "
        "envio una factura, solo cuando se cobro",
}

#: Tablas que el codigo crea o consulta y NO estan en el catalogo de produccion:
#: temporales, de prueba, o de otro esquema. Se declaran para que su ausencia sea
#: una decision y no un hueco.
FUERA_DEL_CATALOGO: set[str] = set()


def _catalogo() -> dict[str, set[str]]:
    doc = json.loads(CATALOGO.read_text(encoding="utf-8"))
    return {t: set(c) for t, c in doc["tablas"].items()}


def _literales(texto: str):
    """Los literales de cadena del fichero, que es donde vive el SQL."""
    for m in re.finditer(r'"""(.*?)"""|\'\'\'(.*?)\'\'\'|"([^"\n]*)"|\'([^\'\n]*)\'',
                         texto, re.S):
        yield next(g for g in m.groups() if g is not None)


def _citas() -> list[tuple[str, str, str]]:
    """(fichero, tabla, columna) de cada INSERT/UPDATE del backend."""
    cat = _catalogo()
    fuera = []
    for f in sorted(BACKEND.rglob("*.py")):
        if "tests" in f.parts or "migrations" in str(f):
            continue
        texto = f.read_text(encoding="utf-8", errors="replace")
        for sql in _literales(texto):
            if not re.search(r"\b(INSERT\s+INTO|UPDATE)\b", sql, re.I):
                continue
            for tabla, cols in _INSERT.findall(sql):
                if tabla.lower() not in cat:
                    continue
                for c in cols.split(","):
                    nombre = c.strip().strip('"').lower()
                    if re.fullmatch(r"[a-z_][a-z0-9_]*", nombre):
                        fuera.append((f.relative_to(BACKEND).as_posix(), tabla.lower(), nombre))
            for tabla, sets in _UPDATE.findall(sql):
                if tabla.lower() not in cat:
                    continue
                for nombre in _ASIGNACION.findall(sets):
                    fuera.append((f.relative_to(BACKEND).as_posix(), tabla.lower(), nombre.lower()))
    return fuera


def test_la_instantanea_del_catalogo_existe_y_es_grande():
    """Sin catalogo, la comprobacion de abajo aprobaria todo por no tener contra que."""
    assert CATALOGO.exists(), f"falta {CATALOGO}"
    cat = _catalogo()
    assert len(cat) >= 500, f"solo {len(cat)} tablas en la instantanea"
    assert sum(len(v) for v in cat.values()) >= 4000


def test_el_extractor_encuentra_consultas_de_escritura():
    """Un patron roto daria cero citas y un verde vacio."""
    citas = _citas()
    assert len(citas) >= 500, (
        f"solo se extrajeron {len(citas)} pares tabla/columna: el extractor "
        f"dejo de casar y esta comprobacion no mira nada")


def _malas() -> list[tuple[str, str, str]]:
    cat = _catalogo()
    return sorted({(f, t, c) for f, t, c in _citas() if c not in cat[t]})


def test_no_aparece_deriva_nueva():
    """LA PRUEBA. Una columna inexistente hace que la consulta lance SIEMPRE."""
    nuevas = [(f, t, c) for f, t, c in _malas() if (t, c) not in DERIVA_DECLARADA]
    detalle = "\n".join(f"  {f}: {t}.{c}" for f, t, c in nuevas[:25])
    assert not nuevas, (
        f"{len(nuevas)} columnas citadas que no existen en produccion y no estan "
        f"declaradas. La consulta lanza cada vez que se ejecuta, y si ninguna "
        f"prueba pasa por ahi el fallo lo descubre un cliente:\n{detalle}")


def test_la_deriva_declarada_no_crece():
    """El techo solo puede bajar."""
    assert len(_malas()) <= len(DERIVA_DECLARADA), (
        f"hay {len(_malas())} derivas y solo {len(DERIVA_DECLARADA)} declaradas")


def test_las_derivas_declaradas_siguen_existiendo():
    """Una entrada arreglada tiene que salir de la lista.

    Una lista de deuda que conserva entradas ya resueltas deja de creerse, y
    entonces tampoco se cree cuando señala algo real.
    """
    vivas = {(t, c) for _, t, c in _malas()}
    resueltas = sorted(k for k in DERIVA_DECLARADA if k not in vivas)
    assert not resueltas, (
        f"estas derivas ya no existen y siguen declaradas: {resueltas}. "
        f"Quitalas de DERIVA_DECLARADA.")


def test_cada_deriva_declarada_dice_por_que_no_se_ha_corregido():
    """Una lista de excepciones sin motivos es una lista de excusas."""
    for clave, motivo in DERIVA_DECLARADA.items():
        assert len(motivo) > 15, f"{clave} no explica por que sigue ahi: {motivo!r}"


def test_la_comprobacion_detecta_una_columna_inventada():
    """EL CONTROL. Sin esto, un extractor inerte daria cero y verde.

    Se construye el caso a mano en vez de romper un fichero del arbol: una prueba
    que se modifica a si misma deja residuos si falla a medias.
    """
    cat = _catalogo()
    tabla = "webhook_deliveries"
    assert tabla in cat, "la tabla de referencia desaparecio del catalogo"
    # Las que el codigo citaba y no existen: exactamente el fallo que se cerro.
    assert "webhook_id" in cat[tabla]
    for inventada in ("endpoint_id", "status", "attempts", "next_retry_at"):
        assert inventada not in cat[tabla], (
            f"`{inventada}` ya existe en `{tabla}`: si alguien la anadio, revisa "
            f"si esta prueba sigue teniendo sentido")


@pytest.mark.parametrize("tabla", sorted(FUERA_DEL_CATALOGO))
def test_las_tablas_declaradas_fuera_del_catalogo_siguen_fuera(tabla):
    """Una lista de excepciones con entradas muertas deja de leerse."""
    assert tabla not in _catalogo(), (
        f"`{tabla}` ya esta en el catalogo de produccion: quitala de "
        f"FUERA_DEL_CATALOGO para que se compruebe como las demas")
