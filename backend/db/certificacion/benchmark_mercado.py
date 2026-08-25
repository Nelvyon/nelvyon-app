"""BLOQUE 5 · FASE B — comparativa de mercado con clases de evidencia.

La instruccion del fundador es tajante: **prohibido inventar superioridad**, y
en concreto «no declares SUPERIOR_CERTIFIED ni EQUAL_CERTIFIED cuando solo
exista documentacion del competidor».

Eso no es una recomendacion de estilo: define lo que este fichero puede y no
puede decir. Para afirmar que NELVYON es mejor o igual que un referente en un
criterio hace falta **la misma medida tomada de los dos lados**. Y medir el
producto de un tercero exige una cuenta suya —normalmente de pago—, usar datos
reales y tocar sistemas ajenos. Las tres cosas estan prohibidas en este bloque.

De ahi la consecuencia incomoda y honesta: en casi todas las categorias la
comparativa se queda en DOCUMENTADO, y el estado certificable es el de la
calidad **propia** medida, no el de una superioridad que nadie ha demostrado.

Las cinco clases, de mas fuerte a mas debil:

  MEASURED       Medido AQUI, con una herramienta reproducible de este arbol.
                 Es la unica clase que sostiene una comparacion, y solo si esta
                 tomada igual en los dos lados.
  OBSERVED       Visto funcionando en un producto publico y gratuito, sin
                 cuenta ni pago. Vale como testimonio; no como medida.
  DOCUMENTED     Sale de la documentacion publica del referente. Dice lo que el
                 fabricante AFIRMA, que no es lo mismo que lo que hace.
  SIMULATED      Modelado o estimado. No es evidencia de nada real; se etiqueta
                 asi justamente para que nadie lo confunda.
  NOT_COMPARABLE No hay base para comparar: el referente no tiene esa pieza, o
                 tenerla significa algo distinto en su producto.

`ORDEN` fija esa jerarquia para que el guardian pueda comprobarla en vez de
confiar en que quien escriba se acuerde.
"""

from __future__ import annotations

import json
from pathlib import Path

ESTADO = Path(__file__).with_name("benchmark_mercado_estado.json")

CLASES = ("MEASURED", "OBSERVED", "DOCUMENTED", "SIMULATED", "NOT_COMPARABLE")

# Solo estas dos clases pueden sostener una comparacion, y solo con la misma
# medida en ambos lados.
CLASES_COMPARABLES = ("MEASURED",)

VEREDICTOS = (
    "SUPERIOR",         # exige MEASURED en NELVYON **y** en el referente
    "EQUAL",            # idem
    "PROPIA_MEDIDA",    # se mide lo de NELVYON; del referente no hay medida
    "SIN_COMPARAR",     # no hay base
)


# (categoria, referentes, criterio comparable, nota sobre el limite)
FILAS = [
    ("crm_y_ventas",
     ["HubSpot CRM (plan gratuito)", "Zoho CRM Free", "EspoCRM (codigo abierto)"],
     "gestion de contactos, oportunidades y actividades sobre una misma ficha",
     "El comportamiento del referente solo se puede leer en su documentacion: "
     "medirlo exigiria una cuenta suya y datos reales."),

    ("campanias_y_email",
     ["Mailchimp (plan gratuito)", "Brevo (plan gratuito)", "Listmonk (codigo abierto)"],
     "composicion, segmentacion y envio de campanias con seguimiento de aperturas",
     "NELVYON tiene el correo APAGADO por diseno en certificacion "
     "(`CorreoDesactivadoError`), asi que ni siquiera el lado propio se mide "
     "enviando: se mide que el envio no sale sin autorizacion."),

    ("seo_y_visibilidad",
     ["Google Search Console (gratuito)", "Ahrefs Webmaster Tools (gratuito)"],
     "auditoria tecnica y seguimiento de posiciones",
     "Los referentes miden un dominio real conectado; NELVYON se certifica "
     "contra entorno de certificacion. No son la misma poblacion."),

    ("contenido_y_copy",
     ["Notion (plan gratuito)", "Google Docs"],
     "creacion y reutilizacion de piezas de contenido con plantillas",
     "Comparacion de superficie: el referente es un editor generico y NELVYON "
     "un generador orientado a campania."),

    ("social_y_comunidad",
     ["Buffer (plan gratuito)", "Discourse (codigo abierto)"],
     "programacion de publicaciones y espacio de comunidad",
     "Publicar de verdad exige credenciales de las redes, prohibidas aqui."),

    ("publicidad",
     ["Google Ads (documentacion publica)", "Meta Ads Manager (documentacion publica)"],
     "estructura de campania, presupuesto y atribucion",
     "Cualquier medida real implicaria gasto publicitario: coste externo > 0 €."),

    ("reputacion",
     ["Google Business Profile (gratuito)"],
     "recogida de resenas y respuesta",
     "Requiere una ficha de negocio real. No se usan clientes reales."),

    ("funnels_y_conversion",
     ["Google Forms (gratuito)", "Typeform (plan gratuito)"],
     "construccion de formulario y medicion de conversion",
     "La conversion del referente depende de su trafico; no hay dos poblaciones "
     "comparables."),

    ("web_y_tienda",
     ["WooCommerce (codigo abierto)", "Medusa (codigo abierto)"],
     "catalogo, ficha de producto y proceso de compra",
     "El proceso de compra real implica pagos; prohibidos en este bloque."),

    ("entregables_y_packs",
     ["Google Drive", "Notion (plan gratuito)"],
     "entrega y versionado de material al cliente",
     "El referente entrega ficheros; NELVYON entrega paquetes de servicio. La "
     "unidad no es la misma."),

    ("soporte_e_inbox",
     ["Chatwoot (codigo abierto)", "FreeScout (codigo abierto)"],
     "bandeja unificada con asignacion y estados",
     "Los canales reales (WhatsApp, correo) estan desconectados en certificacion."),

    ("automatizacion",
     ["n8n (codigo abierto)", "Make (plan gratuito)"],
     "encadenar pasos con disparador, condiciones y reintentos",
     "El referente es una plataforma generica de flujos; NELVYON automatiza su "
     "propio dominio. Comparables en mecanica, no en alcance."),

    ("analitica_y_reporting",
     ["Matomo (codigo abierto)", "Metabase (codigo abierto)", "Google Analytics 4 (gratuito)"],
     "paneles, series temporales y exportacion",
     "Sin trafico real no hay datos que comparar."),

    ("agencia_y_partners",
     [],
     "",
     "NO COMPARABLE: la operativa de agencia con subcuentas, marca blanca y "
     "reparto de comision no tiene un referente gratuito y documentable con la "
     "misma unidad. Inventar uno para poder poner una nota seria peor que "
     "decir que no lo hay."),

    ("portal_del_cliente",
     ["Chatwoot (codigo abierto)"],
     "acceso del cliente a su material y su estado",
     "El referente cubre soporte, no entrega de proyecto. Solape parcial."),

    ("cobro_y_facturacion",
     ["Stripe Billing (documentacion publica)", "Invoice Ninja (codigo abierto)"],
     "suscripciones, facturas y estados de cobro",
     "Cobrar de verdad es coste externo y produccion. Lo que SI se mide aqui es "
     "que el importe lo decide el servidor y que la tabla de precios esta "
     "congelada."),

    ("cuenta_y_configuracion",
     ["Keycloak (codigo abierto)"],
     "identidad, roles y permisos",
     "El referente es un servidor de identidad; NELVYON integra RBAC en el "
     "producto. Comparables en propiedades, no en forma."),

    ("integraciones_y_api",
     ["n8n (codigo abierto)", "Zapier (documentacion publica)"],
     "webhooks entrantes y salientes, claves de API e idempotencia",
     "Los webhooks externos reales estan prohibidos en este bloque."),

    ("ia_y_agentes",
     ["Flowise (codigo abierto)", "LangChain (codigo abierto)"],
     "agentes con herramientas, memoria y aprobaciones",
     "NELVYON se certifica con la IA APAGADA (`NELVYON_AI_ENABLED=0`) y sin "
     "proveedores de pago. Lo medido es el contrato de estados y las guardas, "
     "no la calidad de un modelo."),

    ("os_servicios_premium",
     [],
     "",
     "NO COMPARABLE: son 25 servicios de agencia empaquetados. No hay producto "
     "gratuito que venda lo mismo con la misma unidad."),

    ("os_plataforma",
     [],
     "",
     "NO COMPARABLE: es el sistema operativo interno de la agencia. Un "
     "referente externo mediria otra cosa."),

    ("sitio_publico",
     ["Cualquier sitio publico de SaaS (medible sin cuenta)"],
     "accesibilidad WCAG, ausencia de desbordamiento en movil y errores de render",
     "ESTE es el unico eje donde la misma medida se podria tomar de los dos "
     "lados sin cuenta ni pago, porque una pagina publica se puede auditar con "
     "axe. No se ha hecho: exigiria lanzar peticiones contra servidores de "
     "terceros, y este bloque no sale a la red. Queda registrado como limite, "
     "no como resultado."),

    ("legales",
     ["Textos legales publicos de cualquier SaaS"],
     "presencia y accesibilidad de aviso legal, privacidad y cookies",
     "Comparar la CALIDAD juridica de un texto no es una medida tecnica; "
     "afirmarlo seria opinar con cara de dato."),

    ("acceso",
     ["Keycloak (codigo abierto)", "Auth.js (codigo abierto)"],
     "registro, acceso, recuperacion de contrasena y cierre de sesion",
     "Los proveedores OAuth reales estan prohibidos en este bloque."),

    ("enlaces_y_utilidades",
     [],
     "",
     "NO COMPARABLE: son rutas de utilidad y previsualizacion internas, sin "
     "equivalente comercial."),
]


def _veredicto(clase_nelvyon: str, clase_referente: str) -> str:
    """El veredicto SALE de las clases. No se teclea.

    Con esto es imposible escribir «SUPERIOR» sin la medida que lo sostiene: no
    hay ninguna rama que lo devuelva si falta la medida del referente.
    """
    if clase_nelvyon != "MEASURED":
        return "SIN_COMPARAR"
    if clase_referente == "MEASURED":
        return "SUPERIOR"          # y aun asi habria que justificar el criterio
    if clase_referente == "NOT_COMPARABLE":
        return "SIN_COMPARAR"      # se midio lo propio, pero no hay contra que
    return "PROPIA_MEDIDA"         # lo propio medido; del referente solo su documentacion


def construir() -> dict:
    # La medida propia no se AFIRMA: se copia del informe por categoria, que la
    # calcula barriendo el arbol. Una etiqueta `MEASURED` sin el numero detras
    # es una palabra, no una medida.
    from backend.db.certificacion.informe_por_categoria import informe

    medido = informe()

    cats = {}
    for categoria, referentes, criterio, limite in FILAS:
        m = medido[categoria]
        clase_nelvyon = "MEASURED"
        clase_referente = "DOCUMENTED" if referentes else "NOT_COMPARABLE"
        cats[categoria] = {
            "referentes": referentes,
            "criterio": criterio,
            "clase_nelvyon": clase_nelvyon,
            "clase_referente": clase_referente,
            "veredicto": _veredicto(clase_nelvyon, clase_referente),
            "limite": limite,
            "medida_nelvyon": {
                "areas": len(m["areas"]),
                "pantallas": m["pantallas"],
                "defectos": m["total_defectos"],
                "enlaces_rotos": m["enlaces_rotos"],
                "herramientas": [
                    "auditoria_de_pantallas (7 reglas)",
                    "auditoria_de_rutas (888 rutas derivadas)",
                    "medicion-por-categoria.spec.ts (axe-core + 375px, navegador real)",
                ],
            },
        }
    return {
        "nota": (
            "Ninguna categoria declara SUPERIOR ni EQUAL. Para sostener "
            "cualquiera de las dos haria falta la MISMA medida tomada en el "
            "referente, y medir el producto de un tercero exige una cuenta "
            "suya, coste y datos reales: las tres cosas estan prohibidas en "
            "este bloque. Lo que si se afirma es la calidad PROPIA medida."
        ),
        "clases": [
            "MEASURED: medido aqui con herramienta reproducible del arbol",
            "OBSERVED: visto en producto publico gratuito, sin cuenta",
            "DOCUMENTED: lo que el fabricante afirma en su documentacion publica",
            "SIMULATED: modelado; no es evidencia de nada real",
            "NOT_COMPARABLE: no hay base comun para comparar",
        ],
        "categorias": cats,
    }


def estado() -> dict:
    return json.loads(ESTADO.read_text(encoding="utf-8"))


def categorias() -> dict[str, dict]:
    return estado()["categorias"]


def _resumen() -> dict[str, int]:
    conteo = {v: 0 for v in VEREDICTOS}
    for v in categorias().values():
        conteo[v["veredicto"]] = conteo.get(v["veredicto"], 0) + 1
    return conteo


def escribir() -> None:
    """Regenera el fichero de estado desde la derivacion."""
    ESTADO.write_text(
        json.dumps(construir(), ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
        newline="\n",
    )

if __name__ == "__main__":
    import sys as _sys
    if "--escribir" in _sys.argv:
        escribir()
        print("escrito", ESTADO)
    cats = categorias()
    print(f"categorias comparadas: {len(cats)}\n")
    print(f"{'categoria':28} {'veredicto':16} {'nelvyon':14} {'referente':14}")
    print("-" * 76)
    for c in sorted(cats):
        d = cats[c]
        print(f"{c:28} {d['veredicto']:16} {d['clase_nelvyon']:14} {d['clase_referente']:14}")
    print("-" * 76)
    for k, n in _resumen().items():
        print(f"  {k:16} {n}")
