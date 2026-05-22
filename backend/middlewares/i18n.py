"""I18n middleware — re-export from core.i18n for middleware package discovery."""

from core.i18n import I18nMiddleware, register_i18n_middleware

__all__ = ["I18nMiddleware", "register_i18n_middleware"]
