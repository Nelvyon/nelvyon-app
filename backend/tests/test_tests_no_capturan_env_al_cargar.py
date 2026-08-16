"""Ningun test captura `process.env` al cargar el modulo para restaurarlo luego.

EL FALLO QUE ESTO IMPIDE
------------------------
La suite TypeScript fallaba una de cada cinco corridas, en dos tests que pasaban
siempre aislados:

    authSessionSecurity > sin JWT_SECRET el servicio no arranca
    saasDealsPipelineStageSync > changeStage actualiza pipeline_stage

Causa: `process.env` pertenece al PROCESO. Vitest aisla modulos, no el proceso,
asi que los ficheros que comparten worker comparten entorno — y que ficheros
comparten worker, y en que orden, cambia entre corridas.

`authSessionSecurity.test.ts` hacia

    describe("JWT_SECRET — fail-closed", () => {
      const original = process.env.JWT_SECRET;      // <- al CARGAR el modulo
      afterEach(() => { process.env.JWT_SECRET = original; });

Ese `original` no era el valor de este test: era el que hubiera dejado el
fichero anterior del mismo worker. El `afterEach` "restauraba" a un valor ajeno,
y el siguiente test se encontraba un entorno que no era el que esperaba.

Capturado dentro de `beforeEach`, el valor es el de este test y el patron deja
de depender de quien corrio antes.

QUE COMPRUEBA
-------------
Que no vuelva el patron: una captura de `process.env` en el ambito del `describe`
o del modulo cuyo valor se reinyecta en un `afterEach`.

No prohibe leer `process.env` —hay usos legitimos—, solo capturarlo fuera de un
hook PARA RESTAURARLO, que es lo que crea la dependencia de orden.
"""
from __future__ import annotations

import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent

#: `const x = process.env.Y;` con indentacion de ambito de describe o modulo,
#: es decir NO dentro de un `it(...)` ni de un hook, que llevan >=4 espacios.
#: Una captura dentro de un `it` YA es por test y no crea dependencia de orden.
_CAPTURA = re.compile(
    r"^[ \t]{0,4}(?:const|let|var)\s+(\w+)\s*=\s*process\.env\.(\w+)\s*;",
    re.M,
)


def _ficheros_de_test():
    for raiz in (REPO / "backend", REPO / "apps" / "web" / "src", REPO / "packages"):
        if not raiz.is_dir():
            continue
        for f in raiz.rglob("*.test.ts"):
            if "node_modules" not in f.parts:
                yield f


def test_el_barrido_ve_ficheros_de_test():
    """Control positivo: sin esto, un glob roto daria verde con cero ficheros."""
    ficheros = list(_ficheros_de_test())
    assert len(ficheros) > 100, f"solo {len(ficheros)} ficheros .test.ts; barrido roto"


#: Inventario a cero. Aqui hubo 11 ficheros con el patron —el mismo que hacia
#: fallar `authSessionSecurity.test.ts` una de cada cinco corridas—: todos
#: capturan ya el valor DENTRO de un `beforeEach`, asi que no queda deuda que
#: tolerar.
#:
#: Con el conjunto vacio, `test_la_deuda_de_capturas_no_crece` deja de ser un
#: tope de deuda y pasa a ser un guard puro contra la reintroduccion: cualquier
#: fichero que vuelva a congelar `process.env` fuera de un hook para
#: reinyectarlo despues sale en `nuevos` y rompe el test.
#:
#: Si algun dia hiciera falta reintroducir una entrada aqui, tiene que venir con
#: el motivo tecnico concreto escrito al lado. Vaciarla otra vez es el objetivo.
DEUDA_CONOCIDA = set()


def test_el_fichero_que_fallaba_ya_no_tiene_el_patron():
    """Regresion del defecto concreto que se reprodujo y se arreglo."""
    f = REPO / "backend" / "auth" / "__tests__" / "authSessionSecurity.test.ts"
    texto = f.read_text(encoding="utf-8")
    for m in _CAPTURA.finditer(texto):
        nombre, variable = m.group(1), m.group(2)
        assert not re.search(rf"process\.env\.{variable}\s*=\s*{nombre}", texto), (
            f"vuelve la captura fuera de hook en authSessionSecurity: {nombre}"
        )


def test_la_deuda_de_capturas_no_crece():
    """El patron que hacia la suite dependiente del orden entre ficheros."""
    culpables = []
    for f in _ficheros_de_test():
        texto = f.read_text(encoding="utf-8", errors="replace")
        if "afterEach" not in texto and "afterAll" not in texto:
            continue
        for m in _CAPTURA.finditer(texto):
            nombre, variable = m.group(1), m.group(2)
            # Solo molesta si ese valor se reinyecta al entorno mas tarde.
            reinyecta = re.search(
                rf"process\.env\.{variable}\s*=\s*{nombre}\b", texto
            )
            if reinyecta:
                culpables.append(f"{f.relative_to(REPO).as_posix()}: {nombre} <- process.env.{variable}")
    ficheros = {c.split(":")[0] for c in culpables}
    nuevos = sorted(ficheros - DEUDA_CONOCIDA)
    arreglados = sorted(DEUDA_CONOCIDA - ficheros)
    assert not nuevos and not arreglados, (
        (f"ficheros NUEVOS con el patron: {nuevos}\n" if nuevos else "")
        + (f"ya arreglados, quitalos de DEUDA_CONOCIDA: {arreglados}\n" if arreglados else "")
        + "Captura el valor dentro de `beforeEach`: fuera de un hook se congela "
          "lo que dejo otro fichero del mismo worker."
    )


def test_el_detector_reconoce_el_patron_original():
    """Control negativo, con el codigo exacto que fallaba.

    Sin esto, un regex que no casara nada daria verde y el guard seria decorativo.
    """
    muestra = (
        'describe("x", () => {\n'
        "  const original = process.env.JWT_SECRET;\n"
        "  afterEach(() => {\n"
        "    process.env.JWT_SECRET = original;\n"
        "  });\n"
        "});\n"
    )
    m = _CAPTURA.search(muestra)
    assert m, "el detector ya no reconoce la captura en ambito de describe"
    assert re.search(rf"process\.env\.{m.group(2)}\s*=\s*{m.group(1)}\b", muestra)

    # Y no debe marcar una captura hecha DENTRO del hook, que es la forma correcta.
    correcta = (
        'describe("x", () => {\n'
        "  let original: string | undefined;\n"
        "  beforeEach(() => {\n"
        "    original = process.env.JWT_SECRET;\n"
        "  });\n"
        "});\n"
    )
    assert not _CAPTURA.search(correcta), "el detector marca la forma correcta"
