"""Todo servicio que se vende tiene un departamento que responde por el.

LAS DOS CAPAS, Y POR QUE NO SON LA MISMA LISTA
-----------------------------------------------
NELVYON tiene dos catalogos de agentes:

  · `backend/os-agents/agents/*` — TREINTA agentes con nombre de SERVICIO
    (`web_premium`, `seo_premium`, `reputacion_online_orm_premium`). Producen el
    entregable que el cliente compra.

  · `backend/agents/workforce/hierarchy` — el ORGANIGRAMA: `ceo_supervisor`,
    `cto`, `qa`, `devops`, `finance`. Quien supervisa, con que permisos y que
    conocimiento.

Que no coincidan NO es un fallo. Un catalogo de servicios y un organigrama no
tienen por que tener las mismas entradas: una agencia vende «fotografia de
producto» sin tener un director de fotografia.

LO QUE SI ERA UN FALLO
----------------------
Que la diferencia no estuviera escrita. Sin el mapa, un servicio podia existir
sin que NADIE respondiera por el —ni supervision, ni permisos, ni escalado— y
«¿quien aprueba esto?» no tenia respuesta consultable.

Al escribirlo aparecieron SEIS servicios huerfanos: diseno grafico, video,
fotografia de producto, 3D, marca y reputacion online. Los cinco primeros
crearon el departamento `creative`; el sexto, `reputation`. No son asientos de
adorno: existen porque hay servicios cobrando que no tenian supervisor.

QUE VIGILA ESTA PRUEBA
----------------------
Que la diferencia siga siendo INTENCIONAL, EXPLICABLE Y VERIFICADA:

  1 · ningun servicio sin dueno;
  2 · ningun dueno inventado —tiene que existir en el organigrama—;
  3 · ningun dueno declarado para un servicio que ya no existe.

Un servicio nuevo rompe esto el dia que se anade, que es cuando se decide quien
responde por el, no seis meses despues.

COSTE EXTERNO: 0 EUR. Se lee el arbol.
"""
from __future__ import annotations

import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
AGENTES = RAIZ / "backend" / "os-agents" / "agents"
JERARQUIA = RAIZ / "backend" / "agents" / "workforce" / "hierarchy.ts"
MAPA = RAIZ / "backend" / "agents" / "workforce" / "duenoDeCadaServicio.ts"

_SERVICE_ID = re.compile(r'readonly serviceId = "([a-z_0-9]+)"')
_AGENT_ID = re.compile(r'agentId: "([a-z_0-9]+)"')


def _servicios() -> set[str]:
    """Los `serviceId` que declaran los agentes de servicio."""
    fuera: set[str] = set()
    for p in AGENTES.glob("*Agent.ts"):
        fuera.update(_SERVICE_ID.findall(p.read_text(encoding="utf-8", errors="replace")))
    return fuera


def _departamentos() -> set[str]:
    """Los agentes que existen en el organigrama.

    Incluye los que se anaden por codigo —los especialistas de red y los dos
    heads nuevos— porque para responder por un servicio basta con estar, no con
    estar escrito a mano.
    """
    texto = JERARQUIA.read_text(encoding="utf-8")
    return set(_AGENT_ID.findall(texto))


def _mapa() -> dict[str, str]:
    texto = MAPA.read_text(encoding="utf-8")
    cuerpo = texto.split("DUENO_DE_SERVICIO")[1]
    return dict(re.findall(r'"?([a-z_0-9]+)"?:\s*"([a-z_0-9]+)"', cuerpo))


def test_el_barrido_ve_las_dos_capas():
    """CONTROL POSITIVO.

    Si dejara de encontrar servicios o departamentos, todo lo de abajo pasaria
    en verde comparando dos conjuntos vacios.
    """
    servicios = _servicios()
    assert len(servicios) >= 25, f"solo se ven {len(servicios)} servicios; el barrido mira mal"
    departamentos = _departamentos()
    assert len(departamentos) >= 20, (
        f"solo se ven {len(departamentos)} departamentos; el barrido mira mal"
    )
    assert _mapa(), "el mapa de duenos esta vacio"


def test_ningun_servicio_se_queda_sin_dueno():
    """LA REGLA.

    Un servicio sin dueno es un servicio que se cobra y que nadie supervisa.
    """
    mapa = _mapa()
    huerfanos = sorted(s for s in _servicios() if s not in mapa)
    assert not huerfanos, (
        "estos servicios se venden y ningun departamento responde por ellos —sin "
        "supervision, sin permisos prestados y sin a quien escalar—:\n  "
        + "\n  ".join(huerfanos)
    )


def test_ningun_dueno_es_inventado():
    """Un dueno que no existe en el organigrama es peor que ninguno: parece que
    hay alguien detras."""
    departamentos = _departamentos()
    inventados = sorted({d for d in _mapa().values() if d not in departamentos})
    assert not inventados, (
        "estos departamentos responden por un servicio y no existen en el "
        f"organigrama: {inventados}"
    )


def test_ningun_dueno_responde_por_un_servicio_muerto():
    """EL TRINQUETE.

    Una entrada que apunta a un servicio retirado es ruido: hace creer que la
    cobertura es mayor de lo que es.
    """
    servicios = _servicios()
    fantasmas = sorted(s for s in _mapa() if s not in servicios)
    assert not fantasmas, (
        f"estos servicios ya no existen y siguen teniendo dueno declarado: {fantasmas}"
    )


def test_los_dos_departamentos_nuevos_responden_por_algo():
    """`creative` y `reputation` se crearon porque habia servicios huerfanos. Si
    dejaran de responder por alguno, serian asientos de adorno — que es
    exactamente lo que no se queria."""
    mapa = _mapa()
    for departamento in ("creative", "reputation"):
        suyos = [s for s, d in mapa.items() if d == departamento]
        assert suyos, (
            f"`{departamento}` no responde por ningun servicio; o se le asigna "
            "alguno o sobra"
        )
