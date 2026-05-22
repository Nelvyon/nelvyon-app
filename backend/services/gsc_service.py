"""Google Search Console API — OAuth2 refresh token, lazy init, mock fallback."""

from __future__ import annotations

import asyncio
import logging
import os
import secrets
from typing import Any
from urllib.parse import urlencode

import httpx

logger = logging.getLogger(__name__)

GSC_SCOPES = [
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/webmasters",
]

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

# state -> redirect_uri (OAuth CSRF)
_oauth_states: dict[str, str] = {}


class GSCService:
    """Search Console client via google-api-python-client."""

    def __init__(self) -> None:
        self._init_attempted = False
        self._mock = False
        self.client_id = ""
        self.client_secret = ""
        self.refresh_token = ""
        self._api_service: Any | None = None

    def _ensure_config(self) -> None:
        if self._init_attempted:
            return
        self._init_attempted = True

        self.client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
        self.client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
        self.refresh_token = os.environ.get("GOOGLE_REFRESH_TOKEN", "").strip()

        if not self.client_id or not self.client_secret or not self.refresh_token:
            self._mock = True
            logger.info(
                "GSCService: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or "
                "GOOGLE_REFRESH_TOKEN missing — mock mode for API calls"
            )

    @property
    def is_mock(self) -> bool:
        self._ensure_config()
        return self._mock

    def _oauth_configured(self) -> bool:
        return bool(
            os.environ.get("GOOGLE_CLIENT_ID", "").strip()
            and os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()
        )

    def default_redirect_uri(self) -> str:
        explicit = os.environ.get("GSC_OAUTH_REDIRECT_URI", "").strip()
        if explicit:
            return explicit
        base = os.environ.get("PYTHON_BACKEND_URL", "").strip().rstrip("/")
        if base:
            return f"{base}/api/gsc/callback"
        return "http://localhost:8000/api/gsc/callback"

    def _get_api_service(self) -> Any:
        self._ensure_config()
        if self._mock:
            raise RuntimeError("GSC API not configured (mock mode)")

        if self._api_service is not None:
            return self._api_service

        from google.auth.transport.requests import Request
        from google.oauth2.credentials import Credentials
        from googleapiclient.discovery import build

        creds = Credentials(
            token=None,
            refresh_token=self.refresh_token,
            token_uri=GOOGLE_TOKEN_URL,
            client_id=self.client_id,
            client_secret=self.client_secret,
            scopes=GSC_SCOPES,
        )
        creds.refresh(Request())
        self._api_service = build("searchconsole", "v1", credentials=creds, cache_discovery=False)
        logger.info("GSCService: Search Console API client ready")
        return self._api_service

    async def _run_sync(self, fn: Any) -> Any:
        return await asyncio.to_thread(fn)

    async def get_search_analytics(
        self,
        site_url: str,
        start_date: str,
        end_date: str,
        dimensions: list[str] | None = None,
    ) -> dict[str, Any]:
        self._ensure_config()
        site = site_url.strip()
        if not site:
            raise ValueError("site_url is required")

        dims = dimensions or ["query"]
        if self._mock:
            return {
                "mock": True,
                "site_url": site,
                "start_date": start_date,
                "end_date": end_date,
                "dimensions": dims,
                "rows": [
                    {
                        "keys": ["nelvyon seo mock"],
                        "clicks": 42,
                        "impressions": 1200,
                        "ctr": 0.035,
                        "position": 8.4,
                    }
                ],
                "responseAggregationType": "byProperty",
            }

        body = {
            "startDate": start_date,
            "endDate": end_date,
            "dimensions": dims,
            "rowLimit": 25000,
        }

        def _query() -> dict[str, Any]:
            service = self._get_api_service()
            return (
                service.searchanalytics()
                .query(siteUrl=site, body=body)
                .execute()
            )

        data = await self._run_sync(_query)
        return {"mock": False, "site_url": site, **data}

    async def get_sites(self) -> dict[str, Any]:
        self._ensure_config()
        if self._mock:
            return {
                "mock": True,
                "siteEntry": [
                    {
                        "siteUrl": "https://nelvyon.com/",
                        "permissionLevel": "siteOwner",
                    }
                ],
            }

        def _list() -> dict[str, Any]:
            service = self._get_api_service()
            return service.sites().list().execute()

        data = await self._run_sync(_list)
        return {"mock": False, **data}

    async def get_sitemaps(self, site_url: str) -> dict[str, Any]:
        self._ensure_config()
        site = site_url.strip()
        if not site:
            raise ValueError("site_url is required")

        if self._mock:
            return {
                "mock": True,
                "site_url": site,
                "sitemap": [
                    {
                        "path": f"{site.rstrip('/')}/sitemap.xml",
                        "lastSubmitted": "2026-01-01",
                        "isPending": False,
                        "isSitemapsIndex": False,
                    }
                ],
            }

        def _list() -> dict[str, Any]:
            service = self._get_api_service()
            return service.sitemaps().list(siteUrl=site).execute()

        data = await self._run_sync(_list)
        return {"mock": False, "site_url": site, **data}

    async def submit_sitemap(self, site_url: str, sitemap_url: str) -> dict[str, Any]:
        self._ensure_config()
        site = site_url.strip()
        feed = sitemap_url.strip()
        if not site or not feed:
            raise ValueError("site_url and sitemap_url are required")

        if self._mock:
            logger.info("[GSC MOCK] submit sitemap site=%s feed=%s", site, feed)
            return {
                "mock": True,
                "site_url": site,
                "sitemap_url": feed,
                "submitted": True,
            }

        def _submit() -> dict[str, Any]:
            service = self._get_api_service()
            service.sitemaps().submit(siteUrl=site, feedpath=feed).execute()
            return {"submitted": True, "site_url": site, "sitemap_url": feed}

        result = await self._run_sync(_submit)
        return {"mock": False, **result}

    async def get_authorization_url(self, redirect_uri: str | None = None) -> dict[str, Any]:
        if not self._oauth_configured():
            return {
                "mock": True,
                "error": "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required for OAuth",
            }

        redirect = (redirect_uri or self.default_redirect_uri()).strip()
        state = secrets.token_urlsafe(32)
        _oauth_states[state] = redirect

        params = {
            "client_id": os.environ.get("GOOGLE_CLIENT_ID", "").strip(),
            "redirect_uri": redirect,
            "response_type": "code",
            "scope": " ".join(GSC_SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
        authorize_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
        return {
            "mock": False,
            "authorize_url": authorize_url,
            "state": state,
            "redirect_uri": redirect,
            "scopes": GSC_SCOPES,
        }

    async def exchange_authorization_code(
        self,
        code: str,
        state: str,
        redirect_uri: str | None = None,
    ) -> dict[str, Any]:
        if not self._oauth_configured():
            return {"mock": True, "error": "Google OAuth not configured"}

        code = code.strip()
        state = state.strip()
        if not code or not state:
            raise ValueError("code and state are required")

        expected_redirect = _oauth_states.pop(state, None)
        if expected_redirect is None:
            raise ValueError("Invalid or expired OAuth state")

        redirect = (redirect_uri or expected_redirect).strip()
        client_id = os.environ.get("GOOGLE_CLIENT_ID", "").strip()
        client_secret = os.environ.get("GOOGLE_CLIENT_SECRET", "").strip()

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": redirect,
                    "grant_type": "authorization_code",
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            try:
                body = response.json()
            except Exception:
                body = {"raw": response.text}

            if response.status_code >= 400:
                return {
                    "mock": False,
                    "ok": False,
                    "status_code": response.status_code,
                    "error": body,
                }

        refresh = body.get("refresh_token")
        return {
            "mock": False,
            "ok": True,
            "access_token": body.get("access_token"),
            "refresh_token": refresh,
            "expires_in": body.get("expires_in"),
            "scope": body.get("scope"),
            "message": (
                "Store refresh_token in Railway as GOOGLE_REFRESH_TOKEN"
                if refresh
                else "No refresh_token returned; revoke app access and retry with prompt=consent"
            ),
        }


_gsc_service: GSCService | None = None


def get_gsc_service() -> GSCService:
    global _gsc_service
    if _gsc_service is None:
        _gsc_service = GSCService()
    return _gsc_service
