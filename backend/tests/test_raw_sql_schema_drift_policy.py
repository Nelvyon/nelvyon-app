"""
Politica del guard de deriva raw-SQL sobre el repositorio real.

    DRIFT      -> FALLA
    UNRESOLVED -> trinquete, no puede crecer en silencio

Esa asimetria es deliberada. Un DRIFT es una columna atribuida CON CONFIANZA a
una tabla y ausente del esquema: rompe produccion con `column does not exist`.
Un UNRESOLVED es SQL que el analizador declara honestamente fuera de su alcance
—JOINs sin cualificar, varias tablas— y fallar por ellos seria ruido. Pero
tampoco pueden crecer sin que nadie mire.

Los positivos controlados viven en `test_raw_sql_schema_drift_guard.py` y son
parte de esta certificacion: si dejan de detectar sus casos, un `DRIFT: 0` aqui
no significa nada.
"""
from __future__ import annotations

from collections import Counter

from tests._raw_sql_schema_drift import divergencias, no_resueltos, usos_en_sql_crudo

#: Excepciones. Vacia a proposito: una lectura de columna inexistente devuelve
#: 500 igual que una escritura. Toda entrada exige tabla, columna, fichero y
#: motivo; nunca una regla generica por fichero.
PERMITIDAS: dict[tuple[str, str], dict[str, str]] = {}

#: Linea base medida en v2.1. El techo evita crecimiento silencioso; el suelo
#: obliga a bajarlo explicitamente cuando mejore, para que no se afloje solo.
#: Bajo de 120 a 113 al alinear `social_posts` con su tabla real: dos consultas
#: unian por `project_id`, columna que esa tabla nunca tuvo, y el JOIN ambiguo
#: desaparecio con ellas. El trinquete solo puede apretarse.
#: Sube de 113 a 116 al entrar el nucleo de Autopilot (`core/autopilot.py`).
#: Las tres nuevas son del mismo tipo —`multiples_from`— y salen de la consulta
#: de reclamo de trabajo, que usa un CTE con `FOR UPDATE SKIP LOCKED` y por tanto
#: menciona `autopilot_jobs` en dos bloques. No es deriva de esquema: el
#: analizador no sabe seguir un CTE, y esas tablas las crea la migracion 551.
UNRESOLVED_BASELINE = 116
UNRESOLVED_POR_MOTIVO = {"join_ambiguo": 87, "multiples_from": 29}

#: Drift conocido pendiente de decision de migracion. NO es una allowlist: el
#: test falla si aparece cualquier otro, y falla tambien si estos desaparecen
#: sin actualizar la lista.
#: 8 -> 0. Las siete columnas se investigaron una a una y NINGUNA requeria
#: migracion: seis readers leian columnas que ningun writer escribe y la septima
#: era un bug logico de senal de churn. La lista queda vacia, no allowlisted.
DRIFT_CONOCIDO: set[tuple[str, str]] = set()


def test_el_analizador_esta_vivo():
    """Sin esto, cualquier `0 drift` seria indistinguible de un detector muerto."""
    usos = usos_en_sql_crudo()
    tipos = Counter(u.tipo for u in usos)
    assert len(usos) > 2000, f"solo {len(usos)} usos: el escaner no esta leyendo el repo"
    assert tipos["INSERT"] > 1000 and tipos["UPDATE"] > 300
    # Las lecturas son el 35% del total: si caen a cero, la parte v2 murio.
    assert tipos["SELECT"] > 500, "el analisis de lecturas dejo de funcionar"
    assert tipos["ORDER BY"] > 50


def test_no_aparece_drift_nuevo():
    encontrado = {(d.tabla, d.columna) for d in divergencias()}
    nuevos = encontrado - DRIFT_CONOCIDO - set(PERMITIDAS)
    assert not nuevos, (
        "columnas usadas en SQL crudo que ningun esquema crea: "
        + ", ".join(f"{t}.{c}" for t, c in sorted(nuevos))
        + ". Anade la migracion correspondiente o justifica la excepcion."
    )


def test_el_drift_conocido_no_se_amplia_ni_se_pierde():
    """Si se corrige, hay que actualizar la lista: no se relaja sola."""
    encontrado = {(d.tabla, d.columna) for d in divergencias()}
    resueltos = DRIFT_CONOCIDO - encontrado
    assert not resueltos, (
        "estas divergencias ya no existen; quitalas de DRIFT_CONOCIDO: "
        + ", ".join(f"{t}.{c}" for t, c in sorted(resueltos))
    )


def test_trinquete_de_unresolved():
    usos_en_sql_crudo()
    total = len(no_resueltos)
    assert total <= UNRESOLVED_BASELINE, (
        f"{total} referencias no atribuibles (base {UNRESOLVED_BASELINE}). "
        f"SQL nuevo fuera del alcance del analizador: revisalo antes de entrar."
    )
    assert total >= UNRESOLVED_BASELINE, (
        f"bajo a {total}: actualiza UNRESOLVED_BASELINE para que el trinquete siga apretado"
    )


def test_el_desglose_de_unresolved_es_estable():
    """Un total igual con reparto distinto tambien es un cambio que mirar."""
    usos_en_sql_crudo()
    real = dict(Counter(u.tabla for u in no_resueltos))
    assert real == UNRESOLVED_POR_MOTIVO, f"reparto cambiado: {real}"


def test_toda_excepcion_esta_justificada():
    for clave, meta in PERMITIDAS.items():
        assert meta.get("motivo"), f"{clave} sin motivo"
        assert meta.get("fichero"), f"{clave} sin fichero"
