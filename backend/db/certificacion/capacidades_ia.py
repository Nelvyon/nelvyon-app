"""Inventario CERRADO de capacidades de IA del BLOQUE 3.

Se DERIVA del arbol, igual que las 39 del Bloque 2 se derivaron de las 922 rutas.
La razon es la misma y se gano por las malas: un inventario escrito a mano se
infla o se desinfla segun convenga, y entonces el porcentaje no mide nada.

Aqui la unidad es el MODULO (`.ts` bajo las tres carpetas de IA). Cada modulo cae
en exactamente una capacidad por el PRIMER patron que casa, en orden. Un guardian
comprueba las dos direcciones: ningun modulo huerfano y ninguna capacidad vacia.

Tres familias, y no son intercambiables:

  ORQUESTACION  la maquinaria: quien planifica, quien ejecuta, quien revisa,
                quien recuerda y quien deja rastro.
  INTERNOS      los 23 agentes de la propia empresa IA de NELVYON.
  SERVICIO      los agentes Premium: lo que NELVYON VENDE a sus clientes.

`sectors/` son ~1994 modulos de 195 nichos. No son 195 capacidades: son UNA
—`multinicho_sectores`—, porque lo que hay que certificar no es cada nicho por
separado sino que el comportamiento salga del contexto y no de un hardcode.
"""

from __future__ import annotations

import re
from pathlib import Path

import os

# En el arbol vive en , de ahi los tres niveles.
#  existe para poder probarlo desde fuera sin tocar el arbol.
RAIZ = Path(os.environ.get("NELVYON_RAIZ") or Path(__file__).resolve().parents[3])

CARPETAS = ("backend/os-agents", "backend/local-ai", "backend/private-ai")

# (capacidad, familia, patron). ORDEN SIGNIFICATIVO: gana el primero que casa.
MAPA: list[tuple[str, str, str]] = [
    # ── los nichos, antes que nada: son el 90 % de los ficheros ──────────────
    ("multinicho_sectores",        "ORQUESTACION", r"os-agents/sectors/(?!__tests__)"),

    # ── nucleo de orquestacion ──────────────────────────────────────────────
    ("orquestador_central",        "ORQUESTACION", r"os-agents/(OsOrchestrator|sectorOsRegistry|sectorPriority|sectorOsPayload)"),
    ("cola_y_trabajos",            "ORQUESTACION", r"os-agents/(OsQueue|OsQueueWorker|OsJobStore|cron/)"),
    ("bus_de_eventos_y_avisos",    "ORQUESTACION", r"os-agents/(OsEventBus|OsNotifier|notifiers/|email-queue/)"),
    ("registro_y_base_de_agentes", "ORQUESTACION", r"os-agents/(OsAgentRegistry|BaseOsAgent|SectorAgentBase|SectorAgentWrapper|agents/)"),
    ("recuperacion_ante_fallos",   "ORQUESTACION", r"os-agents/(OsAgentError|healthcheck/)"),
    ("evaluacion_de_calidad",      "ORQUESTACION", r"os-agents/(AgentQualityService|quality/|benchmarks/)"),
    ("intake_y_objetivo",          "ORQUESTACION", r"os-agents/(IntakeFormService|intakeSchemas|IntentMulticanalService)"),
    ("conocimiento_del_cliente",   "ORQUESTACION", r"os-agents/(client-profile/|contextEnricher|seedPersonalizer|seeds/)"),
    ("reporting_y_roi",            "ORQUESTACION", r"os-agents/(OsReportingService|ClosedLoopRoiService|PredictiveRoiService|attribution/|ab-testing/)"),
    ("entregables_y_certificados", "ORQUESTACION", r"os-agents/(OsSectorCertificationService|packs/|artifacts/|watermark)"),
    ("aprendizaje_autonomo",       "ORQUESTACION", r"os-agents/(learning/|upsell/)"),
    ("prompts_y_idioma",           "ORQUESTACION", r"os-agents/(AgentPromptVault|prompts/|agentLanguage)"),
    ("creatividad_y_generacion",   "ORQUESTACION", r"os-agents/(creative/|generative/|creators/|logoDesignerAgent|videoEnhancerAgent)"),
    ("visibilidad_y_crm_os",       "ORQUESTACION", r"os-agents/(GeoAiVisibilityService|crm/|advanced/|assets/)"),
    ("cliente_llm_y_coste",        "ORQUESTACION", r"os-agents/(LlmClient|llm/|llmAsyncContext)"),
    ("varios_del_nucleo",          "ORQUESTACION", r"os-agents/(constants|types|index|scripts/)"),

    # ── memoria, RAG y conocimiento ─────────────────────────────────────────
    ("memoria_y_rag",              "ORQUESTACION", r"local-ai/(LocalMemoryStore|LocalRagRetriever|LocalVectorStore|LocalEmbeddingProvider|RagIngestPipeline)"),
    ("ingesta_de_conocimiento",    "ORQUESTACION", r"local-ai/(KnowledgeIngestService|knowledgeGapDetector|externalKnowledgeRegistry|specialization/)"),
    ("enrutado_de_modelo",         "ORQUESTACION", r"local-ai/(router/|OllamaClient|OllamaRuntimePrep|config)"),
    ("infra_ia_propia",            "ORQUESTACION", r"local-ai/(LocalAiBackupService|LocalAiHealth|railwayRagPrep|db|rlsRoleGuard)"),

    # ── la empresa IA interna ───────────────────────────────────────────────
    ("agentes_internos",           "INTERNOS",     r"private-ai/(nelvyonAgentRegistry|agents/|core/)"),
    ("permisos_y_herramientas",    "INTERNOS",     r"private-ai/(tools/|adapters/|types)"),
    ("rag_privado",                "INTERNOS",     r"private-ai/(rag/|providers/)"),

    # Estas seis salieron de los HUERFANOS que dejo el primer reparto, y no eran
    # residuo: son exactamente las piezas que la orden nombra —aprobaciones,
    # trazabilidad, contexto de negocio, memoria por inquilino, supervision—.
    # Un mapa que las hubiera metido en un cajon de sastre habria escondido lo
    # que mas hay que certificar.
    ("orquestacion_privada",       "INTERNOS",     r"private-ai/(orchestrator/|PrivateAiRouter)"),
    # `estadoDeAccion` entra aqui y no en una capacidad nueva: el contrato de
    # estados es lo que hace que una aprobacion signifique algo. Sin el,
    # "encolado para aprobacion" y "ejecutado" eran el mismo campo de texto.
    ("aprobaciones_y_gates",       "INTERNOS",     r"private-ai/(approvals/|sensitiveActions|estadoDeAccion)"),
    ("trazabilidad_y_auditoria",   "INTERNOS",     r"private-ai/(audit/|observability/)"),
    # `contextoRecuperado` es como se ENTREGA el contexto al modelo, asi que
    # pertenece al contexto de negocio: separar datos de ordenes es parte de
    # que el contexto sea utilizable sin ser una via de instrucciones.
    ("contexto_de_negocio",        "INTERNOS",     r"private-ai/(context/|contextoRecuperado)"),
    ("memoria_por_inquilino",      "INTERNOS",     r"private-ai/memory/"),
    ("modo_privado_y_coste",       "INTERNOS",     r"private-ai/(privateMode|config)"),
]

def _servicios_premium(raiz: Path) -> list[tuple[str, str, str]]:
    """Una capacidad por agente Premium, DERIVADA del arbol.

    Son los servicios que NELVYON vende. Escribir aqui una lista a mano
    significaria que anadir un agente nuevo no cambia el denominador y su
    certificacion no se echa de menos: entraria en produccion sin que nadie lo
    notara. Derivandolos, aparece solo y el guardian obliga a clasificarlo.

     se queda fuera a proposito: es andamio, no un servicio.
    """
    carpeta = raiz / "backend" / "os-agents" / "agents"
    if not carpeta.exists():
        return []
    salida = []
    for f in sorted(carpeta.glob("*PremiumAgent.ts")):
        nombre = f.stem                                  # p.ej. SeoPremiumAgent
        if nombre == "StubPremiumAgent":
            continue
        raiz_nombre = nombre[: -len("PremiumAgent")]     # p.ej. Seo
        slug = re.sub(r"(?<!^)(?=[A-Z])", "_", raiz_nombre).lower()
        # Casa el agente Y su fichero de prompts ().
        minuscula = raiz_nombre[0].lower() + raiz_nombre[1:]
        patron = rf"os-agents/agents/({re.escape(nombre)}|{re.escape(minuscula)}PremiumPrompts)\.ts$"
        salida.append((f"servicio_{slug}", "SERVICIO", patron))
    return salida


# Los servicios van ANTES del registro generico: si no,  se los tragaria
# a todos y lo que NELVYON vende quedaria escondido en un cajon de sastre.
_i = next(i for i, (c, _, _) in enumerate(MAPA) if c == "registro_y_base_de_agentes")
MAPA[_i:_i] = _servicios_premium(RAIZ)

_COMPILADO = [(c, f, re.compile(p)) for c, f, p in MAPA]


def modulos() -> list[str]:
    """Todo `.ts` de las tres carpetas, sin pruebas. Rutas con `/`."""
    fuera = re.compile(r"__tests__|\.test\.ts$|\.spec\.ts$|/node_modules/")
    encontrados: list[str] = []
    for carpeta in CARPETAS:
        base = RAIZ / carpeta
        if not base.exists():
            continue
        for f in base.rglob("*.ts"):
            rel = f.relative_to(RAIZ).as_posix()
            if not fuera.search(rel):
                encontrados.append(rel)
    return sorted(encontrados)


def capacidad_de(ruta: str) -> str | None:
    for capacidad, _familia, patron in _COMPILADO:
        if patron.search(ruta):
            return capacidad
    return None


def familias() -> dict[str, str]:
    return {c: f for c, f, _ in MAPA}


def reparto() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {c: [] for c, _, _ in MAPA}
    for m in modulos():
        c = capacidad_de(m)
        if c:
            out[c].append(m)
    return out


def huerfanos() -> list[str]:
    return [m for m in modulos() if capacidad_de(m) is None]


if __name__ == "__main__":
    r = reparto()
    h = huerfanos()
    if len(modulos()) < 500:
        raise SystemExit(
            f"solo {len(modulos())} modulos: la raiz apunta mal. Cero huerfanos "
            "sobre cero modulos es un verde que no mide nada.")
    print(f"modulos: {len(modulos())}  capacidades: {len(r)}  huerfanos: {len(h)}")
    for c, f, _ in MAPA:
        print(f"  [{f:12}] {c:28} {len(r[c]):5}")
    if h:
        print("\nHUERFANOS:")
        for m in h[:40]:
            print("   ", m)
