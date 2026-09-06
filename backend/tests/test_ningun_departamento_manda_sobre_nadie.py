"""Un jefe de departamento sin nadie que ejecute es un organigrama de mentira.

LA PREGUNTA QUE HABIA QUE CONTESTAR
------------------------------------
La arquitectura objetivo de NELVYON es:

    Master Orchestrator → Department Heads → Specialist Agents → tools/data
    → QA independiente → supervisor → aprobacion/escalado → entrega

Al crear `creative` y `reputation` quedo la duda de si cumplian el modelo, porque
no tienen especialistas L3 en el organigrama. La respuesta salio de MEDIR, no de
suponer: de los DIECISEIS departamentos L2, quince no tienen L3. El unico que los
tiene es `social_media`, y por un motivo escrito: cada red es un oficio distinto
—lo que funciona en LinkedIn hunde un TikTok— y ahi si hacen falta seis criterios
separados.

O sea, `creative` y `reputation` no son la excepcion: son la norma. Y la capa
ejecutora especialista NO es L3, es `backend/os-agents/agents/*`, donde vive el
agente que produce el entregable que el cliente compra.

EL CONTRATO ENTRE LAS DOS CAPAS
--------------------------------
Un departamento L2 cumple la arquitectura si tiene capacidad de ejecucion
especialista por UNA de estas tres vias:

  A · especialistas L3 en el organigrama          (hoy: social_media)
  B · servicios propios con agente ejecutor       (hoy: los nueve que venden)
  C · esta declarado FUNCIONAL: supervisa, opera o mide, y por eso no vende
      un servicio                                 (hoy: siete, cada uno con motivo)

Lo que NO puede pasar —y es lo que esta prueba impide— es un jefe sin ninguna de
las tres: un asiento en el organigrama con permisos, ambito de conocimiento y
capacidad de aprobar, y nadie debajo que haga nada. Eso no es una jerarquia
incompleta: es una que miente sobre lo que puede hacer.

POR QUE ESTO ES UN GUARDIAN Y NO UNA NOTA
------------------------------------------
Porque el modo de fallo es silencioso. Un head nuevo se anade en dos minutos y
parece que el departamento existe. La lista C solo puede ENCOGER: el dia que un
departamento funcional empiece a vender algo, su excepcion deja de valer.

COSTE EXTERNO: 0 EUR. Se lee el arbol.
"""
from __future__ import annotations

import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
JERARQUIA = RAIZ / "backend" / "agents" / "workforce" / "hierarchy.ts"
MAPA = RAIZ / "backend" / "agents" / "workforce" / "duenoDeCadaServicio.ts"
AGENTES = RAIZ / "backend" / "os-agents" / "agents"

#: Departamentos que NO venden un servicio, y por que. Solo puede ENCOGER.
FUNCIONALES: dict[str, str] = {
    "qa": "revisa lo que producen los demas; si vendiera algo, se revisaria a si mismo",
    "devops": "mantiene la infraestructura sobre la que corre todo; no es un entregable",
    "workflows": "orquesta trabajo ajeno: su producto es que el de otros llegue",
    "portal_client": "es la superficie por la que el cliente ve su trabajo, no el trabajo",
    # Los tres de publicidad son heads de PLATAFORMA, y el servicio que se vende
    # —`ads_premium`— es multiplataforma: no puede pertenecer a uno solo sin
    # mentir sobre los otros dos. Su dueno es `marketing`, que los abarca.
    "google_ads": "head de plataforma; el servicio que se vende (`ads_premium`) es multiplataforma",
    "meta_ads": "head de plataforma; el servicio que se vende (`ads_premium`) es multiplataforma",
    "tiktok_ads": "head de plataforma; el servicio que se vende (`ads_premium`) es multiplataforma",
}


def _l2() -> set[str]:
    texto = JERARQUIA.read_text(encoding="utf-8")
    return set(re.findall(r'agentId: "([a-z_0-9]+)",\s*\n\s*level: "L2_domain"', texto))


def _con_l3() -> set[str]:
    """Departamentos que tienen especialistas L3 colgando."""
    texto = JERARQUIA.read_text(encoding="utf-8")
    # Los L3 se generan en bucle desde una constante; se mira a quien reportan.
    return set(re.findall(r'reportsTo:\s*([A-Z_]+)', texto)) | set(
        re.findall(r'reportsTo:\s*"([a-z_0-9]+)"', texto)
    )


def _servicios_por_departamento() -> dict[str, list[str]]:
    cuerpo = MAPA.read_text(encoding="utf-8").split("DUENO_DE_SERVICIO")[1]
    fuera: dict[str, list[str]] = {}
    for servicio, departamento in re.findall(r'"?([a-z_0-9]+)"?:\s*"([a-z_0-9]+)"', cuerpo):
        fuera.setdefault(departamento, []).append(servicio)
    return fuera


def _tiene_ejecutor(service_id: str) -> bool:
    """¿Existe un agente de servicio que produzca este entregable?"""
    marca = f'readonly serviceId = "{service_id}"'
    return any(
        marca in p.read_text(encoding="utf-8", errors="replace")
        for p in AGENTES.glob("*Agent.ts")
    )


def test_el_barrido_ve_el_organigrama():
    """CONTROL POSITIVO. Sin departamentos, todo lo de abajo pasaria vacio."""
    l2 = _l2()
    assert len(l2) >= 14, f"solo se ven {len(l2)} departamentos L2; el barrido mira mal"
    assert _servicios_por_departamento(), "el mapa de duenos esta vacio"


def test_ningun_departamento_manda_sobre_nadie():
    """LA REGLA.

    Un head sin L3, sin servicios y sin declararse funcional es un asiento con
    permisos y sin nadie debajo.
    """
    servicios = _servicios_por_departamento()
    con_l3 = _con_l3()
    huerfanos = []
    for departamento in sorted(_l2()):
        if departamento in FUNCIONALES:
            continue
        if servicios.get(departamento):
            continue
        # `reportsTo` puede venir por constante; se acepta cualquier mencion.
        if departamento in con_l3 or any(departamento in c.lower() for c in con_l3):
            continue
        huerfanos.append(departamento)
    assert not huerfanos, (
        "estos departamentos existen en el organigrama y no tienen a nadie que "
        "ejecute —ni especialistas L3, ni servicios propios, ni motivo declarado "
        f"para no venderlos—: {huerfanos}"
    )


def test_ningun_departamento_funcional_vende_a_escondidas():
    """EL TRINQUETE.

    La excepcion dice «no vende nada». Si empieza a vender, la excepcion es
    falsa y hay que quitarla, no ampliarla.
    """
    servicios = _servicios_por_departamento()
    mentirosos = sorted(d for d in FUNCIONALES if servicios.get(d))
    assert not mentirosos, (
        "estos departamentos estan declarados como funcionales —no venden— y "
        f"tienen servicios asignados: {mentirosos}"
    )


def test_todo_servicio_con_dueno_tiene_quien_lo_produzca():
    """LA EQUIVALENCIA, QUE ES LO QUE HAY QUE DEMOSTRAR.

    Si la capa ejecutora especialista son los `os-agents`, entonces cada servicio
    con dueno tiene que tener su agente. Un servicio con jefe y sin ejecutor es
    un departamento que responde por algo que nadie hace.
    """
    sin_ejecutor = sorted(
        s
        for servicios in _servicios_por_departamento().values()
        for s in servicios
        if not _tiene_ejecutor(s)
    )
    assert not sin_ejecutor, (
        "estos servicios tienen departamento responsable y ningun agente que los "
        f"produzca: {sin_ejecutor}"
    )


def test_creative_y_reputation_cumplen_como_los_demas():
    """LA PREGUNTA CONCRETA QUE ORIGINO ESTO.

    Se comprueba explicitamente, y no por el caso general, porque la duda era
    sobre estos dos: si algun dia pierden sus servicios, quiero que lo diga esta
    prueba y no un informe seis meses despues.
    """
    servicios = _servicios_por_departamento()
    for departamento in ("creative", "reputation"):
        suyos = servicios.get(departamento, [])
        assert suyos, f"`{departamento}` dejo de responder por ningun servicio"
        for s in suyos:
            assert _tiene_ejecutor(s), (
                f"`{departamento}` responde por `{s}` y no hay agente que lo produzca"
            )
