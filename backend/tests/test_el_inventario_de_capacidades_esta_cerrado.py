"""Ninguna ruta queda fuera del inventario de capacidades del Bloque 2.

POR QUE IMPORTA
---------------
El Bloque 2 se mide como «cuantas capacidades estan certificadas de cuantas hay».
Ese porcentaje solo significa algo si el DENOMINADOR es honesto.

Dos formas de mentir con el, y las dos se cierran aqui:

1. **Que aparezca una familia de rutas nueva y nadie la meta en el inventario.**
   El porcentaje subiria sin que se hubiera certificado nada mas. Esta prueba
   falla en cuanto una ruta no pertenece a ninguna capacidad.

2. **Que se declare una capacidad que no existe** para engordar el denominador y
   luego marcarla como cerrada sin trabajo. Esta prueba exige que TODA capacidad
   declarada tenga al menos una ruta real detras.

El inventario se DERIVA de lo que existe: una lista escrita a mano queda
desactualizada al lote siguiente, y el sintoma es un porcentaje que sube solo.
"""
import importlib.util
import io
import json
import pathlib

import pytest

RAIZ = pathlib.Path(__file__).resolve().parents[2]
CERT = RAIZ / "backend" / "db" / "certificacion"
ESTADOS = CERT / "capacidades_estado.json"

_spec = importlib.util.spec_from_file_location("capacidades", CERT / "capacidades.py")
capacidades = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(capacidades)

#: Los unicos estados admitidos. Cualquier otro es una etiqueta inventada.
ESTADOS_VALIDOS = {
    "PENDING", "TESTING", "PASS_CERTIFIED", "FIXED_CERTIFIED",
    "BLOCKED_ON_FOUNDER", "BLOCKED_EXTERNALLY", "RESIDUAL_RISK_DOCUMENTED",
}


def test_hay_rutas_que_inventariar():
    """Control positivo: si el extractor deja de ver rutas, lo de abajo no mide."""
    assert len(capacidades.rutas_de_api()) > 500


def test_ninguna_ruta_se_queda_sin_capacidad():
    _, huerfanas = capacidades.reparto()
    assert not huerfanas, (
        f"{len(huerfanas)} rutas no pertenecen a ninguna capacidad: "
        f"{huerfanas[:15]}. Mientras esten fuera, el porcentaje de cierre del "
        "Bloque 2 mide sobre un denominador incompleto.")


def test_toda_capacidad_declarada_tiene_rutas_de_verdad():
    """Al reves: no se engorda el denominador con capacidades vacias."""
    cuenta, _ = capacidades.reparto()
    vacias = [n for n, _ in capacidades.CAPACIDADES if cuenta.get(n, 0) == 0]
    assert not vacias, (
        f"capacidades declaradas sin una sola ruta: {vacias}. Una capacidad que "
        "no existe no puede contar en el denominador ni cerrarse sin trabajo.")


def test_el_registro_de_estados_cubre_exactamente_el_inventario():
    """Ni una capacidad sin estado, ni un estado sin capacidad."""
    estados = json.load(io.open(ESTADOS, encoding="utf-8"))["capacidades"]
    declaradas = {n for n, _ in capacidades.CAPACIDADES}
    registradas = set(estados)

    assert not (declaradas - registradas), (
        f"capacidades sin estado registrado: {sorted(declaradas - registradas)}")
    assert not (registradas - declaradas), (
        f"estados de capacidades que ya no existen: {sorted(registradas - declaradas)}")


def test_todo_estado_es_uno_de_los_admitidos():
    estados = json.load(io.open(ESTADOS, encoding="utf-8"))["capacidades"]
    malos = {n: v["estado"] for n, v in estados.items()
             if v.get("estado") not in ESTADOS_VALIDOS}
    assert not malos, f"estados inventados: {malos}"


@pytest.mark.parametrize("cerrado", ["PASS_CERTIFIED", "FIXED_CERTIFIED"])
def test_lo_marcado_como_cerrado_dice_con_que_evidencia(cerrado):
    """Un verde sin evidencia es una afirmacion, no una certificacion."""
    estados = json.load(io.open(ESTADOS, encoding="utf-8"))["capacidades"]
    sin_evidencia = [n for n, v in estados.items()
                     if v.get("estado") == cerrado and not v.get("evidencia")]
    assert not sin_evidencia, (
        f"marcadas {cerrado} sin decir con que evidencia: {sin_evidencia}")


@pytest.mark.parametrize("bloqueado", ["BLOCKED_ON_FOUNDER", "BLOCKED_EXTERNALLY"])
def test_lo_bloqueado_dice_por_que(bloqueado):
    """Un bloqueo sin motivo es una forma de aparcar trabajo sin que se note."""
    estados = json.load(io.open(ESTADOS, encoding="utf-8"))["capacidades"]
    sin_motivo = [n for n, v in estados.items()
                  if v.get("estado") == bloqueado and not v.get("motivo")]
    assert not sin_motivo, f"marcadas {bloqueado} sin motivo: {sin_motivo}"
