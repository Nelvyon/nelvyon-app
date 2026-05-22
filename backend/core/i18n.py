"""
NELVYON internationalization — API message translations and request language resolution.
"""

from __future__ import annotations

import logging
import re
from contextvars import ContextVar
from typing import Any, Optional

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

DEFAULT_LANGUAGE = "en"
SUPPORTED_LANGUAGES = frozenset({"en", "es", "fr", "de", "pt", "it", "nl"})
_language_ctx: ContextVar[str] = ContextVar("nelvyon_language", default=DEFAULT_LANGUAGE)

_ACCEPT_LANG_RE = re.compile(r"^([a-zA-Z]{2})(?:[-_]([a-zA-Z]{2}))?")

# ─── Translation catalog ─────────────────────────────────────────────────────

TRANSLATIONS: dict[str, dict[str, str]] = {
    "internal_server_error": {
        "en": "Internal server error",
        "es": "Error interno del servidor",
        "fr": "Erreur interne du serveur",
        "de": "Interner Serverfehler",
        "pt": "Erro interno do servidor",
        "it": "Errore interno del server",
        "nl": "Interne serverfout",
    },
    "bad_request": {
        "en": "Bad request",
        "es": "Solicitud incorrecta",
        "fr": "Requête incorrecte",
        "de": "Ungültige Anfrage",
        "pt": "Requisição inválida",
        "it": "Richiesta non valida",
        "nl": "Ongeldig verzoek",
    },
    "conflict_duplicate": {
        "en": "Conflict with existing data (constraint or duplicate).",
        "es": "Conflicto con datos existentes (restricción o duplicado).",
        "fr": "Conflit avec des données existantes (contrainte ou doublon).",
        "de": "Konflikt mit vorhandenen Daten (Einschränkung oder Duplikat).",
        "pt": "Conflito com dados existentes (restrição ou duplicado).",
        "it": "Conflitto con dati esistenti (vincolo o duplicato).",
        "nl": "Conflict met bestaande gegevens (beperking of duplicaat).",
    },
    "unprocessable_entity": {
        "en": "Unprocessable entity",
        "es": "Entidad no procesable",
        "fr": "Entité non traitable",
        "de": "Nicht verarbeitbare Entität",
        "pt": "Entidade não processável",
        "it": "Entità non elaborabile",
        "nl": "Niet-verwerkbare entiteit",
    },
    "contact_not_found": {
        "en": "Contact not found",
        "es": "Contacto no encontrado",
        "fr": "Contact introuvable",
        "de": "Kontakt nicht gefunden",
        "pt": "Contacto não encontrado",
        "it": "Contatto non trovato",
        "nl": "Contact niet gevonden",
    },
    "contact_wrong_workspace": {
        "en": "Contact does not belong to this workspace.",
        "es": "El contacto no pertenece a este workspace.",
        "fr": "Le contact n'appartient pas à cet espace de travail.",
        "de": "Der Kontakt gehört nicht zu diesem Workspace.",
        "pt": "O contacto não pertence a este workspace.",
        "it": "Il contatto non appartiene a questo workspace.",
        "nl": "Het contact behoort niet tot deze workspace.",
    },
    "workspace_id_required": {
        "en": "X-Workspace-Id header is required for this endpoint",
        "es": "El encabezado X-Workspace-Id es obligatorio para este endpoint",
        "fr": "L'en-tête X-Workspace-Id est requis pour ce point de terminaison",
        "de": "X-Workspace-Id-Header ist für diesen Endpunkt erforderlich",
        "pt": "O cabeçalho X-Workspace-Id é obrigatório para este endpoint",
        "it": "L'intestazione X-Workspace-Id è obbligatoria per questo endpoint",
        "nl": "X-Workspace-Id-header is verplicht voor dit endpoint",
    },
    "workspace_id_invalid": {
        "en": "X-Workspace-Id must be a valid integer",
        "es": "X-Workspace-Id debe ser un entero válido",
        "fr": "X-Workspace-Id doit être un entier valide",
        "de": "X-Workspace-Id muss eine gültige Ganzzahl sein",
        "pt": "X-Workspace-Id deve ser um inteiro válido",
        "it": "X-Workspace-Id deve essere un intero valido",
        "nl": "X-Workspace-Id moet een geldig geheel getal zijn",
    },
    "workspace_access_denied": {
        "en": "You do not have access to this workspace",
        "es": "No tienes acceso a este workspace",
        "fr": "Vous n'avez pas accès à cet espace de travail",
        "de": "Sie haben keinen Zugriff auf diesen Workspace",
        "pt": "Não tem acesso a este workspace",
        "it": "Non hai accesso a questo workspace",
        "nl": "U heeft geen toegang tot deze workspace",
    },
    "workspace_admin_required": {
        "en": "Workspace admin access required",
        "es": "Se requiere acceso de administrador del workspace",
        "fr": "Accès administrateur de l'espace de travail requis",
        "de": "Workspace-Administratorzugriff erforderlich",
        "pt": "Acesso de administrador do workspace necessário",
        "it": "Accesso amministratore workspace richiesto",
        "nl": "Workspace-beheerderstoegang vereist",
    },
    "workspace_operator_required": {
        "en": "Workspace operator role required for this action",
        "es": "Se requiere rol de operador del workspace para esta acción",
        "fr": "Rôle opérateur de l'espace de travail requis pour cette action",
        "de": "Workspace-Operatorrolle für diese Aktion erforderlich",
        "pt": "Função de operador do workspace necessária para esta ação",
        "it": "Ruolo operatore workspace richiesto per questa azione",
        "nl": "Workspace-operatorrol vereist voor deze actie",
    },
    "crm_workspace_required": {
        "en": "X-Workspace-Id header is required for CRM operations",
        "es": "El encabezado X-Workspace-Id es obligatorio para operaciones CRM",
        "fr": "L'en-tête X-Workspace-Id est requis pour les opérations CRM",
        "de": "X-Workspace-Id-Header ist für CRM-Operationen erforderlich",
        "pt": "O cabeçalho X-Workspace-Id é obrigatório para operações CRM",
        "it": "L'intestazione X-Workspace-Id è obbligatoria per le operazioni CRM",
        "nl": "X-Workspace-Id-header is verplicht voor CRM-bewerkingen",
    },
    "auth_required": {
        "en": "Authentication credentials were not provided",
        "es": "No se proporcionaron credenciales de autenticación",
        "fr": "Identifiants d'authentification non fournis",
        "de": "Authentifizierungsdaten wurden nicht bereitgestellt",
        "pt": "Credenciais de autenticação não fornecidas",
        "it": "Credenziali di autenticazione non fornite",
        "nl": "Authenticatiegegevens niet verstrekt",
    },
    "not_found": {
        "en": "Resource not found",
        "es": "Recurso no encontrado",
        "fr": "Ressource introuvable",
        "de": "Ressource nicht gefunden",
        "pt": "Recurso não encontrado",
        "it": "Risorsa non trovata",
        "nl": "Bron niet gevonden",
    },
    "invalid_workspace_id_param": {
        "en": "Invalid workspace_id",
        "es": "workspace_id inválido",
        "fr": "workspace_id invalide",
        "de": "Ungültige workspace_id",
        "pt": "workspace_id inválido",
        "it": "workspace_id non valido",
        "nl": "Ongeldige workspace_id",
    },
    "helpdesk_workspace_required": {
        "en": "workspace_id query param or HELPDESK_DEFAULT_WORKSPACE_ID required",
        "es": "Se requiere parámetro workspace_id o HELPDESK_DEFAULT_WORKSPACE_ID",
        "fr": "Paramètre workspace_id ou HELPDESK_DEFAULT_WORKSPACE_ID requis",
        "de": "workspace_id-Parameter oder HELPDESK_DEFAULT_WORKSPACE_ID erforderlich",
        "pt": "Parâmetro workspace_id ou HELPDESK_DEFAULT_WORKSPACE_ID necessário",
        "it": "Parametro workspace_id o HELPDESK_DEFAULT_WORKSPACE_ID richiesto",
        "nl": "workspace_id-parameter of HELPDESK_DEFAULT_WORKSPACE_ID vereist",
    },
    "admin_required": {
        "en": "Admin access required",
        "es": "Se requiere acceso de administrador",
        "fr": "Accès administrateur requis",
        "de": "Administratorzugriff erforderlich",
        "pt": "Acesso de administrador necessário",
        "it": "Accesso amministratore richiesto",
        "nl": "Beheerderstoegang vereist",
    },
    "gdpr_export_success": {
        "en": "User data exported successfully",
        "es": "Datos del usuario exportados correctamente",
        "fr": "Données utilisateur exportées avec succès",
        "de": "Benutzerdaten erfolgreich exportiert",
        "pt": "Dados do utilizador exportados com sucesso",
        "it": "Dati utente esportati con successo",
        "nl": "Gebruikersgegevens succesvol geëxporteerd",
    },
    "gdpr_delete_requested": {
        "en": "Data deletion request recorded",
        "es": "Solicitud de eliminación de datos registrada",
        "fr": "Demande de suppression de données enregistrée",
        "de": "Datenlöschanfrage registriert",
        "pt": "Pedido de eliminação de dados registado",
        "it": "Richiesta di cancellazione dati registrata",
        "nl": "Verzoek tot gegevensverwijdering geregistreerd",
    },
    "gdpr_consent_recorded": {
        "en": "Consent recorded successfully",
        "es": "Consentimiento registrado correctamente",
        "fr": "Consentement enregistré avec succès",
        "de": "Einwilligung erfolgreich registriert",
        "pt": "Consentimento registado com sucesso",
        "it": "Consenso registrato con successo",
        "nl": "Toestemming succesvol geregistreerd",
    },
    "gdpr_subject_not_found": {
        "en": "Data subject not found in workspace",
        "es": "Titular de datos no encontrado en el workspace",
        "fr": "Personne concernée introuvable dans l'espace de travail",
        "de": "Betroffene Person im Workspace nicht gefunden",
        "pt": "Titular de dados não encontrado no workspace",
        "it": "Interessato non trovato nel workspace",
        "nl": "Betrokkene niet gevonden in workspace",
    },
    "gdpr_anonymized": {
        "en": "Contact anonymized successfully",
        "es": "Contacto anonimizado correctamente",
        "fr": "Contact anonymisé avec succès",
        "de": "Kontakt erfolgreich anonymisiert",
        "pt": "Contacto anonimizado com sucesso",
        "it": "Contatto anonimizzato con successo",
        "nl": "Contact succesvol geanonimiseerd",
    },
}


def normalize_language(code: str | None) -> str:
    """Map locale code to supported language (e.g. es-MX → es)."""
    if not code:
        return DEFAULT_LANGUAGE
    raw = str(code).strip().lower().replace("_", "-")
    if raw in SUPPORTED_LANGUAGES:
        return raw
    primary = raw.split("-", 1)[0]
    if primary in SUPPORTED_LANGUAGES:
        return primary
    return DEFAULT_LANGUAGE


def parse_accept_language(header: str | None) -> str:
    """Pick best supported language from Accept-Language header."""
    if not header:
        return DEFAULT_LANGUAGE
    candidates: list[tuple[float, str]] = []
    for part in header.split(","):
        piece = part.strip()
        if not piece:
            continue
        if ";q=" in piece:
            lang_part, _, q_part = piece.partition(";q=")
            try:
                q = float(q_part.strip())
            except ValueError:
                q = 1.0
        else:
            lang_part = piece
            q = 1.0
        match = _ACCEPT_LANG_RE.match(lang_part.strip())
        if match:
            lang = normalize_language(match.group(1))
            if lang in SUPPORTED_LANGUAGES:
                candidates.append((q, lang))
    if not candidates:
        return DEFAULT_LANGUAGE
    candidates.sort(key=lambda x: x[0], reverse=True)
    return candidates[0][1]


def t(key: str, language: str | None = None, **kwargs: Any) -> str:
    """Translate an API message key for the given language."""
    lang = normalize_language(language)
    catalog = TRANSLATIONS.get(key, {})
    message = catalog.get(lang) or catalog.get(DEFAULT_LANGUAGE) or key
    if kwargs:
        try:
            return message.format(**kwargs)
        except (KeyError, ValueError):
            logger.debug("i18n format failed for key=%s lang=%s", key, lang)
    return message


def get_language(
    request: Request,
    workspace: Any | None = None,
) -> str:
    """
    Resolve request language: workspace locale/language overrides Accept-Language.
    """
    if workspace is not None:
        ws_lang = getattr(workspace, "language", None) or getattr(workspace, "locale", None)
        if ws_lang:
            return normalize_language(str(ws_lang))
    header_lang = parse_accept_language(request.headers.get("accept-language"))
    state_lang = getattr(getattr(request, "state", None), "language", None)
    if state_lang:
        return normalize_language(str(state_lang))
    return header_lang


def bind_language_to_request(request: Request, workspace: Any | None = None) -> str:
    """Set request.state.language and return resolved code."""
    lang = get_language(request, workspace)
    request.state.language = lang
    _language_ctx.set(lang)
    return lang


def request_language(request: Request | None, fallback: str | None = None) -> str:
    """Read language from request.state, context var, or fallback."""
    if request is not None:
        state_lang = getattr(getattr(request, "state", None), "language", None)
        if state_lang:
            return normalize_language(str(state_lang))
    try:
        ctx_lang = _language_ctx.get()
        if ctx_lang:
            return normalize_language(ctx_lang)
    except LookupError:
        pass
    return normalize_language(fallback or DEFAULT_LANGUAGE)


def apply_workspace_language(request: Request, workspace: Any | None) -> None:
    """Override request language from workspace settings when available."""
    if workspace is None:
        return
    ws_lang = getattr(workspace, "language", None) or getattr(workspace, "locale", None)
    if ws_lang:
        lang = normalize_language(str(ws_lang))
        request.state.language = lang
        _language_ctx.set(lang)


class I18nMiddleware(BaseHTTPMiddleware):
    """Injects resolved language into each request (request.state.language)."""

    async def dispatch(self, request: Request, call_next):
        bind_language_to_request(request)
        response = await call_next(request)
        lang = getattr(request.state, "language", DEFAULT_LANGUAGE)
        response.headers["Content-Language"] = lang
        return response


def register_i18n_middleware(app) -> None:
    """Register I18nMiddleware on a FastAPI app (for explicit bootstrap)."""
    app.add_middleware(I18nMiddleware)


# Auto-hook: RequestIDMiddleware imports bind_language_to_request at dispatch time.
