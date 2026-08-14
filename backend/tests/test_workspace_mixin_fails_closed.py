"""El filtro de inquilino falla cerrado cuando no puede aplicarse.

EL DEFECTO QUE ESTO IMPIDE
--------------------------
`WorkspaceAwareMixin._apply_workspace_filter` decia:

    if workspace_id is not None and hasattr(self.model, 'workspace_id'):
        query = query.where(self.model.workspace_id == workspace_id)
    return query

Si el modelo no tenia `workspace_id`, el filtro NO se aplicaba y la consulta
devolvia filas de todos los inquilinos. Sin error, sin aviso, sin traza.

No es hipotetico: aparecio al alinear `calendar_events` con su tabla real, donde
la columna de inquilino se llama `tenant_id`. En el momento en que el modelo
dejo de tener `workspace_id`, ese servicio se quedo sin aislamiento y todo
seguia en verde.

Un filtro de aislamiento que se apaga solo cuando no encuentra su columna es
peor que no tenerlo: promete algo que ya no cumple, y nadie vuelve a mirarlo.

QUE SE EXIGE AHORA
------------------
Que la columna se declare (`columna_inquilino`) y que, si no existe en el
modelo, se lance en vez de devolver filas sin filtrar. Tanto al leer como al
escribir: una fila creada sin inquilino es tan grave como una consulta sin
acotar.
"""
from __future__ import annotations

import pytest
from sqlalchemy import Column, Integer, String, select

from core.database import Base
from services.workspace_mixin import WorkspaceAwareMixin


class _SinInquilino(Base):
    """Modelo sin ninguna columna de inquilino. Solo existe para este test."""

    __tablename__ = "zz_modelo_sin_inquilino"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    nombre = Column(String)


class _ServicioDescuidado(WorkspaceAwareMixin):
    model = _SinInquilino

    def __init__(self):
        self.db = None


class _ServicioConOtraColumna(WorkspaceAwareMixin):
    """Declara una columna que su modelo tampoco tiene."""

    model = _SinInquilino
    columna_inquilino = "tenant_id"

    def __init__(self):
        self.db = None


def test_una_consulta_sin_columna_de_inquilino_lanza():
    """Antes devolvia la consulta SIN filtrar. Ahora se niega."""
    with pytest.raises(RuntimeError) as exc:
        _ServicioDescuidado()._apply_workspace_filter(select(_SinInquilino), 1)
    mensaje = str(exc.value)
    assert "workspace_id" in mensaje
    assert "sin filtrar" in mensaje, (
        "el error debe explicar la consecuencia; si solo dice que falta una "
        "columna, el siguiente que lo lea la anadira en el sitio equivocado"
    )


def test_tambien_lanza_si_la_columna_declarada_no_existe():
    """Declarar `tenant_id` no basta: el modelo tiene que tenerla."""
    with pytest.raises(RuntimeError) as exc:
        _ServicioConOtraColumna()._apply_workspace_filter(select(_SinInquilino), 1)
    assert "tenant_id" in str(exc.value)


def test_sin_workspace_no_se_filtra_y_no_se_lanza():
    """Control negativo: `workspace_id=None` es «no acotes», no un error.

    Lo usan las rutas de plataforma, que consultan a proposito por encima de los
    inquilinos. Si esto lanzara, el guard seria inutilizable y acabaria quitado.
    """
    consulta = select(_SinInquilino)
    assert _ServicioDescuidado()._apply_workspace_filter(consulta, None) is consulta


@pytest.mark.parametrize(
    "servicio, esperada",
    [("Calendar_eventsService", "tenant_id"), ("Social_postsService", None)],
)
def test_los_servicios_realineados_declaran_su_columna(servicio, esperada):
    """Los dos servicios cuyas tablas usan `tenant_id`.

    `Social_postsService` no hereda del mixin —acota con su propio filtro— asi
    que solo se comprueba el que si.
    """
    if esperada is None:
        pytest.skip("no usa el mixin; su acotado se cubre en sus propios tests")
    from services.calendar_events import Calendar_eventsService

    assert Calendar_eventsService.columna_inquilino == esperada


@pytest.mark.asyncio
async def test_crear_sin_columna_de_inquilino_lanza():
    """Escribir tambien falla cerrado: una fila sin inquilino no debe nacer."""
    with pytest.raises(RuntimeError) as exc:
        await _ServicioDescuidado().ws_create({"nombre": "x"}, workspace_id=1)
    assert "sin inquilino" in str(exc.value)
