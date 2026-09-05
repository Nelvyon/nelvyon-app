"""Una senal que deja de emitirse no rompe nada: solo deja de poder explicarse.

LA CLASE DE FALLO
-----------------
`McpAuditRecord` llegaba con agente, usuario, decision, riesgo, aprobacion y las
dos trazas. El `INSERT` escribia SIETE campos y tiraba el resto. Nada fallaba: la
herramienta se ejecutaba, la fila se guardaba, y el dia que hizo falta reconstruir
que paso, la mitad de la cadena no estaba.

Es el peor tipo de deuda de observabilidad, porque no duele hasta que se necesita,
y entonces ya es tarde: no se puede auditar hacia atras algo que nunca se guardo.

LA CADENA QUE HAY QUE PODER RECONSTRUIR
----------------------------------------
    CLIENTE → SERVICIO → TRABAJO → AGENTE → HERRAMIENTA → INTENTO
           → APROBACION → EJECUCION → RESULTADO → COSTE

Cada eslabon que no se persista rompe la cadena entera, no solo su tramo.

QUE VIGILA ESTA PRUEBA
----------------------
Que el `INSERT` de auditoria siga nombrando TODAS las senales obligatorias. Si
alguien reescribe la consulta y se deja una fuera —o anade una columna a la tabla
y no la escribe— esto se pone rojo el mismo dia.

POR QUE MIRA LA CONSULTA Y NO LA BASE
--------------------------------------
Una columna puede existir en el esquema y no escribirse nunca; eso es justo lo
que pasaba. Lo que importa no es que la columna este: es que se RELLENE.

COSTE EXTERNO: 0 EUR. Se lee el arbol.
"""
from __future__ import annotations

import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
AUDITORIA = RAIZ / "backend" / "mcp" / "audit" / "McpAuditService.ts"

#: Sin cualquiera de estas, la cadena de arriba se corta.
SENALES_OBLIGATORIAS: tuple[str, ...] = (
    "tenant_id",      # de quien
    "agent_id",       # quien lo hizo
    "user_id",        # quien lo pidio
    "tool_name",      # que herramienta
    "decision",       # con que permiso
    "risk",           # cuanto arriesgaba
    "approval_id",    # con permiso de quien
    "attempt",        # en que intento
    "latency_ms",     # cuanto tardo
    "success",        # como acabo
    "error_code",     # por que fallo
    "request_id",     # correlacion
    "trace_id",       # correlacion
    "cost_estimate_usd",  # a que coste, o `null` si no se sabe
)


def _insert_de_auditoria() -> str:
    texto = AUDITORIA.read_text(encoding="utf-8")
    m = re.search(r"INSERT INTO saas_mcp_tool_audit(.*?)`", texto, re.S)
    assert m, "no se encuentra el INSERT de auditoria; el barrido mira mal"
    return m.group(1)


def test_el_barrido_encuentra_la_consulta():
    """CONTROL POSITIVO. Sin consulta, todo lo de abajo pasaria vacio."""
    assert "VALUES" in _insert_de_auditoria(), "el INSERT no tiene la forma esperada"


def test_ninguna_senal_obligatoria_falta_en_la_consulta():
    """LA REGLA.

    Un eslabon que no se persiste rompe la cadena entera, no solo su tramo.
    """
    consulta = _insert_de_auditoria()
    ausentes = [s for s in SENALES_OBLIGATORIAS if s not in consulta]
    assert not ausentes, (
        "la auditoria de herramientas dejo de escribir estas senales, asi que ya "
        "no se puede reconstruir que paso:\n  " + "\n  ".join(ausentes)
    )


def test_el_coste_desconocido_no_se_convierte_en_gratis():
    """La distincion que se pierde sin querer.

    `null` es NO SE SABE y `0` es que fue gratis. Un `?? 0` en el sitio
    equivocado afirma que algo no costo nada, que es una mentira barata de
    escribir y cara de detectar.
    """
    texto = AUDITORIA.read_text(encoding="utf-8")
    assert "costEstimateUsd ?? null" in texto, (
        "el coste desconocido dejo de guardarse como `null`; si se guarda 0 se "
        "esta afirmando que la ejecucion fue gratis"
    )
    assert "costEstimateUsd ?? 0" not in texto, (
        "se convierte un coste desconocido en cero: eso es inventarse un dato"
    )


def test_el_fallo_al_auditar_no_desaparece_en_silencio():
    """Perder auditoria sin enterarse es perder la unica prueba de lo que paso.

    Habia un `catch(() => {})`: si la escritura fallaba, no quedaba ni rastro de
    que se hubiera intentado.
    """
    texto = AUDITORIA.read_text(encoding="utf-8")
    assert "avisoSeguro" in texto, (
        "el fallo al auditar volvio a tragarse en silencio"
    )
    assert ".catch(() => {})" not in texto, (
        "hay un catch vacio: un fallo de auditoria desaparece sin dejar rastro"
    )
