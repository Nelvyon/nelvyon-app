"""Unit tests — create_all duplicate-table swallow is strictly scoped (ADR-039)."""

from __future__ import annotations

import pytest

from core.database import is_duplicate_table_error


class _FakeDuplicateTableError(Exception):
    """Stand-in when asyncpg DuplicateTableError is not constructed easily."""


def test_is_duplicate_table_error_accepts_relation_already_exists():
    exc = Exception('relation "contacts" already exists')
    assert is_duplicate_table_error(exc) is True


def test_is_duplicate_table_error_accepts_duplicatetable_token():
    exc = Exception("DuplicateTableError: foo")
    assert is_duplicate_table_error(exc) is True


def test_is_duplicate_table_error_rejects_undefined_column():
    exc = Exception('column "is_active" does not exist')
    assert is_duplicate_table_error(exc) is False


def test_is_duplicate_table_error_rejects_generic_already_exists():
    # Must not swallow non-table "already exists" (e.g. index/constraint noise alone is ok only with relation)
    exc = Exception("value already exists in cache")
    assert is_duplicate_table_error(exc) is False


def test_is_duplicate_table_error_walks_cause_chain():
    root = _FakeDuplicateTableError('relation "contacts" already exists')
    # Rename type check path via message; also wrap
    wrapped = Exception("SQL failed")
    wrapped.__cause__ = Exception('relation "x" already exists')
    assert is_duplicate_table_error(wrapped) is True
    assert is_duplicate_table_error(root) is True
