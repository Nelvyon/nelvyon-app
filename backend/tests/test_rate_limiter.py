"""
Tests unitarios de helpers del middleware de rate limiting (FASE 1).
"""

from middlewares.rate_limiter import RateLimiterMiddleware


class TestRateLimiterHelpers:
    def setup_method(self):
        self.middleware = RateLimiterMiddleware(app=None, enabled=True)

    def test_match_rule_known_path(self):
        rule = self.middleware._match_rule("/api/v1/campaign-sender/send", "POST")
        assert rule is not None
        assert rule["name"] == "campaign_send"

    def test_match_rule_unknown_path_returns_none(self):
        rule = self.middleware._match_rule("/api/v1/entities/contacts", "GET")
        assert rule is None

    def test_workspace_hint_numeric(self):
        class Req:
            headers = {"X-Workspace-Id": "22"}
            client = None

        assert self.middleware._get_workspace_hint(Req()) == "22"

    def test_scope_key_ip_workspace(self):
        class Client:
            host = "127.0.0.1"

        class Req:
            headers = {"X-Workspace-Id": "1"}
            client = Client()

        k = self.middleware._make_subject_key(Req(), "ip_workspace")
        assert k == "ip:127.0.0.1:ws:1"


class TestRateLimiterConfiguration:
    def test_middleware_disabled(self):
        middleware = RateLimiterMiddleware(app=None, enabled=False)
        assert middleware.enabled is False

    def test_middleware_enabled(self):
        middleware = RateLimiterMiddleware(app=None, enabled=True)
        assert middleware.enabled is True

    def test_lazy_redis_init(self):
        middleware = RateLimiterMiddleware(app=None, enabled=True)
        assert middleware._redis is None