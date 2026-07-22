FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
# Shared Postgres with Node SQL migrations (SSOT): set SKIP_ALEMBIC=1 to avoid
# DuplicateTableError on alembic when schema already applied via migrate.ts.
CMD ["sh", "-c", "if [ \"${SKIP_ALEMBIC:-0}\" = \"1\" ]; then echo '[alembic] skipped (SKIP_ALEMBIC=1)'; else alembic upgrade head || echo '[alembic] upgrade failed (non-fatal on shared DB)'; fi; exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
