"""El ciclo comercial declarado tiene que ser cierto.

Un documento de arquitectura envejece sin avisar. Estas pruebas obligan a que la
declaracion coincida con el codigo: que nada que salga hacia un cliente este
marcado automatico, que toda etapa bloqueada diga que le falta y quien puede
resolverlo, y que lo declarado listo tenga de verdad quien lo ejecute.
"""
from __future__ import annotations

import pytest

from core.agentes.ciclo_comercial import (
    BLOQUEADA_EXTERNA, CICLO, ESPERA_APROBACION, ESTADOS, LISTA,
    bloqueos_externos, cobertura, por_estado,
)


def test_el_ciclo_esta_completo_y_ordenado():
    assert len(CICLO) == 18
    assert [e.orden for e in CICLO] == list(range(1, 19))
    assert len({e.clave for e in CICLO}) == len(CICLO), "hay etapas repetidas"
    assert all(e.estado in ESTADOS for e in CICLO)


def test_nada_que_salga_hacia_un_cliente_es_automatico():
    """LA FRONTERA.

    Contactar, negociar, cobrar, publicar y responder producen efectos fuera de
    NELVYON. Ninguna puede estar declarada LISTA, que es como decir «corre sola».
    """
    automaticas_que_salen = [e.clave for e in CICLO
                             if e.sale_fuera and e.estado == LISTA]
    assert not automaticas_que_salen, (
        f"etapas que salen hacia el cliente y estan declaradas automaticas: "
        f"{automaticas_que_salen}")


def test_toda_etapa_de_aprobacion_explica_por_que():
    """Una frontera sin motivo escrito no se puede revisar ni discutir."""
    for e in por_estado(ESPERA_APROBACION):
        assert len(e.motivo_frontera) > 30, f"{e.clave} sin motivo suficiente"
        assert e.sale_fuera, (
            f"{e.clave} espera aprobacion pero no declara que sale fuera: "
            "o falta la bandera, o la frontera esta mal puesta")


def test_todo_bloqueo_externo_dice_que_falta_y_quien_lo_resuelve():
    """Un bloqueo sin dueño es un bloqueo eterno."""
    bloqueos = por_estado(BLOQUEADA_EXTERNA)
    assert bloqueos, "sin bloqueos declarados: sospechoso, revisar"
    for e in bloqueos:
        assert len(e.falta) > 40, f"{e.clave}: no dice que falta"
        assert e.desbloquea.startswith("fundador"), (
            f"{e.clave}: un bloqueo externo lo resuelve una persona, no el codigo")


def test_ninguna_etapa_bloqueada_finge_tener_agente():
    """No presentar un mock como una capacidad real."""
    for e in por_estado(BLOQUEADA_EXTERNA):
        assert not e.agente, (
            f"{e.clave} esta bloqueada y declara el agente '{e.agente}': "
            "eso presentaria como capacidad algo que no puede ejecutarse")


def test_toda_etapa_lista_tiene_quien_la_ejecute():
    for e in por_estado(LISTA):
        assert e.agente, f"{e.clave} declarada LISTA sin agente"


def test_los_agentes_declarados_existen_de_verdad():
    """Lo que mas facilmente se convierte en mentira: nombrar un agente que no
    esta conectado."""
    import core.agentes.plantilla  # noqa: F401
    from core.agentes.runtime import agentes_conectados

    conectados = set(agentes_conectados())
    for e in CICLO:
        # Las entradas entre parentesis describen un mecanismo, no un agente.
        if not e.agente or e.agente.startswith("("):
            continue
        assert e.agente in conectados or "." in e.agente, (
            f"{e.clave} nombra '{e.agente}', que no existe")


def test_la_cobertura_es_la_que_se_reporta():
    """El resumen que va al informe sale de aqui, no de una cuenta a mano."""
    c = cobertura()
    assert sum(c.values()) == len(CICLO)
    assert c[LISTA] >= 8, f"muy poco automatizado: {c}"
    assert c[BLOQUEADA_EXTERNA] >= 1


def test_la_checklist_del_fundador_es_accionable():
    lista = bloqueos_externos()
    assert lista
    for b in lista:
        assert b["etapa"] and b["falta"] and b["quien"]
        assert "fundador" in b["quien"]
