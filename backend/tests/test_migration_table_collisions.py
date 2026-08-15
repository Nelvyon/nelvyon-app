"""Dos migraciones no pueden definir la misma tabla de formas distintas.

LA CAUSA RAIZ QUE ESTE FICHERO FIJA
-----------------------------------
Todas las migraciones usan `CREATE TABLE IF NOT EXISTS`. Es lo correcto para ser
idempotentes, pero tiene una consecuencia que no se ve: si dos ficheros declaran
la MISMA tabla con columnas distintas, gana el que corre antes —el de numero mas
bajo— y el otro no hace nada. En silencio. Sin aviso.

El codigo que se escribio mirando la segunda definicion compila, pasa los tests
sobre SQLite —que construye las tablas desde los modelos, no desde las
migraciones— y falla contra PostgreSQL real. Asi aparecieron la mayoria de los
20 casos de `NOT_NULL_DRIFT` de `test_pg_constraint_drift_certification.py`: no
son veinte errores independientes de veinte programadores, son writers escritos
contra una definicion que nunca llega a aplicarse.

Ejemplo medido: `audit_logs` lo declaran 412 (`tenant_id uuid`, `module`,
`details`) y 507 (`tenant_id integer`, `old_value`, `new_value`). Gana 412 por
numeracion. `services/audit_service.py` escribe la forma de 507, asi que al
reconstruir la base desde cero el rastro de auditoria no puede escribirse.

QUE HACE ESTE TEST Y QUE NO
---------------------------
NO arregla las 15 colisiones: cual definicion debe ganar en cada una es una
decision con consecuencias sobre datos existentes, y varias tienen consumidores
vivos enfrentados. Estan documentadas en `docs/NELVYON_CLOSURE_STATE.md`.

Lo que hace es impedir que crezcan. Una colision nueva se detecta el dia que se
introduce, que es cuando cuesta barata: mover una definicion antes de desplegar
es trivial; despues exige migrar datos.

El patron que el repositorio ya usa para resolver una —renombrar la perdedora
solo si esta vacia, abortar si tiene filas— esta en
`506a_reconcile_legacy_pre_507_social_posts.sql` y en la migracion 532.
"""
from __future__ import annotations

import collections
import re
from pathlib import Path

MIGRACIONES = Path(__file__).resolve().parent.parent / "db" / "migrations"

#: `CREATE TABLE [IF NOT EXISTS] [public.]nombre ( ... );`
#: El cierre exige `\n)` para no cortar en el primer parentesis de un tipo como
#: `NUMERIC(10,2)`.
_CREA = re.compile(
    r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?"
    r"([a-z_][a-z0-9_]*)\s*\((.*?)\n\)\s*;",
    re.IGNORECASE | re.DOTALL,
)

_COMENTARIO = re.compile(r"--[^\n]*")

#: Colisiones medidas el 2026-08-13 sobre las 432 migraciones. Cada entrada es
#: una tabla que mas de un fichero declara con un conjunto de columnas distinto.
#: Documentadas, no aceptadas: ver NELVYON_CLOSURE_STATE.md.
COLISIONES_CONOCIDAS = frozenset({
    "ab_experiments",
    "ab_variants",
    "affiliate_clicks",
    "api_keys",
    "audit_logs",
    "bookings",
    "chatbot_conversations",
    "crm_activities",
    "crm_contacts",
    "invoices",
    "os_tasks",
    "qr_codes",
    "retail_results",
    "stripe_webhook_events",
    "webhook_deliveries",
})


def _columnas(cuerpo: str) -> frozenset:
    fuera = set()
    for trozo in cuerpo.split(","):
        trozo = trozo.strip()
        if not trozo or not re.match(r'^["a-z_]', trozo, re.IGNORECASE):
            continue
        fuera.add(trozo.split()[0].strip('"').lower())
    return frozenset(fuera)


def _declaraciones() -> dict:
    """tabla -> [(fichero, columnas)] para cada CREATE TABLE del repositorio."""
    fuera = collections.defaultdict(list)
    for fichero in sorted(MIGRACIONES.glob("*.sql")):
        texto = _COMENTARIO.sub("", fichero.read_text(encoding="utf-8", errors="replace"))
        for tabla, cuerpo in _CREA.findall(texto):
            fuera[tabla.lower()].append((fichero.name, _columnas(cuerpo)))
    return fuera


def _colisiones() -> dict:
    return {
        tabla: decls
        for tabla, decls in _declaraciones().items()
        if len(decls) > 1 and len({cols for _, cols in decls}) > 1
    }


def test_el_extractor_lee_las_migraciones():
    """Control positivo. Si el regex se rompe, todo lo demas daria verde vacio."""
    decls = _declaraciones()
    assert len(decls) > 400, (
        f"solo {len(decls)} tablas encontradas en las migraciones: el extractor "
        "esta roto y no se estaria comprobando nada"
    )
    assert "subscriptions" in decls
    assert "audit_logs" in decls


def test_el_extractor_detecta_una_colision_conocida():
    """Segundo control positivo: que sepa distinguir definiciones distintas.

    `audit_logs` es el caso medido: 412 lo declara con `module` y `details`, 507
    con `old_value` y `new_value`. Si el detector no lo ve, no vera ninguna.
    """
    colisiones = _colisiones()
    assert "audit_logs" in colisiones, (
        "el detector no distingue dos definiciones distintas de la misma tabla"
    )
    ficheros = {f for f, _ in colisiones["audit_logs"]}
    assert any(f.startswith("412") for f in ficheros)
    assert any(f.startswith("507") for f in ficheros)


def test_el_extractor_no_inventa_colisiones():
    """Control negativo: dos CREATE TABLE IGUALES no son una colision.

    Repetir una definicion identica es idempotencia, no un conflicto. Si esto
    fallara, la lista se llenaria de ruido y acabaria ignorandose.
    """
    decls = _declaraciones()
    repetidas_identicas = [
        t for t, v in decls.items() if len(v) > 1 and len({c for _, c in v}) == 1
    ]
    colisiones = set(_colisiones())
    assert not (set(repetidas_identicas) & colisiones)


def test_no_hay_colisiones_nuevas():
    """La guardia. Una colision nueva se arregla moviendo la definicion; una
    colision desplegada se arregla migrando datos."""
    nuevas = sorted(set(_colisiones()) - COLISIONES_CONOCIDAS)
    assert not nuevas, (
        "estas tablas las declara mas de una migracion con columnas distintas.\n"
        "Gana la de numero mas bajo y la otra no hace nada, sin aviso; el codigo "
        "escrito contra la perdedora fallara contra PostgreSQL real:\n  "
        + "\n  ".join(nuevas)
        + "\n\nUnificar la definicion, o apartar la perdedora siguiendo el patron "
        "de 506a / 532 (renombrar solo si esta vacia)."
    )


def test_la_lista_de_colisiones_no_esta_caducada():
    """Si una colision se resuelve, debe borrarse de la lista explicitamente.

    Una lista que conserva problemas ya resueltos deja de describir la realidad y
    nadie vuelve a mirarla.
    """
    resueltas = sorted(COLISIONES_CONOCIDAS - set(_colisiones()))
    assert not resueltas, (
        "estas colisiones ya no ocurren; borrarlas de COLISIONES_CONOCIDAS:\n  "
        + "\n  ".join(resueltas)
    )
