"""
Tests for security middleware: input sanitization and injection detection.
"""

import pytest
from middlewares.security import scan_for_injection, sanitize_string, deep_scan_dict


class TestScanForInjection:
    """Test injection pattern detection."""

    def test_clean_text_passes(self):
        assert scan_for_injection("Hello World") is None
        assert scan_for_injection("john@example.com") is None
        assert scan_for_injection("My Company Inc.") is None

    def test_script_tag_detected(self):
        assert scan_for_injection("<script>alert('xss')</script>") is not None

    def test_javascript_protocol_detected(self):
        assert scan_for_injection("javascript:alert(1)") is not None

    def test_event_handler_detected(self):
        assert scan_for_injection('onerror=alert(1)') is not None
        assert scan_for_injection('onclick=doSomething()') is not None

    def test_sql_union_select_detected(self):
        assert scan_for_injection("1 UNION SELECT * FROM users") is not None

    def test_sql_drop_table_detected(self):
        assert scan_for_injection("'; DROP TABLE users; --") is not None

    def test_path_traversal_detected(self):
        assert scan_for_injection("../../etc/passwd") is not None

    def test_normal_sql_keywords_in_text_ok(self):
        # Words like "update" in normal text should be fine when not in SQL context
        assert scan_for_injection("Please update your profile") is None

    def test_empty_string_passes(self):
        assert scan_for_injection("") is None

    def test_none_passes(self):
        assert scan_for_injection(None) is None


class TestSanitizeString:
    """Test string sanitization."""

    def test_removes_null_bytes(self):
        assert sanitize_string("hello\x00world") == "helloworld"

    def test_removes_control_characters(self):
        assert sanitize_string("hello\x01\x02world") == "helloworld"

    def test_preserves_newlines_and_tabs(self):
        assert sanitize_string("hello\nworld\ttab") == "hello\nworld\ttab"

    def test_preserves_normal_text(self):
        assert sanitize_string("Hello World 123!") == "Hello World 123!"

    def test_preserves_unicode(self):
        assert sanitize_string("Héllo Wörld 日本語") == "Héllo Wörld 日本語"


class TestDeepScanDict:
    """Test recursive dictionary scanning."""

    def test_clean_dict_passes(self):
        data = {"name": "John", "email": "john@test.com", "age": 30}
        assert deep_scan_dict(data) is None

    def test_nested_xss_detected(self):
        data = {"user": {"name": "<script>alert(1)</script>"}}
        result = deep_scan_dict(data)
        assert result is not None
        assert "user.name" in result

    def test_list_scanning(self):
        data = {"tags": ["safe", "<script>bad</script>"]}
        result = deep_scan_dict(data)
        assert result is not None

    def test_deeply_nested_injection(self):
        data = {"level1": {"level2": {"level3": "'; DROP TABLE users; --"}}}
        result = deep_scan_dict(data)
        assert result is not None

    def test_clean_nested_dict_passes(self):
        data = {
            "contact": {
                "name": "John Doe",
                "address": {"city": "Madrid", "country": "Spain"},
            },
            "tags": ["vip", "enterprise"],
        }
        assert deep_scan_dict(data) is None

    def test_injection_in_key_detected(self):
        data = {"<script>": "value"}
        result = deep_scan_dict(data)
        assert result is not None