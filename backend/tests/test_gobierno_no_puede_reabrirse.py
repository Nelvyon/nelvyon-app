"""El guard que impide que alguien vuelva a abrir la puerta.

POR QUE NO BASTA CON LA MIGRACION 559
--------------------------------------
La 559 retira la escritura sobre las seis tablas que gobiernan a NELVYON. Pero
una revocacion no es permanente: basta un `GRANT ... ON ALL TABLES IN SCHEMA
public TO nelvyon_app` —una linea perfectamente normal en un script de
aprovisionamiento o en una migracion futura— para devolverla entera, en silencio
y sin que ninguna prueba de producto se entere.

Y no es hipotetico: la fixture de `test_rls_activacion_parcial` hacia exactamente
eso. Reconstruia la postura de despliegue con el GRANT masivo, deshacia la 559 en
la base de certificacion y tapaba la proteccion. Se descubrio porque el guard de
gobierno empezo a fallar solo en la suite completa.

QUE VIGILA ESTE FICHERO
-----------------------
Dos cosas distintas, porque son dos vias distintas de reabrir la puerta:

    ESTATICA    ninguna migracion ni script puede conceder escritura masiva sin
                volver a cerrar despues. Se lee el repositorio.
    EFECTIVA    el privilegio real en la base, tras aplicarlo TODO. Es la unica
                que no se puede burlar escribiendo el GRANT de otra forma.

La estatica sola no basta: alguien podria conceder de una forma que la expresion
regular no reconozca. La efectiva sola tampoco: solo corre con PostgreSQL, y una
regresion introducida sin base de certificacion pasaria sin verse hasta el
despliegue.
"""
from __future__ import annotations

import os
import pathlib
import re

import pytest

DSN = os.environ.get("NELVYON_PG_CERT_DSN")

#: Las seis. Cada una decide algo que el sistema no puede decidir sobre si mismo.
DE_GOBIERNO = {
    "agent_policies": "lo que cada agente puede hacer",
    "agent_kill_switch": "el freno de emergencia",
    "agent_catalog": "herramientas y presupuesto de cada agente",
    "autopilot_capabilities": "que se ejecuta solo y que exige aprobacion",
    "plan_rango": "que plan da derecho a que",
    "_migrations": "el registro de lo aplicado",
}

#: La migracion que cierra la puerta. Cualquier concesion masiva POSTERIOR a esta
#: tiene que volver a cerrarla.
MIGRACION_QUE_CIERRA = 559

_RAIZ = pathlib.Path(__file__).resolve().parents[1]

#: Un GRANT que reparte escritura sobre todo el esquema.
#:
#: El tramo entre piezas va acotado a 200 caracteres, no a «lo que sea hasta el
#: punto y coma». Sin el tope, `[^;]*` cruza parrafos enteros y la expresion
#: casaba PROSA: la primera version marco un docstring que explicaba este mismo
#: problema. Un guard que salta con documentacion acaba desactivado por quien se
#: harta de el, y entonces no protege nada.
_MASIVO = re.compile(
    r"GRANT[^;]{0,200}?\b(INSERT|UPDATE|DELETE|ALL)\b[^;]{0,200}?"
    r"ON\s+ALL\s+TABLES\s+IN\s+SCHEMA\s+public[^;]{0,200}?\bnelvyon_app\b",
    re.IGNORECASE | re.DOTALL)

#: `ALTER DEFAULT PRIVILEGES`, que afecta a toda tabla FUTURA. Es la via mas
#: silenciosa: no toca nada hoy y abre todo lo de manana.
_POR_DEFECTO = re.compile(
    r"ALTER\s+DEFAULT\s+PRIVILEGES[^;]{0,200}?GRANT[^;]{0,200}?"
    r"\b(INSERT|UPDATE|DELETE|ALL)\b[^;]{0,200}?\bnelvyon_app\b",
    re.IGNORECASE | re.DOTALL)


def _sin_documentacion(texto: str, sufijo: str) -> str:
    """Quita comentarios y docstrings: solo queda lo que se ejecuta.

    Acotar la distancia no basta por si solo. Un docstring puede contener una
    sentencia de ejemplo perfectamente formada —de hecho los de este proyecto lo
    hacen, para explicar defectos— y marcarla seria un falso positivo garantizado.
    Lo que se vigila es el codigo, no lo que el codigo cuenta sobre si mismo.
    """
    if sufijo == ".sql":
        return re.sub(r"--[^\n]*", "", texto)

    import io as _io
    import tokenize

    fuera: list[str] = []
    anterior = tokenize.INDENT
    try:
        for tok in tokenize.generate_tokens(_io.StringIO(texto).readline):
            if tok.type == tokenize.COMMENT:
                continue
            # Un literal de cadena que es una sentencia por si mismo es un
            # docstring; uno asignado o pasado como argumento es codigo.
            if tok.type == tokenize.STRING and anterior in (
                    tokenize.INDENT, tokenize.NEWLINE, tokenize.NL,
                    tokenize.DEDENT, tokenize.ENCODING):
                continue
            fuera.append(tok.string)
            if tok.type not in (tokenize.NL, tokenize.COMMENT):
                anterior = tok.type
    except (tokenize.TokenError, IndentationError, SyntaxError):
        # Un fichero que no se puede tokenizar se revisa entero: mejor un falso
        # positivo que un hueco.
        return texto
    return "\n".join(fuera)


def _numero(nombre: str) -> int:
    m = re.match(r"(\d+)", nombre)
    return int(m.group(1)) if m else 0


def _cierra_de_nuevo(texto: str) -> bool:
    """¿El mismo fichero vuelve a retirar la escritura de las de gobierno?"""
    for tabla in DE_GOBIERNO:
        if not re.search(
                rf"REVOKE[^;]*\b(INSERT|UPDATE|DELETE|ALL)\b[^;]*\b{tabla}\b[^;]*"
                rf"nelvyon_app",
                texto, re.IGNORECASE | re.DOTALL):
            return False
    return True


# ═══════════════════════════════════════════════════════════════════════════
# Vigilancia estatica: el repositorio
# ═══════════════════════════════════════════════════════════════════════════


def test_ninguna_migracion_posterior_reabre_la_escritura_masiva():
    """Una migracion futura no puede devolver la escritura y dejarla abierta.

    Conceder masivamente sigue siendo legitimo —hay tablas de inquilino que lo
    necesitan— pero quien lo haga TIENE que volver a cerrar las seis de gobierno
    en el mismo fichero. Si no, esta prueba lo dice antes de que llegue a
    produccion.
    """
    culpables = []
    for f in sorted((_RAIZ / "db" / "migrations").glob("*.sql")):
        if _numero(f.name) <= MIGRACION_QUE_CIERRA:
            continue
        texto = _sin_documentacion(
            f.read_text(encoding="utf-8", errors="replace"), f.suffix)
        if (_MASIVO.search(texto) or _POR_DEFECTO.search(texto)) and not _cierra_de_nuevo(texto):
            culpables.append(f.name)

    assert not culpables, (
        f"estas migraciones conceden escritura masiva a nelvyon_app sin volver a "
        f"cerrar las tablas de gobierno: {culpables}. Anade la retirada de "
        f"{sorted(DE_GOBIERNO)} en el mismo fichero.")


def test_ningun_script_de_aprovisionamiento_reabre_la_puerta_en_silencio():
    """Scripts y fixtures tambien reparten privilegios.

    La fixture de `test_rls_activacion_parcial` lo hacia: reconstruia la postura
    de despliegue con el GRANT masivo y deshacia la 559 en la base de
    certificacion. Pasaba en verde porque nadie miraba esto.
    """
    culpables = []
    for carpeta, patron in ((_RAIZ / "tests", "*.py"),
                            (_RAIZ.parent / "scripts", "*.mjs"),
                            (_RAIZ.parent / "scripts", "*.ts")):
        if not carpeta.exists():
            continue
        for f in carpeta.glob(patron):
            if f.name == pathlib.Path(__file__).name:
                continue
            texto = _sin_documentacion(
                f.read_text(encoding="utf-8", errors="replace"), f.suffix)
            if (_MASIVO.search(texto) or _POR_DEFECTO.search(texto)) and not _cierra_de_nuevo(texto):
                culpables.append(str(f.relative_to(_RAIZ.parent)))

    assert not culpables, (
        f"estos ficheros conceden escritura masiva a nelvyon_app sin volver a "
        f"cerrar las tablas de gobierno: {culpables}")


def test_el_guard_reconoce_de_verdad_un_grant_peligroso():
    """Control del propio guard.

    Una expresion regular que no encuentra nada pasa siempre. Se le dan casos
    que TIENEN que detectarse y casos que NO, para que no se convierta en
    decoracion.
    """
    peligrosos = [
        "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nelvyon_app;",
        "GRANT ALL ON ALL TABLES IN SCHEMA public TO nelvyon_app;",
        "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT ON TABLES TO nelvyon_app;",
    ]
    for sql in peligrosos:
        assert _MASIVO.search(sql) or _POR_DEFECTO.search(sql), (
            f"el guard NO detecta un GRANT peligroso: {sql}")

    inofensivos = [
        "GRANT SELECT ON ALL TABLES IN SCHEMA public TO nelvyon_app;",
        "GRANT INSERT, UPDATE ON public.os_clients TO nelvyon_app;",
        "GRANT ALL ON ALL TABLES IN SCHEMA public TO nelvyon_jobs;",
    ]
    for sql in inofensivos:
        assert not (_MASIVO.search(sql) or _POR_DEFECTO.search(sql)), (
            f"el guard marca como peligroso algo que no lo es: {sql}")


def test_un_grant_masivo_que_vuelve_a_cerrar_si_se_acepta():
    """No se prohibe conceder: se exige volver a cerrar.

    Sin esto el guard seria una prohibicion absoluta, y las tablas de inquilino
    necesitan legitimamente ese GRANT.
    """
    completo = (
        "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public "
        "TO nelvyon_app;\n"
        + "\n".join(
            f"REVOKE INSERT, UPDATE, DELETE ON public.{t} FROM nelvyon_app;"
            for t in DE_GOBIERNO)
    )
    assert _MASIVO.search(completo)
    assert _cierra_de_nuevo(completo), (
        "el guard no reconoce que el fichero vuelve a cerrar la puerta")


# ═══════════════════════════════════════════════════════════════════════════
# Vigilancia efectiva: el privilegio real, tras aplicarlo todo
# ═══════════════════════════════════════════════════════════════════════════


@pytest.mark.skipif(not DSN, reason="sin NELVYON_PG_CERT_DSN")
@pytest.mark.asyncio
@pytest.mark.parametrize("tabla", sorted(DE_GOBIERNO))
async def test_el_privilegio_real_sigue_cerrado(tabla):
    """La unica comprobacion que no se puede burlar escribiendo el GRANT de otra
    forma: mirar lo que la base concede de verdad."""
    asyncpg = pytest.importorskip("asyncpg")

    c = await asyncpg.connect(
        (DSN or "").replace("postgresql+asyncpg://", "postgresql://"), timeout=30)
    try:
        concedidos = {r["privilege_type"] for r in await c.fetch(
            "SELECT privilege_type FROM information_schema.role_table_grants "
            " WHERE table_name = $1 AND grantee = 'nelvyon_app'", tabla)}
    finally:
        await c.close()

    escritura = concedidos & {"INSERT", "UPDATE", "DELETE"}
    assert not escritura, (
        f"nelvyon_app puede {sorted(escritura)} sobre '{tabla}', que decide "
        f"{DE_GOBIERNO[tabla]}. Esa tabla no tiene RLS: el GRANT es la unica "
        f"frontera, y alguien la ha vuelto a abrir.")
    assert "SELECT" in concedidos, (
        f"nelvyon_app no puede leer '{tabla}': se revoco de mas y la interfaz "
        "dejara de funcionar")
