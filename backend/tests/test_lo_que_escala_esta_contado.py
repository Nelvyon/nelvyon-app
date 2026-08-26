"""BLOQUE 8 · lo que escala está contado.

Guardián del inventario de puntos de escalado. Dos direcciones, como siempre:
que no aparezcan clases nuevas sin que nadie las mire, y que el detector no se
vuelva verde por dejar de ver.

La segunda mitad no es teórica: al construir este inventario, el detector de
huérfanos encontró tres mapas de módulo (`export const ... = new Map()`) que mi
propia clase no reconocía porque solo miraba `const` y `let` al principio de
línea. Un detector de huérfanos que solo confirma lo que ya sabías no sirve para
nada; este encontró un hueco en su propio dueño.
"""

from __future__ import annotations

import re

from backend.db.certificacion import puntos_de_escalado as inv

# Medido al cerrar el bloque. No es una meta: es un SUELO. Si el numero se
# desploma, lo que ha pasado es que un patron ha dejado de casar.
SUELO = {
    "pool_y_transacciones": 10,
    "estado_en_proceso": 60,
    "lecturas_sin_cota": 400,
    "trabajo_en_serie": 100,
    "temporizadores": 20,
    "abanico_sin_cota": 4,
    "limites_y_backpressure": 600,
}


def test_el_arbol_es_el_arbol() -> None:
    n = len(inv.fuentes())
    assert n >= 3000, (
        f"solo {n} ficheros de produccion: la raiz apunta mal y todo lo demas "
        "mediria el vacio."
    )


def test_ninguna_clase_se_queda_sin_puntos() -> None:
    """Una clase vacía es un patrón roto, no un árbol limpio."""
    p = inv.puntos()
    vacias = [c for c, _ in inv.CLASES if not p[c]]
    assert not vacias, (
        f"clases sin un solo punto: {vacias}. En un arbol de 4000 ficheros eso no "
        "significa que no haya: significa que el patron ha dejado de verlos."
    )


def test_cada_clase_mantiene_su_suelo() -> None:
    p = inv.puntos()
    bajas = []
    for clase, minimo in SUELO.items():
        n = sum(x for _, x in p[clase])
        if n < minimo:
            bajas.append(f"{clase}: {n} < {minimo}")
    assert not bajas, (
        f"clases por debajo de su suelo: {bajas}. Si el arbol de verdad ha mejorado "
        "tanto, baja el suelo A MANO y explica por que; si no, el patron esta roto."
    )


def test_cero_huerfanos() -> None:
    """Lo que la deteccion generica ve y ninguna clase reconoce."""
    h = inv.huerfanos()
    assert not h, (
        f"{len(h)} ficheros con forma de escalado que ninguna clase recoge: "
        f"{h[:15]}. O falta una clase, o una clase se ha quedado corta."
    )


def test_el_detector_de_huerfanos_sabe_decir_que_si() -> None:
    """CONTROL POSITIVO: la prueba de arriba espera cero.

    Una regla rota tambien devuelve cero, y en verde las dos se ven igual. Se le
    ponen delante formas escritas a mano y se exige que las reconozca.
    """
    generico = re.compile(
        r"Promise\.all\(\s*(?!\[)|\.forEach\(\s*async|while\s*\(\s*true\s*\)|"
        r"\.reduce\(\s*async|^(?:export\s+)?(?:const|let)\s+\w+\s*[:=][^=\n]*new\s+(?:Map|Set|WeakMap)|"
        r"setInterval\(|withTransaction\(|FOR\s+UPDATE",
        re.S | re.M,
    )
    for hostil in [
        "const cache = new Map<string, number>();",
        "export const buckets = new Map();",
        "setInterval(() => tick(), 1000);",
        "await Promise.all(items.map(x => f(x)));",
        "while (true) { await siguiente(); }",
        "rows.forEach(async (r) => await guardar(r));",
    ]:
        assert generico.search(hostil), f"el generico NO ve {hostil!r}"
    for inocente in [
        "const m = new Map([[1, 2]]);".replace("const m", "  const m"),  # local
        "await Promise.all([a(), b(), c()]);",
        "const x = 1;",
    ]:
        assert not generico.search(inocente), (
            f"el generico grita por {inocente!r}, que esta acotado por construccion. "
            "Una regla que grita por todo se acaba silenciando entera."
        )


def test_el_pool_de_postgres_sigue_siendo_configurable() -> None:
    """`NELVYON_DB_POOL_MAX` es lo que hace medibles las pruebas de agotamiento.

    Sin poder bajar el tamano del pool, «que pasa cuando se agotan las
    conexiones» no se puede provocar en local sin abrir cientos de conexiones —
    y una prueba que no se puede provocar es una prueba que no se ejecuta.
    """
    src = (inv.RAIZ / "backend" / "db" / "DbClient.ts").read_text(
        encoding="utf-8", errors="replace"
    )
    assert "NELVYON_DB_POOL_MAX" in src, "ya no se puede fijar el tamano del pool"
    assert "connectionTimeoutMillis" in src, (
        "el pool ya no tiene plazo de espera de conexion: una peticion esperaria "
        "para siempre a que se libere una, que es como una saturacion se convierte "
        "en una caida."
    )
