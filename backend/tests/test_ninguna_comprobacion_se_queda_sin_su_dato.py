"""Una comprobación que nadie alimenta está viva en el código y muerta en la práctica.

LO QUE PASÓ, Y POR QUÉ COSTÓ MESES DARSE CUENTA
------------------------------------------------
Ocho comprobaciones del motor de calidad leen campos concretos de la pieza
—`ctasPrincipales`, `camposDelFormulario`, `paginas`…—. Ninguno llegaba nunca:

  · los 28 ficheros de prompts piden JSON riquísimo y ni una sola clave que
    alguna comprobación lea;
  · y lo que devuelve cada paso viaja como TEXTO dentro de `steps[].data.output`,
    así que aunque el modelo hubiera emitido el campo, la comprobación lo busca
    en el primer nivel de la pieza y ahí no hay nada.

Las ocho devolvían `undefined`, que el motor traduce a «no se pudo comprobar».
Nada fallaba. Los informes decían «bloqueado por PROVIDER_REAL_OUTPUT_VERIFICATION»
—hace falta un modelo real— y era falso: el modelo real las emite. Lo que no
existía era la cadena.

Es la peor forma de deuda porque se disfraza de causa externa: mientras la culpa
la tenga un proveedor que no está, nadie mira el cableado que sí está.

QUÉ VIGILA ESTA PRUEBA
----------------------
Que la cadena siga entera. Tres eslabones, y ninguno vale sin los otros dos:

  1 · el CONTRATO está completo — cada campo dice quién lo lee, qué es y qué
      forma tiene; sin la forma, el modelo omite las listas de objetos (medido);
  2 · el campo se PIDE — la disciplina que tiene la comprobación lo incluye;
  3 · la ficha se USA — el manejador de servicios la pasa a la pieza.

Una comprobación nueva que lea un campo nuevo rompe esto el día que se escribe,
que es cuando se decide cómo se le pide ese dato a un modelo.

LO QUE ESTA PRUEBA NO HACE
--------------------------
No llama a ningún modelo. Que un modelo REAL emita la forma se mide en
`laFichaLaEmiteUnModeloDeVerdad.pg.test.ts`, contra el Ollama local, y queda
escrito en `docs/evidence/ficha_de_modelo_real.json`. Aquí solo se vigila que el
cableado siga puesto.

COSTE EXTERNO: 0 EUR. Se lee el árbol.
"""
from __future__ import annotations

import pathlib
import re

RAIZ = pathlib.Path(__file__).resolve().parents[2]
CONTRATO = RAIZ / "backend" / "calidad" / "contratoDeSalidaEstructurada.ts"
PUENTE = RAIZ / "backend" / "calidad" / "laFichaQueFaltaba.ts"
MANEJADOR = RAIZ / "backend" / "queue" / "manejadorDeServicioOs.ts"
EVIDENCIA = RAIZ / "docs" / "evidence" / "ficha_de_modelo_real.json"


def _mapa(nombre: str) -> dict[str, str]:
    """Un `Record<campo, texto>` del contrato, por su nombre."""
    texto = CONTRATO.read_text(encoding="utf-8")
    inicio = texto.index(f"export const {nombre}")
    cuerpo = texto[inicio : texto.index("};", inicio)]
    return dict(re.findall(r'^\s{2}([A-Za-z]+):\s*(.+?),?\s*$', cuerpo, re.M))


def test_el_barrido_encuentra_los_tres_mapas():
    """CONTROL POSITIVO. Sin ellos, todo lo de abajo compararía vacíos."""
    for nombre in ("QUIEN_LEE_CADA_CAMPO", "QUE_ES_CADA_CAMPO", "FORMA_DE_CADA_CAMPO"):
        assert _mapa(nombre), f"no se encuentra {nombre}; el barrido mira mal"
    assert len(_mapa("QUIEN_LEE_CADA_CAMPO")) >= 8, "el contrato perdió campos"


def test_ningun_campo_se_queda_a_medias():
    """EL CONTRATO ENTERO O NADA.

    Un campo sin lector es una llamada que se gasta para nada. Un campo sin
    explicación no se le puede pedir a un modelo. Y un campo sin FORMA se queda
    sin emitir en cuanto es una lista de objetos: se midió contra el modelo real
    y `camposDelFormulario` no llegaba hasta que se le enseñó el esqueleto.
    """
    lectores = set(_mapa("QUIEN_LEE_CADA_CAMPO"))
    for nombre in ("QUE_ES_CADA_CAMPO", "FORMA_DE_CADA_CAMPO"):
        faltan = sorted(lectores - set(_mapa(nombre)))
        assert not faltan, (
            f"estos campos no aparecen en {nombre}, así que la comprobación que "
            f"los lee volverá a quedarse sin dato: {faltan}"
        )


def test_la_instruccion_lleva_la_forma_y_no_solo_la_descripcion():
    """La corrección que salió de medir, y que hay que conservar.

    La primera versión solo describía cada campo. El modelo devolvía las listas
    de textos y omitía las de objetos, porque una descripción no dice qué lleva
    el objeto dentro. Con el esqueleto delante los emite.
    """
    texto = PUENTE.read_text(encoding="utf-8")
    assert "FORMA_DE_CADA_CAMPO[c]" in texto, (
        "la instrucción dejó de enseñar la forma de cada campo; las listas de "
        "objetos volverán a no emitirse"
    )


def test_la_ficha_se_usa_donde_pasa_todo_el_trabajo():
    """EL ESLABÓN QUE FALTABA.

    Que exista el contrato y que se sepa pedir no sirve de nada si la ficha no
    llega a la pieza. Es exactamente el estado en el que llevaba meses.
    """
    texto = MANEJADOR.read_text(encoding="utf-8")
    assert "pedirLaFicha" in texto, (
        "el manejador de servicios dejó de pedir la ficha: las ocho vuelven a "
        "decir «no se pudo comprobar»"
    )
    assert "...ficha" in texto, "la ficha se pide y no se pasa a la pieza"


def test_no_se_pide_la_ficha_a_un_proveedor_de_pago_por_descuido():
    """Es UNA llamada más por trabajo terminado.

    Con el modelo local cuesta 0. Con un proveedor de pago costaría dinero que
    nadie ha autorizado para una ayuda de calidad, así que la política decide, y
    esta prueba impide que alguien se salte la pregunta.
    """
    texto = PUENTE.read_text(encoding="utf-8")
    assert "sePuedePedirSinCoste" in texto, "desapareció la puerta de coste"
    assert "decidirCoste" in texto, (
        "se dejó de preguntar a la política de coste: la decisión pasó a estar "
        "escrita a mano en vez de derivada"
    )


def test_la_verificacion_con_modelo_real_dejo_evidencia():
    """PROVIDER_REAL_OUTPUT_VERIFICATION no se afirma: se mide y se escribe.

    Si el fichero desaparece, la afirmación se queda sin respaldo y vuelve a ser
    una etiqueta.
    """
    assert EVIDENCIA.exists(), (
        "no hay evidencia de que un modelo real emita la ficha; sin ella, "
        "PROVIDER_REAL_OUTPUT_VERIFICATION vuelve a ser una etiqueta"
    )
    datos = EVIDENCIA.read_text(encoding="utf-8")
    assert '"proveedor": "ollama"' in datos, "la evidencia no dice contra qué proveedor se midió"
    assert '"costeEuros": 0' in datos, "la evidencia no declara el coste"
    for comprobacion in (
        "canibalizacion",
        "cualificacion-explicada",
        "el-precio-no-aparece-tarde",
        "empieza-por-lo-que-el-cliente-queria",
        "formulario-pide-lo-justo",
        "gastos-de-envio-sin-sorpresas",
        "se-puede-leer-lo-que-pone",
        "una-idea-por-pantalla",
    ):
        assert comprobacion in datos, (
            f"«{comprobacion}» ya no aparece en la evidencia: o dejó de verificarse "
            "o dejó de emitirse su campo"
        )
