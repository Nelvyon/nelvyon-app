"""Schema guard — production DDL lives in backend/db/migrations only.

Legacy FastAPI services called ensure_schema() at runtime. Those hooks are no-ops;
run `pnpm -C apps/web migrate` (or Railway deploy migrate step) before serving traffic.
"""


async def schema_noop(*_args, **_kwargs) -> None:
    """No-op replacement for removed runtime DDL."""
    return
