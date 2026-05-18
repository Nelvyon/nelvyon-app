"""
Contrato único de deals.stage — fuente de verdad para CRM, dashboards y seed.

Valores CANÓNICOS (escritura / API en PRs posteriores): alineados con Kanban SaaS.
Valores en BD legacy (won, closed, lost): reconocidos en lectura y métricas vía SQL_*
y normalize_stage / stage_category.
"""
from __future__ import annotations

from typing import Final, FrozenSet, Literal, Optional, Tuple

# ── Canónicos (única ortografía para escritura nueva) ──
CANONICAL_DEAL_STAGES: Tuple[str, ...] = (
    "lead",
    "qualified",
    "proposal",
    "negotiation",
    "closed_won",
    "closed_lost",
)

CANONICAL_DEAL_STAGES_SET: FrozenSet[str] = frozenset(CANONICAL_DEAL_STAGES)

OPEN_DEAL_STAGES: FrozenSet[str] = frozenset(
    {"lead", "qualified", "proposal", "negotiation"}
)

CLOSED_WON_STAGE: Final[str] = "closed_won"
CLOSED_LOST_STAGE: Final[str] = "closed_lost"

# Alias legacy → canónico (normalización)
LEGACY_ALIAS_TO_CANONICAL: Final[dict[str, str]] = {
    "won": CLOSED_WON_STAGE,
    "closed": CLOSED_WON_STAGE,
    "lost": CLOSED_LOST_STAGE,
}

# Literales que cuentan como “ganado” en SQL (canónico + legacy en BD)
SQL_WON_STAGE_VALUES: Tuple[str, ...] = (CLOSED_WON_STAGE, "won", "closed")

# Literales que cuentan como “perdido” en SQL
SQL_LOST_STAGE_VALUES: Tuple[str, ...] = (CLOSED_LOST_STAGE, "lost")

# Todos los valores terminales (open = not in este conjunto)
SQL_TERMINAL_STAGE_VALUES: Tuple[str, ...] = tuple(
    dict.fromkeys(SQL_WON_STAGE_VALUES + SQL_LOST_STAGE_VALUES)
)


def is_valid_canonical_stage_for_write(stage: str) -> bool:
    """True si el valor puede persistirse como deals.stage (whitelist canónica)."""
    return stage in CANONICAL_DEAL_STAGES_SET


def coerce_deal_stage_for_write(raw: str) -> str:
    """
    Valor a persistir en deals.stage (create/update). Acepta etapas canónicas y
    alias legacy (won/closed/lost) mapeados a closed_won/closed_lost; rechaza
    cualquier otro literal para mantener coherencia con pipeline_pro y métricas SQL_*.
    """
    if raw is None:
        raise ValueError("stage is required")
    s = raw.strip().lower()
    if not s:
        raise ValueError("stage cannot be empty")
    if s in LEGACY_ALIAS_TO_CANONICAL:
        return LEGACY_ALIAS_TO_CANONICAL[s]
    if s in CANONICAL_DEAL_STAGES_SET:
        return s
    allowed = ", ".join(CANONICAL_DEAL_STAGES)
    legacy = ", ".join(sorted(LEGACY_ALIAS_TO_CANONICAL.keys()))
    raise ValueError(
        f"Invalid stage {raw!r}. Use a canonical stage ({allowed}) "
        f"or legacy alias ({legacy}) for closed outcomes."
    )


def normalize_stage_to_canonical(raw: Optional[str]) -> Optional[str]:
    """
    Devuelve el stage canónico si hay mapeo; si ya es canónico, igual;
    si es desconocido, devuelve el string recortado (no forzar a un bucket).
    """
    if raw is None:
        return None
    s = raw.strip().lower()
    if not s:
        return None
    if s in LEGACY_ALIAS_TO_CANONICAL:
        return LEGACY_ALIAS_TO_CANONICAL[s]
    if s in CANONICAL_DEAL_STAGES_SET:
        return s
    return s


def stage_category(raw: Optional[str]) -> Literal["open", "won", "lost"]:
    """
    Categoría para KPIs: cualquier valor en SQL_WON_* → won, SQL_LOST_* → lost;
    resto → open (incluye pipeline abierto canónico y valores arbitrarios legacy).
    """
    if raw is None:
        return "open"
    s = raw.strip().lower()
    if not s:
        return "open"
    if s in SQL_WON_STAGE_VALUES:
        return "won"
    if s in SQL_LOST_STAGE_VALUES:
        return "lost"
    return "open"


def sql_in_list(values: Tuple[str, ...]) -> str:
    """Fragmento SQL: ('a','b',...) — solo para valores controlados internamente."""
    return "(" + ",".join(f"'{v}'" for v in values) + ")"


def sql_fragment_stage_in_won() -> str:
    return f"stage IN {sql_in_list(SQL_WON_STAGE_VALUES)}"


def sql_fragment_stage_in_lost() -> str:
    return f"stage IN {sql_in_list(SQL_LOST_STAGE_VALUES)}"


def sql_fragment_stage_is_open() -> str:
    """Abierto = no terminal (ganado ni perdido, incl. legacy)."""
    return f"stage NOT IN {sql_in_list(SQL_TERMINAL_STAGE_VALUES)}"


def sql_fragment_stage_not_lost() -> str:
    """Útil para top deals: excluir perdidos (cualquier literal lost)."""
    return f"stage NOT IN {sql_in_list(SQL_LOST_STAGE_VALUES)}"


def sql_fragment_alias_stage_not_lost(table_alias: str = "d") -> str:
    """Ej.: d.stage NOT IN ('closed_lost','lost') para JOIN queries."""
    return f"{table_alias}.stage NOT IN {sql_in_list(SQL_LOST_STAGE_VALUES)}"
