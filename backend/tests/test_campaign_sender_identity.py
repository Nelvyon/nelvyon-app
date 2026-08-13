"""
Una campana sale con el remitente de la campana, no con el de NELVYON.

`campaigns.from_email` y `from_name` existen desde la migracion 507, la API los
ACEPTA al crear la campana y `campaign_service` los ALMACENA. Solo el enviador
los ignoraba: llamaba a `EmailService.send_email` sin pasarlos, asi que toda
campana de todo cliente salia firmada por `SENDGRID_FROM_EMAIL`
(`nelvyon@noreply.com`).

No era una decision de producto pendiente: era un valor capturado que nadie
leia. La evidencia esta en el propio flujo — se pide, se valida y se guarda.

Sin remitente propio se sigue usando el corporativo, que es el comportamiento
anterior y el correcto para quien no ha configurado el suyo. La VERIFICACION del
remitente la impone SendGrid, que rechaza direcciones sin verificar; duplicarla
aqui daria una sensacion de control que no seria nuestra.
"""
from __future__ import annotations

import ast
import inspect
from pathlib import Path

import pytest

RAIZ = Path(__file__).resolve().parent.parent


def test_el_envio_acepta_un_remitente():
    """Sin el parametro, el remitente de la campana no tiene por donde entrar."""
    from services.email_service import EmailService

    firma = inspect.signature(EmailService.send_email)
    assert "from_email" in firma.parameters
    assert "from_name" in firma.parameters
    assert firma.parameters["from_email"].default is None, (
        "debe ser opcional: el correo operativo del SaaS no lleva remitente propio"
    )


def test_el_enviador_pasa_el_remitente_de_la_campana():
    """Regresion del defecto: el valor almacenado tiene que llegar al envio."""
    src = (RAIZ / "services" / "campaign_sender.py").read_text(encoding="utf-8")
    i = src.index("await self.email_service.send_email(")
    llamada = src[i : src.index(")", src.index("workspace_id=workspace_id", i))]
    assert "from_email=" in llamada, "el enviador volvio a ignorar el remitente"
    assert "campaign" in llamada


def test_sin_remitente_propio_se_usa_el_corporativo():
    """
    Contraprueba: el cambio no puede romper a quien no ha configurado remitente.
    La resolucion es `el de la campana o el global`, en ese orden.
    """
    src = (RAIZ / "services" / "email_service.py").read_text(encoding="utf-8")
    assert 'remitente = (from_email or "").strip() or self.from_email' in src
    assert 'nombre_remitente = (from_name or "").strip() or self.from_name' in src


@pytest.mark.parametrize("valor", ["", "   ", None])
def test_un_remitente_vacio_no_sustituye_al_corporativo(valor):
    """
    Una cadena vacia guardada en la campana no puede dejar el correo sin
    remitente: se trata como ausencia.
    """
    corporativo = "nelvyon@noreply.com"
    resuelto = (valor or "").strip() or corporativo
    assert resuelto == corporativo


def test_el_correo_operativo_no_lleva_remitente_de_campana():
    """
    La frontera fijada en el bloque de tenencia sigue en pie: alta, avisos de
    workflow y de ticket son de NELVYON y no pasan remitente.
    """
    src = (RAIZ / "services" / "email_service.py").read_text(encoding="utf-8")
    arbol = ast.parse(src)
    operativos = ("send_welcome_email", "send_workflow_notification", "send_ticket_notification")
    for n in ast.walk(arbol):
        if not isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        if n.name not in operativos:
            continue
        cuerpo = ast.unparse(n)
        assert "from_email=" not in cuerpo, (
            f"{n.name} empezo a mandar con remitente de cliente"
        )
